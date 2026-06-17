const pool = require("../config/db").pool;

const getRevenueStats = async (req, res) => {
  try {
    const { type, month, year, day } = req.query;

    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const currentYear = year ? parseInt(year) : vnTime.getUTCFullYear();
    const currentMonth = month ? (month === "all" ? "all" : parseInt(month)) : vnTime.getUTCMonth() + 1;
    const currentDay = day ? (day === "all" ? "all" : parseInt(day)) : "all";

    const dateStr =
      currentMonth !== "all" && currentDay !== "all"
        ? `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`
        : null;
    const monthStr =
      currentMonth === "all" ? null : `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    const yearStr = `${currentYear}`;

    let dateFormat = "%Y-%m-%d";
    let currentFilter = "";
    if (currentMonth === "all") {
      currentFilter = `YEAR(CONVERT_TZ(b.created_at,'+00:00','+07:00'))='${yearStr}'`;
    } else if (currentDay === "all") {
      currentFilter = `DATE_FORMAT(CONVERT_TZ(b.created_at,'+00:00','+07:00'),'%Y-%m')='${monthStr}'`;
    } else {
      currentFilter = `DATE(CONVERT_TZ(b.created_at,'+00:00','+07:00'))='${dateStr}'`;
    }

    let periodFilter = currentFilter;

    if (type === "month") {
      dateFormat = "%Y-%m";
      periodFilter =
        currentMonth === "all"
          ? `YEAR(CONVERT_TZ(b.created_at,'+00:00','+07:00'))='${yearStr}'`
          : `DATE_FORMAT(CONVERT_TZ(b.created_at,'+00:00','+07:00'),'%Y-%m')='${monthStr}'`;
    } else if (type === "year") {
      dateFormat = "%Y";
      currentFilter = `YEAR(CONVERT_TZ(b.created_at,'+00:00','+07:00'))='${yearStr}'`;
      periodFilter = "1=1";
    }

    const completedStatus = `b.status = 'confirmed'`;

    const financeFields = `
      SUM(CASE WHEN ${completedStatus} THEN b.transfer_amount ELSE 0 END) as total_amount,
      SUM(CASE WHEN ${completedStatus} THEN b.fee_amount ELSE 0 END) as total_fee,
      COUNT(*) as total_count,
      SUM(CASE WHEN ${completedStatus} THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN b.status='rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN b.status='cancelled' THEN 1 ELSE 0 END) as cancelled_count,
      SUM(CASE WHEN b.status IN ('created','customer_paid') THEN 1 ELSE 0 END) as processing_count
    `;

    // Summary — kỳ hiện tại
    const [summaryRows] = await pool.query(
      `SELECT
        SUM(CASE WHEN ${completedStatus} THEN b.transfer_amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN ${completedStatus} THEN b.fee_amount ELSE 0 END) as total_fee,
        SUM(CASE WHEN ${completedStatus} THEN 1 ELSE 0 END) as completed_count
       FROM bookings b
       WHERE ${currentFilter}`
    );
    const summary = summaryRows[0] || { total_amount: 0, total_fee: 0, completed_count: 0 };

    // Theo thời gian
    const [byTime] = await pool.query(
      `SELECT DATE_FORMAT(CONVERT_TZ(b.created_at,'+00:00','+07:00'),?) as label, ${financeFields}
       FROM bookings b WHERE ${periodFilter} GROUP BY label ORDER BY label DESC`,
      [dateFormat]
    );

    // Theo QR
    const [byQr] = await pool.query(
      `SELECT DATE_FORMAT(CONVERT_TZ(b.created_at,'+00:00','+07:00'),?) as label,
              b.qr_id, q.name as qr_name, ${financeFields}
       FROM bookings b JOIN qrs q ON q.id = b.qr_id
       WHERE ${periodFilter} GROUP BY label, b.qr_id, q.name ORDER BY label DESC, total_amount DESC`,
      [dateFormat]
    );

    // Theo khách hàng
    const [byCustomer] = await pool.query(
      `SELECT DATE_FORMAT(CONVERT_TZ(b.created_at,'+00:00','+07:00'),?) as label,
              u.id as customer_id, u.full_name as customer_name, u.email as customer_email, ${financeFields}
       FROM bookings b JOIN users u ON u.id = b.customer_id
       WHERE ${periodFilter} GROUP BY label, u.id ORDER BY label DESC, total_amount DESC`,
      [dateFormat]
    );

    res.json({
      summary,
      byTime,
      byQr,
      byCustomer,
    });
  } catch (err) {
    console.error("Lỗi getRevenueStats:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { getRevenueStats };
