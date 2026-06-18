import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Circle, ZoomIn, Download,
  ShieldCheck, Headphones, Clock, AlertCircle, Image,
  CreditCard, User, Tag, Receipt
} from 'lucide-react';
import api from '../../api/axios';
import './MyBookingDetail.scss';

// ── helpers ────────────────────────────────────────────────────────────────────
const fmt = (v) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN') + 'đ';
};
const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  const time = d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  const date = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: 'numeric', year: 'numeric' });
  return `${time} ${date}`;
};
const shortCode = (code) => String(code || '').slice(-6);

const STATUS = {
  created:       { label: 'Chờ thanh toán', cls: 'amber' },
  customer_paid: { label: 'Đang xử lý',     cls: 'amber' },
  confirmed:     { label: 'Hoàn thành',      cls: 'green' },
  rejected:      { label: 'Từ chối',         cls: 'red'   },
  cancelled:     { label: 'Đã hủy',          cls: 'gray'  },
};

// ── tiny sub-components ────────────────────────────────────────────────────────
const InfoRow = ({ label, value, mono }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className={`detail-row__value${mono ? ' mono' : ''}`}>{value}</span>
    </div>
  );
};

const Card = ({ title, icon: Icon, iconColor, children, className = '' }) => (
  <div className={`od-card ${className}`}>
    {title && (
      <div className="od-card__head">
        {Icon && <Icon size={14} color={iconColor || '#ec4899'} strokeWidth={2.5} />}
        <span>{title}</span>
      </div>
    )}
    {children}
  </div>
);

