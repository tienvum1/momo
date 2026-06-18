import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Receipt } from 'lucide-react';
import api from '../../api/axios';
import './MyBookings.scss';

const STATUS_MAP = {
  created:       { label: 'Chờ thanh toán', cls: 'created' },
  customer_paid: { label: 'Đang xử lý',     cls: 'paid' },
  confirmed:     { label: 'Hoàn thành',      cls: 'completed' },
  rejected:      { label: 'Từ chối',         cls: 'rejected' },
  cancelled:     { label: 'Đã hủy',          cls: 'cancelled' },
};

const DATE_OPTIONS = [
  { label: 'Tất cả thời gian', value: 'all' },
  { label: 'Hôm nay',          value: 'today' },
  { label: '7 ngày qua',       value: '7days' },
  { label: '30 ngày qua',      value: '30days' },
];

const fmt = (v) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN') + 'đ';
};

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return '—';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const shortCode = (code) => String(code || '').slice(-6);

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [dateFilter, setDate]       = useState('all');
  const [currentPage, setPage]      = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal]           = useState(0);
  const PER_PAGE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my', {
        params: {
          page: currentPage, limit: PER_PAGE,
          search: search.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          dateRange: dateFilter === 'all' ? undefined : dateFilter,
        }
      });
      setBookings(res.data.bookings || []);
      setTotalPages(res.data.totalPages || 0);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const changePage = (p) => { setPage(p); window.scrollTo(0, 0); };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div className="mb-pagination">
        <button disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>←</button>
        {start > 1 && (
          <>
            <button onClick={() => changePage(1)}>1</button>
            {start > 2 && <span>…</span>}
          </>
        )}
        {pages.map(p => (
          <button key={p} className={currentPage === p ? 'active' : ''} onClick={() => changePage(p)}>
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span>…</span>}
            <button onClick={() => changePage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>→</button>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="mb-empty-state">
      <div className="mb-empty-icon">
        <Receipt size={40} strokeWidth={1.5} color="#d0d5dd" />
      </div>
      <p>Không tìm thấy đơn hàng nào</p>
      <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
    </div>
  );

  return (
    <div className="mb-page">

      {/* ── Header ── */}
      <div className="mb-header">
        <div className="mb-header-left">
          <h1>Đơn của tôi</h1>
          <p>Lịch sử giao dịch · {total} đơn</p>
        </div>
        <div className="mb-controls">
          <div className="mb-search">
            <Search size={14} />
            <input
              placeholder="Tìm theo mã đơn..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">Tất cả trạng thái</option>
            <option value="created">Chờ thanh toán</option>
            <option value="customer_paid">Đang xử lý</option>
            <option value="confirmed">Hoàn thành</option>
            <option value="rejected">Từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select value={dateFilter} onChange={e => { setDate(e.target.value); setPage(1); }}>
            {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Desktop Table ── */}
      <div className="mb-table-wrap">
        <table className="mb-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>QR</th>
              <th>SĐT MoMo</th>
              <th>Tên chính chủ</th>
              <th>Số tiền</th>
              <th>Phí</th>
              <th>Nhận được</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10}>
                  <div className="mb-skeleton">
                    {[...Array(6)].map((_, i) => <div key={i} />)}
                  </div>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={10}><EmptyState /></td>
              </tr>
            ) : bookings.map(b => {
              const st = STATUS_MAP[b.status] || { label: b.status, cls: '' };
              return (
                <tr key={b.id}>
                  <td><span className="mb-code">#{shortCode(b.code)}</span></td>
                  <td>{b.qr_name || '—'}</td>
                  <td className="mb-mono">{b.customer_account_number || '—'}</td>
                  <td>{b.customer_account_holder || '—'}</td>
                  <td className="mb-amount">{fmt(b.transfer_amount)}</td>
                  <td className="mb-fee">{fmt(b.fee_amount)}</td>
                  <td className="mb-net">{fmt(b.net_amount)}</td>
                  <td><span className={`mb-status ${st.cls}`}>{st.label}</span></td>
                  <td className="mb-date">{fmtDate(b.created_at)}</td>
                  <td>
                    <div className="mb-actions">
                      {b.status === 'created' && (
                        <button className="mb-btn-pay" onClick={() => navigate(`/payment/${b.id}`)}>
                          Thanh toán
                        </button>
                      )}
                      <button className="mb-btn-detail" onClick={() => navigate(`/my-bookings/${b.id}`)}>
                        Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="mb-cards">
        {loading ? (
          <div className="mb-skeleton">{[...Array(4)].map((_, i) => <div key={i} />)}</div>
        ) : bookings.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e8ecf0' }}>
            <EmptyState />
          </div>
        ) : bookings.map(b => {
          const st = STATUS_MAP[b.status] || { label: b.status, cls: '' };
          return (
            <div key={b.id} className="mb-card">
              <div className="mb-card-row top">
                <span className="mb-code">#{shortCode(b.code)}</span>
                <span className={`mb-status ${st.cls}`}>{st.label}</span>
              </div>
              {b.qr_name && (
                <div className="mb-card-row">
                  <span className="mb-card-label">QR</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{b.qr_name}</span>
                </div>
              )}
              <div className="mb-card-row">
                <span className="mb-card-label">SĐT MoMo</span>
                <span className="mb-mono">{b.customer_account_number || '—'}</span>
              </div>
              <div className="mb-card-row">
                <span className="mb-card-label">Số tiền</span>
                <span className="mb-amount">{fmt(b.transfer_amount)}</span>
              </div>
              <div className="mb-card-row">
                <span className="mb-card-label">Nhận được</span>
                <span className="mb-net">{fmt(b.net_amount)}</span>
              </div>
              <div className="mb-card-row">
                <span className="mb-card-label">Thời gian</span>
                <span className="mb-date">{fmtDate(b.created_at)}</span>
              </div>
              <div className="mb-card-actions">
                {b.status === 'created' && (
                  <button className="mb-btn-pay" onClick={() => navigate(`/payment/${b.id}`)}>
                    Thanh toán
                  </button>
                )}
                <button className="mb-btn-detail" onClick={() => navigate(`/my-bookings/${b.id}`)}>
                  Chi tiết
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {renderPagination()}
    </div>
  );
};

export default MyBookings;
