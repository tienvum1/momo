import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import './QRManager.scss';

const StaffQRManager = () => {
  const navigate = useNavigate();
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQr, setEditingQr] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [togglingEditId, setTogglingEditId] = useState(null);
  const [togglingNotifyId, setTogglingNotifyId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  
  // Form states
  const [mainImageFile, setMainImageFile] = useState(null);
  const [qrImageFile, setQrImageFile] = useState(null);
  const [qrName, setQrName] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [feeRate, setFeeRate] = useState('');
  const [baseFeeRate, setBaseFeeRate] = useState('');
  const [feeRateL1, setFeeRateL1] = useState('');
  const [feeRateL2, setFeeRateL2] = useState('');
  const [feeRateL3, setFeeRateL3] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('ready');
  const [isNotifyTelegram, setIsNotifyTelegram] = useState(true);

  const refreshQRs = async () => {
    try {
      const res = await api.get('/qrs');
      setQrs(res.data);
    } catch {
      // toast.error sẽ được handle bởi axios interceptor
    }
  };

  useEffect(() => {
    const fetchQRs = async () => {
      try {
        const res = await api.get('/qrs');
        setQrs(res.data);
      } catch {
        // toast.error sẽ được handle bởi axios interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchQRs();
  }, []);

  const resetForm = () => {
    setMainImageFile(null);
    setQrImageFile(null);
    setQrName('');
    setMaxAmount('');
    setFeeRate('');
    setBaseFeeRate('');
    setFeeRateL1('');
    setFeeRateL2('');
    setFeeRateL3('');
    setNote('');
    setStatus('ready');
    setIsNotifyTelegram(true);
    setEditingQr(null);
  };

  const handleEdit = (qr) => {
    setEditingQr(qr);
    setQrName(qr.name || '');
    setMaxAmount(qr.max_amount_per_trans ? Math.round(qr.max_amount_per_trans).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
    setFeeRate(qr.fee_rate);
    setBaseFeeRate(qr.base_fee_rate || '');
    setFeeRateL1(qr.fee_rate_l1 || '');
    setFeeRateL2(qr.fee_rate_l2 || '');
    setFeeRateL3(qr.fee_rate_l3 || '');
    setNote(qr.note || '');
    setStatus(qr.status || 'ready');
    setIsNotifyTelegram(qr.is_notify_telegram ?? true);
    setShowModal(true);
  };

  const handleMaxAmountChange = (e) => {
    // Chỉ giữ lại số
    const raw = e.target.value.replace(/\./g, '');
    if (raw === '' || /^\d+$/.test(raw)) {
      // Định dạng lại với dấu chấm
      const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      setMaxAmount(formatted);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // chặn double-submit
    setSubmitting(true);

    const formData = new FormData();
    if (mainImageFile) formData.append('main_image', mainImageFile);
    if (qrImageFile) formData.append('qr_image', qrImageFile);
    formData.append('name', qrName);
    // Xóa dấu chấm trước khi gửi lên server
    const cleanMaxAmount = maxAmount.replace(/\./g, '');
    formData.append('max_amount_per_trans', cleanMaxAmount);
    
    formData.append('fee_rate', feeRate);
    formData.append('base_fee_rate', baseFeeRate);
    formData.append('fee_rate_l1', feeRateL1);
    formData.append('fee_rate_l2', feeRateL2);
    formData.append('fee_rate_l3', feeRateL3);
    formData.append('note', note);
    formData.append('status', status);
    formData.append('is_notify_telegram', isNotifyTelegram ? '1' : '0');
    
    try {
      if (editingQr) {
        await api.put(`/qrs/${editingQr.id}`, formData);
      } else {
        await api.post('/qrs', formData);
      }
      setShowModal(false);
      resetForm();
      refreshQRs();
    } catch (err) {
      console.error('Lỗi chi tiết:', err.response?.data || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleToggleStatus = async (qr) => {
    const nextStatus = qr.status === 'ready' ? 'maintenance' : 'ready';
    setUpdatingId(qr.id);
    try {
      await api.patch(`/qrs/${qr.id}/status`, { status: nextStatus });
      await refreshQRs();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleAccountantEditable = async (qr) => {
    setTogglingEditId(qr.id);
    try {
      await api.patch(`/qrs/${qr.id}/accountant-editable`);
      await refreshQRs();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingEditId(null);
    }
  };

  const handleToggleNotifyTele = async (qr) => {
    if (togglingNotifyId === qr.id) return;
    const nextNotifyState = !qr.is_notify_telegram;
    setTogglingNotifyId(qr.id);
    try {
      const formData = new FormData();
      formData.append('is_notify_telegram', nextNotifyState ? '1' : '0');
      await api.put(`/qrs/${qr.id}`, formData);
      setQrs((prev) =>
        prev.map((item) =>
          item.id === qr.id ? { ...item, is_notify_telegram: nextNotifyState } : item
        )
      );
    } catch (err) {
      console.error(err);
      await refreshQRs();
    } finally {
      setTogglingNotifyId(null);
    }
  };

  const filteredQrs = qrs.filter((qr) => {
    return statusFilter === 'all' ? true : qr.status === statusFilter;
  });

  return (
    <div className="staff-qr-page">
      {/* ── Header ── */}
      <div className="acc-qr-header">
        <div className="back-btn-wrapper">
          <button className="back-btn" onClick={() => navigate('/admin')}>
            ← Quay lại
          </button>
        </div>
        <div className="acc-qr-title">
          <h1>Quản lý QR</h1>
          <p>{qrs.length} thẻ — {qrs.filter(qr => qr.accountant_editable).length} được phép chỉnh sửa</p>
        </div>
        <div className="acc-qr-controls">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="ready">Sẵn sàng</option>
            <option value="maintenance">Bảo trì</option>
          </select>
          <button
            className="add-qr-btn"
            onClick={() => {
              resetForm();
              setSubmitting(false);
              setShowModal(true);
            }}
          >
            + Thêm thẻ mới
          </button>
        </div>
      </div>

      <div className="table-shell desktop-only">
        {/* ... (keep desktop table as is or similar) */}
        <table className="qr-table">
          <thead>
            <tr>
              <th className="th-stt">ID</th>
              <th>Tên QR</th>
              <th className="th-img">Ảnh đại diện</th>
              <th className="th-img">Ảnh QR</th>
              <th className="th-money">Hạn mức</th>
              <th className="th-fee">Phí gốc</th>
              <th className="th-fee">Phí Def</th>
              <th className="th-fee">Phí L1</th>
              <th className="th-fee">Phí L2</th>
              <th className="th-fee">Phí L3</th>
              <th className="th-status">Trạng thái QR</th>
              <th className="th-status">Thông báo Tele</th>
              <th className="th-status">Kế toán sửa</th>
              <th className="th-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredQrs.length === 0 ? (
              <tr>
                <td colSpan={13} className="empty">
                  Không có dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              filteredQrs.map((qr) => {
                const statusText = qr.status === 'ready' ? 'Sẵn sàng' : 'Bảo trì';
                return (
                  <tr key={qr.id}>
                    <td data-label="ID" className="td-stt">#{qr.id}</td>
                    <td data-label="Tên QR"><span style={{ fontWeight: 600 }}>{qr.name || '—'}</span></td>
                    <td data-label="Ảnh đại diện" className="td-img">
                      <div className="qr-cell">
                        <button type="button" className="qr-thumb-btn" onClick={() => setPreviewImageUrl(qr.main_image)}>
                          <img className="qr-thumb" src={qr.main_image} alt={`Main ${qr.id}`} />
                        </button>
                      </div>
                    </td>
                    <td data-label="Ảnh QR" className="td-img">
                      <div className="qr-cell">
                        <button type="button" className="qr-thumb-btn" onClick={() => setPreviewImageUrl(qr.qr_image)}>
                          <img className="qr-thumb" src={qr.qr_image} alt={`QR ${qr.id}`} />
                        </button>
                      </div>
                    </td>
                    <td data-label="Hạn mức" className="td-money">
                      <span className="money-value">{formatMoney(qr.max_amount_per_trans)}</span>
                    </td>
                    <td data-label="Phí gốc" className="td-fee"><span className="fee-badge base">{qr.base_fee_rate || 0}%</span></td>
                    <td data-label="Phí Def" className="td-fee"><span className="fee-badge def">{qr.fee_rate}%</span></td>
                    <td data-label="Phí L1" className="td-fee"><span className="fee-badge l1">{qr.fee_rate_l1}%</span></td>
                    <td data-label="Phí L2" className="td-fee"><span className="fee-badge l2">{qr.fee_rate_l2}%</span></td>
                    <td data-label="Phí L3" className="td-fee"><span className="fee-badge l3">{qr.fee_rate_l3}%</span></td>
                    <td data-label="Trạng thái QR" className="td-status">
                      <button
                        type="button"
                        className={`status-toggle-btn ${qr.status !== 'ready' ? 'inactive' : ''}`}
                        onClick={() => handleToggleStatus(qr)}
                        disabled={updatingId === qr.id}
                      >
                        {statusText}
                      </button>
                    </td>
                    <td data-label="Thông báo Tele" className="td-status">
                      <button
                        type="button"
                        className={`status-toggle-btn ${qr.is_notify_telegram ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleNotifyTele(qr)}
                        disabled={togglingNotifyId === qr.id}
                      >
                        {togglingNotifyId === qr.id ? 'Đang lưu...' : qr.is_notify_telegram ? '✓ Bật' : '✗ Tắt'}
                      </button>
                    </td>
                    <td data-label="Kế toán sửa" className="td-status">
                      <button
                        type="button"
                        className={`status-toggle-btn ${qr.accountant_editable ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleAccountantEditable(qr)}
                        disabled={togglingEditId === qr.id}
                      >
                        {qr.accountant_editable ? '✓ Bật' : '✗ Tắt'}
                      </button>
                    </td>
                    <td data-label="Thao tác" className="td-actions">
                      <div className="row-actions">
                        <button type="button" className="ghost-btn" onClick={() => handleEdit(qr)}>Sửa</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="qr-mobile-list mobile-only">
        {filteredQrs.length === 0 ? (
          <div className="empty">Không có dữ liệu phù hợp.</div>
        ) : (
          filteredQrs.map((qr) => (
            <div key={qr.id} className="acc-qr-card">
              <div className="card-images">
                <div className="card-img-wrap" onClick={() => setPreviewImageUrl(qr.main_image)}>
                  <img src={qr.main_image} alt={`Ảnh đại diện ${qr.name}`} />
                  <span className="img-label">Ảnh đại diện</span>
                </div>
                <div className="card-img-wrap" onClick={() => setPreviewImageUrl(qr.qr_image)}>
                  <img src={qr.qr_image} alt={`Mã QR ${qr.name}`} />
                  <span className="img-label">Mã QR</span>
                </div>
              </div>

              <div className="card-body">
                <div className="card-name">#{qr.id} — {qr.name || '—'}</div>
                
                <div className="card-rows">
                  <div className="card-row">
                    <span className="row-label">Hạn mức</span>
                    <span className="row-value money">{formatMoney(qr.max_amount_per_trans)} VNĐ</span>
                  </div>
                  <div className="card-row note-row">
                    <span className="row-label">Ghi chú</span>
                    <div 
                      className={`row-value note ${expandedNotes[qr.id] ? 'expanded' : ''}`}
                      onClick={() => qr.note && setExpandedNotes(prev => ({ ...prev, [qr.id]: !prev[qr.id] }))}
                    >
                      {qr.note || '—'}
                      {!expandedNotes[qr.id] && qr.note && qr.note.split('\n').length > 3 && (
                        <span className="expand-trigger">...</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="fee-grid">
                  <div className="fee-item">
                    <span className="fee-label">Phí gốc</span>
                    <span className="fee-val base">{qr.base_fee_rate || 0}%</span>
                  </div>
                  <div className="fee-item">
                    <span className="fee-label">Phí mặc định</span>
                    <span className="fee-val def">{qr.fee_rate}%</span>
                  </div>
                  <div className="fee-item">
                    <span className="fee-label">Phí Cấp 1</span>
                    <span className="fee-val l1">{qr.fee_rate_l1}%</span>
                  </div>
                  <div className="fee-item">
                    <span className="fee-label">Phí Cấp 2</span>
                    <span className="fee-val l2">{qr.fee_rate_l2}%</span>
                  </div>
                  <div className="fee-item">
                    <span className="fee-label">Phí Cấp 3</span>
                    <span className="fee-val l3">{qr.fee_rate_l3}%</span>
                  </div>
                </div>

                <div className="card-status-wrapper">
                  <div className={`status-pill ${qr.status}`} onClick={() => handleToggleStatus(qr)}>
                    {qr.status === 'ready' ? '● Sẵn sàng' : '● Bảo trì'}
                  </div>
                  <div 
                    className={`status-pill accountant-edit ${qr.accountant_editable ? 'active' : ''}`} 
                    onClick={() => handleToggleAccountantEditable(qr)}
                  >
                    {qr.accountant_editable ? '● Kế toán: Được sửa' : '● Kế toán: Tắt sửa'}
                  </div>
                  <div 
                    className={`status-pill tele-notify ${qr.is_notify_telegram ? 'active' : ''}`} 
                    onClick={() => handleToggleNotifyTele(qr)}
                  >
                    {togglingNotifyId === qr.id ? '● Tele: Đang lưu...' : qr.is_notify_telegram ? '● Tele: Bật' : '● Tele: Tắt'}
                  </div>
                </div>

                <button type="button" className="edit-btn-mobile" onClick={() => handleEdit(qr)}>
                  ✏️ Chỉnh sửa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {previewImageUrl && (
        <div className="image-preview-overlay" onClick={() => setPreviewImageUrl(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="image-preview-close"
              onClick={() => setPreviewImageUrl(null)}
              aria-label="Đóng"
            >
              ×
            </button>
            <img src={previewImageUrl} alt="QR preview" className="image-preview-img" />
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingQr ? 'Chỉnh sửa QR' : 'Thêm QR mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên QR:</label>
                <input
                  type="text"
                  value={qrName}
                  onChange={(e) => setQrName(e.target.value)}
                  placeholder="Ví dụ: Thẻ Visa Vietcombank"
                  required
                />
              </div>
              <div className="form-group">
                <label>Ảnh đại diện (hiển thị ở Card ngoài):</label>
                {editingQr && editingQr.main_image && (
                  <div className="current-img-hint">Đã có ảnh. Tải lên ảnh mới nếu muốn thay đổi.</div>
                )}
                <input type="file" accept="image/*" onChange={(e) => setMainImageFile(e.target.files[0])} required={!editingQr} />
                </div>
                <div className="form-group">
                  <label>Ảnh mã QR (khách quét):</label>
                  {editingQr && editingQr.qr_image && (
                    <div className="current-img-hint">Đã có mã QR. Tải lên mã mới nếu muốn thay đổi.</div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => setQrImageFile(e.target.files[0])} required={!editingQr} />
                </div>
              <div className="form-group">
                <label>Hạn mức tối đa:</label>
                <input 
                  type="text" 
                  value={maxAmount} 
                  onChange={handleMaxAmountChange} 
                  placeholder="Ví dụ: 4.000.000"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Tỷ lệ phí mặc định (%):</label>
                <input type="number" step="0.01" value={feeRate} onChange={(e) => setFeeRate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Phí gốc (%):</label>
                <input type="number" step="0.01" value={baseFeeRate} onChange={(e) => setBaseFeeRate(e.target.value)} placeholder="Phí thực tế ngân hàng thu" />
              </div>
              <div className="fee-levels-grid">
                <div className="form-group">
                  <label>Phí Cấp 1 (%):</label>
                  <input type="number" step="0.01" value={feeRateL1} onChange={(e) => setFeeRateL1(e.target.value)} placeholder="Mặc định" />
                </div>
                <div className="form-group">
                  <label>Phí Cấp 2 (%):</label>
                  <input type="number" step="0.01" value={feeRateL2} onChange={(e) => setFeeRateL2(e.target.value)} placeholder="Mặc định" />
                </div>
                <div className="form-group">
                  <label>Phí Cấp 3 (%):</label>
                  <input type="number" step="0.01" value={feeRateL3} onChange={(e) => setFeeRateL3(e.target.value)} placeholder="Mặc định" />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú:</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Trạng thái:</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ready">Sẵn sàng</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={isNotifyTelegram} 
                    onChange={(e) => setIsNotifyTelegram(e.target.checked)} 
                  />
                  Gửi thông báo Telegram khi có đơn mới
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-btn" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button type="button" className="cancel-btn" disabled={submitting} onClick={() => setShowModal(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffQRManager;
