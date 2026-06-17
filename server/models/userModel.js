// Định nghĩa cấu trúc các trường cho bảng users
const userFields = {
  id: 'INT AUTO_INCREMENT PRIMARY KEY',
  username: 'VARCHAR(255) NOT NULL UNIQUE',
  email: 'VARCHAR(255)', // Email có thể NULL nếu dùng đăng ký thông thường
  password: 'VARCHAR(255)', // Password có thể NULL nếu dùng Google Login
  full_name: 'VARCHAR(255)',
  role: "ENUM('admin_system', 'user') DEFAULT 'user'",
  level: 'TINYINT DEFAULT 1', // Cấp độ người dùng (1, 2, 3, 4)
  status: "ENUM('active', 'locked') DEFAULT 'active'",
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
};

module.exports = userFields;