// ── main ───────────────────────────────────────────────────────────────────────
const MyBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let live = true;
    api.get(`/bookings/my/${id}`)
      .then(r => { if (live) setBooking(r.data); })
      .catch(console.error)
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

  if (loading) return (
    <div className="od-center">
      <div className="od-spinner" />
      <p>Đang tải...</p>
    </div>
  );
  if (!booking) return (
    <div className="od-center">
      <AlertCircle size={40} color="#ef4444" />
      <p>Không tìm thấy đơn hàng</p>
      <Link to="/my-bookings" className="od-link-back">← Quay lại danh sách</Link>
    </div>
  );

  const st = STATUS[booking.status] || STATUS.cancelled;
  const proofUrls      = booking.proof_urls        || [];
  const adminProofUrls = booking.admin_proof_urls   || [];

  const timeline = [
    { label: 'Tạo đơn',               time: fmtDate(booking.created_at),    done: true },
    { label: 'Khách đã chuyển tiền',  time: fmtDate(booking.paid_at),       done: !!booking.paid_at },
    { label: 'Admin xử lý',           time: fmtDate(booking.admin_paid_at), done: !!booking.admin_paid_at },
    { label: 'Kết thúc',              time: fmtDate(booking.confirmed_at),  done: !!booking.confirmed_at },
  ];

  return (
    <div className="od-page">

      {/* ── TOP HEADER ── */}
      <div className="od-header">
        <button className="od-back-btn" onClick={() => navigate('/my-bookings')}>
          <ArrowLeft size={15} />
          Quay lại
        </button>
        <h1 className="od-title">
          Chi tiết đơn <span className="od-title__code">#{shortCode(booking.code)}</span>
        </h1>
        <span className={`od-status-badge od-status-badge--${st.cls}`}>
          ● {st.label}
        </span>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="od-layout">

        {/* ════ LEFT SIDEBAR ════ */}
        <aside className="od-sidebar">

          {/* Card 1 — Recipient */}
          <Card className="od-recipient-card">
            {/* Top: logo + name */}
            <div className="od-recipient__top">
              <img src="/logo.svg" alt="Momo247" className="od-recipient__logo" />
              <div>
                <p className="od-recipient__to-label">CHUYỂN TIỀN ĐẾN</p>
                <p className="od-recipient__name">
                  {booking.customer_account_holder || '—'}
                </p>
                <p className="od-recipient__phone">
                  {booking.customer_account_number || '—'}
                </p>
              </div>
            </div>

            {/* Amount rows */}
            <div className="od-amount-rows">
              <div className="od-amount-row">
                <span>Số tiền chuyển</span>
                <span>{fmt(booking.transfer_amount)}</span>
              </div>
              <div className="od-amount-row od-amount-row--fee">
                <span>Phí dịch vụ ({Number(booking.fee_rate)}%)</span>
                <span>{fmt(booking.fee_amount)}</span>
              </div>
            </div>

            {/* Net amount */}
            <div className="od-net-row">
              <span className="od-net-row__label">Thực nhận</span>
              <span className="od-net-row__value">{fmt(booking.net_amount)}</span>
            </div>

            {/* Status pill */}
            <div className={`od-status-box od-status-box--${st.cls}`}>
              {st.cls === 'green' && <CheckCircle2 size={16} />}
              <span>{st.label}</span>
            </div>

            {/* Reject note */}
            {booking.reject_note && (
              <p className="od-reject-note">Lý do: {booking.reject_note}</p>
            )}

            {/* Pay CTA */}
            {booking.status === 'created' && (
              <button
                className="od-pay-btn"
                onClick={() => navigate(`/payment/${booking.id}`)}
              >
                Thanh toán ngay →
              </button>
            )}
          </Card>

          {/* Card 2 — Timeline */}
          <Card title="LỊCH SỬ GIAO DỊCH" icon={Clock}>
            <div className="od-timeline">
              {timeline.map((s, i) => (
                <div key={i} className={`od-tl-item${s.done ? ' done' : ''}`}>
                  <div className="od-tl-item__dot-col">
                    <div className={`od-tl-item__dot${s.done ? ' done' : ''}`}>
                      {s.done
                        ? <CheckCircle2 size={16} />
                        : <Circle size={16} />
                      }
                    </div>
                    {i < timeline.length - 1 && <div className="od-tl-item__line" />}
                  </div>
                  <div className="od-tl-item__text">
                    <span className="od-tl-item__label">{s.label}</span>
                    {s.time && <span className="od-tl-item__time">{s.time}</span>}
                    {!s.time && <span className="od-tl-item__time od-tl-item__time--pending">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 3 — Security */}
          <Card className="od-security-card">
            <div className="od-security-card__inner">
              <ShieldCheck size={18} color="#ec4899" />
              <span>Giao dịch được bảo mật tuyệt đối</span>
            </div>
            <button className="od-support-btn">
              <Headphones size={13} />
              Liên hệ hỗ trợ
            </button>
          </Card>

        </aside>

        {/* ════ RIGHT CONTENT ════ */}
        <div className="od-content">

          {/* Row 1: Thông tin đơn + Thông tin khách */}
          <div className="od-row2">
            <Card title="THÔNG TIN ĐƠN" icon={Receipt}>
              <InfoRow label="Mã đơn"      value={`#${shortCode(booking.code)}`} />
              <InfoRow label="Mã đầy đủ"   value={booking.code} mono />
              <InfoRow label="ID"           value={`#${booking.id}`} />
              <InfoRow label="Tạo lúc"      value={fmtDate(booking.created_at)} />
              <InfoRow label="Hết hạn"      value={fmtDate(booking.expires_at)} />
              <InfoRow label="Cập nhật"     value={fmtDate(booking.updated_at)} />
            </Card>

            <Card title="THÔNG TIN KHÁCH" icon={User}>
              <InfoRow label="SĐT MoMo"      value={booking.customer_account_number} mono />
              <InfoRow label="Tên chính chủ" value={booking.customer_account_holder} />
              <InfoRow label="ID khách"      value={`#${booking.customer_id}`} />
              <InfoRow label="Tên QR"        value={booking.qr_name} />
              <InfoRow label="ID QR"         value={`#${booking.qr_id}`} />
              <InfoRow label="Ghi chú"       value={booking.customer_paid_note} />
            </Card>
          </div>

          {/* Row 2: Payment timestamps */}
          <Card title="THỜI GIAN THANH TOÁN" icon={CreditCard}>
            <div className="od-timestamps">
              <div className="od-ts-col">
                <span className="od-ts-col__label">KHÁCH CHUYỂN TIỀN</span>
                <span className="od-ts-col__value">{fmtDate(booking.paid_at) || '—'}</span>
              </div>
              <div className="od-ts-divider" />
              <div className="od-ts-col">
                <span className="od-ts-col__label">ADMIN XỬ LÝ</span>
                <span className="od-ts-col__value">{fmtDate(booking.admin_paid_at) || '—'}</span>
              </div>
              <div className="od-ts-divider" />
              <div className="od-ts-col">
                <span className="od-ts-col__label">HOÀN THÀNH / TỪ CHỐI</span>
                <span className="od-ts-col__value">{fmtDate(booking.confirmed_at) || '—'}</span>
              </div>
            </div>
          </Card>

          {/* Row 3: Bills */}
          <div className="od-row2">

            {/* Customer bills */}
            <Card title="ẢNH BILL CỦA BẠN" icon={Image}>
              {proofUrls.length === 0 ? (
                <div className="od-no-bill">
                  <Image size={32} strokeWidth={1.2} color="#e2e8f0" />
                  <span>Chưa có ảnh bill</span>
                </div>
              ) : (
                <div className="od-bill-previews">
                  {proofUrls.map((url, i) => (
                    <div
                      key={i}
                      className="od-bill-thumb"
                      onClick={() => setLightbox(url)}
                    >
                      <img src={url} alt={`bill ${i + 1}`} />
                      <div className="od-bill-thumb__overlay">
                        <ZoomIn size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {proofUrls.length > 0 && (
                <div className="od-bill-actions">
                  <button
                    className="od-btn-outline"
                    onClick={() => setLightbox(proofUrls[0])}
                  >
                    <ZoomIn size={14} /> Xem lớn
                  </button>
                  <a
                    className="od-btn-pink"
                    href={proofUrls[0]}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={14} /> Tải xuống
                  </a>
                </div>
              )}
            </Card>

            {/* Admin bills */}
            <Card title="ẢNH BILL ADMIN XÁC NHẬN" icon={ShieldCheck}>
              {adminProofUrls.length === 0 ? (
                <div className="od-no-bill">
                  <ShieldCheck size={32} strokeWidth={1.2} color="#e2e8f0" />
                  <span>Chưa có xác nhận</span>
                </div>
              ) : (
                <div className="od-bill-previews">
                  {adminProofUrls.map((url, i) => (
                    <div
                      key={i}
                      className="od-bill-thumb"
                      onClick={() => setLightbox(url)}
                    >
                      <img src={url} alt={`admin bill ${i + 1}`} />
                      <div className="od-bill-thumb__overlay">
                        <ZoomIn size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {adminProofUrls.length > 0 && (
                <div className="od-bill-actions">
                  <button
                    className="od-btn-outline"
                    onClick={() => setLightbox(adminProofUrls[0])}
                  >
                    <ZoomIn size={14} /> Xem lớn
                  </button>
                  <a
                    className="od-btn-pink"
                    href={adminProofUrls[0]}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={14} /> Tải xuống
                  </a>
                </div>
              )}
            </Card>

          </div>
        </div>{/* /od-content */}
      </div>{/* /od-layout */}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="od-lightbox" onClick={() => setLightbox(null)}>
          <div className="od-lightbox__box" onClick={e => e.stopPropagation()}>
            <button className="od-lightbox__close" onClick={() => setLightbox(null)}>
              ×
            </button>
            <img src={lightbox} alt="preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingDetail;
