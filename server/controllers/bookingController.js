const crypto = require("crypto");
const prisma = require("../config/prisma");
const cache = require("../utils/cache");

const generateCode = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const statusLabel = (status) => {
  const map = {
    created: "Chờ thanh toán",
    customer_paid: "Đang xử lý",
    confirmed: "Hoàn thành",
    rejected: "Từ chối",
    cancelled: "Đã hủy",
  };
  return map[status] || status;
};

const enrichBooking = (booking) => {
  const createdAt = new Date(booking.created_at);
  const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
  return {
    ...booking,
    status_label: statusLabel(booking.status),
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    server_time: new Date().toISOString(),
  };
};

const parseJsonField = (jsonField, fallback) => {
  if (!jsonField) return fallback ? [fallback] : [];
  if (Array.isArray(jsonField)) return jsonField;
  try { return JSON.parse(jsonField); } catch { return fallback ? [fallback] : []; }
};

// Helper function to safely serialize BigInt and Decimal (from Prisma) for Express JSON
const serializeBigIntAndDecimal = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name === 'Decimal') {
      return Number(obj.toString());
    }
    if (obj instanceof Date) {
      return obj; // keep Date objects as-is
    }
    if (Array.isArray(obj)) {
      return obj.map(serializeBigIntAndDecimal);
    }
    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = serializeBigIntAndDecimal(obj[key]);
    }
    return newObj;
  }
  return obj;
};

// ─── Khách tạo đơn ────────────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const { qr_id, customer_bank_name, customer_account_number, customer_account_holder, transfer_amount } = req.body;

    if (!qr_id) return res.status(400).json({ message: "Thiếu qr_id" });
    if (!customer_bank_name?.trim()) return res.status(400).json({ message: "Vui lòng nhập tên ngân hàng" });
    if (!customer_account_number?.trim()) return res.status(400).json({ message: "Vui lòng nhập số tài khoản" });
    if (!customer_account_holder?.trim()) return res.status(400).json({ message: "Vui lòng nhập tên chính chủ" });

    const transferAmountNumber = toNumber(transfer_amount);
    if (!Number.isFinite(transferAmountNumber) || transferAmountNumber <= 0)
      return res.status(400).json({ message: "Vui lòng nhập số tiền hợp lệ" });
    if (transferAmountNumber < 500000)
      return res.status(400).json({ message: "Số tiền tối thiểu là 500.000 VNĐ" });

    const qr = await prisma.qr.findUnique({
      where: { id: parseInt(qr_id) },
      select: { id: true, status: true, max_amount_per_trans: true, monthly_limit: true, fee_rate: true, fee_rate_under: true, fee_rate_over: true, qr_image: true, name: true }
    });

    if (!qr) return res.status(404).json({ message: "Không tìm thấy QR" });
    if (qr.status !== "ready") return res.status(400).json({ message: "QR đang bảo trì" });

    const maxAmount = toNumber(qr.max_amount_per_trans);
    if (Number.isFinite(maxAmount) && transferAmountNumber > maxAmount)
      return res.status(400).json({ message: "Số tiền vượt quá hạn mức của thẻ QR" });

    if (qr.monthly_limit) {
      const monthlyLimit = toNumber(qr.monthly_limit);
      if (Number.isFinite(monthlyLimit) && monthlyLimit > 0) {
        const monthlyUsage = await prisma.$queryRaw`
          SELECT COALESCE(SUM(transfer_amount), 0) as used
          FROM bookings
          WHERE qr_id = ${parseInt(qr_id)} AND status IN ('customer_paid','confirmed')
          AND MONTH(CONVERT_TZ(created_at,'+00:00','+07:00')) = MONTH(CONVERT_TZ(NOW(),'+00:00','+07:00'))
          AND YEAR(CONVERT_TZ(created_at,'+00:00','+07:00')) = YEAR(CONVERT_TZ(NOW(),'+00:00','+07:00'))
        `;
        const usedAmount = monthlyUsage[0] ? toNumber(monthlyUsage[0].used) : 0;
        if (usedAmount + transferAmountNumber > monthlyLimit)
          return res.status(400).json({ message: "QR đã đạt hạn mức giao dịch trong tháng" });
      }
    }

    // Chọn fee_rate theo ngưỡng 5 triệu
    const THRESHOLD = 5_000_000;
    let feeRate;
    if (transferAmountNumber < THRESHOLD) {
      feeRate = toNumber(qr.fee_rate_under) || toNumber(qr.fee_rate) || 0;
    } else {
      feeRate = toNumber(qr.fee_rate_over) || toNumber(qr.fee_rate) || 0;
    }
    const fee_amount = roundMoney((transferAmountNumber * feeRate) / 100);
    const net_amount = roundMoney(transferAmountNumber - fee_amount);
    const code = generateCode();

    const booking = await prisma.booking.create({
      data: {
        code,
        qr_id: parseInt(qr_id),
        customer_id: parseInt(customer_id),
        customer_bank_name: String(customer_bank_name).trim(),
        customer_account_number: String(customer_account_number).trim(),
        customer_account_holder: String(customer_account_holder).trim(),
        transfer_amount: transferAmountNumber,
        fee_rate: feeRate,
        fee_amount,
        net_amount,
        status: 'created'
      }
    });

    res.status(201).json({
      message: "Tạo đơn thành công",
      booking: enrichBooking(serializeBigIntAndDecimal(booking)),
      qr: { id: qr.id, qr_image: qr.qr_image },
    });
    cache.del("booking_stats");
  } catch (err) {
    console.error("Lỗi khi tạo booking:", err);
    res.status(500).json({ message: "Lỗi server khi tạo đơn" });
  }
};

