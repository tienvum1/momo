const pool = require('../config/db').pool;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: tạo JWT và trả về trong response body
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(statusCode).json({
    message: 'Thành công',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      level: user.level,
    }
  });
};

// Test gửi email để debug trên Production
const testEmail = async (req, res) => {
  const targetEmail = req.query.email || process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL;

  if (!targetEmail) {
    return res.status(400).json({
      status: 'error',
      message: 'Vui lòng cung cấp email nhận (?email=...) hoặc cấu hình RESEND_FROM_EMAIL trong .env'
    });
  }

  try {
    const data = await sendEmail({
      to: targetEmail,
      subject: `[RESEND TEST] Kiểm tra hệ thống Email - ${new Date().toLocaleString('vi-VN')}`,
      html: `<p>Hệ thống email hoạt động tốt. Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>`
    });

    res.json({ status: 'success', message: `Đã gửi email test tới ${targetEmail}`, id: data?.id });
  } catch (error) {
    console.error('LỖI GỬI MAIL:', error);
    res.status(500).json({ status: 'error', message: 'Gửi mail thất bại', error: error.message });
  }
};

const register = async (req, res) => {
  const { username, password, full_name } = req.body;
  try {
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO users (username, password, full_name, role, level, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, full_name || username, 'user', 0, 1]
    );

    res.status(201).json({ message: 'Đăng ký thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const verifyEmail = async (req, res) => {
  const token = req.params.token ? req.params.token.trim() : '';
  try {
    const [users] = await pool.query(
      'SELECT id, email, is_verified FROM users WHERE verification_token = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Mã xác nhận không hợp lệ, đã hết hạn hoặc tài khoản đã được xác thực.' });
    }

    const user = users[0];
    if (user.is_verified) {
      return res.json({ message: 'Tài khoản của bạn đã được xác nhận từ trước. Bạn có thể đăng nhập.' });
    }

    await pool.query(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
      [user.id]
    );

    res.json({ message: 'Xác nhận email thành công! Bạn có thể đăng nhập ngay bây giờ.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });

    const user = users[0];
    if (!user.password) return res.status(400).json({ message: 'Tài khoản này dùng Google Login' });

    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const googleLogin = async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;

    if (users.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (email, full_name, password, role, level, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [email, name, null, 'user', 0, 1]
      );
      user = { id: result.insertId, email, full_name: name, role: 'user', level: 0 };
    } else {
      user = users[0];
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Xác thực Google thất bại' });
  }
};

const logout = (req, res) => {
  res.status(200).json({ message: 'Đã đăng xuất' });
};

const getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, role, level, status, is_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json({ user: users[0] });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'Email không tồn tại' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 giờ

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://credifyapp.site';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;

    await sendEmail({
      to: email,
      subject: 'Khôi phục mật khẩu - Credify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5; text-align: center;">Khôi phục mật khẩu</h2>
          <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Link này sẽ hết hạn sau <strong>1 giờ</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Credify.vn. All rights reserved.</p>
        </div>
      `
    });

    res.json({ message: 'Link khôi phục mật khẩu đã được gửi vào email của bạn.' });
  } catch (err) {
    console.error('LỖI FORGOT PASSWORD:', err);
    res.status(500).json({ message: 'Lỗi hệ thống khi gửi mail', error: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );
    if (users.length === 0) return res.status(400).json({ message: 'Token không hợp lệ' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = ?',
      [hashedPassword, token]
    );

    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const updateProfile = async (req, res) => {
  const { full_name } = req.body;
  const userId = req.user.id;

  try {
    await pool.query('UPDATE users SET full_name = ? WHERE id = ?', [full_name, userId]);

    const [users] = await pool.query(
      'SELECT id, email, full_name, role, level, status, is_verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Cập nhật thông tin thành công', user: users[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật profile' });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('Lỗi khi đổi mật khẩu:', err);
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu' });
  }
};

module.exports = {
  register, verifyEmail, login, googleLogin, logout,
  getMe, forgotPassword, resetPassword,
  updateProfile, changePassword, testEmail
};
