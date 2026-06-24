import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, ShieldCheck, Zap, FileText } from 'lucide-react';
import api from '../../api/axios';
import './Home.scss';

const Home = () => {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(false); // popup nhắc đăng nhập
  const [pendingQrId, setPendingQrId] = useState(null);  // QR user muốn tạo đơn

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qrsRes, userRes] = await Promise.all([
          api.get('/qrs/ready'),
          api.get('/auth/me').catch(() => ({ data: { user: null } }))
        ]);
        setQrs(qrsRes.data);
        setUser(userRes.data.user);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Xử lý khi bấm "Tạo đơn"
  const handleTaoDon = (qrId) => {
    if (!user) {
      setPendingQrId(qrId);
      setLoginPrompt(true);
      return;
    }
    window.location.href = `/qrs/${qrId}`;
  };

  if (loading) return <div className="home-loading">Đang tải dữ liệu...</div>;

  return (
    <div className="home-container">
      <section className="hero-section">
        <img src="/banner1.png" alt="Banner Credify" className="hero-banner" />
      </section>

      <section className="qr-showcase" id="ready-qrs">
        <div className="section-heading">
          <div className="section-heading-badge">
            <Zap size={14} />
            <span>Hoạt động</span>
          </div>
          <h2>QR đang sẵn sàng</h2>
          <p>Chọn mã QR phù hợp và tạo đơn chuyển tiền ngay</p>
        </div>

        {qrs.length === 0 ? (
          <div className="no-qrs">Hiện tại chưa có thẻ QR nào sẵn sàng.</div>
        ) : (
          <div className="qr-grid">
            {qrs.map(qr => {
              const feeUnder = Number(qr.fee_rate_under ?? qr.fee_rate ?? 0);
              const feeOver  = Number(qr.fee_rate_over  ?? qr.fee_rate ?? 0);
              const maxAmount = Math.round(Number(qr.max_amount_per_trans)).toLocaleString('vi-VN');
              return (
                <div key={qr.id} className="qr-card">
                  <div className="qr-card-image">
                    <img src={qr.main_image} alt={qr.name || 'QR'} />
                  </div>

                  <div className="qr-card-body">
                    {qr.name && <h3 className="qr-card-name">{qr.name}</h3>}

                    <div className="qr-card-info-row">
                      <div className="qr-info-box">
                        <div className="qr-info-box-header">
                          <span className="qr-info-box-icon"><BadgePercent size={18} /></span>
                          <span className="qr-info-box-title">PHÍ GIAO DỊCH</span>
                        </div>
                        <div className="qr-info-box-content">
                          <div className="fee-line">
                            <span className="fee-line-label">Dưới 5.000.000đ</span>
                            <span className="fee-line-value">{feeUnder}%</span>
                          </div>
                          <div className="fee-line">
                            <span className="fee-line-label">Trên 5.000.000đ</span>
                            <span className="fee-line-value">{feeOver}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="qr-info-box">
                        <div className="qr-info-box-header">
                          <span className="qr-info-box-icon"><ShieldCheck size={18} /></span>
                          <span className="qr-info-box-title">HẠN MỨC</span>
                        </div>
                        <div className="qr-info-box-content">
                          <div className="limit-block">
                            <span className="limit-block-label">Tối đa / lần chuyển</span>
                            <span className="limit-block-value">{maxAmount}đ</span>
                          </div>
                          {qr.daily_remaining != null && (
                            <div className="limit-block">
                              <span className="limit-block-label">Hạn mức còn lại</span>
                              <span className="limit-block-value">{Math.round(Number(qr.daily_remaining)).toLocaleString('vi-VN')}đ</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nút Tạo đơn — intercept nếu chưa đăng nhập */}
                    <button
                      className="qr-card-btn"
                      onClick={() => handleTaoDon(qr.id)}
                    >
                      Tạo đơn
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal nhắc đăng nhập */}
      {loginPrompt && (
        <div className="login-prompt-overlay" onClick={() => setLoginPrompt(false)}>
          <div className="login-prompt-modal" onClick={e => e.stopPropagation()}>
            <button className="login-prompt-close" onClick={() => setLoginPrompt(false)}>×</button>
            <div className="login-prompt-icon">🔒</div>
            <h3>Vui lòng đăng nhập</h3>
            <p>Bạn cần đăng nhập để tạo đơn và sử dụng dịch vụ rút ví trả sau.</p>
            <div className="login-prompt-actions">
              <Link
                to={`/login?redirect=${encodeURIComponent(`/qrs/${pendingQrId}`)}`}
                className="login-prompt-btn login-prompt-btn--primary"
              >
                Đăng nhập ngay
              </Link>
              <Link to="/register" className="login-prompt-btn login-prompt-btn--outline">
                Đăng ký tài khoản
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
