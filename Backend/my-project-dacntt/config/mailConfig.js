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

// Gửi email chứa mã OTP
const sendCreateAccount = async (to, otp) => {
  const mailOptions = {
    from: `"Hệ thống hỗ trợ" <${process.env.EMAIL}>`,
    to,
    subject: "Tạo tài khoản - Mã OTP",
    html: `
            <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
                <h2>Tạo tài khoản</h2>
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

const sendRecoveryPassword = async (to, otp) => {
  const mailOptions = {
    from: `"Hệ thống hỗ trợ" <${process.env.EMAIL}>`,
    to,
    subject: "Khôi phục mật khẩu - Mã OTP",
    html: `
            <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
                <h2>Khôi phục mật khẩu</h2>
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

const sendInviteMember = async (
  email,
  inviterName,
  memberName,
  projectName,
  inviteLink
) => {
  const mailOptions = {
    to: email,
    subject: `${inviterName} mời bạn tham gia dự án "${projectName}"`,
    html: `
    <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 580px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
      
      <div style="background-color: #f9f9f9; padding: 20px 30px; border-bottom: 1px solid #e0e0e0;">
        <h2 style="margin: 0; color: #333; font-size: 24px;">
          Lời mời tham gia dự án
        </h2>
      </div>

      <div style="padding: 30px; font-size: 16px; line-height: 1.6; color: #555;">
        <p>Xin chào <b>${memberName}</b>,</p>
        
        <p>Bạn vừa được <b>${inviterName}</b> mời tham gia vào dự án <b>"${projectName}"</b>.</p>
        
        <p>Để chấp nhận lời mời và bắt đầu làm việc, vui lòng nhấn vào nút bên dưới:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
            Chấp nhận lời mời
          </a>
        </div>
        
        <p>Nếu bạn không thể nhấn vào nút, hãy sao chép và dán liên kết sau vào trình duyệt của bạn:</p>
        <p style="word-break: break-all; font-size: 14px; color: #007bff;">${inviteLink}</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #888;">
          Lưu ý: Vì lý do bảo mật, liên kết này sẽ tự động hết hạn sau <b>3 ngày</b>.
        </p>
      </div>

      <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0;">Trân trọng,<br>Hệ thống quản lý công việc</p>
      </div>
      
    </div>
  `,
  };

  await transporter.sendMail(mailOptions);
};

const sendAcceptInvite = async (
  email,
  projectName,
  memberName,
  inviterName,
  message
) => {
  const mailOptions = {
    to: email,
    subject: `${memberName} đã chấp nhận lời mời tham gia dự án "${projectName}"`,
    html: `
    <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 580px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
      
      <!-- Header -->
      <div style="background-color: #f9f9f9; padding: 20px 30px; border-bottom: 1px solid #e0e0e0;">
        <h2 style="margin: 0; color: #333; font-size: 24px;">
          Thành viên đã chấp nhận lời mời
        </h2>
      </div>

      <!-- Body -->
      <div style="padding: 30px; font-size: 16px; line-height: 1.6; color: #555;">
        <p>Xin chào <b>${inviterName}</b>,</p>

        <p>Thành viên <b>${memberName}</b> vừa <span style="color:#007bff; font-weight:bold;">chấp nhận</span> lời mời tham gia dự án <b>"${projectName}"</b>.</p>

        <p style="background-color: #f1f7ff; border-left: 4px solid #007bff; padding: 12px 16px; border-radius: 6px; color: #333; font-size: 15px;">
          ${message}
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FE_URL || "#"}" target="_blank" 
            style="background-color: #007bff; color: #ffffff; padding: 14px 28px; 
            text-decoration: none; border-radius: 5px; display: inline-block; 
            font-weight: bold; font-size: 16px;">
            Xem chi tiết dự án
          </a>
        </div>

        <p style="font-size: 14px; color: #888;">
          Hãy chào đón thành viên mới và bắt đầu cộng tác cùng nhau 🎉
        </p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 14px; color: #888;">
          Trân trọng,<br>
          Hệ thống quản lý công việc
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0;">Trân trọng,<br>Hệ thống quản lý công việc</p>
      </div>
    </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendDeclineInvite = async (
  email,
  projectName,
  memberName, // người từ chối
  inviterName, // người mời
  message // nội dung notification
) => {
  const mailOptions = {
    to: email,
    subject: `${memberName} đã từ chối lời mời tham gia dự án "${projectName}"`,
    html: `
    <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 580px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
      
      <!-- Header -->
      <div style="background-color: #f9f9f9; padding: 20px 30px; border-bottom: 1px solid #e0e0e0;">
        <h2 style="margin: 0; color: #333; font-size: 24px;">
          Lời mời bị từ chối
        </h2>
      </div>

      <!-- Body -->
      <div style="padding: 30px; font-size: 16px; line-height: 1.6; color: #555;">
        <p>Xin chào <b>${inviterName}</b>,</p>

        <p>Thành viên <b style="color:#007bff;">${memberName}</b> đã <b style="color:#d9534f;">từ chối</b> lời mời tham gia vào dự án <b>"${projectName}"</b>.</p>

        ${
          message
            ? `<p style="background-color:#f8f9fa; padding:12px 18px; border-left:4px solid #007bff; border-radius:6px; font-style:italic; color:#666;">
              ${message}
            </p>`
            : ""
        }

        <p>Bạn có thể xem chi tiết trong hệ thống hoặc mời thành viên khác tham gia dự án.</p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 14px; color: #888;">
          Trân trọng,<br>
          Hệ thống quản lý công việc
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0;">© 2025 Hệ thống quản lý công việc. Mọi quyền được bảo lưu.</p>
      </div>
      
    </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendCreateAccount,
  sendRecoveryPassword,
  sendInviteMember,
  sendAcceptInvite,
  sendDeclineInvite,
};
