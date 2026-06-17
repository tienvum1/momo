const pool = require('../config/db').pool;
const bcrypt = require('bcryptjs');

// Lấy danh sách tất cả người dùng và thống kê
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users,
        SUM(CASE WHEN role = 'admin_system' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    let whereSql = " WHERE 1=1";
    const params = [];

    if (search) {
      whereSql += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) {
      whereSql += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      whereSql += ' AND status = ?';
      params.push(status);
    }

    const [totalRows] = await pool.query(`SELECT COUNT(*) as total FROM users ${whereSql}`, params);
    const totalItems = totalRows[0].total;

    let query = `SELECT id, username, email, full_name, role, level, status, created_at FROM users ${whereSql}`;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);
    res.json({
      success: true,
      data: rows,
      stats: stats[0],
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// Tạo người dùng mới (bởi Admin)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, full_name, role, level } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Chỉ cho phép role admin_system hoặc user
    const validRole = ['admin_system', 'user'].includes(role) ? role : 'user';

    await pool.query(
      'INSERT INTO users (username, email, password, full_name, role, level, status) VALUES (?, ?, ?, ?, ?, ?, "active")',
      [username, email || null, hashedPassword, full_name, validRole, level !== undefined ? level : 0]
    );

    res.json({ success: true, message: 'Tạo người dùng thành công' });
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo người dùng' });
  }
};

// Cập nhật người dùng
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, level, status, password } = req.body;

    // Chỉ cho phép role admin_system hoặc user
    const validRole = ['admin_system', 'user'].includes(role) ? role : 'user';

    let query = 'UPDATE users SET full_name = ?, role = ?, level = ?, status = ?';
    const params = [full_name, validRole, level !== undefined ? level : 0, status];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Cập nhật người dùng thành công' });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật người dùng' });
  }
};

// Khóa/Mở khóa người dùng
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: status === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
  } catch (error) {
    console.error('Toggle User Status Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái' });
  }
};

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể xóa chính tài khoản của mình' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa người dùng' });
  }
};

// Xóa đơn hàng (Admin duy nhất có quyền)
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const [booking] = await pool.query('SELECT id, code FROM bookings WHERE id = ?', [id]);
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    await pool.query('DELETE FROM bookings WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Đã xóa đơn hàng #${booking[0].code.slice(-6)} thành công`
    });
  } catch (error) {
    console.error('Delete Booking Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa đơn hàng' });
  }
};
