import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../../api/axios';
import './Login.scss';

const Login = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = redirectTo;
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-new">
      <div className="top-nav">
        <div className="auth-buttons-nav">
          <span className="nav-text">Bạn chưa có tài khoản?</span>
          <Link to="/register" className="nav-register-btn">Đăng ký ngay</Link>
        </div>
      </div>

      <div className="login-content">
        <div className="left-section">
          <div className="intro-card">
            <h2 className="intro-title">
              Đăng nhập để trải nghiệm
              <br />
              <span className="title-highlight">dịch vụ rút ví trả sau</span>
              <br />
              cùng Momo247
            </h2>
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon"><i className="fas fa-shield-alt"></i></div>
                <div className="feature-text">
                  <strong>An toàn bảo mật</strong>
                  <p>Hệ thống bảo mật đạt chuẩn quốc tế</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><i className="fas fa-bolt"></i></div>
                <div className="feature-text">
                  <strong>Rút tiền nhanh chóng</strong>
                  <p>Giao dịch tức thì, mọi lúc mọi nơi</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><i className="fas fa-gift"></i></div>
                <div className="feature-text">
                  <strong>Trả sau tiện lợi</strong>
                  <p>Thanh toán linh hoạt, ưu đãi hấp dẫn</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="auth-card-new">
            <div className="auth-header-new">
              <h2>Chào mừng bạn trở lại!</h2>
              <p>Đăng nhập để tiếp tục sử dụng Credify</p>
            </div>

            <form className="auth-form-new" onSubmit={handleSubmit}>
              {error && (
                <div className="error-message-new">
                  <i className="fas fa-exclamation-circle"></i> {error}
                </div>
              )}

              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu"
                    className="password-input-new"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <i
                    className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password-new`}
                    onClick={() => setShowPassword(!showPassword)}
                  ></i>
                </div>
              </div>

              <button type="submit" className="auth-btn-new" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>

              <div className="security-note">
                <div className="security-icon"><i className="fas fa-shield-alt"></i></div>
                <div className="security-text">
                  <strong>Momo247 cam kết bảo mật tuyệt đối</strong>
                  <p>Thông tin của bạn được mã hóa và bảo vệ an toàn</p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
