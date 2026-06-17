import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import './Home.scss';

const Home = () => {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

  if (loading) return <div className="home-loading">Đang tải dữ liệu...</div>;

  return (
    <div className="home-container">
      <section className="hero-section">
        <img src="/banner.png" alt="Banner Credify" className="hero-banner" />
      </section>

      <section className="qr-showcase" id="ready-qrs">
        <h2> QR đang sẵn sàng</h2>
        {!user ? (
          <div className="login-to-view">
            <h3>Vui lòng đăng nhập</h3>
            <p>Bạn cần đăng nhập tài khoản để xem danh sách thẻ QR và sử dụng dịch vụ.</p>
            <Link to="/login" className="login-btn">Đăng nhập ngay</Link>
          </div>
        ) : qrs.length === 0 ? (
          <div className="no-qrs">Hiện tại chưa có thẻ QR nào sẵn sàng.</div>
        ) : (
          <div className="qr-grid">
            {qrs.map(qr => {
              const feeUnder = Number(qr.fee_rate_under ?? qr.fee_rate ?? 0);
              const feeOver  = Number(qr.fee_rate_over  ?? qr.fee_rate ?? 0);
              const maxAmount = Math.round(Number(qr.max_amount_per_trans)).toLocaleString('vi-VN');
              return (
                <div key={qr.id} className="qr-card">
                  {/* Ảnh full width */}
                  <div className="qr-card-image">
                    <img src={qr.main_image} alt={qr.name || 'QR'} />
                  </div>

                  <div className="qr-card-body">
                    {/* Tên QR */}
                    {qr.name && <h3 className="qr-card-name">{qr.name}</h3>}

                    {/* 2 info cards */}
                    <div className="qr-card-info-row">
                      {/* Phí giao dịch */}
                      <div className="qr-info-box">
                        <div className="qr-info-box-header">
                          <span className="qr-info-box-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.39 16.57 8 15.4 8 14h2c0 .55.9 1 2 1s2-.45 2-1c0-.61-.55-.86-2.05-1.27-2.04-.54-3.95-1.18-3.95-3.23 0-1.57 1.39-2.7 3-3.07V5h2v1.43c1.61.37 3 1.5 3 3.07h-2c0-.55-.9-1-2-1s-2 .45-2 1c0 .61.55.86 2.05 1.27 2.04.54 3.95 1.18 3.95 3.23 0 1.57-1.39 2.7-3 3.93z"/></svg>
                          </span>
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

                      {/* Hạn mức */}
                      <div className="qr-info-box">
                        <div className="qr-info-box-header">
                          <span className="qr-info-box-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                          </span>
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

                    {/* Nút TẠO ĐƠN */}
                    <Link to={`/qrs/${qr.id}`} className="qr-card-btn">
                      
                      TẠO ĐƠN
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
