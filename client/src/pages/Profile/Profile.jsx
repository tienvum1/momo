import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  User, Edit3, Check, X, Shield,
  LogOut, Lock, ChevronLeft, Eye, EyeOff,
  Mail, ChevronRight
} from 'lucide-react';
import './Profile.scss';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName]     = useState('');
  const [updating, setUpdating]     = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm]         = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [showOld, setShowOld]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading]   = useState(false);

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
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Mật khẩu xác nhận không khớp');
    if (pwForm.newPassword.length < 6) return toast.error('Mật khẩu mới phải ít nhất 6 ký tự');
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setShowPwModal(false);
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

  const getRoleLabel = (role) => role === 'admin_system' ? 'Quản trị viên' : 'Khách hàng';

  if (loading) return (
    <div className="pf-loading">
      <div className="pf-spinner" />
      <p>Đang tải...</p>
    </div>
  );
  if (!user) return (
    <div className="pf-loading">
      <p>Không tìm thấy thông tin.</p>
      <button onClick={() => navigate('/login')} className="pf-login-btn">Đăng nhập lại</button>
    </div>
  );

  return (
    <div className="pf-page">
      {/* pink cloud blobs */}
      <div className="pf-blob pf-blob--1" />
      <div className="pf-blob pf-blob--2" />

      <div className="pf-wrap">

        {/* ── HERO CARD ── */}
        <div className="pf-hero-card">
          <button className="pf-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="pf-hero-body">
            <div className="pf-avatar-wrap">
              <div className="pf-avatar">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </div>
              <span className="pf-online-dot" />
            </div>
            <div>
              <h1 className="pf-hero-name">{user.full_name || 'Người dùng'}</h1>
              <span className="pf-role-badge">
                <Shield size={12} />
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN GRID ── */}
        <div className="pf-grid">

          {/* LEFT: Thông tin cá nhân */}
          <div className="pf-card">
            <div className="pf-card__title">
              <User size={16} color="#ec4899" />
              <span>Thông tin cá nhân</span>
            </div>

            {/* Họ và tên */}
            <div className="pf-field">
              <div className="pf-field__icon"><User size={16} /></div>
              <div className="pf-field__body">
                <span className="pf-field__label">HỌ VÀ TÊN</span>
                {editingName ? (
                  <div className="pf-edit-row">
                    <input
                      className="pf-input"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleUpdateName()}
                    />
                    <button className="pf-icon-btn pf-icon-btn--confirm" onClick={handleUpdateName} disabled={updating}>
                      <Check size={15} />
                    </button>
                    <button className="pf-icon-btn pf-icon-btn--cancel" onClick={() => { setEditingName(false); setFullName(user.full_name || ''); }}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <span className="pf-field__value">{user.full_name || '—'}</span>
                )}
              </div>
              {!editingName && (
                <button className="pf-edit-btn" onClick={() => setEditingName(true)}>
                  <Edit3 size={15} />
                </button>
              )}
            </div>

            {/* Email */}
            <div className="pf-field pf-field--last">
              <div className="pf-field__icon"><Mail size={16} /></div>
              <div className="pf-field__body">
                <span className="pf-field__label">ĐỊA CHỈ EMAIL</span>
                <span className="pf-field__value">{user.email}</span>
              </div>
              <span className="pf-verified-badge">
                <Check size={11} /> Đã xác thực
              </span>
            </div>


          </div>

          {/* RIGHT: Bảo mật */}
          <div className="pf-card">
            <div className="pf-card__title">
              <Shield size={16} color="#ec4899" />
              <span>Bảo mật &amp; Tài khoản</span>
            </div>

            <button className="pf-menu-item" onClick={() => setShowPwModal(true)}>
              <div className="pf-menu-icon">
                <Lock size={18} color="#ec4899" />
              </div>
              <div className="pf-menu-text">
                <span className="pf-menu-label">Đổi mật khẩu</span>
                <span className="pf-menu-desc">Cập nhật mật khẩu định kỳ để bảo vệ tài khoản</span>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </button>

            <button className="pf-menu-item pf-menu-item--logout" onClick={handleLogout}>
              <div className="pf-menu-icon pf-menu-icon--logout">
                <LogOut size={18} color="#ec4899" />
              </div>
              <div className="pf-menu-text">
                <span className="pf-menu-label">Đăng xuất</span>
                <span className="pf-menu-desc">Thoát khỏi phiên làm việc trên thiết bị này</span>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </button>
          </div>
        </div>

        {/* ── SECURITY FOOTER ── */}
        <div className="pf-footer">
          <div className="pf-footer__left">
            <Shield size={20} color="#ec4899" />
            <div>
              <p className="pf-footer__title">MoMo cam kết bảo mật tuyệt đối thông tin của bạn</p>
              <p className="pf-footer__sub">Mọi giao dịch và thông tin sẽ được bảo vệ theo tiêu chuẩn bảo mật quốc tế.</p>
            </div>
          </div>
          <div className="pf-footer__badges">
            <div className="pf-sec-badge">
              <Shield size={13} color="#ec4899" />
              <span>Secure<br /><strong>SSL Encryption</strong></span>
            </div>
            <div className="pf-sec-badge">
              <span className="pf-sec-logo">PCI<br /><strong>DSS</strong></span>
            </div>
            <div className="pf-sec-badge">
              <span className="pf-sec-logo pf-sec-logo--napas">napas</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── PASSWORD MODAL ── */}
      {showPwModal && (
        <div className="pf-modal-overlay" onClick={() => setShowPwModal(false)}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal__head">
              <h3>Đổi mật khẩu</h3>
              <button onClick={() => setShowPwModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleChangePassword}>
              {[
                { label: 'Mật khẩu hiện tại', key: 'oldPassword', show: showOld, toggle: () => setShowOld(v => !v) },
                { label: 'Mật khẩu mới',       key: 'newPassword', show: showNew, toggle: () => setShowNew(v => !v) },
                { label: 'Xác nhận mật khẩu',  key: 'confirm',     show: showConfirm, toggle: () => setShowConfirm(v => !v) },
              ].map(({ label, key, show, toggle }) => (
                <div className="pf-pw-field" key={key}>
                  <label>{label}</label>
                  <div className="pf-pw-wrap">
                    <input
                      type={show ? 'text' : 'password'}
                      value={pwForm[key]}
                      onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                      required
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={toggle}>
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="pf-modal__actions">
                <button type="button" className="pf-btn-cancel" onClick={() => setShowPwModal(false)}>Hủy</button>
                <button type="submit" className="pf-btn-save" disabled={pwLoading}>
                  {pwLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
