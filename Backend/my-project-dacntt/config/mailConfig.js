const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: `"Hệ thống quản lý công việc" <${process.env.EMAIL}>`,
    to,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

// -----------------------------
// Template chung cho email thông báo (assign, invite, remove, deadline, check-item)
// -----------------------------
const getNotificationTemplate = (title, contentBlocks, footerNote = "") => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0079bf 0%, #0065a5 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">${title}</h1>
    </div>

    <!-- Main Content -->
    <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      ${contentBlocks}
      
      <!-- Closing -->
      <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin-top: 40px;">
        Trân trọng,<br>
        <strong>Đội ngũ Hệ thống quản lý công việc</strong>
      </p>

      <!-- Footer Note -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0 20px 0;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        Đây là email tự động, vui lòng không trả lời email này.<br>
        ${footerNote}
      </p>
    </div>

    <!-- Brand Footer -->
    <div style="text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 12px; background: #f9fafb;">
      <p style="margin: 0;">© 2025 Hệ thống quản lý công việc. All rights reserved.</p>
    </div>
  </div>
`;

// -----------------------------
// 1️⃣ & 2️⃣ OTP (giữ đơn giản, bảo mật)
// -----------------------------
const getOTPTemplate = (type, otp) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 40px 20px;">
    <div style="background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center;">
      <h2 style="color: #0079bf; margin-bottom: 30px;">${type}</h2>
      <p style="font-size: 16px; color: #374151;">Mã OTP của bạn là:</p>
      <div style="font-size: 36px; font-weight: bold; color: #0079bf; letter-spacing: 8px; margin: 20px 0;">${otp}</div>
      <p style="font-size: 14px; color: #6b7280;">Mã này có hiệu lực trong 5 phút.<br>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0 20px 0;">
      <p style="font-size: 12px; color: #9ca3af;">© 2025 Hệ thống quản lý công việc</p>
    </div>
  </div>
`;

const sendCreateAccount = async (to, otp) => {
  const subject = "Tạo tài khoản - Mã OTP";
  const html = getOTPTemplate("Tạo tài khoản mới", otp);
  await sendEmail(to, subject, html);
};

const sendRecoveryPassword = async (to, otp) => {
  const subject = "Khôi phục mật khẩu - Mã OTP";
  const html = getOTPTemplate("Khôi phục mật khẩu", otp);
  await sendEmail(to, subject, html);
};

// -----------------------------
// 3️⃣ Mời tham gia board
// -----------------------------
const sendShareBoardEmail = async (to, inviterName, boardTitle, message, link) => {
  const subject = `Lời mời tham gia bảng "${boardTitle}"`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7;">
      <strong>${inviterName}</strong> đã mời bạn tham gia bảng làm việc <strong>"${boardTitle}"</strong>.
    </p>
    ${message ? `<blockquote style="margin: 30px 0; padding: 20px; background: #f0f9ff; border-left: 4px solid #0079bf; border-radius: 6px; color: #374151;">${message}</blockquote>` : ""}
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${link}" style="display: inline-block; background-color: #0079bf; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Tham gia ngay
      </a>
    </div>
  `;

  const html = getNotificationTemplate("Mời tham gia bảng làm việc", contentBlocks);
  await sendEmail(to, subject, html);
};

// -----------------------------
// 4️⃣ Assign task
// -----------------------------
const sendAssignTaskEmail = async (to, task, boardTitle, inviterName) => {
  const subject = `Bạn được chỉ định vào task "${task.title}"`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      <strong>${inviterName}</strong> đã chỉ định bạn vào task trên bảng <strong>"${boardTitle}"</strong>.
    </p>

    <div style="background: #eef2ff; border-left: 4px solid #0079bf; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 8px 0; color: #0079bf; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Task</p>
      <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">${task.title}</h2>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <table style="width: 100%; font-size: 15px; color: #4b5563;">
        ${task.description ? `<tr><td style="padding: 8px 0; font-weight: 600;">Mô tả:</td><td style="padding: 8px 0;">${task.description}</td></tr>` : ""}
        <tr><td style="padding: 8px 0; font-weight: 600;">Bắt đầu:</td><td style="padding: 8px 0;">${task.startDate || "Chưa có"}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600;">Hạn:</td><td style="padding: 8px 0;">${task.dueDate || "Chưa có"}</td></tr>
      </table>
    </div>

    <div style="background: #f0fdfa; padding: 20px; border-radius: 6px; border-left: 4px solid #14b8a6; margin: 30px 0;">
      <p style="margin: 0; color: #0f766e; font-size: 15px;">Hãy truy cập ứng dụng để xem chi tiết và thực hiện công việc.</p>
    </div>
  `;

  const html = getNotificationTemplate("Bạn được chỉ định task mới", contentBlocks);
  await sendEmail(to, subject, html);
};

