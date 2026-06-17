import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import './AdminBookingManager.scss';

const formatMoney = (value) => {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('vi-VN');
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const statusLabel = (status) => {
  const map = {
    created: 'Chờ thanh toán',
    customer_paid: 'Đang xử lý',
    confirmed: 'Hoàn thành',
    rejected: 'Từ chối',
    cancelled: 'Đã hủy',
  };
  return map[status] || status;
};

const shortCode = (code) => String(code || '').slice(-6);

const DATE_OPTIONS = [
  { label: 'Tất cả thời gian', value: 'all' },
  { label: 'Hôm nay', value: 'today' },
  { label: '7 ngày qua', value: '7days' },
  { label: '30 ngày qua', value: '30days' },
  { label: 'Tháng này', value: 'thisMonth' },
];

const AdminBookingManager = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0, pending: 0, processing: 0,
    completed: 0, rejected: 0, cancelled: 0,
    total_revenue: 0, total_fee: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('thisMonth');
  const [qrNameFilter, setQrNameFilter] = useState('');
  const [qrList, setQrList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 20;

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, bookingId: null, shortCode: '' });

  useEffect(() => {
    api.get('/qrs').then(res => {
      const names = [...new Set((res.data || []).map(q => q.name).filter(Boolean))].sort();
      setQrList(names);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchTerm.trim() || undefined,
      qrName: qrNameFilter.trim() || undefined,
      dateRange: dateFilter === 'all' ? undefined : dateFilter,
      page: currentPage,
      limit: itemsPerPage,
    };
    try {
      const res = await api.get('/bookings/admin/list', { params });
      setBookings(Array.isArray(res.data.data) ? res.data.data : []);
      setTotalPages(res.data.totalPages || 0);
      setStats(res.data.stats || {});
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm, qrNameFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteBooking = async () => {
    try {
      await api.delete(`/admin/bookings/${deleteModal.bookingId}`);
      toast.success('Đã xóa đơn hàng thành công');
      setDeleteModal({ isOpen: false, bookingId: null, shortCode: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa đơn hàng');
    }
  };

  const handlePageChange = (p) => { setCurrentPage(p); window.scrollTo(0, 0); };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div className="pagination">
        <button type="button" className="page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
        {start > 1 && (<><button type="button" className="page-btn" onClick={() => handlePageChange(1)}>1</button>{start > 2 && <span className="page-ellipsis">...</span>}</>)}
        {pages.map(p => <button key={p} type="button" className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>)}
        {end < totalPages && (<>{end < totalPages - 1 && <span className="page-ellipsis">...</span>}<button type="button" className="page-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button></>)}
        <button type="button" className="page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
      </div>
    );
  };

  return (
    <div className="admin-booking-page">
      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Tổng đơn', value: stats.total },
          { label: 'Chờ thanh toán', value: stats.pending },
          { label: 'Đang xử lý', value: stats.processing },
          { label: 'Hoàn thành', value: stats.completed },
          { label: 'Từ chối', value: stats.rejected },
          { label: 'Đã hủy', value: stats.cancelled },
          { label: 'Doanh thu', value: `${formatMoney(stats.total_revenue)} đ` },
          { label: 'Tổng phí', value: `${formatMoney(stats.total_fee)} đ` },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-info">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value ?? 0}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="booking-toolbar">
        <div className="booking-title"><h1>Quản lý đơn hàng</h1></div>
        <div className="booking-controls">
          <div className="search-box">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Mã đơn, tên khách, email..."
            />
          </div>
          <select value={qrNameFilter} onChange={handleFilterChange(setQrNameFilter)}>
            <option value="">Tất cả QR</option>
            {qrList.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="created">Chờ thanh toán</option>
            <option value="customer_paid">Đang xử lý</option>
            <option value="confirmed">Hoàn thành</option>
            <option value="rejected">Từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select value={dateFilter} onChange={handleFilterChange(setDateFilter)}>
            {DATE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-shell">
        <table className="booking-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Mã đơn</th>
              <th>QR</th>
              <th>Khách hàng</th>
              <th>Tiền chuyển</th>
              <th>Phí</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="empty">Đang tải...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={9} className="empty">Không có dữ liệu đơn hàng.</td></tr>
            ) : bookings.map((b) => (
              <tr key={b.id}>
                <td>#{b.id}</td>
                <td><span className="mono">{shortCode(b.code)}</span></td>
                <td>{b.qr_name || '—'}</td>
                <td>
                  <div className="customer-cell">
                    <span className="name">{b.customer_name || '—'}</span>
                    <span className="email">{b.customer_email || ''}</span>
                  </div>
                </td>
                <td><span className="money-value">{formatMoney(b.transfer_amount)} đ</span></td>
                <td>{b.fee_rate}%</td>
                <td><span className={`status-text ${b.status}`}>{statusLabel(b.status)}</span></td>
                <td>{formatDateTime(b.created_at)}</td>
                <td>
                  <div className="row-actions">
                    <button className="detail-view-btn" onClick={() => navigate(`/admin/bookings/${b.id}`)}>Chi tiết</button>
                    <button
                      className="delete-booking-btn"
                      onClick={() => setDeleteModal({ isOpen: true, bookingId: b.id, shortCode: shortCode(b.code) })}
                      title="Xóa đơn"
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

      {renderPagination()}

      {/* Delete modal */}
      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal-content delete-modal">
            <div className="modal-icon-warning"><Trash2 size={48} color="#ef4444" /></div>
            <h3>Xác nhận xóa đơn hàng</h3>
            <p>
              Bạn có chắc chắn muốn xóa đơn hàng <strong>#{deleteModal.shortCode}</strong>?
              <br /><span className="danger-text">Hành động này không thể hoàn tác.</span>
            </p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setDeleteModal({ isOpen: false, bookingId: null, shortCode: '' })}>Hủy bỏ</button>
              <button className="confirm-btn delete-btn" onClick={handleDeleteBooking}>Xóa đơn ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingManager;
