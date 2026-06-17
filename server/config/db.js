const mysql = require('mysql2/promise');
require('dotenv').config();
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'railway',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
});

pool.on('error', (err) => {
  console.error('Lỗi Database Pool:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    console.log('Đang thử kết nối lại với Database...');
  } else {
    throw err;
  }
});

const initDB = async () => {
  try {
    const connection = await pool.getConnection();

    // ── 1. Bảng users ─────────────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(191) NOT NULL UNIQUE,
        email VARCHAR(191) NULL UNIQUE,
        password VARCHAR(255),
        full_name VARCHAR(191),
        role ENUM('admin_system', 'user') DEFAULT 'user',
        level TINYINT DEFAULT 0,
        status ENUM('active', 'locked') DEFAULT 'active',
        is_verified TINYINT(1) DEFAULT 1,
        verification_token CHAR(64) NULL,
        reset_token CHAR(64) NULL,
        reset_token_expires TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_verification (verification_token),
        INDEX idx_reset (reset_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ── 2. Bảng qrs ───────────────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS qrs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NULL,
        main_image VARCHAR(255) NULL,
        qr_image VARCHAR(255) NULL,
        max_amount_per_trans DECIMAL(15,2) NOT NULL DEFAULT 0,
        daily_limit DECIMAL(15,2) NULL DEFAULT NULL,
        fee_rate DECIMAL(5,2) DEFAULT 0,
        note TEXT NULL,
        status ENUM('ready', 'maintenance') DEFAULT 'ready',
        creator_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ── 3. Bảng bookings ──────────────────────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        qr_id INT NOT NULL,
        customer_id INT NOT NULL,
        customer_bank_name VARCHAR(120) NOT NULL,
        customer_account_number VARCHAR(60) NOT NULL,
        customer_account_holder VARCHAR(255) NOT NULL,
        admin_bank_name VARCHAR(120) NULL,
        admin_account_number VARCHAR(60) NULL,
        admin_account_holder VARCHAR(255) NULL,
        admin_bank_qr_image VARCHAR(500) NULL,
        transfer_amount DECIMAL(15, 2) NOT NULL,
        fee_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
        fee_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
        net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
        customer_paid_proof_url VARCHAR(255) NULL,
        customer_paid_proof_urls JSON NULL,
        customer_paid_note TEXT NULL,
        admin_paid_proof_url VARCHAR(255) NULL,
        admin_paid_proof_urls JSON NULL,
        admin_paid_at TIMESTAMP NULL,
        status ENUM('created','customer_paid','confirmed','rejected','cancelled') NOT NULL DEFAULT 'created',
        reject_note TEXT NULL,
        paid_at TIMESTAMP NULL,
        confirmed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (qr_id) REFERENCES qrs(id),
        INDEX idx_booking_status (status),
        INDEX idx_booking_customer (customer_id),
        INDEX idx_booking_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ── 4. Migrations (backward compat với DB cũ) ─────────────────────────────

    // users — thêm cột username nếu chưa có
    try {
      const [uCols] = await connection.query('SHOW COLUMNS FROM users');
      const uColNames = uCols.map(c => c.Field);
      if (!uColNames.includes('username')) {
        await connection.query("ALTER TABLE users ADD COLUMN username VARCHAR(191) NULL UNIQUE AFTER id");
        // Cập nhật username = email cho các user cũ
        await connection.query("UPDATE users SET username = email WHERE username IS NULL");
        // Sau đó đặt username NOT NULL
        await connection.query("ALTER TABLE users MODIFY COLUMN username VARCHAR(191) NOT NULL UNIQUE");
      }
    } catch (err) { console.error('Lỗi migration thêm username:', err.message); }
    
    // users — đảm bảo ENUM role chỉ còn admin_system và user
    try {
      await connection.query(`ALTER TABLE users MODIFY COLUMN role ENUM('admin_system','user') DEFAULT 'user'`);
    } catch {}
    // Cập nhật user cũ có role staff/accountant thành user
    try {
      await connection.query(`UPDATE users SET role = 'user' WHERE role NOT IN ('admin_system','user')`);
    } catch {}
    // Xóa cột phone nếu còn
    try {
      const [uCols] = await connection.query('SHOW COLUMNS FROM users');
      const uColNames = uCols.map(c => c.Field);
      if (uColNames.includes('phone')) await connection.query('ALTER TABLE users DROP COLUMN phone');
    } catch {}

    // qrs — bỏ cột cũ không còn dùng
    try {
      const [qrCols] = await connection.query('SHOW COLUMNS FROM qrs');
      const qrColNames = qrCols.map(c => c.Field);
      const dropQrCols = ['fee_rate_l1','fee_rate_l2','fee_rate_l3','fee_rate_l4','base_fee_rate','accountant_editable','is_notify_telegram','card_line','image_url'];
      for (const col of dropQrCols) {
        if (qrColNames.includes(col)) {
          try { await connection.query(`ALTER TABLE qrs DROP COLUMN ${col}`); } catch {}
        }
      }
      if (!qrColNames.includes('name')) await connection.query("ALTER TABLE qrs ADD COLUMN name VARCHAR(255) NULL AFTER id");
      if (!qrColNames.includes('daily_limit')) await connection.query("ALTER TABLE qrs ADD COLUMN daily_limit DECIMAL(15,2) NULL DEFAULT NULL AFTER max_amount_per_trans");
    } catch (err) { console.error('Lỗi migration qrs:', err.message); }

    // bookings — xử lý DB cũ
    try {
      const [bCols] = await connection.query('SHOW COLUMNS FROM bookings');
      const bColNames = bCols.map(c => c.Field);

      // Đổi status cũ sang mới
      await connection.query(`UPDATE bookings SET status = 'confirmed' WHERE status IN ('staff_confirmed','completed','accountant_paid')`);

      // Sửa ENUM status
      try {
        await connection.query(`ALTER TABLE bookings MODIFY COLUMN status ENUM('created','customer_paid','confirmed','rejected','cancelled') NOT NULL DEFAULT 'created'`);
      } catch {}

      // Thêm cột admin_paid nếu chưa có
      if (!bColNames.includes('admin_paid_proof_url')) await connection.query("ALTER TABLE bookings ADD COLUMN admin_paid_proof_url VARCHAR(255) NULL");
      if (!bColNames.includes('admin_paid_proof_urls')) await connection.query("ALTER TABLE bookings ADD COLUMN admin_paid_proof_urls JSON NULL AFTER admin_paid_proof_url");
      if (!bColNames.includes('admin_paid_at')) await connection.query("ALTER TABLE bookings ADD COLUMN admin_paid_at TIMESTAMP NULL");
      if (!bColNames.includes('confirmed_at')) await connection.query("ALTER TABLE bookings ADD COLUMN confirmed_at TIMESTAMP NULL");
      if (!bColNames.includes('daily_limit')) await connection.query("ALTER TABLE qrs ADD COLUMN daily_limit DECIMAL(15,2) NULL DEFAULT NULL AFTER max_amount_per_trans");

      // Xóa cột cũ không còn dùng
      const dropBookingCols = ['staff_id','staff_paid_proof_urls','accountant_paid_proof_url','accountant_paid_proof_urls','accountant_paid_at','accountant_status','is_valid','customer_id_card_urls','customer_bank_qr_image','base_fee_rate','base_fee_amount','ncb_journal_number'];
      for (const col of dropBookingCols) {
        if (bColNames.includes(col)) {
          try { await connection.query(`ALTER TABLE bookings DROP COLUMN ${col}`); } catch {}
        }
      }
    } catch (err) { console.error('Lỗi migration bookings:', err.message); }

    console.log('Database đã sẵn sàng');
    connection.release();
  } catch (err) {
    console.error('Lỗi khởi tạo DB:', err);
  }
};

module.exports = { pool, initDB };
