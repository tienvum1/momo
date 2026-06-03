## [OPEN] telegram-bill-photo

### Triệu chứng
- Khách đã upload bill nhưng thông báo Telegram không gửi kèm ảnh bill.

### Kỳ vọng
- Khi khách nộp bill, Telegram nhận được ảnh bill upload kèm caption thông báo.

### Giả thuyết
1. `mainProofUrl` không có giá trị hợp lệ tại thời điểm gọi Telegram.
2. Telegram `sendPhoto` bị lỗi do URL ảnh bill không public hoặc Telegram không tải được URL đó.
3. Có route/luồng khác đang chạy khi khách nộp bill, không đi qua đoạn code vừa sửa.
4. Telegram nhận request nhưng reject do payload caption/parse mode khi dùng `sendPhoto`.
5. Request gửi ảnh đang lỗi trong util Telegram nhưng bị fallback sang text nên nhìn như "không gửi ảnh".

### Kế hoạch
- Thêm instrumentation log ở điểm lấy bill URL, điểm gọi Telegram, và kết quả response/error từ Telegram.
- Reproduce lại thao tác upload bill.
- Đối chiếu log để xác nhận giả thuyết đúng.
