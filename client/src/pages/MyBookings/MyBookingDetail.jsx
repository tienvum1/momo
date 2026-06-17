import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, DollarSign, Clock,
  MessageSquare, ShieldCheck, Headphones,
  ZoomIn, Download, CheckCircle2, Circle, AlertCircle, Tag
} from 'lucide-react';
import api from '../../api/axios';
import './MyBookingDetail.scss';

const fmt = (v) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN') + 'đ';
};
const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};
const shortCode = (code) => String(code || '').slice(-6);

const STATUS_CFG = {
  created:       { label: 'Chờ thanh toán', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  customer_paid: { label: 'Đang xử lý',     color: '#eab308', bg: '#fefce8', border: '#fde047' },
  confirmed:     { label: 'Hoàn thành',      color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
  rejected:      { label: 'Từ chối',         color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  cancelled:     { label: 'Đã hủy',          color: '#94a3b8', bg: '#f8fafc', border: '#cbd5e1' },
};

const InfoRow = ({ label, value, mono, pink }) => (
  <div className="mbd-row">
    <span className="mbd-row-label">{label}</span>
    <span className={`mbd-row-value${mono ? ' mono' : ''}${pink ? ' pink' : ''}`}>{value ?? '—'}</span>
  </div>
);

const Card = ({ icon: Icon, title, children, className = '' }) => (
  <div className={`mbd-card ${className}`}>
    <div className="mbd-card-head"><Icon size={13} strokeWidth={2.5}/><span>{title}</span></div>
    <div className="mbd-card-body">{children}</div>
  </div>
);

const MyBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let active = true;
    api.get(`/bookings/my/${id}`)
      .then(res => { if (active) setBooking(res.data); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="mbd-state"><div className="mbd-spinner"/><span>Đang tải...</span></div>;
  if (!booking) return <div className="mbd-state"><AlertCircle size={32} color="#ef4444"/><span>Không tìm thấy đơn</span></div>;

  const st = STATUS_CFG[booking.status] || STATUS_CFG.cancelled;
  const proofUrls = booking.proof_urls || [];
  const timeline = [
    { label: 'Tạo lúc',        time: fmtDate(booking.created_at),   done: true },
    { label: 'Thanh toán lúc', time: fmtDate(booking.paid_at),      done: !!booking.paid_at },
    { label: 'Hoàn thành lúc', time: fmtDate(booking.confirmed_at), done: booking.status === 'confirmed' },
  ];

  return (
    <div className="mbd-page">

      {/* ── Topbar ── */}
      <div className="mbd-topbar">
        <button className="mbd-back" onClick={() => navigate('/my-bookings')}>
          <ArrowLeft size={14}/> Quay lại danh sách
        </button>
        <h1 className="mbd-title">Chi tiết đơn <span className="mbd-code">{shortCode(booking.code)}</span></h1>
      </div>

      {/* ── Hero ── */}
      <div className="mbd-hero">
        <div className="mbd-hero-left">
          <img src="/logo.svg" alt="Momo247" className="mbd-hero-logo"/>
          <div>
            <p className="mbd-hero-sub">Chuyển tiền đến</p>
            <h2 className="mbd-hero-name">{(booking.customer_account_holder || '—').toUpperCase()}</h2>
            <p className="mbd-hero-phone">Momo · {booking.customer_account_number || '—'}</p>
          </div>
        </div>
        <div className="mbd-hero-right">
          <span className="mbd-status-pill" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
            ● {st.label}
          </span>
          <p className="mbd-recv-label">Thực nhận</p>
          <p className="mbd-recv-amount">{fmt(booking.net_amount)}</p>
          <p className="mbd-recv-fee">Phí: {fmt(booking.fee_amount)} ({Number(booking.fee_rate)}%)</p>
        </div>
      </div>

      {/* ── Main: left 65% + right 35% ── */}
      <div className="mbd-main">

        {/* Left: 3-column grid of cards */}
        <div className="mbd-left">
          <div className="mbd-grid3">

            {/* Col 1 */}
            <Card icon={FileText} title="Thông tin giao dịch">
              <InfoRow label="Mã đơn"             value={shortCode(booking.code)} mono/>
              <InfoRow label="ID đơn"             value={booking.id}/>
              <InfoRow label="ID QR"              value={booking.qr_id}/>
              <InfoRow label="Tên QR"             value={booking.qr_name}/>
              <InfoRow label="SĐT Momo"           value={booking.customer_account_number} mono/>
              <InfoRow label="Tên chính chủ"      value={booking.customer_account_holder}/>
            </Card>

            {/* Col 2 */}
            <div className="mbd-col2">
              <Card icon={DollarSign} title="Thông tin số tiền">
                <InfoRow label="Tiền khách chuyển" value={fmt(booking.transfer_amount)}/>
                <InfoRow label={`Phí (${Number(booking.fee_rate)}%)`} value={fmt(booking.fee_amount)}/>
                <div className="mbd-sep"/>
                <InfoRow label="Thực nhận" value={fmt(booking.net_amount)} pink/>
              </Card>
              <Card icon={MessageSquare} title="Ghi chú">
                <InfoRow label="Ghi chú"      value={booking.customer_paid_note || 'Đã chuyển'}/>
                <InfoRow label="Lý do từ chối" value={booking.reject_note}/>
              </Card>
            </div>

            {/* Col 3 */}
            <div className="mbd-col3">
              <Card icon={Clock} title="Thời gian giao dịch">
                <div className="mbd-timeline">
                  {timeline.map((s, i) => (
                    <div key={i} className={`mbd-step ${s.done ? 'done' : ''}`}>
                      <div className="mbd-step-dot">
                        {s.done ? <CheckCircle2 size={16}/> : <Circle size={16}/>}
                        {i < timeline.length - 1 && <div className="mbd-step-line"/>}
                      </div>
                      <div className="mbd-step-text">
                        <span className="mbd-step-label">{s.label}</span>
                        <span className="mbd-step-time">{s.time || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card icon={Tag} title="Trạng thái">
                <span className="mbd-status-big" style={{ color: st.color }}>{st.label}</span>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="mbd-footer">
            <div className="mbd-footer-left">
              <ShieldCheck size={16} style={{ color: '#d82d8b', flexShrink: 0 }}/>
              <div>
                <p className="mbd-footer-title">Giao dịch được bảo mật tuyệt đối bởi hệ thống.</p>
                <p className="mbd-footer-sub">Nếu có thắc mắc, vui lòng liên hệ hỗ trợ.</p>
              </div>
            </div>
            <button className="mbd-btn-support"><Headphones size={13}/> Liên hệ hỗ trợ</button>
          </div>
        </div>

        {/* Right: bill sidebar */}
        <aside className="mbd-right">
          <Card icon={FileText} title="Ảnh bill đã tải">
            {proofUrls.length === 0 ? (
              <p className="mbd-no-bill">Chưa có ảnh bill</p>
            ) : (
              <div className="mbd-bills">
                {proofUrls.map((url, i) => (
                  <div key={i} className="mbd-bill-item">
                    <img src={url} alt={`Bill ${i+1}`} onClick={() => setLightbox(url)}/>
                    <span className="mbd-bill-caption">BILL CỦA BẠN {i+1}</span>
                  </div>
                ))}
              </div>
            )}
            {proofUrls.length > 0 && (
              <div className="mbd-bill-actions">
                <button className="mbd-btn-outline" onClick={() => setLightbox(proofUrls[0])}>
                  <ZoomIn size={13}/> Xem ảnh lớn
                </button>
                <a className="mbd-btn-primary" href={proofUrls[0]} download target="_blank" rel="noreferrer">
                  <Download size={13}/> Tải xuống
                </a>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="mbd-lightbox" onClick={() => setLightbox(null)}>
          <div className="mbd-lightbox-box" onClick={e => e.stopPropagation()}>
            <button className="mbd-lightbox-close" onClick={() => setLightbox(null)}>×</button>
            <img src={lightbox} alt="preview"/>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingDetail;