// ─── Khách upload bill ────────────────────────────────────────────────────────
const submitCustomerPaid = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const customer_id = req.user.id;
    const note = req.body?.note ?? null;

    const files = req.files?.proof || [];
    if (files.length === 0)
      return res.status(400).json({ message: "Vui lòng tải ít nhất một ảnh bill" });

    const proofUrls = files.map((f) => f.path);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });

    if (Number(booking.customer_id) !== Number(customer_id))
      return res.status(403).json({ message: "Bạn không có quyền cập nhật đơn này" });
    if (booking.status !== "created")
      return res.status(400).json({ message: "Đơn không ở trạng thái cho phép cập nhật" });

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        customer_paid_proof_url: proofUrls[0],
        customer_paid_proof_urls: proofUrls,
        customer_paid_note: note ? String(note).trim() : null,
        status: 'customer_paid',
        paid_at: new Date()
      }
    });

    res.json({ message: "Đã ghi nhận khách đã chuyển tiền", booking: enrichBooking(serializeBigIntAndDecimal(updated)) });
  } catch (err) {
    console.error("Lỗi khi submit bill:", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật thanh toán" });
  }
};

// ─── Khách xem đơn của mình ───────────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const { page = 1, limit = 10, search = "", status, dateRange = "all" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      customer_id: parseInt(customer_id)
    };

    if (search) {
      where.code = { contains: search };
    }
    if (status && status !== "all") {
      where.status = status;
    }

    if (dateRange === "today") {
      const now = new Date();
      const vnOffset = 7 * 60 * 60 * 1000;
      const vnNow = new Date(now.getTime() + vnOffset);
      const vnStartOfDay = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));
      const startOfDayUtc = new Date(vnStartOfDay.getTime() - vnOffset);
      where.created_at = { gte: startOfDayUtc };
    } else if (dateRange === "7days") {
      where.created_at = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === "30days") {
      where.created_at = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: {
          qr: {
            select: { name: true, main_image: true, qr_image: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: parseInt(limit)
      })
    ]);

    const rows = bookings.map(b => {
      const bookingObj = {
        ...b,
        qr_name: b.qr?.name || null,
        qr_main_image: b.qr?.main_image || null,
        qr_image: b.qr?.qr_image || null
      };
      delete bookingObj.qr;
      return enrichBooking(serializeBigIntAndDecimal(bookingObj));
    });

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      bookings: rows,
    });
  } catch (err) {
    console.error("Lỗi khi lấy my bookings:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Khách xem chi tiết đơn ───────────────────────────────────────────────────
const getMyBookingDetail = async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        id: parseInt(req.params.id),
        customer_id: parseInt(req.user.id)
      },
      include: {
        qr: {
          select: { name: true, main_image: true, qr_image: true }
        }
      }
    });

    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn của bạn" });

    const bookingObj = {
      ...booking,
      qr_name: booking.qr?.name || null,
      qr_main_image: booking.qr?.main_image || null,
      qr_image: booking.qr?.qr_image || null
    };
    delete bookingObj.qr;

    bookingObj.proof_urls = parseJsonField(bookingObj.customer_paid_proof_urls, bookingObj.customer_paid_proof_url);
    bookingObj.admin_proof_urls = parseJsonField(bookingObj.admin_paid_proof_urls, bookingObj.admin_paid_proof_url);

    res.json(enrichBooking(serializeBigIntAndDecimal(bookingObj)));
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết đơn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Admin xem tất cả đơn ─────────────────────────────────────────────────────
const adminGetBookings = async (req, res) => {
  try {
    const { status, search = "", page = 1, limit = 10, dateRange = "all", qrName = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereSql = "WHERE 1=1";

    if (status && status !== "all") { whereSql += " AND b.status = ?"; params.push(status); }
    if (search) {
      whereSql += " AND (b.code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
      const s = `%${search}%`; params.push(s, s, s);
    }
    if (qrName) { whereSql += " AND q.name LIKE ?"; params.push(`%${qrName}%`); }
    if (dateRange === "today") whereSql += " AND DATE(CONVERT_TZ(b.created_at,'+00:00','+07:00'))=DATE(CONVERT_TZ(NOW(),'+00:00','+07:00'))";
    else if (dateRange === "7days") whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    else if (dateRange === "30days") whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    else if (dateRange === "thisMonth") whereSql += " AND MONTH(CONVERT_TZ(b.created_at,'+00:00','+07:00'))=MONTH(CONVERT_TZ(NOW(),'+00:00','+07:00')) AND YEAR(CONVERT_TZ(b.created_at,'+00:00','+07:00'))=YEAR(CONVERT_TZ(NOW(),'+00:00','+07:00'))";

    const statsRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total,
        COUNT(CASE WHEN b.status='created' THEN 1 END) as pending,
        COUNT(CASE WHEN b.status='customer_paid' THEN 1 END) as processing,
        COUNT(CASE WHEN b.status='confirmed' THEN 1 END) as completed,
        COUNT(CASE WHEN b.status='rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN b.status='cancelled' THEN 1 END) as cancelled,
        SUM(CASE WHEN b.status='confirmed' THEN b.transfer_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN b.status='confirmed' THEN b.fee_amount ELSE 0 END) as total_fee
       FROM bookings b LEFT JOIN users u ON u.id = b.customer_id JOIN qrs q ON q.id = b.qr_id ${whereSql}`,
      ...params
    );

    const rows = await prisma.$queryRawUnsafe(
      `SELECT b.*, q.name as qr_name, q.main_image as qr_main_image, q.qr_image,
              u.full_name as customer_name, u.email as customer_email
       FROM bookings b JOIN qrs q ON q.id = b.qr_id LEFT JOIN users u ON u.id = b.customer_id
       ${whereSql} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      ...params, parseInt(limit), offset
    );

    const stats = serializeBigIntAndDecimal(statsRows[0]);
    const cleanRows = serializeBigIntAndDecimal(rows);

    res.json({
      stats,
      total: stats.total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(stats.total / parseInt(limit)),
      data: cleanRows.map(enrichBooking),
    });
  } catch (err) {
    console.error("Lỗi adminGetBookings:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Admin xem chi tiết đơn ───────────────────────────────────────────────────
const adminGetBookingDetail = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        qr: {
          select: { name: true, main_image: true, qr_image: true }
        },
        customer: {
          select: { full_name: true, email: true }
        }
      }
    });

    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });

    const bookingObj = {
      ...booking,
      qr_name: booking.qr?.name || null,
      qr_main_image: booking.qr?.main_image || null,
      qr_image: booking.qr?.qr_image || null,
      customer_name: booking.customer?.full_name || null,
      customer_email: booking.customer?.email || null,
    };
    delete bookingObj.qr;
    delete bookingObj.customer;

    bookingObj.proof_urls = parseJsonField(bookingObj.customer_paid_proof_urls, bookingObj.customer_paid_proof_url);
    bookingObj.admin_proof_urls = parseJsonField(bookingObj.admin_paid_proof_urls, bookingObj.admin_paid_proof_url);

    res.json(enrichBooking(serializeBigIntAndDecimal(bookingObj)));
  } catch (err) {
    console.error("Lỗi adminGetBookingDetail:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Admin xác nhận đơn ───────────────────────────────────────────────────────
const adminConfirmBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const files = req.files || [];
    if (files.length === 0)
      return res.status(400).json({ message: "Vui lòng tải ít nhất một ảnh bill xác nhận" });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });
    if (booking.status !== "customer_paid")
      return res.status(400).json({ message: "Đơn chưa ở trạng thái khách đã chuyển tiền" });

    const proofUrls = files.map((f) => f.path);
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'confirmed',
        admin_paid_proof_url: proofUrls[0],
        admin_paid_proof_urls: proofUrls,
        admin_paid_at: new Date(),
        confirmed_at: new Date()
      }
    });

    res.json({ message: "Xác nhận đơn thành công", booking: enrichBooking(serializeBigIntAndDecimal(updated)) });
    cache.del("booking_stats");
  } catch (err) {
    console.error("Lỗi adminConfirmBooking:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Admin từ chối đơn ────────────────────────────────────────────────────────
const adminRejectBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const rejectNote = String(req.body?.note || "").trim();
    if (!rejectNote) return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true }
    });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });
    if (booking.status !== "customer_paid")
      return res.status(400).json({ message: "Chỉ được từ chối đơn ở trạng thái khách đã chuyển tiền" });

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'rejected',
        reject_note: rejectNote,
        confirmed_at: new Date()
      }
    });

    res.json({ message: "Đã từ chối đơn", booking: enrichBooking(serializeBigIntAndDecimal(updated)) });
    cache.del("booking_stats");
  } catch (err) {
    console.error("Lỗi adminRejectBooking:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Thống kê cho admin ───────────────────────────────────────────────────────
const getAdminStats = async (req, res) => {
  try {
    const { dateRange = "all", search = "", status, qrName = "" } = req.query;
    const cacheKey = `admin_stats_${dateRange}_${search}_${status}_${qrName}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let whereSql = "WHERE 1=1";
    const params = [];

    if (search) {
      whereSql += " AND (b.code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
      const s = `%${search}%`; params.push(s, s, s);
    }
    if (qrName) { whereSql += " AND q.name LIKE ?"; params.push(`%${qrName}%`); }
    if (status && status !== "all") { whereSql += " AND b.status = ?"; params.push(status); }
    if (dateRange === "today") whereSql += " AND DATE(CONVERT_TZ(b.created_at,'+00:00','+07:00'))=DATE(CONVERT_TZ(NOW(),'+00:00','+07:00'))";
    else if (dateRange === "7days") whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    else if (dateRange === "30days") whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    else if (dateRange === "thisMonth") whereSql += " AND MONTH(CONVERT_TZ(b.created_at,'+00:00','+07:00'))=MONTH(CONVERT_TZ(NOW(),'+00:00','+07:00')) AND YEAR(CONVERT_TZ(b.created_at,'+00:00','+07:00'))=YEAR(CONVERT_TZ(NOW(),'+00:00','+07:00'))";

    const statsRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total,
        COUNT(CASE WHEN b.status='created' THEN 1 END) as pending,
        COUNT(CASE WHEN b.status='customer_paid' THEN 1 END) as processing,
        COUNT(CASE WHEN b.status='confirmed' THEN 1 END) as completed,
        COUNT(CASE WHEN b.status='rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN b.status='cancelled' THEN 1 END) as cancelled,
        SUM(CASE WHEN b.status='confirmed' THEN b.transfer_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN b.status='confirmed' THEN b.fee_amount ELSE 0 END) as total_fee
       FROM bookings b LEFT JOIN users u ON u.id = b.customer_id JOIN qrs q ON q.id = b.qr_id ${whereSql}`,
      ...params
    );

    const stats = serializeBigIntAndDecimal(statsRows[0]);

    cache.set(cacheKey, stats, 5000);
    res.json(stats);
  } catch (err) {
    console.error("Lỗi getAdminStats:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  createBooking,
  submitCustomerPaid,
  getMyBookings,
  getMyBookingDetail,
  adminGetBookings,
  adminGetBookingDetail,
  adminConfirmBooking,
  adminRejectBooking,
  getAdminStats,
};
