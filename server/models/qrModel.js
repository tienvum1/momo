// Định nghĩa cấu trúc các trường cho bảng qrs
const qrFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  name: 'VARCHAR(255) NULL',
  main_image: 'VARCHAR(255)', // Ảnh đại diện hiển thị ở danh sách ngoài (Card)
  qr_image: 'VARCHAR(255)', // Ảnh mã QR thực tế để khách quét
  max_amount_per_trans: 'DECIMAL(15, 2) NOT NULL', // Mức tiền tối đa một lần chuyển
  daily_limit: 'DECIMAL(15, 2) NULL DEFAULT NULL', // Hạn mức tổng tiền có thể chuyển mỗi ngày
  fee_rate: 'DECIMAL(5, 2) DEFAULT 0', // Phí mặc định áp dụng cho khách
  note: 'TEXT', // Ghi chú
  status: "ENUM('ready', 'maintenance') DEFAULT 'ready'", // Trạng thái QR
  creator_id: 'INT NOT NULL', // Người tạo (FK tới users)
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

module.exports = qrFields;
