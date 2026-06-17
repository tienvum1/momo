const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { full_name: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, totalItems, total, usersCount, adminsCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, full_name: true, role: true, status: true, is_verified: true, created_at: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'user' } }),
      prisma.user.count({ where: { role: 'admin_system' } }),
    ]);

    res.json({
      success: true,
      data: users,
      stats: { total, users: usersCount, admins: adminsCount },
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error('Get All Users Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });

    const validRole = ['admin_system', 'user'].includes(role) ? role : 'user';
    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        full_name,
        role: validRole,
        is_verified: true,
        status: 'active',
      },
    });
    res.json({ success: true, message: 'Tạo người dùng thành công' });
  } catch (err) {
    console.error('Create User Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo người dùng' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, status, password } = req.body;
    const validRole = ['admin_system', 'user'].includes(role) ? role : 'user';

    const data = { full_name, role: validRole, status };
    if (password?.trim()) {
      data.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({ where: { id: parseInt(id) }, data });
    res.json({ success: true, message: 'Cập nhật người dùng thành công' });
  } catch (err) {
    console.error('Update User Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật người dùng' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await prisma.user.update({ where: { id: parseInt(id) }, data: { status } });
    res.json({ success: true, message: status === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
  } catch (err) {
    console.error('Toggle User Status Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id)
      return res.status(400).json({ success: false, message: 'Bạn không thể xóa chính tài khoản của mình' });

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa người dùng' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    await prisma.booking.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: `Đã xóa đơn hàng #${booking.code.slice(-6)} thành công` });
  } catch (err) {
    console.error('Delete Booking Error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa đơn hàng' });
  }
};
