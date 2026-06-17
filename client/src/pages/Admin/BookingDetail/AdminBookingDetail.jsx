import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import './AdminBookingDetail.scss';

const formatMoney = (value) => {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('vi-VN') + ' VNĐ';
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const statusLabel = (status) => {
  const map = {
    created: 'Chờ thanh toán',
    customer_paid: 'Đang xử lý',
    confirmed: 'Hoàn thành',
    rejected: 'Từ chối',
    cancelled: 'Đã hủy',
  };
  const cls = status;
  return <span className={`status-text ${cls}`}>{map[status] || status}</span>;
};

const shortCode = (code) => String(code || '').slice(-6);

const AdminBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [proofFiles, setProofFiles] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, note: '' });

  const fetchDetail = async () => {
    const res = await api.get(`/bookings/admin/${id}`);
    setBooking(res.data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/bookings/admin/${id}`);
        if (active) setBooking(res.data);
      } catch {
        if (active) navigate('/admin/bookings');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, navigate]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const updated = [...proofFiles, ...newFiles].slice(0, 3);
    setProofFiles(updated);
    Promise.all(
      updated.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      }))
    ).then(setProofPreviews);
  };

  const removeProof = (index) => {
    const f = [...proofFiles]; f.splice(index, 1); setProofFiles(f);
    const p = [...proofPreviews]; p.splice(index, 1); setProofPreviews(p);
  };

  const handleConfirm = async () => {
    if (proofFiles.length === 0) {
      toast.error('Vui lòng tải ít nhất một ảnh bill xác nhận');
      return;
    }
    setUpdating(true);
    try {
      const formData = new FormData();
      proofFiles.forEach(f => formData.append('proof', f));
      await api.patch(`/bookings/admin/${id}/confirm`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Xác nhận đơn hàng thành công');
      setProofFiles([]);
      setProofPreviews([]);
      await fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xác nhận đơn');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.note.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setUpdating(true);
    try {
      await api.patch(`/bookings/admin/${id}/reject`, { note: rejectModal.note.trim() });
      toast.success('Đã từ chối đơn hàng');
      setRejectModal({ isOpen: false, note: '' });
      await fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối đơn');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="booking-detail-loading">Đang tải dữ liệu đơn hàng...</div>;
  if (!booking) return <div className="booking-detail-loading">Không tìm thấy đơn</div>;

  return (
    <div className="admin-booking-detail-page">
      <div className="booking-detail-top">
        <button type="button" className="back-btn" onClick={() => navigate('/admin/bookings')}>
          ← Quay lại danh sách
        </button>
        <h1>Chi tiết đơn #{shortCode(booking.code)}</h1>
      </div>

      <table className="detail-table">
        <tbody>
          <tr><th>ID đơn</th><td>{booking.id}</td></tr>
          <tr><th>Mã đơn</th><td className="mono">{shortCode(booking.code)}</td></tr>
          <tr><th>Tên QR</th><td>{booking.qr_name || '—'}</td></tr>
          <tr><th>Khách hàng</th><td>{booking.customer_name || '—'} ({booking.customer_email || '—'})</td></tr>
          <tr><th>Ngân hàng khách</th><td>{booking.customer_bank_name || '—'}</td></tr>
          <tr><th>Số tài khoản khách</th><td className="mono">{booking.customer_account_number || '—'}</td></tr>
          <tr><th>Tên chính chủ</th><td>{booking.customer_account_holder || '—'}</td></tr>
          <tr><th>Tiền khách chuyển</th><td><strong>{formatMoney(booking.transfer_amount)}</strong></td></tr>
          <tr><th>Phí (%)</th><td>{booking.fee_rate}% → {formatMoney(booking.fee_amount)}</td></tr>
          <tr><th>Khách thực nhận</th><td style={{ color: '#2563eb', fontWeight: 700 }}>{formatMoney(booking.net_amount)}</td></tr>
          <tr><th>Ghi chú khách</th><td>{booking.customer_paid_note || '—'}</td></tr>
          <tr><th>Lý do từ chối</th><td>{booking.reject_note || '—'}</td></tr>
          <tr><th>Tạo lúc</th><td>{formatDateTime(booking.created_at)}</td></tr>
          <tr><th>Khách thanh toán lúc</th><td>{formatDateTime(booking.paid_at)}</td></tr>
          <tr><th>Xác nhận lúc</th><td>{formatDateTime(booking.confirmed_at)}</td></tr>
          <tr><th>Trạng thái</th><td>{statusLabel(booking.status)}</td></tr>

          {/* Bill khách gửi */}
          <tr>
            <th>Bill khách gửi</th>
            <td>
              <div className="proof-images-grid">
                {booking.proof_urls?.length > 0
                  ? booking.proof_urls.map((url, idx) => (
                      <div key={idx} className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(url)}>
                        <img src={url} alt={`Bill ${idx + 1}`} className="proof-thumb" />
                        <span className="thumb-label">Bill {idx + 1}</span>
                      </div>
                    ))
                  : '—'}
              </div>
            </td>
          </tr>

          {/* Bill admin */}
          {booking.admin_proof_urls?.length > 0 && (
            <tr>
              <th>Bill admin xác nhận</th>
              <td>
                <div className="proof-images-grid">
                  {booking.admin_proof_urls.map((url, idx) => (
                    <div key={idx} className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`Admin bill ${idx + 1}`} className="proof-thumb" />
                      <span className="thumb-label">Admin bill {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )}

          {booking.admin_paid_at && (
            <tr><th>Admin xác nhận lúc</th><td>{formatDateTime(booking.admin_paid_at)}</td></tr>
          )}
        </tbody>
      </table>

      {/* Upload bill xác nhận (chỉ khi status = customer_paid) */}
      {booking.status === 'customer_paid' && (
        <div className="staff-upload-section">
          <h3>Xác nhận & Upload bill (tối đa 3 ảnh)</h3>

          <div className="staff-upload-grid">
            {proofPreviews.map((preview, idx) => (
              <div key={idx} className="staff-proof-preview-container">
                <img src={preview} alt={`Preview ${idx}`} className="staff-proof-preview-img" />
                <button type="button" className="remove-staff-proof-btn" onClick={() => removeProof(idx)}>×</button>
              </div>
            ))}
            {proofPreviews.length < 3 && (
              <label className="staff-file-upload-box">
                <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                <div className="upload-placeholder">
                  <span className="plus">+</span>
                  <span>Thêm ảnh</span>
                </div>
              </label>
            )}
          </div>

          <div className="detail-actions">
            <button
              className="confirm-btn"
              onClick={handleConfirm}
              disabled={updating || proofFiles.length === 0}
            >
              {updating ? 'Đang xử lý...' : 'Xác nhận hoàn thành'}
            </button>
            <button
              className="reject-btn"
              onClick={() => setRejectModal({ isOpen: true, note: '' })}
              disabled={updating}
            >
              Từ chối đơn
            </button>
          </div>
        </div>
      )}

      {/* Image preview */}
      {previewImageUrl && (
        <div className="image-preview-overlay" onClick={() => setPreviewImageUrl(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="image-preview-close" onClick={() => setPreviewImageUrl(null)}>×</button>
            <img src={previewImageUrl} alt="Preview" className="image-preview-img" />
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-content reject-modal">
            <h3>Từ chối đơn hàng</h3>
            <p>Vui lòng nhập lý do từ chối:</p>
            <textarea
              className="reject-textarea"
              placeholder="Nhập lý do tại đây..."
              value={rejectModal.note}
              onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
              autoFocus
            />
            <div className="confirm-modal-actions">
              <button className="cancel-btn" onClick={() => setRejectModal({ isOpen: false, note: '' })} disabled={updating}>Hủy</button>
              <button className="confirm-btn-final no" onClick={handleReject} disabled={updating || !rejectModal.note.trim()}>
                {updating ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingDetail;