// -----------------------------
// Remove member khỏi task
// -----------------------------
const sendRemoveMemberEmail = async (to, task, boardTitle, inviterName) => {
  const subject = `Bạn đã bị loại khỏi task "${task.title}"`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      <strong>${inviterName}</strong> đã loại bạn khỏi task trên bảng <strong>"${boardTitle}"</strong>.
    </p>

    <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Task</p>
      <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">${task.title}</h2>
    </div>

    <p style="font-size: 15px; color: #4b5563;">Bạn sẽ không còn nhận thông báo liên quan đến task này nữa.</p>
  `;

  const html = getNotificationTemplate("Cập nhật quyền truy cập task", contentBlocks);
  await sendEmail(to, subject, html);
};

// -----------------------------
// 5️⃣ Nhắc deadline task
// -----------------------------
const sendTaskDeadlineEmail = async (to, task) => {
  const subject = `Task "${task.title}" sắp hết hạn`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      Task trên bảng <strong>"${task.boardId.title}"</strong> sẽ hết hạn trong <strong>${task.reminderTime} phút</strong>.
    </p>

    <div style="background: #ffedd5; border-left: 4px solid #f97316; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 8px 0; color: #f97316; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Task sắp hết hạn</p>
      <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">${task.title}</h2>
    </div>

    <div style="background: #fef3c7; padding: 20px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 30px 0;">
      <p style="margin: 0; color: #92400e; font-size: 15px;">Hãy hoàn thành task trước thời hạn để tránh trễ tiến độ.</p>
    </div>
  `;

  const html = getNotificationTemplate("Nhắc nhở deadline", contentBlocks);
  await sendEmail(to, subject, html);
};

// -----------------------------
// Xóa thành viên khỏi board
// -----------------------------
const sendRemoveFromBoardEmail = async (to, boardTitle) => {
  const subject = `Bạn đã bị xóa khỏi bảng "${boardTitle}"`;

  const contentBlocks = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 48px; margin-bottom: 15px;">👋</div>
    </div>

    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      Quản trị viên đã xóa bạn khỏi bảng làm việc:
    </p>

    <div style="background: #f0f2f5; border-left: 4px solid #0079bf; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Bảng làm việc</p>
      <h2 style="margin: 8px 0 0 0; color: #333; font-size: 22px; font-weight: 600;">📋 ${boardTitle}</h2>
    </div>

    <div style="margin: 30px 0; padding: 20px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #ef4444;">
      <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">
        <strong>Điều này có nghĩa là:</strong>
      </p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #991b1b; font-size: 14px;">
        <li style="margin: 5px 0;">Bạn không còn thấy bảng này trong danh sách</li>
        <li style="margin: 5px 0;">Bạn không thể truy cập hoặc chỉnh sửa task</li>
        <li style="margin: 5px 0;">Bạn không nhận thông báo từ bảng nữa</li>
      </ul>
    </div>
  `;

  const html = getNotificationTemplate("Cập nhật thành viên bảng", contentBlocks, "Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ quản trị viên.");
  await sendEmail(to, subject, html);
};

// -----------------------------
// 6️⃣ Gán check-item
// -----------------------------
const sendAssignCheckItemEmail = async (to, inviterName, boardTitle, taskTitle, checkItemTitle) => {
  const subject = `Bạn được giao mục việc: "${checkItemTitle}"`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      <strong>${inviterName}</strong> đã giao cho bạn một mục việc cần thực hiện.
    </p>

    <div style="background: #eef2ff; border-left: 4px solid #0079bf; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 8px 0; color: #0079bf; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Mục việc cần làm</p>
      <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">☐ ${checkItemTitle}</h2>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <table style="width: 100%; font-size: 15px; color: #4b5563;">
        <tr><td style="padding: 8px 0; font-weight: 600;">Trong bảng:</td><td style="padding: 8px 0;">${boardTitle}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600;">Thuộc task:</td><td style="padding: 8px 0;">${taskTitle}</td></tr>
      </table>
    </div>

    <div style="background: #f0fdfa; padding: 20px; border-radius: 6px; border-left: 4px solid #14b8a6; margin: 30px 0;">
      <p style="margin: 0; color: #0f766e; font-size: 15px; line-height: 1.6;">
        <strong>Lời khuyên:</strong> Vui lòng truy cập ứng dụng để đánh dấu hoàn thành khi xong.
      </p>
    </div>
  `;

  const html = getNotificationTemplate("Công việc mới được giao", contentBlocks);
  await sendEmail(to, subject, html);
};

module.exports = {
  sendCreateAccount,
  sendRecoveryPassword,
  sendShareBoardEmail,
  sendAssignTaskEmail,
  sendTaskDeadlineEmail,
  sendRemoveMemberEmail,
  sendRemoveFromBoardEmail,
  sendAssignCheckItemEmail,
};