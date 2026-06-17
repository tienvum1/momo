import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Clock, Copy, CheckCircle2, Camera, Lock, AlertTriangle, X, ShieldCheck, Zap, Headphones, Building2 } from 'lucide-react';
import api from '../../api/axios';
import './BookingPayment.scss';

const BookingPayment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [copied, setCopied] = useState(false);

  const fmt = (v) => {
    let val = v;
    if (val && typeof val === 'object' && typeof val.toNumber === 'function') val = val.toNumber();
    const n = Math.round(parseFloat(val) || 0);
    return n.toLocaleString('vi-VN') + 'đ';
  };

  const shortCode = (code) => String(code || '').slice(-6);

  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
    if (typeof v === 'number') return v;
    return parseFloat(String(v)) || 0;
  };

  useEffect(() => {
    let active = true;
    api.get(`/bookings/my/${bookingId}`)
      .then((res) => {
        if (!active) return;
        const d = res.data;
        d.transfer_amount = toNum(d.transfer_amount);
        d.fee_rate        = toNum(d.fee_rate);
        d.fee_amount      = toNum(d.fee_amount);
        d.net_amount      = toNum(d.net_amount);
        setBooking(d);
        setQr({ qr_image: d.qr_image, name: d.qr_name });
      })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Không thể tải thông tin'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId]);

  useEffect(() => {
    if (!booking || booking.status !== 'created' || !booking.server_time || !booking.expires_at) return;
    const offset = Date.now() - new Date(booking.server_time).getTime();
    const tick = () => {
      const diff = new Date(booking.expires_at).getTime() + offset - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        if (booking.status === 'created') api.patch(`/bookings/${booking.id}/cancel`).catch(() => {});
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [booking]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const merged = [...proofFiles, ...files].slice(0, 5);
    setProofFiles(merged);
    const previews = [];
    let done = 0;
    merged.forEach((f) => {
      const r = new FileReader();
      r.onloadend = () => { previews.push(r.result); if (++done === merged.length) setProofPreviews([...previews]); };
      r.readAsDataURL(f);
    });
  };

  const removeProof = (i) => {
    setProofFiles(proofFiles.filter((_, idx) => idx !== i));
    setProofPreviews(proofPreviews.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    if (!booking || booking.status !== 'created') return;
    if (timeLeft === 0) { setError('Đơn đã hết hạn.'); return; }
    if (!proofFiles.length) { setError('Vui lòng tải ít nhất một ảnh biên lai'); return; }
    setError('');
    setSubmitting(true);
    const form = new FormData();
    proofFiles.forEach((f) => form.append('proof', f));
    if (paymentNote.trim()) form.append('note', paymentNote.trim());
    api.post(`/bookings/${booking.id}/customer-paid`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => navigate(`/my-bookings/${booking.id}`))
      .catch((err) => setError(err.response?.data?.message || 'Lỗi khi xác nhận'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="bp-loading">Đang tải...</div>;
  if (error && !booking) return <div className="bp-error-page"><p>{error}</p><Link to="/">← Trang chủ</Link></div>;
  if (!booking || !qr) return <div className="bp-loading">Không tìm thấy đơn hàng</div>;

  const isExpired = timeLeft === 0;
  const canSubmit = !submitting && booking.status === 'created' && !isExpired;

  return (
    <div className="bp-page">
      {/* Topbar */}
      <div className="bp-topbar">
        <Link to="/" className="bp-back">← Quay lại</Link>
        <h1 className="bp-title">Thanh toán đơn {shortCode(booking.code)}</h1>
      </div>

      <div className="bp-grid">
        {/* ── LEFT: QR panel ── */}
        <div className="bp-left">
          <div className="bp-qr-card">
            {/* Header */}
            <div className="bp-qr-header">
              <div>
                <div className="bp-qr-title">Quét mã để chuyển tiền</div>
              </div>
            </div>

            {/* QR image */}
            <div className="bp-qr-img-wrap">
              {qr.qr_image
                ? <img src={qr.qr_image} alt="QR" className="bp-qr-img" />
                : <div className="bp-qr-placeholder">Không có ảnh QR</div>
              }
            </div>

            {/* Countdown */}
            {timeLeft !== null && (
              <div className={`bp-countdown ${isExpired ? 'expired' : ''}`}>
                {isExpired ? <span>Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.</span> : (
                  <><span>Thanh toán trong</span><strong>{timeLeft}</strong></>
                )}
              </div>
            )}

            {/* Order detail */}
            <div className="bp-order-detail">
              <div className="bp-detail-title">Chi tiết đơn hàng</div>
              <div className="bp-detail-row">
                <span>Mã đơn hàng</span>
                <span className="bp-code-cell">
                  {shortCode(booking.code)}
                  <button className="bp-copy-btn" onClick={() => { navigator.clipboard.writeText(shortCode(booking.code)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    {copied ? <CheckCircle2 size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                </span>
              </div>
              <div className="bp-detail-row">
                <span>Số tiền cần chuyển</span>
                <span className="bp-amount-highlight">{fmt(booking.transfer_amount)}</span>
              </div>
              <div className="bp-detail-row">
                <span>Phí giao dịch</span>
                <div className="bp-fee-cell">
                  <span className="bp-fee-badge">{booking.fee_rate}%</span>
                  <span className="bp-fee-val">{fmt(booking.fee_amount)}</span>
                </div>
              </div>
              <div className="bp-detail-row net-row">
                <span>Bạn sẽ nhận được</span>
                <span className="bp-net-value">{fmt(booking.net_amount)}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="bp-badges">
              <div className="bp-badge"><ShieldCheck size={18} /><span>An toàn<br/>bảo mật</span></div>
              <div className="bp-badge"><Zap size={18} /><span>Nhận tiền<br/>tức thì</span></div>
              <div className="bp-badge"><Headphones size={18} /><span>Hỗ trợ<br/>24/7</span></div>
              <div className="bp-badge"><Building2 size={18} /><span>Được bảo trợ bởi<br/>ngân hàng</span></div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Upload panel ── */}
        <div className="bp-right">
          <div className="bp-upload-card">
            <h2 className="bp-upload-title">Xác nhận thanh toán</h2>
            <p className="bp-upload-sub">Sau khi chuyển khoản thành công, vui lòng tải lên ảnh giao dịch để chúng tôi xác nhận.</p>

            {/* Upload */}
            <div className="bp-field">
              <label className="bp-field-label">Ảnh biên lai / ảnh chụp màn hình</label>
              {proofPreviews.length === 0 ? (
                <label className="bp-upload-zone">
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} disabled={!canSubmit} />
                  <div className="bp-upload-zone-content">
                    <div className="bp-upload-icon-wrap">
                      <Camera size={36} />
                    </div>
                    <span className="bp-upload-cta">Tải ảnh lên</span>
                    <span className="bp-upload-hint">Hỗ trợ JPG, PNG · tối đa 5 ảnh</span>
                  </div>
                </label>
              ) : (
                <div className="bp-previews">
                  {proofPreviews.map((src, i) => (
                    <div key={i} className="bp-preview-item">
                      <img src={src} alt={`bill ${i + 1}`} />
                      <button type="button" className="bp-remove-btn" onClick={() => removeProof(i)}>×</button>
                    </div>
                  ))}
                  {proofFiles.length < 5 && (
                    <label className="bp-add-more">
                      <input type="file" accept="image/*" multiple onChange={handleFileChange} disabled={!canSubmit} />
                      <span>+</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Note */}
            <div className="bp-field">
              <label className="bp-field-label">Ghi chú (không bắt buộc)</label>
              <div className="bp-textarea-wrap">
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value.slice(0, 200))}
                  placeholder="Nhập ghi chú cho nhân viên..."
                  rows={3}
                  disabled={!canSubmit}
                  maxLength={200}
                />
                <span className="bp-char-count">{paymentNote.length}/200</span>
              </div>
            </div>

            {/* Warning */}
            <div className="bp-warning-box">
              <div className="bp-warning-title"><AlertTriangle size={15} /> Lưu ý quan trọng</div>
              <ul>
                <li>Vui lòng chuyển đúng số tiền và nội dung chuyển khoản (nếu có).</li>
                <li>Nội dung chuyển khoản <strong>không liên quan</strong> đến rút tiền, phí trả sau.</li>
                <li>Chỉ tải lên ảnh giao dịch thành công.</li>
                <li>Đơn hàng sẽ tự động hủy nếu không thanh toán trong thời gian quy định.</li>
              </ul>
            </div>

            {error && <div className="bp-error-msg"><X size={14} /> {error}</div>}

            <button className="bp-submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? 'Đang xử lý...' : 'Tôi đã thanh toán'}
            </button>

            <p className="bp-secure-note"><Lock size={12} /> Thông tin của bạn được bảo mật tuyệt đối</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPayment;
