const crypto = require("crypto");
const pool = require("../config/db").pool;
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

    const [qrRows] = await pool.query(
      "SELECT id, status, max_amount_per_trans, daily_limit, fee_rate, qr_image, name FROM qrs WHERE id = ? LIMIT 1",
      [qr_id]
    );
    if (qrRows.length === 0) return res.status(404).json({ message: "Không tìm thấy QR" });
    const qr = qrRows[0];
    if (qr.status !== "ready") return res.status(400).json({ message: "QR đang bảo trì" });

    const maxAmount = toNumber(qr.max_amount_per_trans);
    if (Number.isFinite(maxAmount) && transferAmountNumber > maxAmount)
      return res.status(400).json({ message: "Số tiền vượt quá hạn mức của thẻ QR" });

    if (qr.daily_limit) {
      const dailyLimit = toNumber(qr.daily_limit);
      if (Number.isFinite(dailyLimit) && dailyLimit > 0) {
        const [dailyUsage] = await pool.query(
          `SELECT COALESCE(SUM(transfer_amount), 0) as used
           FROM bookings
           WHERE qr_id = ? AND status IN ('customer_paid','confirmed')
           AND DATE(CONVERT_TZ(created_at,'+00:00','+07:00')) = DATE(CONVERT_TZ(NOW(),'+00:00','+07:00'))`,
          [qr_id]
        );
        if ((toNumber(dailyUsage[0].used) || 0) + transferAmountNumber > dailyLimit)
          return res.status(400).json({ message: "QR đã đạt hạn mức giao dịch trong ngày" });
      }
    }

    const feeRate = toNumber(qr.fee_rate) || 0;
    const fee_amount = roundMoney((transferAmountNumber * feeRate) / 100);
    const net_amount = roundMoney(transferAmountNumber - fee_amount);
    const code = generateCode();

    const [result] = await pool.query(
      `INSERT INTO bookings (
        code, qr_id, customer_id,
        customer_bank_name, customer_account_number, customer_account_holder,
        transfer_amount, fee_rate, fee_amount, net_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
      [code, qr_id, customer_id,
        String(customer_bank_name).trim(), String(customer_account_number).trim(), String(customer_account_holder).trim(),
        transferAmountNumber, feeRate, fee_amount, net_amount]
    );

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [result.insertId]);
    res.status(201).json({
      message: "Tạo đơn thành công",
      booking: enrichBooking(rows[0]),
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
    const bookingId = req.params.id;
    const customer_id = req.user.id;
    const note = req.body?.note ?? null;

    const files = req.files?.proof || [];
    if (files.length === 0)
      return res.status(400).json({ message: "Vui lòng tải ít nhất một ảnh bill" });

    const proofUrls = files.map((f) => f.path);
    const proofUrlsJson = JSON.stringify(proofUrls);

    const [existingRows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    if (existingRows.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn" });
    const booking = existingRows[0];

    if (Number(booking.customer_id) !== Number(customer_id))
      return res.status(403).json({ message: "Bạn không có quyền cập nhật đơn này" });
    if (booking.status !== "created")
      return res.status(400).json({ message: "Đơn không ở trạng thái cho phép cập nhật" });

    await pool.query(
      `UPDATE bookings
       SET customer_paid_proof_url = ?, customer_paid_proof_urls = ?, customer_paid_note = ?,
           status = 'customer_paid', paid_at = NOW()
       WHERE id = ?`,
      [proofUrls[0], proofUrlsJson, note ? String(note).trim() : null, bookingId]
    );

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    res.json({ message: "Đã ghi nhận khách đã chuyển tiền", booking: enrichBooking(rows[0]) });
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
    const offset = (page - 1) * limit;

    let whereSql = "WHERE b.customer_id = ?";
    const params = [customer_id];

    if (search) { whereSql += " AND b.code LIKE ?"; params.push(`%${search}%`); }
    if (status && status !== "all") { whereSql += " AND b.status = ?"; params.push(status); }
    if (dateRange === "today") whereSql += " AND DATE(CONVERT_TZ(b.created_at,'+00:00','+07:00'))=DATE(CONVERT_TZ(NOW(),'+00:00','+07:00'))";
    else if (dateRange === "7days") whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    else if (dateRange === "30days") whereSql += " AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as total FROM bookings b JOIN qrs q ON q.id = b.qr_id ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT b.*, q.name as qr_name, q.main_image as qr_main_image, q.qr_image
       FROM bookings b JOIN qrs q ON q.id = b.qr_id
       ${whereSql} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      total: totalRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalRows[0].total / limit),
      bookings: rows.map(enrichBooking),
    });
  } catch (err) {
    console.error("Lỗi khi lấy my bookings:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Khách xem chi tiết đơn ───────────────────────────────────────────────────
const getMyBookingDetail = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, q.name as qr_name, q.main_image as qr_main_image, q.qr_image
       FROM bookings b JOIN qrs q ON q.id = b.qr_id
       WHERE b.id = ? AND b.customer_id = ? LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn của bạn" });

    const booking = rows[0];
    booking.proof_urls = parseJsonField(booking.customer_paid_proof_urls, booking.customer_paid_proof_url);
    booking.admin_proof_urls = parseJsonField(booking.admin_paid_proof_urls, booking.admin_paid_proof_url);
    res.json(enrichBooking(booking));
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

    const [statsRows] = await pool.query(
      `SELECT COUNT(*) as total,
        COUNT(CASE WHEN b.status='created' THEN 1 END) as pending,
        COUNT(CASE WHEN b.status='customer_paid' THEN 1 END) as processing,
        COUNT(CASE WHEN b.status='confirmed' THEN 1 END) as completed,
        COUNT(CASE WHEN b.status='rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN b.status='cancelled' THEN 1 END) as cancelled,
        SUM(CASE WHEN b.status='confirmed' THEN b.transfer_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN b.status='confirmed' THEN b.fee_amount ELSE 0 END) as total_fee
       FROM bookings b LEFT JOIN users u ON u.id = b.customer_id JOIN qrs q ON q.id = b.qr_id ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT b.*, q.name as qr_name, q.main_image as qr_main_image, q.qr_image,
              u.full_name as customer_name, u.email as customer_email
       FROM bookings b JOIN qrs q ON q.id = b.qr_id LEFT JOIN users u ON u.id = b.customer_id
       ${whereSql} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      stats: statsRows[0],
      total: statsRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(statsRows[0].total / parseInt(limit)),
      data: rows.map(enrichBooking),
    });
  } catch (err) {
    console.error("Lỗi adminGetBookings:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Admin xem chi tiết đơn ───────────────────────────────────────────────────
const adminGetBookingDetail = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, q.name as qr_name, q.main_image as qr_main_image, q.qr_image,
              u.full_name as customer_name, u.email as customer_email
       FROM bookings b JOIN qrs q ON q.id = b.qr_id LEFT JOIN users u ON u.id = b.customer_id
       WHERE b.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn" });

    const booking = rows[0];
    booking.proof_urls = parseJsonField(booking.customer_paid_proof_urls, booking.customer_paid_proof_url);
    booking.admin_proof_urls = parseJsonField(booking.admin_paid_proof_urls, booking.admin_paid_proof_url);
    res.json(enrichBooking(booking));
  } catch (err) {
    console.error("Lỗi adminGetBookingDetail:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Admin xác nhận đơn ───────────────────────────────────────────────────────
const adminConfirmBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const files = req.files || [];
    if (files.length === 0)
      return res.status(400).json({ message: "Vui lòng tải ít nhất một ảnh bill xác nhận" });

    const [existingRows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    if (existingRows.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn" });
    if (existingRows[0].status !== "customer_paid")
      return res.status(400).json({ message: "Đơn chưa ở trạng thái khách đã chuyển tiền" });

    const proofUrls = files.map((f) => f.path);
    await pool.query(
      `UPDATE bookings SET status='confirmed', admin_paid_proof_url=?, admin_paid_proof_urls=?, admin_paid_at=NOW(), confirmed_at=NOW() WHERE id=?`,
      [proofUrls[0], JSON.stringify(proofUrls), bookingId]
    );

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    res.json({ message: "Xác nhận đơn thành công", booking: enrichBooking(rows[0]) });
    cache.del("booking_stats");
  } catch (err) {
    console.error("Lỗi adminConfirmBooking:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Admin từ chối đơn ────────────────────────────────────────────────────────
const adminRejectBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const rejectNote = String(req.body?.note || "").trim();
    if (!rejectNote) return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });

    const [existingRows] = await pool.query("SELECT status FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    if (existingRows.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn" });
    if (existingRows[0].status !== "customer_paid")
      return res.status(400).json({ message: "Chỉ được từ chối đơn ở trạng thái khách đã chuyển tiền" });

    await pool.query(
      `UPDATE bookings SET status='rejected', reject_note=?, confirmed_at=NOW() WHERE id=?`,
      [rejectNote, bookingId]
    );

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
    res.json({ message: "Đã từ chối đơn", booking: enrichBooking(rows[0]) });
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

    const [rows] = await pool.query(
      `SELECT COUNT(*) as total,
        COUNT(CASE WHEN b.status='created' THEN 1 END) as pending,
        COUNT(CASE WHEN b.status='customer_paid' THEN 1 END) as processing,
        COUNT(CASE WHEN b.status='confirmed' THEN 1 END) as completed,
        COUNT(CASE WHEN b.status='rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN b.status='cancelled' THEN 1 END) as cancelled,
        SUM(CASE WHEN b.status='confirmed' THEN b.transfer_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN b.status='confirmed' THEN b.fee_amount ELSE 0 END) as total_fee
       FROM bookings b LEFT JOIN users u ON u.id = b.customer_id JOIN qrs q ON q.id = b.qr_id ${whereSql}`,
      params
    );

    cache.set(cacheKey, rows[0], 5000);
    res.json(rows[0]);
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
