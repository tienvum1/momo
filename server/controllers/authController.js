const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.status(statusCode).json({
    message: 'Thành công',
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
  });
};

const register = async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name)
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email, tên và mật khẩu' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự' });

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(400).json({ message: 'Email này đã được sử dụng' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashed,
        full_name: full_name.trim(),
        role: 'user',
      },
    });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    if (user.status === 'locked')
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const logout = (req, res) => res.status(200).json({ message: 'Đã đăng xuất' });

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, full_name: true, role: true, status: true, is_verified: true, created_at: true },
    });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const updateProfile = async (req, res) => {
  const { full_name } = req.body;
  if (!full_name?.trim()) return res.status(400).json({ message: 'Tên không được để trống' });
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { full_name: full_name.trim() },
      select: { id: true, email: true, full_name: true, role: true, status: true, is_verified: true, created_at: true },
    });
    res.json({ message: 'Cập nhật thành công', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Vui lòng nhập đủ thông tin' });
  if (newPassword.length < 6) return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 6 ký tự' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { register, login, logout, getMe, updateProfile, changePassword };
