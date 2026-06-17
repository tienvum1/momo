import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Menu, X, LayoutDashboard, ShoppingCart } from 'lucide-react';
import './Header.scss';

const Header = ({ user, handleLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Left */}
        <div className="header-left">
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/" className="logo-container" onClick={() => setIsMenuOpen(false)}>
            <img
              src="/logo.svg"
              alt="Momo247 Logo"
              className="logo-img"
            />
          
          </Link>

          <nav className={`header-nav ${isMenuOpen ? 'mobile-open' : ''}`}>
            <Link to="/" className="nav-item" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link>
          </nav>
        </div>

        {/* Right */}
        <div className="header-right">
          {user ? (
            <div className="user-actions">

              <div className="user-profile">
                <div className="avatar-wrapper">
                  {user.picture ? (
                    <img src={user.picture} alt="Avatar" className="user-avatar" />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <p className="user-name">{user.full_name}</p>
                    <p className="user-email">{user.email}</p>
                    <span className="role-badge">
                      {user.role === 'admin_system' ? 'Admin' : 'Khách hàng'}
                    </span>
                  </div>
                  <hr />
                  <Link to="/profile" className="dropdown-item">
                    <User size={16} /> Hồ sơ cá nhân
                  </Link>
                  {user.role === 'user' && (
                    <Link to="/my-bookings" className="dropdown-item">
                      <ShoppingCart size={16} /> Đơn của tôi
                    </Link>
                  )}
                  {user.role === 'admin_system' && (
                    <>
                      <Link to="/admin/users" className="dropdown-item admin-portal-btn">
                        <LayoutDashboard size={16} /> Quản lý hệ thống
                      </Link>
                      <Link to="/my-bookings" className="dropdown-item">
                        <ShoppingCart size={16} /> Đơn của tôi
                      </Link>
                    </>
                  )}
                  <hr />
                  <button onClick={handleLogout} className="dropdown-item logout-item">
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-link">Đăng nhập</Link>
              <Link to="/register" className="register-btn">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMenuOpen(false)}></div>
      )}
    </header>
  );
};

export default Header;
