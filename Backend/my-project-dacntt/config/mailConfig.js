const nodemailer = require("nodemailer");
require("dotenv").config();

// Khởi tạo transporter với Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// -----------------------------
// Gửi email OTP khi tạo tài khoản
// -----------------------------
const sendCreateAccount = async (to, otp) => {
  const mailOptions = {
    from: `"Hệ thống hỗ trợ" <${process.env.EMAIL}>`,
    to,
    subject: "Tạo tài khoản - Mã OTP",
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <h2 style="color:#2d8cf0;">Tạo tài khoản</h2>
        <p>Bạn vừa yêu cầu tạo tài khoản mới.</p>
        <p><strong>Mã OTP của bạn là:</strong></p>
        <div style="font-size: 24px; font-weight: bold; color: #2d8cf0;">${otp}</div>
        <p>Mã OTP này có hiệu lực trong 5 phút.</p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        <br/>
        <p>Trân trọng,</p>
        <p>Đội ngũ hỗ trợ</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// -----------------------------
// Gửi email OTP khi khôi phục mật khẩu
// -----------------------------
const sendRecoveryPassword = async (to, otp) => {
  const mailOptions = {
    from: `"Hệ thống hỗ trợ" <${process.env.EMAIL}>`,
    to,
    subject: "Khôi phục mật khẩu - Mã OTP",
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <h2 style="color:#2d8cf0;">Khôi phục mật khẩu</h2>
        <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản.</p>
        <p><strong>Mã OTP của bạn là:</strong></p>
        <div style="font-size: 24px; font-weight: bold; color: #2d8cf0;">${otp}</div>
        <p>Mã OTP này có hiệu lực trong 5 phút.</p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        <br/>
        <p>Trân trọng,</p>
        <p>Đội ngũ hỗ trợ</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// -----------------------------
// 💌 Gửi email mời tham gia bảng làm việc
// -----------------------------
const sendShareBoardEmail = async (to, inviterName, boardTitle, message, link) => {
  const mailOptions = {
    from: `"Hệ thống hỗ trợ" <${process.env.EMAIL}>`,
    to,
    subject: `Lời mời tham gia bảng "${boardTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
        <div style="text-align: center; border-bottom: 2px solid #2d8cf0; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="color:#2d8cf0; margin: 0;">Mời bạn tham gia bảng làm việc</h2>
        </div>

        <p>Xin chào,</p>
        <p><b>${inviterName}</b> đã mời bạn tham gia bảng <b>"${boardTitle}"</b>.</p>

        ${message ? `<blockquote style="margin: 15px 0; padding: 10px 15px; background: #f3f8ff; border-left: 4px solid #2d8cf0;">${message}</blockquote>` : ""}

        <p>Bạn có thể truy cập bảng này tại liên kết sau:</p>
        <p style="text-align: center;">
          <a href="${link}" 
             style="display:inline-block; background-color:#2d8cf0; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">
             Tham gia ngay
          </a>
        </p>

        <br/>
        <p>Trân trọng,</p>
        <p>Đội ngũ hỗ trợ</p>

        <hr style="margin-top:30px; border:none; border-top:1px solid #ccc;">
        <small style="color:#888;">Đây là email tự động, vui lòng không trả lời.</small>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendCreateAccount,
  sendRecoveryPassword,
  sendShareBoardEmail,
};
