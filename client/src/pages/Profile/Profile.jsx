import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  User, Edit3, Check, X, Shield,
  LogOut, Lock, ChevronLeft, Eye, EyeOff
} from 'lucide-react';
import './Profile.scss';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState('');
  const [updating, setUpdating] = useState(false);

  // Đổi mật khẩu
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user);
        setFullName(res.data.user.full_name || '');
      })
      .catch(() => toast.error('Không thể tải thông tin cá nhân'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateName = async () => {
    if (!fullName.trim()) return toast.warn('Họ và tên không được để trống');
    setUpdating(true);
    try {
      const res = await api.put('/auth/profile', { full_name: fullName.trim() });
      setUser(res.data.user);
      setEditingName(false);
      toast.success('Cập nhật thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm)
      return toast.error('Mật khẩu xác nhận không khớp');
    if (pwForm.newPassword.length < 6)
      return toast.error('Mật khẩu mới phải ít nhất 6 ký tự');
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setShowChangePassword(false);
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await api.get('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getRoleLabel = (role) => role === 'admin_system' ? 'Quản trị hệ thống' : 'Khách hàng';

  if (loading) return (
    <div className="profile-loading"><div className="spinner"></div><p>Đang tải...</p></div>
  );
  if (!user) return (
    <div className="profile-error">
      <p>Không tìm thấy thông tin. Vui lòng đăng nhập lại.</p>
      <button onClick={() => navigate('/login')}>Đăng nhập</button>
    </div>
  );

  return (
    <div className="profile-container">
      <div className="profile-background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="profile-wrapper">
        {/* Header card */}
        <div className="profile-header-card">
          <button className="back-nav-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
          <div className="profile-hero">
            <div className="avatar-container">
              <div className="avatar-main">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="status-indicator online"></div>
            </div>
            <div className="hero-content">
              <h1>{user.full_name || 'Người dùng'}</h1>
              <div className="hero-badges">
                <span className={`badge-role ${user.role}`}>
                  <Shield size={12} style={{ marginRight: 4 }} />
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-grid-layout">
          {/* Thông tin cá nhân */}
          <div className="profile-main-content">
            <div className="content-card">
              <div className="card-header">
                <div className="header-title"><User size={18} /><span>Thông tin cá nhân</span></div>
              </div>
              <div className="card-body">
                <div className="profile-fields-list">
                  {/* Họ và tên */}
                  <div className="profile-field-item">
                    <div className="field-label">Họ và tên</div>
                    <div className="field-control">
                      {editingName ? (
                        <div className="field-edit-group">
                          <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            autoFocus
                          />
                          <div className="action-btns">
                            <button className="confirm-btn" onClick={handleUpdateName} disabled={updating}>
                              <Check size={18} />
                            </button>
                            <button className="cancel-btn" onClick={() => { setEditingName(false); setFullName(user.full_name || ''); }}>
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="field-display-group">
                          <span className="display-value">{user.full_name || 'Chưa thiết lập'}</span>
                          <button className="edit-btn" onClick={() => setEditingName(true)}><Edit3 size={16} /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email (readonly) */}
                  <div className="profile-field-item readonly">
                    <div className="field-label">Địa chỉ Email</div>
                    <div className="field-control">
                      <div className="field-display-group">
                        <span className="display-value">{user.email}</span>
                        <div className="readonly-badge">Cố định</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bảo mật */}
          <div className="profile-side-content">
            <div className="content-card settings-card">
              <div className="card-header">
                <div className="header-title"><Shield size={18} /><span>Bảo mật & Tài khoản</span></div>
              </div>
              <div className="card-body">
                <div className="settings-menu">
                  <button className="menu-item" onClick={() => setShowChangePassword(!showChangePassword)}>
                    <div className="menu-icon"><Lock size={18} /></div>
                    <div className="menu-text">
                      <span className="menu-label">Đổi mật khẩu</span>
                      <span className="menu-desc">Cập nhật mật khẩu định kỳ</span>
                    </div>
                  </button>
                  <button className="menu-item logout" onClick={handleLogout}>
                    <div className="menu-icon"><LogOut size={18} /></div>
                    <div className="menu-text">
                      <span className="menu-label">Đăng xuất</span>
                      <span className="menu-desc">Thoát khỏi phiên làm việc</span>
                    </div>
                  </button>
                </div>

                {/* Form đổi mật khẩu */}
                {showChangePassword && (
                  <form className="change-password-form" onSubmit={handleChangePassword}>
                    <div className="pw-field">
                      <label>Mật khẩu hiện tại</label>
                      <div className="pw-input-wrap">
                        <input
                          type={showOld ? 'text' : 'password'}
                          value={pwForm.oldPassword}
                          onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })}
                          required
                        />
                        <button type="button" onClick={() => setShowOld(!showOld)}>
                          {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="pw-field">
                      <label>Mật khẩu mới</label>
                      <div className="pw-input-wrap">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={pwForm.newPassword}
                          onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                          required
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)}>
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="pw-field">
                      <label>Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        value={pwForm.confirm}
                        onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                        required
                      />
                    </div>
                    <div className="pw-actions">
                      <button type="button" className="cancel-btn" onClick={() => setShowChangePassword(false)}>Hủy</button>
                      <button type="submit" className="save-btn" disabled={pwLoading}>
                        {pwLoading ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
