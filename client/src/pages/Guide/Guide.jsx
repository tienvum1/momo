import {
  ArrowRight, QrCode, Lock, ShieldCheck,
  Phone, User, CircleDollarSign, Camera,
  CheckCircle, AlertTriangle, FileText,
  Settings, LogOut, Headphones, Clock
} from 'lucide-react';
import './Guide.scss';

const QUICK = [100000, 200000, 500000, 1000000, 2000000];
const fmtQ  = (v) => v.toLocaleString('vi-VN') + 'đ';

const STEPS = [
  { n:'1', title:'Tạo đơn & quét QR',       desc:'Tạo đơn và quét mã QR để bắt đầu giao dịch.' },
  { n:'2', title:'Điền thông tin & tạo QR',  desc:'Nhập thông tin giao dịch và tạo QR nhận tiền.' },
  { n:'3', title:'Nhận tiền tức thì',         desc:'Quét mã để khách chuyển tiền, bạn nhận tiền ngay lập tức.' },
  { n:'4', title:'Xem thông tin đơn hàng',   desc:'Xem thông tin đơn hàng đã thành công và chi tiết tại "Đơn của tôi".' },
];

const ORDERS = [
  { id:'#841409', amt:'2.000.000đ', date:'19/06/2026 19:05', status:'green', statusTxt:'Thành công' },
  { id:'#841408', amt:'1.500.000đ', date:'19/06/2026 18:30', status:'green', statusTxt:'Thành công' },
  { id:'#841407', amt:'800.000đ',   date:'19/06/2026 17:15', status:'red',   statusTxt:'Thất bại' },
  { id:'#841406', amt:'1.000.000đ', date:'19/06/2026 16:45', status:'green', statusTxt:'Thành công' },
];

