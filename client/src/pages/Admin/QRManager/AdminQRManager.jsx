import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Edit2, XCircle, Eye, EyeOff, QrCode, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../api/axios';
import './AdminQRManager.scss';

const formatMoney = (value) => {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('vi-VN');
};

const statusLabel = (status) => (status === 'ready' ? 'Sẵn sàng' : 'Bảo trì');

const EMPTY_FORM = {
  name: '',
  max_amount_per_trans: '',
  monthly_limit: '',
  fee_rate: '',
  fee_rate_under: '',
  fee_rate_over: '',
  status: 'ready',
};

const AdminQRManager = () => {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQR, setEditingQR] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [qrImageFile, setQrImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [qrImagePreview, setQrImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail preview modal
  const [previewQR, setPreviewQR] = useState(null);

  // Delete confirm
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, qr: null });

  const fetchQRs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/qrs');
      setQrs(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Không thể tải danh sách QR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQRs(); }, [fetchQRs]);

  // Derived filtered list
  const filtered = qrs.filter((q) => {
    const matchSearch =
      !search ||
      (q.name || '').toLowerCase().includes(search.toLowerCase()) ||
      String(q.id).includes(search);
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: qrs.length,
    ready: qrs.filter((q) => q.status === 'ready').length,
    maintenance: qrs.filter((q) => q.status === 'maintenance').length,
  };

  // ── Open / close modal ──────────────────────────────────────
  const handleOpenModal = (qr = null) => {
    setEditingQR(qr);
    if (qr) {
      setFormData({
        name: qr.name || '',
        max_amount_per_trans: qr.max_amount_per_trans ?? '',
        monthly_limit: qr.monthly_limit ?? '',
        fee_rate: qr.fee_rate ?? '',
        fee_rate_under: qr.fee_rate_under ?? '',
        fee_rate_over: qr.fee_rate_over ?? '',
        status: qr.status || 'ready',
      });
      setMainImagePreview(qr.main_image || null);
      setQrImagePreview(qr.qr_image || null);
    } else {
      setFormData(EMPTY_FORM);
      setMainImagePreview(null);
      setQrImagePreview(null);
    }
    setMainImageFile(null);
    setQrImageFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingQR(null);
    setMainImageFile(null);
    setQrImageFile(null);
    setMainImagePreview(null);
    setQrImagePreview(null);
  };

  // ── File inputs ─────────────────────────────────────────────
  const handleFileChange = (field) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (field === 'main_image') {
      setMainImageFile(file);
      setMainImagePreview(url);
    } else {
      setQrImageFile(file);
      setQrImagePreview(url);
    }
  };

  // ── Submit create / update ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingQR && (!mainImageFile || !qrImageFile)) {
      toast.error('Vui lòng chọn đủ ảnh đại diện và ảnh mã QR');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('max_amount_per_trans', formData.max_amount_per_trans);
      fd.append('monthly_limit', formData.monthly_limit);
      fd.append('fee_rate', formData.fee_rate);
      fd.append('fee_rate_under', formData.fee_rate_under);
      fd.append('fee_rate_over', formData.fee_rate_over);
      fd.append('status', formData.status);
      if (mainImageFile) fd.append('main_image', mainImageFile);
      if (qrImageFile) fd.append('qr_image', qrImageFile);

      if (editingQR) {
        await api.put(`/qrs/${editingQR.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Cập nhật QR thành công');
      } else {
        await api.post('/qrs', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Tạo QR mới thành công');
      }
      handleCloseModal();
      fetchQRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu QR');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle status ────────────────────────────────────────────
  const handleToggleStatus = async (qr) => {
    const newStatus = qr.status === 'ready' ? 'maintenance' : 'ready';
    try {
      await api.patch(`/qrs/${qr.id}/status`, { status: newStatus });
      toast.success(`Đã chuyển sang trạng thái "${statusLabel(newStatus)}"`);
      fetchQRs();
    } catch {
      toast.error('Lỗi khi đổi trạng thái');
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal.qr) return;
    try {
      await api.delete(`/qrs/${deleteModal.qr.id}`);
      toast.success('Đã xóa QR thành công');
      setDeleteModal({ isOpen: false, qr: null });
      fetchQRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa QR');
    }
  };

  return (
    <div className="admin-qr-page">
      {/* Stats */}
      <div className="qr-stats-grid">
        {[
          { label: 'Tổng QR', value: stats.total },
          { label: 'Sẵn sàng', value: stats.ready },
          { label: 'Bảo trì', value: stats.maintenance },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-info">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="qr-toolbar">
        <div className="qr-title">
          <h1>Quản lý QR</h1>
        </div>
        <div className="qr-controls">
          <div className="search-box">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, ID..."
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="ready">Sẵn sàng</option>
            <option value="maintenance">Bảo trì</option>
          </select>
          <button className="add-qr-btn" onClick={() => handleOpenModal()}>
            <Plus size={16} /> Thêm QR
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-shell">
        <table className="qr-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ảnh</th>
              <th>Tên QR</th>
              <th>Hạn mức/lần</th>
              <th>Hạn mức tháng</th>
              <th>Phí &lt;5tr (%)</th>
              <th>Phí ≥5tr (%)</th>
              <th>Trạng thái</th>
              <th>Người tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="empty">Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="empty">Không có dữ liệu QR.</td></tr>
            ) : filtered.map((qr) => (
              <tr key={qr.id}>
                <td>#{qr.id}</td>
                <td>
                  {qr.main_image ? (
                    <img src={qr.main_image} alt={qr.name} className="qr-thumb" />
                  ) : (
                    <div className="qr-thumb-empty"><QrCode size={20} /></div>
                  )}
                </td>
                <td className="qr-name-cell">{qr.name || '—'}</td>
                <td>{formatMoney(qr.max_amount_per_trans)} đ</td>
                <td>{qr.monthly_limit ? `${formatMoney(qr.monthly_limit)} đ` : '—'}</td>
                <td>{Number(qr.fee_rate_under)}%</td>
                <td>{Number(qr.fee_rate_over)}%</td>
                <td>
                  <span className={`status-badge ${qr.status}`}>{statusLabel(qr.status)}</span>
                </td>
                <td>{qr.creator_name || '—'}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn preview"
                      title="Xem chi tiết"
                      onClick={() => setPreviewQR(qr)}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className="icon-btn edit"
                      title="Chỉnh sửa"
                      onClick={() => handleOpenModal(qr)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className={`icon-btn toggle ${qr.status === 'ready' ? 'pause' : 'play'}`}
                      title={qr.status === 'ready' ? 'Tạm ngưng' : 'Kích hoạt'}
                      onClick={() => handleToggleStatus(qr)}
                    >
                      {qr.status === 'ready' ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>
                    <button
                      className="icon-btn delete"
                      title="Xóa QR"
                      onClick={() => setDeleteModal({ isOpen: true, qr })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="qr-modal-content">
            <div className="modal-header">
              <h2>{editingQR ? 'Chỉnh sửa QR' : 'Thêm QR mới'}</h2>
              <button className="close-btn" onClick={handleCloseModal}><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Tên QR</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: MoMo Chính, Techcombank..."
                  />
                </div>
                <div className="form-group">
                  <label>Hạn mức tối đa / giao dịch (đ) <span className="required">*</span></label>
                  <input
                    type="number" required min="0"
                    value={formData.max_amount_per_trans}
                    onChange={(e) => setFormData({ ...formData, max_amount_per_trans: e.target.value })}
                    placeholder="VD: 50000000"
                  />
                </div>
                <div className="form-group">
                  <label>Hạn mức tháng (đ)</label>
                  <input
                    type="number" min="0"
                    value={formData.monthly_limit}
                    onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                    placeholder="Để trống nếu không giới hạn"
                  />
                </div>
                <div className="form-group">
                  <label>Phí giao dịch dưới 5 triệu (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={formData.fee_rate_under}
                    onChange={(e) => setFormData({ ...formData, fee_rate_under: e.target.value })}
                    placeholder="VD: 2"
                  />
                </div>
                <div className="form-group">
                  <label>Phí giao dịch từ 5 triệu trở lên (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={formData.fee_rate_over}
                    onChange={(e) => setFormData({ ...formData, fee_rate_over: e.target.value })}
                    placeholder="VD: 1.5"
                  />
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ready">Sẵn sàng</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>
                {/* Image uploads */}
                <div className="form-group">
                  <label>
                    Ảnh đại diện {!editingQR && <span className="required">*</span>}
                    {editingQR && <span className="hint"> (để trống để giữ ảnh cũ)</span>}
                  </label>
                  <div className="image-upload-box">
                    {mainImagePreview && (
                      <img src={mainImagePreview} alt="preview" className="upload-preview" />
                    )}
                    <label className="upload-btn" htmlFor="main_image_input">
                      Chọn ảnh
                    </label>
                    <input
                      id="main_image_input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange('main_image')}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    Ảnh mã QR {!editingQR && <span className="required">*</span>}
                    {editingQR && <span className="hint"> (để trống để giữ ảnh cũ)</span>}
                  </label>
                  <div className="image-upload-box">
                    {qrImagePreview && (
                      <img src={qrImagePreview} alt="qr preview" className="upload-preview" />
                    )}
                    <label className="upload-btn" htmlFor="qr_image_input">
                      Chọn ảnh
                    </label>
                    <input
                      id="qr_image_input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange('qr_image')}
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>Hủy</button>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingQR ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Preview Modal ────────────────────────────────────────── */}
      {previewQR && (
        <div className="modal-overlay" onClick={() => setPreviewQR(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết QR #{previewQR.id}</h2>
              <button className="close-btn" onClick={() => setPreviewQR(null)}><XCircle size={24} /></button>
            </div>
            <div className="preview-body">
              <div className="preview-images">
                {previewQR.main_image && (
                  <div className="preview-image-block">
                    <span>Ảnh đại diện</span>
                    <img src={previewQR.main_image} alt="main" />
                  </div>
                )}
                {previewQR.qr_image && (
                  <div className="preview-image-block">
                    <span>Mã QR</span>
                    <img src={previewQR.qr_image} alt="qr" />
                  </div>
                )}
              </div>
              <div className="preview-info">
                <div className="info-row"><span>Tên</span><strong>{previewQR.name || '—'}</strong></div>
                <div className="info-row"><span>Hạn mức/lần</span><strong>{formatMoney(previewQR.max_amount_per_trans)} đ</strong></div>
                <div className="info-row"><span>Hạn mức tháng</span><strong>{previewQR.monthly_limit ? `${formatMoney(previewQR.monthly_limit)} đ` : '—'}</strong></div>
                <div className="info-row"><span>Phí &lt;5 triệu</span><strong>{Number(previewQR.fee_rate_under)}%</strong></div>
                <div className="info-row"><span>Phí ≥5 triệu</span><strong>{Number(previewQR.fee_rate_over)}%</strong></div>
                <div className="info-row"><span>Trạng thái</span><strong><span className={`status-badge ${previewQR.status}`}>{statusLabel(previewQR.status)}</span></strong></div>
                <div className="info-row"><span>Người tạo</span><strong>{previewQR.creator_name || '—'}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────── */}
      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal-content delete-modal">
            <div className="modal-icon-warning"><Trash2 size={48} color="#ef4444" /></div>
            <h3>Xác nhận xóa QR</h3>
            <p>
              Bạn có chắc chắn muốn xóa QR <strong>{deleteModal.qr?.name || `#${deleteModal.qr?.id}`}</strong>?
              <br /><span className="danger-text">Hành động này không thể hoàn tác.</span>
            </p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setDeleteModal({ isOpen: false, qr: null })}>Hủy bỏ</button>
              <button className="confirm-btn delete-btn" onClick={handleDelete}>Xóa ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQRManager;
