import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import './Register.scss';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name.trim()) return setError('Vui lòng nhập họ và tên');
    if (formData.password !== formData.confirmPassword) return setError('Mật khẩu xác nhận không khớp');
    if (formData.password.length < 6) return setError('Mật khẩu phải ít nhất 6 ký tự');

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-new">
      <div className="top-nav">
        <div className="auth-buttons-nav">
          <span className="nav-text">Đã có tài khoản?</span>
          <Link to="/login" className="nav-register-btn">Đăng nhập ngay</Link>
        </div>
      </div>

      <div className="login-content">
        <div className="left-section">
          <div className="intro-card">
            <h2 className="intro-title">
              Tạo tài khoản để trải nghiệm
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
              <h2>Tạo tài khoản mới</h2>
              <p>Đăng ký để trải nghiệm dịch vụ Momo247</p>
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
                    type="text"
                    name="full_name"
                    placeholder="Họ và tên"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Mật khẩu (ít nhất 6 ký tự)"
                    className="password-input-new"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <i
                    className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password-new`}
                    onClick={() => setShowPassword(!showPassword)}
                  ></i>
                </div>
              </div>

              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Xác nhận mật khẩu"
                    className="password-input-new"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <i
                    className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'} toggle-password-new`}
                    onClick={() => setShowConfirm(!showConfirm)}
                  ></i>
                </div>
              </div>

              <button type="submit" className="auth-btn-new" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng ký'}
              </button>

              <div className="security-note">
                <div className="security-icon"><i className="fas fa-shield-alt"></i></div>
                <div className="security-text">
                  <strong>Credify cam kết bảo mật tuyệt đối</strong>
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

export default Register;