export default function Guide() {
  return (
    <div className="gp">

      {/* ── HERO ── */}
      <div className="gp__hero">
        <h1 className="gp__h1">Hướng dẫn <span>rút ví trả sau Momo247</span></h1>
        <p className="gp__sub">Thực hiện nhanh chóng chỉ với <b>4 bước</b> đơn giản</p>
        <div className="gp__stepbar">
          {STEPS.map((s, i, a) => (
            <div key={s.n} className="gp__sb-wrap">
              <div className="gp__sb-item">
                <div className="gp__sb-dot">{s.n}</div>
                <div className="gp__sb-txt">
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </div>
              {i < a.length - 1 && <ArrowRight size={18} className="gp__arrow" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="gp__grid">

        {/* COLUMN 1 */}
        <div className="gp__col-wrap">
          <div className="gp__col-hd-outside">
            <div className="gp__col-dot">1</div>
            <span className="gp__col-title">Tạo đơn &amp; quét QR</span>
          </div>
          <div className="gp__card">
            <div className="gp__qr-wrap">
              <img src="/qrDaiDienMomo.png" alt="QR Momo247" className="gp__qr-img" />
            </div>
          </div>
          <div className="gp__tips">
            <div className="gp__tip"><span className="gp__num">1</span>Chọn <b>"Tạo đơn"</b>.</div>
            <div className="gp__tip"><span className="gp__num">2</span>Mở camera hoặc ứng dụng ngân hàng/ví điện tử và quét mã QR.</div>
          </div>
        </div>

        {/* COLUMN 2 */}
        <div className="gp__col-wrap">
          <div className="gp__col-hd-outside">
            <div className="gp__col-dot">2</div>
            <span className="gp__col-title">Điền thông tin &amp; tạo QR</span>
          </div>
          <div className="gp__card">
            <div className="gp__card-hd-mock">
              <span className="gp__badge">BƯỚC 2</span>
              <span className="gp__badge-sep">|</span>
              <span className="gp__badge-title">Điền thông tin giao dịch</span>
            </div>
            <div className="gp__form">
              <span className="gp__form-back">← Trang chủ</span>
              <div className="gp__form-heading">
                <span className="gp__form-bar" />
                <div>
                  <div className="gp__form-name">Tạo đơn thanh toán</div>
                  <div className="gp__form-sub">Tạo QR để khách hàng quét mã thanh toán</div>
                </div>
              </div>
              <div className="gp__field">
                <label>Số điện thoại MoMo <span className="gp__req">*</span></label>
                <div className="gp__inp"><Phone size={14} className="gp__ico" /><input placeholder="Nhập số điện thoại MoMo" readOnly tabIndex={-1} /></div>
              </div>
              <div className="gp__field">
                <label>Tên chính chủ <span className="gp__req">*</span></label>
                <div className="gp__inp"><User size={14} className="gp__ico" /><input placeholder="Nhập họ tên đầy đủ" readOnly tabIndex={-1} /></div>
              </div>
              <div className="gp__field">
                <label>Số tiền cần nhận (VND) <span className="gp__req">*</span></label>
                <div className="gp__inp">
                  <CircleDollarSign size={14} className="gp__ico" />
                  <input placeholder="Nhập số tiền" readOnly tabIndex={-1} />
                  <span className="gp__sfx">đ</span>
                </div>
                <div className="gp__quick">{QUICK.map(v=><span key={v} className="gp__chip">{fmtQ(v)}</span>)}</div>
              </div>
              <p className="gp__fee-note"><ShieldCheck size={11} />Phí giao dịch sẽ được trừ tự động khi khách hàng thanh toán thành công.</p>
              <button className="gp__btn"><QrCode size={15} /> Tạo QR nhận tiền</button>
            </div>
          </div>
          <div className="gp__tips">
            <div className="gp__tip"><span className="gp__num">1</span>Nhập số điện thoại MoMo.</div>
            <div className="gp__tip"><span className="gp__num">2</span>Nhập tên chính chủ.</div>
            <div className="gp__tip"><span className="gp__num">3</span>Nhập số tiền cần nhận.</div>
            <div className="gp__tip"><span className="gp__num">4</span>Nhấn <b>"Tạo QR nhận tiền"</b>.</div>
          </div>
        </div>

        {/* COLUMN 3 */}
        <div className="gp__col-wrap">
          <div className="gp__col-hd-outside">
            <div className="gp__col-dot">3</div>
            <span className="gp__col-title">Nhận tiền tức thì</span>
          </div>
          <div className="gp__card">
            <div className="gp__card-hd-mock">
              <span className="gp__badge">BƯỚC 3</span>
              <span className="gp__badge-sep">|</span>
              <span className="gp__badge-title">Xác nhận và gửi giao dịch</span>
            </div>
            <div className="gp__c3">
              <p className="gp__c3-lbl">Quét mã để khách hàng thanh toán</p>
              <div className="gp__qrb">
                <div className="gp__qrb-tag"><QrCode size={10} /> QR Thẻ hệ 2.0</div>
                <img src="/IMG_6092.JPG" alt="Bill" className="gp__qrb-img" />
                <div className="gp__qrb-code">Mã đơn: a808c7 · 14:50</div>
              </div>
              <label className="gp__upload-lbl">Tải ảnh giao dịch <span>(không bắt buộc)</span></label>
              <div className="gp__upload">
                <div className="gp__upload-icon"><Camera size={20} /></div>
                <span className="gp__upload-cta">Chụp hoặc tải ảnh lên</span>
                <span className="gp__upload-hint">Hỗ trợ JPG, PNG tối đa 5MB</span>
              </div>
              <label className="gp__upload-lbl">Ghi chú <span>(không bắt buộc)</span></label>
              <div className="gp__note-wrap">
                <textarea placeholder="Nhập ghi chú cho giao dịch..." readOnly tabIndex={-1} rows={2} />
                <span className="gp__char">0/200</span>
              </div>
              <button className="gp__btn"><CheckCircle size={15} /> Tôi đã chuyển tiền</button>
              <p className="gp__secure"><Lock size={10} /> Thông tin của bạn được bảo mật tuyệt đối</p>
            </div>
          </div>
          <div className="gp__tips">
            <div className="gp__tip"><span className="gp__num">1</span>Khách quét mã và chuyển tiền.</div>
            <div className="gp__tip"><span className="gp__num">2</span>Tiền về ngay lập tức vào Ví MoMo của bạn.</div>
            <div className="gp__tip"><span className="gp__num">3</span>Nhấn <b>"Tôi đã chuyển tiền"</b> để hoàn tất.</div>
          </div>
        </div>

        {/* COLUMN 4 (WIDE AREA - SPANS COLUMNS 4-6) */}
        <div className="gp__col-wrap gp__col-wrap--wide">
          <div className="gp__col-hd-outside">
            <div className="gp__col-dot">4</div>
            <span className="gp__col-title">Xem thông tin đơn hàng</span>
          </div>

          <div className="gp__step4-row">
            
            {/* 4.1 */}
            <div className="gp__subcol">
              <div className="gp__subcol-hd">4.1 Vào "Đơn của tôi"</div>
              <div className="gp__card">
                <div className="gp__mini-app">
                  {/* mini header */}
                  <div className="gp__mini-hd">
                    <img src="/logo.svg" alt="logo" className="gp__mini-logo" />
                    <div className="gp__mini-nav">
                      <span>Trang chủ</span>
                      <span>Hướng dẫn</span>
                    </div>
                    <div className="gp__mini-av">A</div>
                  </div>
                  {/* user info block */}
                  <div className="gp__user-block">
                    <div className="gp__user-av">A</div>
                    <div>
                      <div className="gp__user-name">admin</div>
                      <div className="gp__user-email">admin@gmail.com</div>
                      <span className="gp__user-role">Admin</span>
                    </div>
                  </div>
                  {/* menu */}
                  <div className="gp__menu">
                    <div className="gp__menu-item"><User size={11} /> Hồ sơ cá nhân</div>
                    <div className="gp__menu-item"><Settings size={11} /> Quản lý hệ thống</div>
                    <div className="gp__menu-item gp__menu-item--active">
                      <FileText size={11} /> Đơn của tôi
                      <svg className="gp__click-hand" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 21.5c-3.5 0-6.5-3-6.5-6.5v-3.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v2h1V5.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v8h1V4.5C12 3.7 12.7 3 13.5 3s1.5.7 1.5 1.5v8h1V5.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v8h1V7.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v9c0 3.5-3 6.5-6.5 6.5h-4z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="gp__menu-item"><LogOut size={11} /> Đăng xuất</div>
                  </div>
                </div>
              </div>
              <p className="gp__subcol-tip">Tại góc phải màn hình, nhấn vào hình đại diện (A) và chọn <b>"Đơn của tôi"</b>.</p>
            </div>

            {/* Arrow 1 */}
            <div className="gp__subcol-arrow">
              <ArrowRight size={16} />
            </div>

            {/* 4.2 */}
            <div className="gp__subcol">
              <div className="gp__subcol-hd">4.2 Chọn đơn hàng</div>
              <div className="gp__card">
                <div className="gp__order-list">
                  <div className="gp__order-head">Đơn hàng gần đây</div>
                  {ORDERS.map((o, i) => (
                    <div key={o.id} className={`gp__order-item${i===0?' gp__order-item--sel':''}`}>
                      <div className="gp__order-row">
                        <span className="gp__order-id">{o.id}</span>
                        <span className="gp__order-amt">{o.amt}</span>
                      </div>
                      <div className="gp__order-row">
                        <span className="gp__order-date">{o.date}</span>
                        <span className={`gp__status gp__status--${o.status}`}>{o.statusTxt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="gp__subcol-tip">Chọn đơn hàng bạn muốn xem.</p>
            </div>

            {/* Arrow 2 */}
            <div className="gp__subcol-arrow">
              <ArrowRight size={16} />
            </div>

            {/* 4.3 */}
            <div className="gp__subcol">
              <div className="gp__subcol-hd">4.3 Xem chi tiết đơn</div>
              <div className="gp__card">
                <div className="gp__detail">
                  <div className="gp__detail-top">
                    <span className="gp__detail-back">← Chi tiết đơn <b>#841409</b></span>
                    <span className="gp__detail-status">Thành công</span>
                  </div>
                  <div className="gp__detail-hero">
                    <img src="/logo.svg" alt="logo" className="gp__detail-logo" />
                    <div>
                      <div className="gp__detail-name">Tiến Vũ 34</div>
                      <div className="gp__detail-phone">0815618427</div>
                    </div>
                  </div>
                  <div className="gp__detail-row"><span>Số tiền chuyển</span><b>2.000.000đ</b></div>
                  <div className="gp__detail-row"><span>Phí dịch vụ (5%)</span><span>100.000đ</span></div>
                  <div className="gp__detail-row"><span>Thực nhận</span><span className="gp__net">1.900.000đ</span></div>
                  <div className="gp__detail-divider"/>
                  <div className="gp__detail-sec"><span className="gp__sec-dot">•</span> THÔNG TIN ĐƠN</div>
                  <div className="gp__detail-row"><span>Mã đơn</span><b>#841409</b></div>
                  <div className="gp__detail-row"><span>Mã đầy đủ</span><span className="gp__detail-mono">ef27412b-e638-46fa-9e80-b00315841409</span></div>
                  <div className="gp__detail-row"><span>Tạo lúc</span><span>19:05:42 17/6/2026</span></div>
                  <div className="gp__detail-row"><span>Hết hạn</span><span>19:20:42 17/6/2026</span></div>
                  <div className="gp__detail-row"><span>Cập nhật</span><span>23:40:54 18/6/2026</span></div>
                </div>
              </div>
              <p className="gp__subcol-tip">Xem thông tin chi tiết đơn hàng đã thành công.</p>
            </div>

          </div>
        </div>

      </div>{/* /gp__grid */}

      {/* ── NOTICE ── */}
      <div className="gp__notice">
        <div className="gp__notice-inner">
          <div className="gp__notice-left">
            <div className="gp__notice-shield-container">
              <ShieldCheck size={28} className="gp__notice-shield-icon" />
            </div>
            <div className="gp__notice-text-block">
              <div className="gp__notice-title">Lưu ý quan trọng</div>
              <div className="gp__notice-desc">Vui lòng chuyển đúng số tiền và nội dung chuyển khoản (nếu có).</div>
            </div>
          </div>
          <div className="gp__notice-right">
            <div className="gp__ni">
              <div className="gp__ni-icon"><FileText size={18} /></div>
              <div>Nội dung chuyển khoản <b>không liên quan</b> đến rút tiền, phí trả sau thành công.</div>
            </div>
            <div className="gp__ni">
              <div className="gp__ni-icon"><Clock size={18} /></div>
              <div>Đơn hàng sẽ tự động hủy nếu không thanh toán trong thời gian quy định.</div>
            </div>
            <div className="gp__ni">
              <div className="gp__ni-icon"><Headphones size={18} /></div>
              <div>Mọi thắc mắc vui lòng liên hệ hỗ trợ để được giải đáp.</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
