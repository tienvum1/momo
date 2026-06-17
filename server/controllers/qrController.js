const prisma = require('../config/prisma');
const { cloudinary } = require('../config/cloudinary');

// Hàm helper để xóa ảnh trên Cloudinary từ URL
const deleteCloudinaryImage = async (url) => {
  if (!url) return;
  try {
    const parts = url.split('/');
    const folderAndPublicId = parts.slice(-2).join('/').split('.')[0];
    await cloudinary.uploader.destroy(folderAndPublicId);
    console.log('Đã xóa ảnh cũ trên Cloudinary:', folderAndPublicId);
  } catch (err) {
    console.error('Lỗi khi xóa ảnh trên Cloudinary:', err.message);
  }
};

// Tạo mới một QR
const createQR = async (req, res) => {
  try {
    const { name, max_amount_per_trans, monthly_limit, fee_rate, fee_rate_under, fee_rate_over, note, status } = req.body;
    const creator_id = req.user.id;

    const main_image = req.files && req.files.main_image ? req.files.main_image[0].path : '';
    const qr_image = req.files && req.files.qr_image ? req.files.qr_image[0].path : '';

    if (!main_image || !qr_image) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ ảnh đại diện và ảnh mã QR' });
    }

    const qrStatus = status || 'ready';

    const qr = await prisma.qr.create({
      data: {
        name: name || null,
        main_image,
        qr_image,
        max_amount_per_trans: Number(max_amount_per_trans),
        monthly_limit: monthly_limit ? Number(monthly_limit) : null,
        fee_rate: fee_rate !== undefined && fee_rate !== '' ? Number(fee_rate) : 0,
        fee_rate_under: fee_rate_under !== undefined && fee_rate_under !== '' ? Number(fee_rate_under) : 0,
        fee_rate_over: fee_rate_over !== undefined && fee_rate_over !== '' ? Number(fee_rate_over) : 0,
        note: note || null,
        status: qrStatus,
        creator_id: creator_id,
      }
    });

    res.status(201).json({
      message: 'Tạo QR thành công',
      qr
    });
  } catch (err) {
    console.error('Lỗi khi tạo QR:', err);
    res.status(500).json({ message: 'Lỗi server khi tạo QR: ' + err.message });
  }
};

// Cập nhật QR
const updateQR = async (req, res) => {
  try {
    const { name, max_amount_per_trans, monthly_limit, fee_rate, fee_rate_under, fee_rate_over, note, status } = req.body;
    const qrId = parseInt(req.params.id);

    const existing = await prisma.qr.findUnique({
      where: { id: qrId }
    });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy QR' });

    let main_image = existing.main_image;
    let qr_image = existing.qr_image;

    if (req.files) {
      if (req.files.main_image) {
        await deleteCloudinaryImage(existing.main_image);
        main_image = req.files.main_image[0].path;
      }
      if (req.files.qr_image) {
        await deleteCloudinaryImage(existing.qr_image);
        qr_image = req.files.qr_image[0].path;
      }
    }

    const updatedName = name !== undefined ? name : existing.name;
    const updatedMaxAmount = max_amount_per_trans !== undefined ? Number(max_amount_per_trans) : existing.max_amount_per_trans;
    const updatedMonthlyLimit = monthly_limit !== undefined ? (monthly_limit ? Number(monthly_limit) : null) : existing.monthly_limit;
    const updatedFeeRate = fee_rate !== undefined ? Number(fee_rate) : existing.fee_rate;
    const updatedFeeRateUnder = fee_rate_under !== undefined ? Number(fee_rate_under) : existing.fee_rate_under;
    const updatedFeeRateOver = fee_rate_over !== undefined ? Number(fee_rate_over) : existing.fee_rate_over;
    const updatedNote = note !== undefined ? note : existing.note;
    const qrStatus = status || existing.status;

    await prisma.qr.update({
      where: { id: qrId },
      data: {
        name: updatedName || null,
        main_image,
        qr_image,
        max_amount_per_trans: updatedMaxAmount,
        monthly_limit: updatedMonthlyLimit,
        fee_rate: updatedFeeRate,
        fee_rate_under: updatedFeeRateUnder,
        fee_rate_over: updatedFeeRateOver,
        note: updatedNote || null,
        status: qrStatus
      }
    });

    res.json({ message: 'Cập nhật QR thành công' });
  } catch (err) {
    console.error('Lỗi khi cập nhật QR:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật QR: ' + err.message });
  }
};

