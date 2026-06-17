import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './QRDetail.scss';

const QRDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form fields — chỉ cần SĐT MoMo + tên chính chủ + số tiền
  const [momoPhone, setMomoPhone] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [amount, setAmount] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');
    setQr(null);

    Promise.all([
      api.get(`/qrs/ready/${id}`),
      api.get('/auth/me').catch(() => ({ data: { user: null } })),
    ]).then(([qrRes, userRes]) => {
      if (!active) return;
      setQr(qrRes.data);
      setUser(userRes.data.user);
    }).catch((err) => {
      if (!active) return;
      setError(err.response?.data?.message || 'Không thể tải chi tiết QR');
    }).finally(() => {
      if (!active) return;
      setLoading(false);
    });

    return () => { active = false; };
  }, [id]);

  const computed = useMemo(() => {
    const amountNumber = Number(amount);
    const maxAmountNumber = Number(qr?.max_amount_per_trans);
    const isAmountValid = Number.isFinite(amountNumber) && amountNumber > 0;
    const overLimit = isAmountValid && Number.isFinite(maxAmountNumber) && maxAmountNumber > 0 && amountNumber > maxAmountNumber;

    const THRESHOLD = 5_000_000;
    let feeRateNumber;
    if (isAmountValid && amountNumber < THRESHOLD) {
      feeRateNumber = Number(qr?.fee_rate_under ?? qr?.fee_rate ?? 0);
    } else {
      feeRateNumber = Number(qr?.fee_rate_over ?? qr?.fee_rate ?? 0);
    }

    const fee = isAmountValid ? (amountNumber * feeRateNumber) / 100 : 0;
    const net = isAmountValid ? amountNumber - fee : 0;
    return { amountNumber, feeRateNumber, maxAmountNumber, isAmountValid, overLimit, fee, net };
  }, [amount, qr]);

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
  };

  const handleCreateOrder = () => {
    if (!qr) return;
    if (!momoPhone.trim()) { setError('Vui lòng nhập số điện thoại MoMo'); return; }
    if (!/^(0[3-9]\d{8})$/.test(momoPhone.trim())) { setError('Số điện thoại không hợp lệ'); return; }
    if (!accountHolderName.trim()) { setError('Vui lòng nhập tên chính chủ'); return; }
    if (!computed.isAmountValid) { setError('Vui lòng nhập số tiền hợp lệ'); return; }
    if (computed.overLimit) { setError('Số tiền vượt quá hạn mức của thẻ QR'); return; }

    setError('');
    setSubmittingCreate(true);
    api.post('/bookings', {
      qr_id: qr.id,
      customer_bank_name: 'MoMo',
      customer_account_number: momoPhone.trim(),
      customer_account_holder: accountHolderName.trim(),
      transfer_amount: computed.amountNumber,
    })
      .then((res) => { navigate(`/payment/${res.data.booking.id}`); })
      .catch((err) => { setError(err.response?.data?.message || 'Không thể tạo đơn hàng'); })
      .finally(() => setSubmittingCreate(false));
  };

  if (loading) return <div className="qr-detail-loading">Đang tải...</div>;

  if (!qr) {
    return (
      <div className="qr-detail-error">
        <h1>Không tìm thấy thẻ QR</h1>
        <p>{error || 'Thẻ QR không tồn tại hoặc đang bảo trì.'}</p>
        <Link to="/" className="back-link">Quay về Trang chủ</Link>
      </div>
    );
  }

  const feeRateUnder = Number(qr.fee_rate_under ?? qr.fee_rate ?? 0);
  const feeRateOver  = Number(qr.fee_rate_over  ?? qr.fee_rate ?? 0);
  const dailyRemaining = qr.daily_remaining != null ? Math.round(Number(qr.daily_remaining)) : null;

  return (
    <div className="qr-detail-page">
      <div className="qr-detail-top">
        <Link to="/" className="back-link">← Trang chủ</Link>
        <div className={`qr-status ${qr.status}`}>
          {qr.status === 'ready' ? 'Sẵn sàng' : 'Bảo trì'}
        </div>
      </div>

      {/* Layout 50/50 */}
      <div className="qr-main-layout">

        {/* ── Thông tin QR bên trái ── */}
        <div className="qr-info-card">
          <div className="qr-info-images">
            {qr.main_image && (
              <div className="qr-info-img-wrap" onClick={() => setLightbox(qr.main_image)}>
                <img src={qr.main_image} alt="QR đại diện" />
                <span className="img-label">Thông tin thẻ QR</span>
              </div>
            )}
          </div>

          <div className="qr-info-details">
            <h2 className="qr-info-name">{qr.name || `QR #${qr.id}`}</h2>

            <div className="qr-info-cards-row">
              {/* Card phí */}
              <div className="qr-stat-card">
                <div className="qr-stat-card-header">
                  <div className="qr-stat-icon fee-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.39 16.57 8 15.4 8 14h2c0 .55.9 1 2 1s2-.45 2-1c0-.61-.55-.86-2.05-1.27-2.04-.54-3.95-1.18-3.95-3.23 0-1.57 1.39-2.7 3-3.07V5h2v1.43c1.61.37 3 1.5 3 3.07h-2c0-.55-.9-1-2-1s-2 .45-2 1c0 .61.55.86 2.05 1.27 2.04.54 3.95 1.18 3.95 3.23 0 1.57-1.39 2.7-3 3.93z"/>
                    </svg>
                  </div>
                  <span className="qr-stat-card-title">PHÍ GIAO DỊCH</span>
                </div>
                <div className="qr-stat-card-body">
                  <div className="fee-row">
                    <span className="fee-label">Dưới 5.000.000đ</span>
                    <span className="fee-value">{feeRateUnder}%</span>
                  </div>
                  <div className="fee-divider" />
                  <div className="fee-row">
                    <span className="fee-label">Trên 5.000.000đ</span>
                    <span className="fee-value">{feeRateOver}%</span>
                  </div>
                </div>
              </div>

              {/* Card hạn mức */}
              <div className="qr-stat-card">
                <div className="qr-stat-card-header">
                  <div className="qr-stat-icon limit-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                    </svg>
                  </div>
                  <span className="qr-stat-card-title">HẠN MỨC</span>
                </div>
                <div className="qr-stat-card-body">
                  <div className="limit-row">
                    <span className="limit-label">Tối đa / lần chuyển</span>
                    <span className="limit-value">{Math.round(Number(qr.max_amount_per_trans)).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {dailyRemaining !== null && (
                    <>
                      <div className="fee-divider" />
                      <div className="limit-row">
                        <span className="limit-label">Hạn mức còn lại</span>
                        <span className="limit-value">{dailyRemaining.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form tạo đơn bên phải ── */}
        <div className="qr-detail-grid">
          <section className="order-panel">
            <h1>Tạo đơn</h1>
            <div className="order-form">

              {/* Số điện thoại MoMo */}
              <label className="field">
                <span>Số điện thoại MoMo</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="VD: 0901234567"
                />
              </label>

              {/* Tên chính chủ */}
              <label className="field">
                <span>Tên chính chủ</span>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Nhập họ tên đầy đủ"
                />
              </label>

              {/* Số tiền */}
              <label className="field">
                <span>Số tiền chuyển (VNĐ)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountDisplay}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAmount(val);
                    setAmountDisplay(val.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                  }}
                  placeholder="Nhập số tiền"
                />
              </label>

              {computed.maxAmountNumber > 0 && (
                <div className="order-hint">
                  Giới hạn 1 lần: {Math.round(computed.maxAmountNumber).toLocaleString('vi-VN')} VNĐ
                </div>
              )}

              {/* Tóm tắt phí */}
              <div className="order-summary">
                <div className="row">
                  <span>Phí ({computed.feeRateNumber}%)</span>
                  <span>{formatMoney(computed.fee)}</span>
                </div>
                <div className="row total">
                  <span>Nhận được</span>
                  <span>{formatMoney(computed.net)}</span>
                </div>
              </div>

              {error && <div className="order-error">{error}</div>}

              <button type="button" className="create-btn" onClick={handleCreateOrder} disabled={submittingCreate}>
                {submittingCreate ? 'Đang tạo...' : 'Tạo đơn'}
              </button>
            </div>
          </section>
        </div>

      </div>{/* end qr-main-layout */}

      {/* Lightbox */}
      {lightbox && (
        <div className="qr-lightbox" onClick={() => setLightbox(null)}>
          <div className="qr-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="qr-lightbox-close" onClick={() => setLightbox(null)}>×</button>
            <img src={lightbox} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default QRDetail;
