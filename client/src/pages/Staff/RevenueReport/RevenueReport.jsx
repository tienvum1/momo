import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../../api/axios';
import './RevenueReport.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RevenueReport = () => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [reportType, setReportType] = useState('day');
  
  // Lấy tháng/năm hiện tại
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState('all');
  const [showDayPicker, setShowDayPicker] = useState(false);

  // Lưu trữ tháng đã chọn trước khi bấm "Tất cả"
  const [lastSelectedMonth, setLastSelectedMonth] = useState(now.getMonth() + 1);

  // Thêm state cho tháng/năm hiển thị trong lịch
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const openDayPicker = () => {
    if (selectedMonth !== 'all') {
      setCalendarMonth(selectedMonth);
    }
    setCalendarYear(selectedYear);
    setShowDayPicker(true);
  };

  const [data, setData] = useState({
    global:   { summary: {}, total: [], byQr: [], byStaff: [], byCustomer: [] },
    personal: { summary: {}, total: [], byQr: [] }
  });
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    let tid = null;
    const ro = new ResizeObserver(() => {
      if (tid) clearTimeout(tid);
      tid = setTimeout(() => setChartKey(k => k + 1), 100);
    });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); if (tid) clearTimeout(tid); };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/revenue?type=${reportType}&month=${selectedMonth}&year=${selectedYear}&day=${selectedDay}`);
        if (active) setData(res.data);
      } catch (err) {
        console.error('Lỗi khi tải báo cáo:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [reportType, selectedMonth, selectedYear, selectedDay]);

  const fmt = (amount) => {
    const n = Math.round(Number(amount) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') ;
  };

  const fmtShort = (amount) => {
    const n = Math.round(Number(amount) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    if (reportType === 'year') return dateStr;
    if (reportType === 'month') {
      const [year, month] = dateStr.split('-');
      return `Tháng ${month}/${year}`;
    }
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const sectionData = isAdminPath ? data.global : data.personal;
  const summary = sectionData.summary || {};

  const totalRevenue   = Number(summary.total_amount   || 0);
  const totalFee       = Number(summary.total_fee      || 0);
  const totalBaseFee   = Number(summary.total_base_fee || 0);
  const totalProfit    = Number(summary.total_profit   || 0);
  const totalOrders    = Number(summary.completed_count|| 0);
  
  const dayName = selectedDay === 'all' ? 'Tất cả các ngày' : `Ngày ${selectedDay}`;
  const monthName = selectedMonth === 'all' ? 'Tất cả các tháng' : `Tháng ${selectedMonth}`;
  const yearName = `Năm ${selectedYear}`;

  const periodLabel     = reportType === 'day' ? (selectedDay === 'all' ? monthName : `${dayName} ${monthName}`) : reportType === 'month' ? yearName : 'Tất cả';
  const fullPeriodLabel = reportType === 'day' ? (selectedDay === 'all' ? monthName : `${dayName} ${monthName}`) : reportType === 'month' ? yearName : 'Toàn thời gian';
  const groupLabel      = reportType === 'day' ? 'ngày' : reportType === 'month' ? 'tháng' : 'năm';

  // Tính số ngày trong tháng và ngày bắt đầu của tháng
  const getCalendarDays = () => {
    const displayMonth = calendarMonth;
    const displayYear = calendarYear;
    
    const firstDayOfMonth = new Date(displayYear, displayMonth - 1, 1);
    const lastDayOfMonth = new Date(displayYear, displayMonth, 0);
    
    // Ngày bắt đầu của tuần (0: CN, 1: T2, ..., 6: T7)
    // Chuyển sang (0: T2, ..., 5: T7, 6: CN)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6; 

    const days = [];
    
    // Lấy ngày của tháng trước để lấp đầy hàng đầu tiên
    const prevMonthLastDay = new Date(selectedYear, selectedMonth - 1, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, currentMonth: false });
    }
    
    // Ngày của tháng hiện tại
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({ day: i, currentMonth: true });
    }
    
    // Lấp đầy cho đủ các hàng (6 hàng x 7 ngày = 42 ô)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false });
    }
    
    return days;
  };

  const calendarDays = getCalendarDays();

  const reversedTotal = [...sectionData.total].reverse();

  const chartData = {
    labels: reversedTotal.map(r => fmtDate(r.label)),
    datasets: [
      {
        label: 'Doanh thu (đ)',
        data: reversedTotal.map(r => Number(r.total_amount || 0)),
        backgroundColor: isAdminPath ? 'rgba(99,102,241,0.8)' : 'rgba(16,185,129,0.8)',
        borderRadius: 6,
        barThickness: isAdminPath ? 18 : 28,
      },
      {
        label: 'Phí khách chịu (đ)',
        data: reversedTotal.map(r => Number(r.total_fee || 0)),
        backgroundColor: 'rgba(244,63,94,0.8)',
        borderRadius: 6,
        barThickness: isAdminPath ? 18 : 28,
      },
      ...(isAdminPath ? [
        {
          label: 'Phí gốc (đ)',
          data: reversedTotal.map(r => Number(r.total_base_fee || 0)),
          backgroundColor: 'rgba(234,88,12,0.8)',
          borderRadius: 6,
          barThickness: 18,
        },
        {
          label: 'Lợi nhuận (đ)',
          data: reversedTotal.map(r => Number(r.total_profit || 0)),
          backgroundColor: 'rgba(22,163,74,0.85)',
          borderRadius: 6,
          barThickness: 18,
        },
      ] : []),
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 20, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return ` ${ctx.dataset.label}: ${val} đ`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 11 },
          color: '#64748b',
          callback: (val) => {
            if (val >= 1_000_000) return (val / 1_000_000).toLocaleString('vi') + 'tr';
            if (val >= 1_000) return (val / 1_000).toLocaleString('vi') + 'k';
            return val;
          },
        },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
    },
  };

  return (
    <div className="revenue-report-container">
      {/* Header */}
      <div className="report-header">
        <div className="header-left">
          <h1>{isAdminPath ? 'Thống kê hệ thống' : 'Báo cáo doanh thu cá nhân'}</h1>
          <p className="subtitle">{isAdminPath ? 'Toàn cảnh hoạt động kinh doanh' : 'Theo dõi và phân tích hiệu suất'}</p>
        </div>

        {/* Period filter */}
        {!loading && (
          <div className="header-actions">
            <div className="period-filter main-type-filter">
              {['day','month','year'].map(t => (
                <button 
                  key={t} 
                  className={reportType === t ? 'active' : ''} 
                  onClick={() => {
                    setReportType(t);
                    setSelectedDay('all'); // Reset về tất cả ngày khi đổi chế độ xem
                    if (t === 'month' && selectedMonth === 'all') {
                      setSelectedMonth(lastSelectedMonth);
                    }
                  }}
                >
                  {t === 'day' ? 'Ngày' : t === 'month' ? 'Tháng' : 'Năm'}
                </button>
              ))}
            </div>

            <div className="custom-period-pickers">
              {reportType === 'day' && selectedMonth !== 'all' && (
                <button 
                  className="day-picker-trigger"
                  onClick={openDayPicker}
                >
                  {selectedDay === 'all' ? 'Tất cả ngày' : `Ngày ${selectedDay}`}
                </button>
              )}
              {reportType !== 'year' && (
                <select 
                  value={selectedMonth} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'all') setLastSelectedMonth(Number(val));
                    setSelectedMonth(val === 'all' ? 'all' : Number(val));
                    setSelectedDay('all'); // Reset về tất cả ngày khi đổi tháng
                  }}
                  className="month-picker"
                >
                  <option value="all">Tất cả tháng</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                  ))}
                </select>
              )}

              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="year-picker"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = now.getFullYear() - 2 + i;
                  return <option key={y} value={y}>Năm {y}</option>;
                })}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Day Picker Grid Popup */}
      {!loading && showDayPicker && (
        <div className="day-picker-modal-overlay" onClick={() => setShowDayPicker(false)}>
          <div className="day-picker-modal-content" onClick={e => e.stopPropagation()}>
            <div className="calendar-container">
              <div className="calendar-header">
                <div className="month-year-display">
                  tháng {calendarMonth} năm {calendarYear} <span className="arrow-down">▼</span>
                </div>
                <div className="header-nav">
                  <button 
                    className="nav-btn"
                    onClick={() => {
                      if (calendarMonth === 1) {
                        setCalendarMonth(12);
                        setCalendarYear(v => v - 1);
                      } else {
                        setCalendarMonth(v => v - 1);
                      }
                    }}
                  >
                    ↑
                  </button>
                  <button 
                    className="nav-btn"
                    onClick={() => {
                      if (calendarMonth === 12) {
                        setCalendarMonth(1);
                        setCalendarYear(v => v + 1);
                      } else {
                        setCalendarMonth(v => v + 1);
                      }
                    }}
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="calendar-weekdays">
                <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
              </div>

              <div className="calendar-grid">
                {calendarDays.map((d, i) => (
                  <button 
                    key={i} 
                    className={`calendar-day ${!d.currentMonth ? 'other-month' : ''} ${d.currentMonth && selectedDay === d.day && calendarMonth === selectedMonth && calendarYear === selectedYear ? 'active' : ''}`}
                    onClick={() => {
                      if (d.currentMonth) {
                        setSelectedDay(d.day);
                        setSelectedMonth(calendarMonth);
                        setSelectedYear(calendarYear);
                        setShowDayPicker(false);
                      }
                    }}
                  >
                    {d.day}
                  </button>
                ))}
              </div>

              <div className="calendar-footer">
                <button 
                  className="footer-btn clear-btn"
                  onClick={() => {
                    setSelectedDay('all');
                    setShowDayPicker(false);
                  }}
                >
                  Xóa
                </button>
                <button 
                  className="footer-btn today-btn"
                  onClick={() => {
                    const today = new Date().getDate();
                    setSelectedDay(today);
                    setShowDayPicker(false);
                  }}
                >
                  Hôm nay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loader-ring" />
          <p>Đang tổng hợp dữ liệu...</p>
        </div>
      ) : (
        <div className="report-content-animate">
          {/* Summary cards */}
          <div className="stats-summary">
            <div className="stat-card revenue">
              <div className="stat-info">
                <span className="label">Doanh thu ({periodLabel})</span>
                <p className="value">{fmtShort(totalRevenue)} <small>đ</small></p>
              </div>
            </div>
            <div className="stat-card fee">
              <div className="stat-info">
                <span className="label">Phí khách ({periodLabel})</span>
                <p className="value">{fmtShort(totalFee)} <small>đ</small></p>
              </div>
            </div>
            {isAdminPath && (
              <div className="stat-card base-fee">
                <div className="stat-info">
                  <span className="label">Phí gốc ({periodLabel})</span>
                  <p className="value">{fmtShort(totalBaseFee)} <small>đ</small></p>
                </div>
              </div>
            )}
            {isAdminPath && (
              <div className="stat-card profit">
                <div className="stat-info">
                  <span className="label">Lợi nhuận ({periodLabel})</span>
                  <p className="value">{fmtShort(totalProfit)} <small>đ</small></p>
                </div>
              </div>
            )}
            <div className="stat-card orders">
              <div className="stat-info">
                <span className="label">Đơn hoàn tất ({periodLabel})</span>
                <p className="value">{totalOrders.toLocaleString()} <small>đơn</small></p>
              </div>
            </div>
          </div>

          {/* Bảng thống kê theo thời gian */}
          <div className="table-card period-stats-table">
            <div className="card-header">
              <div className="header-left">
                <h3>Thống kê theo {groupLabel} ({fullPeriodLabel})</h3>
                <p>Chi tiết đơn hàng và doanh thu từng {groupLabel}</p>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th className="text-center">Tổng đơn</th>
                    <th className="text-center text-success">Hoàn thành</th>
                    <th className="text-center text-warning">Đang xử lý</th>
                    <th className="text-center text-danger">Từ chối</th>
                    <th className="text-center text-muted">Đã hủy</th>
                    <th className="text-right text-revenue">Doanh thu</th>
                    <th className="text-right text-fee">Phí khách</th>
                    {isAdminPath && <th className="text-right" style={{color:'#ea580c'}}>Phí gốc</th>}
                    {isAdminPath && <th className="text-right" style={{color:'#16a34a'}}>Lợi nhuận</th>}
                  </tr>
                </thead>
                <tbody>
                  {sectionData.total.length === 0 ? (
                    <tr><td colSpan={isAdminPath ? 10 : 8} className="empty-state">Chưa có dữ liệu trong kỳ này</td></tr>
                  ) : sectionData.total.map((item, idx) => {
                    const showDate = idx === 0 || item.label !== sectionData.total[idx - 1].label;
                    return (
                      <tr key={idx}>
                        <td data-label="Thời gian">
                          {showDate ? <strong>{fmtDate(item.label)}</strong> : <span className="text-muted" style={{opacity: 0.3}}>—</span>}
                        </td>
                        <td data-label="Tổng đơn" className="text-center">{Number(item.total_count).toLocaleString()}</td>
                        <td data-label="Hoàn thành" className="text-center text-success">{Number(item.completed_count).toLocaleString()}</td>
                        <td data-label="Đang xử lý" className="text-center text-warning">{Number(item.processing_count).toLocaleString()}</td>
                        <td data-label="Từ chối" className="text-center text-danger">{Number(item.rejected_count).toLocaleString()}</td>
                        <td data-label="Đã hủy" className="text-center text-muted">{Number(item.cancelled_count).toLocaleString()}</td>
                        <td data-label="Doanh thu" className="text-right text-revenue font-bold">{fmt(item.total_amount)}</td>
                        <td data-label="Phí khách" className="text-right text-fee">{fmt(item.total_fee)}</td>
                        {isAdminPath && <td data-label="Phí gốc" className="text-right" style={{color:'#ea580c'}}>{fmt(item.total_base_fee)}</td>}
                        {isAdminPath && <td data-label="Lợi nhuận" className="text-right" style={{color:'#16a34a', fontWeight:700}}>{fmt(item.total_profit)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Biểu đồ */}
          <div className="charts-grid full-width-chart">
            <div className="chart-card main-chart">
              <div className="card-header">
                <h3>Biểu đồ doanh thu ({fullPeriodLabel})</h3>
                <p>Thống kê theo {groupLabel}</p>
              </div>
              <div className="chart-container" ref={chartContainerRef}>
                <Bar key={chartKey} options={chartOptions} data={chartData} />
              </div>
            </div>
          </div>

          {/* Bảng theo khách hàng (chỉ admin) */}
          {isAdminPath && sectionData.byCustomer && sectionData.byCustomer.length > 0 && (
            <div className="table-card customer-revenue-table">
              <div className="card-header">
                <div className="header-left">
                  <h3>Thống kê theo khách hàng ({fullPeriodLabel})</h3>
                  <p>Hiệu suất và tổng tiền theo từng người tạo đơn</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Khách hàng</th>
                      <th className="text-center">Tổng đơn</th>
                      <th className="text-center text-success">Hoàn thành</th>
                      <th className="text-center text-danger">Hủy/Từ chối</th>
                      <th className="text-right text-revenue">Doanh thu</th>
                      <th className="text-right text-fee">Phí khách</th>
                      <th className="text-right" style={{color:'#ea580c'}}>Phí gốc</th>
                      <th className="text-right" style={{color:'#16a34a'}}>Lợi nhuận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionData.byCustomer.map((c, idx) => {
                      const showDate = idx === 0 || c.label !== sectionData.byCustomer[idx - 1].label;
                      return (
                        <tr key={idx}>
                          <td data-label="Thời gian">
                            {showDate ? <strong>{fmtDate(c.label)}</strong> : <span className="text-muted" style={{opacity: 0.3}}>—</span>}
                          </td>
                          <td data-label="Khách hàng">
                            <div className="staff-info-cell">
                              <strong>{c.customer_name || c.customer_email}</strong>
                              <small>ID: #{c.customer_id}</small>
                            </div>
                          </td>
                          <td data-label="Tổng đơn" className="text-center">{Number(c.total_count).toLocaleString()}</td>
                          <td data-label="Hoàn thành" className="text-center text-success">{Number(c.completed_count).toLocaleString()}</td>
                          <td data-label="Hủy/Từ chối" className="text-center text-danger">{(Number(c.cancelled_count) + Number(c.rejected_count)).toLocaleString()}</td>
                          <td data-label="Doanh thu" className="text-right text-revenue font-bold">{fmt(c.total_amount)}</td>
                          <td data-label="Phí khách" className="text-right text-fee">{fmt(c.total_fee)}</td>
                          <td data-label="Phí gốc" className="text-right" style={{color:'#ea580c'}}>{fmt(c.total_base_fee)}</td>
                          <td data-label="Lợi nhuận" className="text-right" style={{color:'#16a34a', fontWeight:700}}>{fmt(c.total_profit)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bảng theo QR */}
          <div className="table-card">
            <div className="card-header">
              <div className="header-left">
                <h3>Chi tiết theo QR ({fullPeriodLabel})</h3>
                <p>Hiệu suất từng thẻ QR trong kỳ</p>
              </div>
              {sectionData.byQr.length > 0 && (
                <div className="top-performer">
                  <span className="label">Hiệu quả nhất:</span>
                  <span className="value">{sectionData.byQr[0].qr_name || `QR #${sectionData.byQr[0].qr_id}`}</span>
                </div>
              )}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Thẻ QR</th>
                    <th className="text-center">Tổng đơn</th>
                    <th className="text-center text-success">Hoàn thành</th>
                    <th className="text-center text-danger">Hủy/Từ chối</th>
                    <th className="text-right text-revenue">Doanh thu</th>
                    <th className="text-right text-fee">Phí khách</th>
                    {isAdminPath && <th className="text-right" style={{color:'#ea580c'}}>Phí gốc</th>}
                    {isAdminPath && <th className="text-right" style={{color:'#16a34a'}}>Lợi nhuận</th>}
                  </tr>
                </thead>
                <tbody>
                  {sectionData.byQr.length === 0 ? (
                    <tr><td colSpan={isAdminPath ? 9 : 7} className="empty-state">Chưa có dữ liệu giao dịch trong kỳ này</td></tr>
                  ) : sectionData.byQr.map((qr, idx) => {
                    const showDate = idx === 0 || qr.label !== sectionData.byQr[idx - 1].label;
                    return (
                      <tr key={idx}>
                        <td data-label="Thời gian">
                          {showDate ? <strong>{fmtDate(qr.label)}</strong> : <span className="text-muted" style={{opacity: 0.3}}>—</span>}
                        </td>
                        <td data-label="Thẻ QR">
                          <div className="qr-id-cell">
                            <span className="dot" />
                            <div>
                              <strong>{qr.qr_name || `QR #${qr.qr_id}`}</strong>
                              <small>ID: #{qr.qr_id}</small>
                            </div>
                          </div>
                        </td>
                        <td data-label="Tổng đơn" className="text-center">{Number(qr.total_count).toLocaleString()}</td>
                        <td data-label="Hoàn thành" className="text-center text-success">{Number(qr.completed_count).toLocaleString()}</td>
                        <td data-label="Hủy/Từ chối" className="text-center text-danger">{(Number(qr.cancelled_count) + Number(qr.rejected_count)).toLocaleString()}</td>
                        <td data-label="Doanh thu" className="text-right text-revenue font-bold">{fmt(qr.total_amount)}</td>
                        <td data-label="Phí khách" className="text-right text-fee">{fmt(qr.total_fee)}</td>
                        {isAdminPath && <td data-label="Phí gốc" className="text-right" style={{color:'#ea580c'}}>{fmt(qr.total_base_fee)}</td>}
                        {isAdminPath && <td data-label="Lợi nhuận" className="text-right" style={{color:'#16a34a', fontWeight:700}}>{fmt(qr.total_profit)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default RevenueReport;
