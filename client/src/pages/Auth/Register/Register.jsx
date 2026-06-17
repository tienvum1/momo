import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import './Register.scss';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: formData.username,
        password: formData.password
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
    <div className="login-page">
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
              Đăng ký để trải nghiệm
              <br />
              <span className="title-highlight">thanh toán tiện lợi</span>
              <br />
              cùng momo247
            </h2>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="feature-text">
                  <strong>An toàn bảo mật</strong>
                  <p>Hệ thống bảo mật đạt chuẩn quốc tế, bảo vệ thông tin của bạn</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-bolt"></i>
                </div>
                <div className="feature-text">
                  <strong>Thanh toán nhanh chóng</strong>
                  <p>Giao dịch tức thì, mọi lúc, mọi nơi chỉ với vài giây</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-gift"></i>
                </div>
                <div className="feature-text">
                  <strong>Ưu đãi mỗi ngày</strong>
                  <p>Hàng ngàn ưu đãi hấp dẫn dành riêng cho bạn</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="auth-card-new">
            <div className="auth-header-new">
              <h2>Chào mừng bạn đến với momo247!</h2>
              <p>Đăng ký để bắt đầu sử dụng</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="error-message-new">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}
              
              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <i className="fas fa-user"></i>
                  <input 
                    type="text" 
                    name="username" 
                    placeholder="Tên đăng nhập / Số điện thoại"
                    value={formData.username} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <i className="fas fa-lock"></i>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    placeholder="Mật khẩu"
                    className="password-input-new"
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                  />
                  <i 
                    className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} toggle-password-new`}
                    onClick={() => setShowPassword(!showPassword)}
                  ></i>
                </div>
              </div>

              <div className="form-group-new">
                <div className="input-wrapper-new">
                  <i className="fas fa-shield-alt"></i>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    name="confirmPassword" 
                    placeholder="Xác nhận mật khẩu"
                    className="password-input-new"
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    required 
                  />
                  <i 
                    className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"} toggle-password-new`}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  ></i>
                </div>
              </div>

              <button type="submit" className="auth-btn-new" disabled={loading}>
                {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản mới'}
                {!loading && <i className="fas fa-arrow-right"></i>}
              </button>

              <div className="login-footer">
                <p>Đã có tài khoản?</p>
                <Link to="/login" className="login-now-btn">
                  Đăng nhập ngay
                  <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
