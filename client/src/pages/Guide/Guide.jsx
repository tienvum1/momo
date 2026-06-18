import {
  ArrowRight, QrCode, Lock, ShieldCheck,
  Phone, User, CircleDollarSign, Camera,
  CheckCircle, AlertTriangle, BadgePercent, Wallet
} from 'lucide-react';
import './Guide.scss';

const Guide = () => (
  <div className="gd-page">

    {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
    <div className="gd-hero">
      <h1 className="gd-h1">
        Hướng dẫn <em>rút ví trả sau</em> Momo247
      </h1>
      <p className="gd-sub">Thực hiện nhanh chóng chỉ với 3 bước đơn giản</p>

      <div className="gd-stepbar">
        <div className="gd-step-item">
          <div className="gd-step-dot">1</div>
          <div className="gd-step-txt">
            <strong>Chọn QR &amp; Tạo đơn</strong>
            <span>Chọn mã QR phù hợp và nhấn<br />"Tạo đơn" để bắt đầu</span>
          </div>
        </div>
        <ArrowRight size={18} className="gd-arrow" />
        <div className="gd-step-item">
          <div className="gd-step-dot">2</div>
          <div className="gd-step-txt">
            <strong>Điền thông tin</strong>
            <span>Nhập số điện thoại MoMo, tên chính chủ<br />và số tiền cần nhận.</span>
          </div>
        </div>
        <ArrowRight size={18} className="gd-arrow" />
        <div className="gd-step-item">
          <div className="gd-step-dot">3</div>
          <div className="gd-step-txt">
            <strong>Tạo QR &amp; Xác nhận</strong>
            <span>Tạo QR nhận tiền, upload ảnh giao dịch<br />(nếu có), ghi chú và xác nhận.</span>
          </div>
        </div>
      </div>
    </div>

    {/* ══ 3 CARDS ═══════════════════════════════════════════════════════════ */}
    <div className="gd-grid">

      {/* ── BƯỚC 1 ── */}
      <div className="gd-card">
        <div className="gd-card-hd">
          <span className="gd-badge">BƯỚC 1</span>
          <span className="gd-card-name">Chọn QR và tạo đơn</span>
        </div>

        <div className="gd-c1">
          {/* QR preview — full width, no top label */}
          <div className="gd-qr-frame">
            <img src="/qrDaiDienMomo.png" alt="QR" className="gd-qr-img" />
            <div className="gd-qr-frame-name">Momo</div>
          </div>

          {/* fee + limit boxes */}
          <div className="gd-boxes">
            <div className="gd-box">
              <div className="gd-box-hd pink"><BadgePercent size={11} /> PHÍ GIAO DỊCH</div>
              <div className="gd-box-row"><span>Dưới 5.000.000đ</span><b>5%</b></div>
              <div className="gd-box-row"><span>Trên 5.000.000đ</span><b>4%</b></div>
            </div>
            <div className="gd-box">
              <div className="gd-box-hd pink"><Wallet size={11} /> HẠN MỨC</div>
              <div className="gd-box-stack">
                <span>Tối đa / lần chuyển</span>
                <b>20.000.000đ</b>
              </div>
              <div className="gd-box-stack">
                <span>Hạn mức còn lại</span>
                <b className="pink">115.999.998đ</b>
              </div>
            </div>
          </div>

          <button className="gd-btn-pink">Tạo đơn</button>
        </div>

        {/* guide list */}
        <div className="gd-guide-list">
          <div className="gd-guide-item"><span className="gd-num">1</span>Chọn mã QR phù hợp với nhu cầu.</div>
          <div className="gd-guide-item"><span className="gd-num">2</span>Nhấn <b>"Tạo đơn"</b> để tiếp tục.</div>
        </div>
      </div>

      {/* ── BƯỚC 2 ── */}
      <div className="gd-card">
        <div className="gd-card-hd">
          <span className="gd-badge">BƯỚC 2</span>
          <span className="gd-card-name">Điền thông tin giao dịch</span>
        </div>

        <div className="gd-c2">
          <span className="gd-form-back">← Trang chủ</span>
          <div className="gd-form-title-row">
            <span className="gd-form-bar" />
            <div>
              <div className="gd-form-title">Tạo đơn thanh toán</div>
              <div className="gd-form-desc">Tạo QR để khách hàng quét mã thanh toán</div>
            </div>
          </div>

          <div className="gd-field">
            <label>Số điện thoại MoMo <span className="req">*</span></label>
            <div className="gd-inp"><Phone size={14} className="gd-ico" /><input placeholder="Nhập số điện thoại MoMo" readOnly /></div>
          </div>
          <div className="gd-field">
            <label>Tên chính chủ <span className="req">*</span></label>
            <div className="gd-inp"><User size={14} className="gd-ico" /><input placeholder="Nhập họ tên đầy đủ" readOnly /></div>
          </div>
          <div className="gd-field">
            <label>Số tiền cần nhận (VND) <span className="req">*</span></label>
            <div className="gd-inp">
              <CircleDollarSign size={14} className="gd-ico" />
              <input placeholder="Nhập số tiền" readOnly />
              <span className="gd-sfx">đ</span>
            </div>
            <div className="gd-quick">
              {['100.000đ','200.000đ','500.000đ','1.000.000đ','2.000.000đ'].map(v => (
                <span key={v} className="gd-qchip">{v}</span>
              ))}
            </div>
          </div>

          <div className="gd-fee-note">
            <ShieldCheck size={11} />
            Phí giao dịch sẽ được trừ tự động khi khách hàng thanh toán thành công.
          </div>

          <button className="gd-btn-pink"><QrCode size={14} /> Tạo QR nhận tiền</button>
          <div className="gd-secure"><Lock size={11} /> Thông tin của bạn được bảo mật tuyệt đối</div>
        </div>

        <div className="gd-guide-list">
          <div className="gd-guide-item"><span className="gd-num">1</span>Nhập số điện thoại MoMo.</div>
          <div className="gd-guide-item"><span className="gd-num">2</span>Nhập tên chính chủ trùng với tài khoản MoMo.</div>
          <div className="gd-guide-item"><span className="gd-num">3</span>Nhập số tiền cần nhận.</div>
          <div className="gd-guide-item"><span className="gd-num">4</span>Nhấn <b>"Tạo QR nhận tiền"</b>.</div>
        </div>
      </div>

      {/* ── BƯỚC 3 ── */}
      <div className="gd-card">
        <div className="gd-card-hd">
          <span className="gd-badge">BƯỚC 3</span>
          <span className="gd-card-name">Xác nhận và gửi giao dịch</span>
        </div>

        <div className="gd-c3">
          <div className="gd-c3-label">Quét mã để khách hàng thanh toán</div>

          {/* 2 columns: tall bill image left | upload+note right */}
          <div className="gd-c3-row">
            <div className="gd-qrb">
              <div className="gd-qrb-tag"><QrCode size={10} /> QR Thẻ hệ 2.0</div>
              <img src="/IMG_6092.JPG" alt="Bill" className="gd-bill-img" />
              <div className="gd-qrb-code">Mã đơn: a808c7 · 14:50</div>
            </div>

            <div className="gd-c3-right">
              <label className="gd-c3-lbl">
                Tải ảnh giao dịch <span>(không bắt buộc)</span>
              </label>
              <div className="gd-upload">
                <Camera size={18} color="#ec4899" />
                <span>Chụp hoặc tải ảnh lên</span>
                <small>Hỗ trợ JPG, PNG tối đa 5MB</small>
              </div>

              <label className="gd-c3-lbl" style={{ marginTop: 8 }}>
                Ghi chú <span>(không bắt buộc)</span>
              </label>
              <div className="gd-note-box">Nhập ghi chú cho giao dịch...</div>
              <div className="gd-char-count">0/200</div>
            </div>
          </div>

          <button className="gd-btn-pink"><CheckCircle size={14} /> Tôi đã chuyển tiền</button>
          <div className="gd-secure"><Lock size={11} /> Thông tin của bạn được bảo mật tuyệt đối</div>
        </div>

        <div className="gd-guide-list">
          <div className="gd-guide-item"><span className="gd-num">1</span>Gửi mã QR cho khách hàng để thanh toán.</div>
          <div className="gd-guide-item"><span className="gd-num">2</span>Upload ảnh giao dịch (nếu có).</div>
          <div className="gd-guide-item"><span className="gd-num">3</span>Ghi chú thêm cho giao dịch (nếu cần).</div>
          <div className="gd-guide-item"><span className="gd-num">4</span>Nhấn <b>"Tôi đã chuyển tiền"</b> để hoàn tất.</div>
        </div>
      </div>

    </div>

    {/* ══ NOTICE ════════════════════════════════════════════════════════════ */}
    <div className="gd-notice">
      <div className="gd-notice-ttl">
        <AlertTriangle size={15} color="#ec4899" />
        Lưu ý quan trọng
      </div>
      <div className="gd-notice-body">
        <div className="gd-ni"><span className="gd-ni-dot" />Vui lòng chuyển đúng số tiền và nội dung chuyển khoản (nếu có).</div>
        <div className="gd-ni"><span className="gd-ni-dot" />Nội dung chuyển khoản <b>không liên quan</b> đến rút tiền, phí trả sau thành công.</div>
        <div className="gd-ni"><span className="gd-ni-dot" />Đơn hàng sẽ tự động hủy nếu không thanh toán trong thời gian quy định.</div>
      </div>
    </div>

  </div>
);

export default Guide;
