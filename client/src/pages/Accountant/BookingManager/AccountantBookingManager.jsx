import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import './AccountantBookingManager.scss';

const AccountantBookingManager = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending_count: 0,
    completed_count: 0,
    total_amount: 0,
    total_base_fee: 0,
    total_transfer: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [validFilter, setValidFilter] = useState('');
  const [dateRange, setDateRange] = useState('all');
  
  // Phân trang
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);
  
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bookings/accountant/list?search=${search}&status=${statusFilter}&is_valid=${validFilter}&dateRange=${dateRange}&page=${page}&limit=${limit}`);
      
      // Parse JSON proof urls for all bookings
      const processedData = res.data.data.map(b => {
        let urls = [];
        try {
          if (b.accountant_paid_proof_urls) {
            urls = typeof b.accountant_paid_proof_urls === 'string' 
              ? JSON.parse(b.accountant_paid_proof_urls) 
              : b.accountant_paid_proof_urls;
          } else if (b.accountant_paid_proof_url) {
            urls = [b.accountant_paid_proof_url];
          }
        } catch (error) {
          console.error('Lỗi parse proof urls:', error);
          urls = b.accountant_paid_proof_url ? [b.accountant_paid_proof_url] : [];
        }
        return { ...b, proof_urls: urls };
      });

      setBookings(processedData);
      setStats(res.data.stats);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, validFilter, dateRange, page, limit]);

  useEffect(() => {
    const init = async () => {
      await fetchBookings();
    };
    init();
  }, [fetchBookings]);

  // Reset page khi filter thay đổi
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleValidChange = (e) => {
    setValidFilter(e.target.value);
    setPage(1);
  };

  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
    setPage(1);
  };

  const formatMoney = (amount) => {
    const n = Math.round(Number(amount) || 0);
    return n.toLocaleString('vi-VN') ;
  };

  const getStatusBadge = (booking) => {
    switch (booking.accountant_status) {
      case 'pending':
        return <span className="badge-warning">Chờ chuyển tiền</span>;
      case 'paid':
        return <span className="badge-success">Đã chuyển tiền</span>;
      case 'rejected':
        return <span className="badge-danger">Từ chối chuyển tiền</span>;
      default:
        return <span className="badge-default">Chờ xác nhận</span>;
    }
  };

  return (
    <div className="accountant-manager-wrapper">
      <div className="dashboard-header">
        <div className="header-title">
          <h1>Quản lý Thanh toán (Kế toán)</h1>
          <p>Danh sách các đơn hàng cần kế toán chuyển tiền cho khách</p>
        </div>
        
        <div className="header-actions">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn, tên admin..." 
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          
          <select value={statusFilter} onChange={handleStatusChange}>
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ chuyển tiền</option>
            <option value="paid">Đã chuyển tiền</option>
            <option value="rejected">Từ chối chuyển tiền</option>
          </select>

          <select value={validFilter} onChange={handleValidChange}>
            <option value="">Tất cả xác nhận</option>
            <option value="yes">✓ Có</option>
            <option value="no">✗ Không</option>
            <option value="null">Chưa xác nhận</option>
          </select>

          <select value={dateRange} onChange={handleDateRangeChange}>
            <option value="all">Tất cả thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-info">
            <span className="label">Tổng đơn</span>
            <span className="value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-info">
            <span className="label">Chờ thanh toán</span>
            <span className="value">{stats.pending_count}</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-info">
            <span className="label">Đã thanh toán</span>
            <span className="value">{stats.completed_count}</span>
          </div>
        </div>
        <div className="stat-card transfer">
          <div className="stat-info">
            <span className="label">Tổng tiền khách gửi</span>
            <span className="value">{formatMoney(stats.total_transfer)}</span>
          </div>
        </div>
        <div className="stat-card amount">
          <div className="stat-info">
            <span className="label">Tổng tiền chuyển cho admin</span>
            <span className="value">{formatMoney(stats.total_amount)}</span>
          </div>
        </div>
        <div className="stat-card base-fee">
          <div className="stat-info">
            <span className="label">Tổng phí gốc</span>
            <span className="value">{formatMoney(stats.total_base_fee)}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          <div className="bookings-content">
            {/* Desktop Table */}
            <div className="excel-table-container desktop-only">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Số tiền gốc</th>
                    <th>Thông tin Admin (Nguồn tiền)</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Xác nhận</th>
                    <th className="actions-col">Chi tiết & Xác nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        <div className="empty-state">
                          <p>Không có đơn hàng nào cần xử lý</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bookings.map(b => (
                      <tr key={b.id}>
                        <td className="mono">#{b.code.slice(-8).toUpperCase()}</td>
                        <td className="amount-cell">{formatMoney(b.transfer_amount)}</td>
                        <td>
                          <div className="admin-info-cell">
                            <div className="holder">{b.admin_account_holder || 'Chưa có'}</div>
                            <div className="bank">{b.admin_bank_name} - {b.admin_account_number}</div>
                          </div>
                        </td>
                        <td>{new Date(b.created_at).toLocaleString('vi-VN')}</td>
                        <td>{getStatusBadge(b)}</td>
                        <td>
                          {b.is_valid === 'yes' ? (
                            <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Có</span>
                          ) : b.is_valid === 'no' ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ Không</span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td className="actions-col">
                          <button className="detail-btn" onClick={() => navigate(`/accountant/bookings/${b.id}`)}>
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="booking-mobile-list mobile-only">
              {bookings.length === 0 ? (
                <div className="empty">Không có dữ liệu đơn hàng.</div>
              ) : (
                bookings.map(b => (
                  <div key={b.id} className="booking-mobile-card">
                    <div className="card-top">
                      <span className="date">{new Date(b.created_at).toLocaleString('vi-VN')}</span>
                      <span className="amount">{formatMoney(b.transfer_amount)}</span>
                    </div>
                    <div className="card-middle">
                      <div className="code-wrapper">
                        <span className="code">#{b.code.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="validation-mobile">
                        <span className="label">Xác nhận: </span>
                        {b.is_valid === 'yes'
                          ? <span className="valid-yes">✓ Có</span>
                          : b.is_valid === 'no'
                            ? <span className="valid-no">✗ Không</span>
                            : <span className="valid-none">—</span>}
                      </div>
                    </div>
                    <div className="card-bottom">
                      <div className="status-badge-wrapper">
                        {getStatusBadge(b)}
                      </div>
                      <div className="card-actions">
                        <button className="detail-btn-mobile" onClick={() => navigate(`/accountant/bookings/${b.id}`)}>
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="pagination-btn"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="page-info">
                Trang <strong>{page}</strong> / {totalPages}
              </div>
              
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="pagination-btn"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccountantBookingManager;