// Lấy tất cả QR (cho admin) - Ưu tiên ready hiện đầu tiên
const getAllQRs = async (req, res) => {
  try {
    const qrs = await prisma.qr.findMany({
      include: {
        creator: {
          select: { full_name: true }
        }
      }
    });

    const rows = qrs.map(q => ({
      ...q,
      creator_name: q.creator ? q.creator.full_name : null
    }));

    // Sort: status = 'ready' first, then maintenance. Within status, created_at desc.
    rows.sort((a, b) => {
      if (a.status === 'ready' && b.status !== 'ready') return -1;
      if (a.status !== 'ready' && b.status === 'ready') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách QR' });
  }
};

// Helper tính hạn mức còn lại trong tháng cho một QR
const calcDailyRemaining = async (qrId, monthlyLimit) => {
  if (!monthlyLimit) return null;
  const limit = Number(monthlyLimit);
  if (!limit || limit <= 0) return null;

  const rows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(transfer_amount), 0) as used
    FROM bookings
    WHERE qr_id = ${qrId}
      AND status IN ('customer_paid', 'confirmed')
      AND MONTH(CONVERT_TZ(created_at,'+00:00','+07:00')) = MONTH(CONVERT_TZ(NOW(),'+00:00','+07:00'))
      AND YEAR(CONVERT_TZ(created_at,'+00:00','+07:00')) = YEAR(CONVERT_TZ(NOW(),'+00:00','+07:00'))
  `;
  const used = Number(rows[0]?.used ?? 0);
  return Math.max(0, limit - used);
};

// Lấy danh sách QR sẵn sàng cho người dùng
const getReadyQRs = async (req, res) => {
  try {
    const qrs = await prisma.qr.findMany({
      where: { status: 'ready' },
      include: { creator: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' }
    });

    const rows = await Promise.all(qrs.map(async (q) => ({
      ...q,
      creator_name: q.creator ? q.creator.full_name : null,
      daily_remaining: await calcDailyRemaining(q.id, q.monthly_limit),
    })));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách QR sẵn sàng' });
  }
};

// Lấy chi tiết QR sẵn sàng cho người dùng
const getReadyQRById = async (req, res) => {
  try {
    const qr = await prisma.qr.findFirst({
      where: { id: parseInt(req.params.id), status: 'ready' },
      include: { creator: { select: { full_name: true } } }
    });

    if (!qr) return res.status(404).json({ message: 'Không tìm thấy QR' });

    const daily_remaining = await calcDailyRemaining(qr.id, qr.monthly_limit);

    res.json({
      ...qr,
      creator_name: qr.creator ? qr.creator.full_name : null,
      daily_remaining,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy chi tiết QR' });
  }
};

// Cập nhật trạng thái QR (admin)
const updateQRStatus = async (req, res) => {
  try {
    const qrId = parseInt(req.params.id);
    const { status } = req.body;

    if (status !== 'ready' && status !== 'maintenance') {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const existing = await prisma.qr.findUnique({
      where: { id: qrId },
      select: { id: true }
    });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy QR' });

    await prisma.qr.update({
      where: { id: qrId },
      data: { status }
    });

    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái' });
  }
};

// Xóa QR
const deleteQR = async (req, res) => {
  try {
    const qrId = parseInt(req.params.id);

    const existing = await prisma.qr.findUnique({
      where: { id: qrId },
      select: { main_image: true, qr_image: true }
    });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy QR' });

    await deleteCloudinaryImage(existing.main_image);
    await deleteCloudinaryImage(existing.qr_image);

    await prisma.qr.delete({
      where: { id: qrId }
    });

    res.json({ message: 'Xóa QR thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi xóa QR' });
  }
};

// Lấy chi tiết 1 QR
const getQRById = async (req, res) => {
  try {
    const qr = await prisma.qr.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!qr) return res.status(404).json({ message: 'Không tìm thấy QR' });
    res.json(qr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  createQR,
  updateQR,
  getReadyQRs,
  getReadyQRById,
  updateQRStatus,
  deleteQR,
  getAllQRs,
  getQRById
};
