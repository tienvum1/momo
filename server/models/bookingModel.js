// Định nghĩa cấu trúc các trường cho bảng bookings
const bookingFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  code: 'VARCHAR(40) NOT NULL UNIQUE', // Mã đơn duy nhất
  qr_id: 'INT NOT NULL', // FK tới qrs
  customer_id: 'INT NOT NULL', // FK tới users (khách tạo đơn)

  // Thông tin ngân hàng khách
  customer_bank_name: 'VARCHAR(120) NOT NULL', // Tên ngân hàng khách chuyển
  customer_account_number: 'VARCHAR(60) NOT NULL', // Số tài khoản khách chuyển
  customer_account_holder: 'VARCHAR(255) NOT NULL', // Tên chính chủ


  // Tài chính
  transfer_amount: 'DECIMAL(15, 2) NOT NULL', // Tiền khách chuyển
  fee_rate: 'DECIMAL(5, 2) NOT NULL', // Tỷ lệ phí (%) áp dụng cho khách
  fee_amount: 'DECIMAL(15, 2) NOT NULL', // Tiền phí
  net_amount: 'DECIMAL(15, 2) NOT NULL', // Thực nhận (transfer_amount - fee_amount)

  // Chứng từ khách gửi khi xác nhận đã chuyển tiền
  customer_paid_proof_url: 'VARCHAR(255) NULL', // Ảnh bill đầu tiên (legacy)
  customer_paid_proof_urls: 'JSON NULL', // Danh sách ảnh bill (tối đa 3)
  customer_paid_note: 'TEXT NULL', // Ghi chú khi upload bill

  // Chứng từ admin xác nhận hoàn thành
  admin_paid_proof_url: 'VARCHAR(255) NULL', // Ảnh bill admin (legacy)
  admin_paid_proof_urls: 'JSON NULL', // Danh sách ảnh bill admin
  admin_paid_at: 'TIMESTAMP NULL', // Thời gian admin xác nhận

  // Trạng thái & xác nhận
  status: "ENUM('created', 'customer_paid', 'confirmed', 'rejected', 'cancelled') NOT NULL DEFAULT 'created'",
  reject_note: 'TEXT NULL', // Lý do từ chối

  // Timestamps
  paid_at: 'TIMESTAMP NULL', // Thời điểm khách xác nhận đã chuyển
  confirmed_at: 'TIMESTAMP NULL', // Thời điểm admin xác nhận hoàn thành
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

module.exports = bookingFields;
