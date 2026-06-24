import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Zap, Phone, User, CircleDollarSign,
  QrCode, Lock, BadgePercent, Wallet, Info, X
} from 'lucide-react';
import api from '../../api/axios';
import './QRDetail.scss';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];

const fmt = (value) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN') + 'đ';
};

const QRDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [momoPhone, setMomoPhone] = useState('');
  const [holderName, setHolderName] = useState('');
  const [amount, setAmount] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/qrs/ready/${id}`)
      .then((res) => { if (active) setQr(res.data); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Không thể tải chi tiết QR'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const computed = useMemo(() => {
    const num = Number(amount);
    const isValid = Number.isFinite(num) && num > 0;
    const max = Number(qr?.max_amount_per_trans ?? 0);
    const remaining = qr?.daily_remaining != null ? Number(qr.daily_remaining) : null;
    const effectiveMax = remaining !== null ? Math.min(max, remaining) : max;
    const overLimit = isValid && effectiveMax > 0 && num > effectiveMax;
    const THRESHOLD = 5_000_000;
    const feeRate = isValid
      ? (num < THRESHOLD ? Number(qr?.fee_rate_under ?? qr?.fee_rate ?? 0) : Number(qr?.fee_rate_over ?? qr?.fee_rate ?? 0))
      : 0;
    const fee = isValid ? (num * feeRate) / 100 : 0;
    const net = isValid ? num - fee : 0;
    return { num, isValid, overLimit, feeRate, fee, net, max, remaining, effectiveMax };
  }, [amount, qr]);

  const getEffectiveMax = () => {
    const max = Number(qr?.max_amount_per_trans ?? 0);
    const remaining = qr?.daily_remaining != null ? Number(qr.daily_remaining) : null;
    return remaining !== null ? Math.min(max, remaining) : max;
  };

  const setQuickAmount = (val) => {
    const effectiveMax = getEffectiveMax();
    if (effectiveMax > 0 && val > effectiveMax) return;
    setAmount(String(val));
    setAmountDisplay(val.toLocaleString('vi-VN'));
    setFormError('');
  };

  const handleAmountInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw);
    const max = Number(qr?.max_amount_per_trans ?? 0);
    const remaining = qr?.daily_remaining != null ? Number(qr.daily_remaining) : null;
    const effectiveMax = remaining !== null ? Math.min(max, remaining) : max;
    if (effectiveMax > 0 && num > effectiveMax) {
      const label = remaining !== null && remaining < max
        ? `hạn mức còn lại (${fmt(remaining)})` : `hạn mức giao dịch (${fmt(max)})`;
      setFormError(`Số tiền vượt quá ${label}`);
      return;
    }
    setFormError('');
    setAmount(raw);
    setAmountDisplay(raw ? num.toLocaleString('vi-VN') : '');
  };

  const handleSubmit = () => {
    // Chưa đăng nhập → redirect sang login, giữ lại URL hiện tại để quay về sau
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setFormError('');
    if (!momoPhone.trim()) { setFormError('Vui lòng nhập số điện thoại MoMo'); return; }
    if (!/^(0[3-9]\d{8})$/.test(momoPhone.trim())) { setFormError('Số điện thoại không hợp lệ'); return; }
    if (!holderName.trim()) { setFormError('Vui lòng nhập tên chính chủ'); return; }
    if (!computed.isValid) { setFormError('Vui lòng nhập số tiền hợp lệ'); return; }
    if (computed.overLimit) {
      const label = computed.remaining !== null && computed.remaining < computed.max
        ? `hạn mức còn lại ${fmt(computed.remaining)}` : `hạn mức giao dịch ${fmt(computed.max)}`;
      setFormError(`Số tiền vượt quá ${label}`); return;
    }
    setSubmitting(true);
    api.post('/bookings', {
      qr_id: qr.id,
      customer_account_number: momoPhone.trim(),
      customer_account_holder: holderName.trim(),
      transfer_amount: computed.num,
    })
      .then((res) => navigate(`/payment/${res.data.booking.id}`))
      .catch((err) => setFormError(err.response?.data?.message || 'Không thể tạo đơn'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="qrd-loading">Đang tải...</div>;
  if (!qr) return (
    <div className="qrd-error">
      <p>{error || 'Không tìm thấy QR hoặc đang bảo trì.'}</p>
      <Link to="/">← Trang chủ</Link>
    </div>
  );

  const feeUnder  = Number(qr.fee_rate_under ?? qr.fee_rate ?? 0);
  const feeOver   = Number(qr.fee_rate_over  ?? qr.fee_rate ?? 0);
  const maxAmt    = Math.round(Number(qr.max_amount_per_trans));
  const remaining = qr.daily_remaining != null ? Math.round(Number(qr.daily_remaining)) : null;

  return (
    <div className="qrd-page">
      <div className="qrd-layout">

        {/* ── LEFT ── */}
        <div className="qrd-left">
          <div className="qrd-card">
            <Link to="/" className="qrd-back">← Trang chủ</Link>

            {/* Header */}
            <div className="qrd-card-header">
              <div className="qrd-card-name">{qr.name || `QR #${qr.id}`}</div>
              <div className="qrd-card-sub">Thanh toán an toàn – Nhận tiền tức thì</div>
            </div>

            {/* QR image */}
            <div className="qrd-qr-wrap" onClick={() => setLightbox(true)}>
              <img src={qr.main_image} alt="QR" className="qrd-qr-img" />
            </div>

            {/* Info box */}
            <div className="qrd-info-box">
              <div className="qrd-info-title">
                <Info size={14} /> Thông tin giao dịch
              </div>

              <div className="qrd-info-section-label">
                <BadgePercent size={14} /> Phí giao dịch
              </div>
              <div className="qrd-fee-list">
                <div className="qrd-fee-item">
                  <span>Dưới 5.000.000đ</span>
                  <span className="qrd-fee-val">{feeUnder}%</span>
                </div>
                <div className="qrd-fee-item">
                  <span>Trên 5.000.000đ</span>
                  <span className="qrd-fee-val">{feeOver}%</span>
                </div>
              </div>

              <div className="qrd-info-row space-top">
                <span className="qrd-info-label"><Wallet size={13} /> Hạn mức giao dịch</span>
                <span className="qrd-info-value">{fmt(maxAmt)}</span>
              </div>
              {remaining !== null && (
                <div className="qrd-info-row">
                  <span className="qrd-info-label"><Zap size={13} /> Hạn mức còn lại</span>
                  <span className="qrd-info-value">{fmt(remaining)}</span>
                </div>
              )}
            </div>

            <div className="qrd-trust">
              <ShieldCheck size={13} />
              MoMo được Ngân hàng Nhà nước cấp phép và bảo trợ bởi các ngân hàng uy tín.
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="qrd-right">
          <div className="qrd-form-card">
            <h1 className="qrd-form-title">
              <span className="qrd-title-bar" />
              Tạo đơn thanh toán
            </h1>
            <p className="qrd-form-sub">Tạo QR để khách hàng quét mã thanh toán</p>

            {/* Phone */}
            <div className="qrd-field">
              <label>Số điện thoại MoMo <span className="req">*</span></label>
              <div className="qrd-input-wrap">
                <Phone size={17} className="qrd-input-icon" />
                <input
                  type="text" inputMode="numeric"
                  placeholder="Nhập số điện thoại MoMo"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
            </div>

            {/* Name */}
            <div className="qrd-field">
              <label>Tên chính chủ <span className="req">*</span></label>
              <div className="qrd-input-wrap">
                <User size={17} className="qrd-input-icon" />
                <input
                  type="text"
                  placeholder="Nhập họ tên đầy đủ"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                />
              </div>
            </div>

            {/* Amount */}
            <div className="qrd-field">
              <label>Số tiền cần nhận (VND) <span className="req">*</span></label>
              <div className="qrd-input-wrap">
                <CircleDollarSign size={17} className="qrd-input-icon" />
                <input
                  type="text" inputMode="numeric"
                  placeholder="Nhập số tiền"
                  value={amountDisplay}
                  onChange={handleAmountInput}
                />
                <span className="qrd-input-suffix">đ</span>
              </div>

              <div className="qrd-quick-amounts">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val} type="button"
                    className={`qrd-quick-btn ${Number(amount) === val ? 'active' : ''}`}
                    onClick={() => setQuickAmount(val)}
                  >
                    {val.toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {computed.isValid && (
              <div className="qrd-summary">
                <div className="qrd-summary-row">
                  <span>Số tiền khách chuyển</span>
                  <span className="qrd-summary-plain">{fmt(computed.num)}</span>
                </div>
                <div className="qrd-summary-row">
                  <span>Phí giao dịch ({computed.feeRate}%)</span>
                  <span className="qrd-summary-fee">{fmt(computed.fee)}</span>
                </div>
                <div className="qrd-summary-divider" />
                <div className="qrd-summary-row total">
                  <span>Bạn sẽ nhận được</span>
                  <span className="qrd-summary-net">{fmt(computed.net)}</span>
                </div>
              </div>
            )}

            {formError && (
              <div className="qrd-error-msg">
                <X size={14} /> {formError}
              </div>
            )}

            <p className="qrd-fee-note">
              <ShieldCheck size={13} />
              Phí giao dịch sẽ được trừ tự động khi khách hàng thanh toán thành công.
            </p>

            <button className="qrd-submit-btn" onClick={handleSubmit} disabled={submitting}>
              <QrCode size={20} />
              {submitting ? 'Đang tạo...' : 'Tạo QR nhận tiền'}
            </button>

            <p className="qrd-secure-note">
              <Lock size={13} />
              Thông tin của bạn được bảo mật tuyệt đối
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="qrd-lightbox" onClick={() => setLightbox(false)}>
          <div className="qrd-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="qrd-lightbox-close" onClick={() => setLightbox(false)}>×</button>
            <img src={qr.main_image} alt="QR" />
          </div>
        </div>
      )}
    </div>
  );
};

export default QRDetail;
