import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, ShieldCheck, Zap, FileText } from 'lucide-react';
import api from '../../api/axios';
import './Home.scss';

const Home = () => {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Chưa có token → không cần fetch gì cả, ẩn QR ngay
    if (!token) {
      setLoading(false);
      return;
    }

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
                            <BadgePercent size={18} />
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
                            <ShieldCheck size={18} />
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
                      Tạo đơn
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
