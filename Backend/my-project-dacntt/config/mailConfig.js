const nodemailer = require("nodemailer");
require("dotenv").config();

// -----------------------------
// Khởi tạo transporter Gmail
// -----------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// -----------------------------
// Hàm helper gửi email
// -----------------------------
const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: `"Hệ thống hỗ trợ" <${process.env.EMAIL}>`,
    to,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

// -----------------------------
// 1️⃣ Tạo tài khoản / OTP
// -----------------------------
const sendCreateAccount = async (to, otp) => {
  const subject = "Tạo tài khoản - Mã OTP";
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:16px; color:#333;">
      <h2 style="color:#2d8cf0;">Tạo tài khoản</h2>
      <p>Bạn vừa yêu cầu tạo tài khoản mới.</p>
      <p><strong>Mã OTP của bạn là:</strong></p>
      <div style="font-size:24px; font-weight:bold; color:#2d8cf0;">${otp}</div>
      <p>Mã OTP này có hiệu lực trong 5 phút.</p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      <br/>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
    </div>
  `;
  await sendEmail(to, subject, html);
};

// -----------------------------
// 2️⃣ Khôi phục mật khẩu / OTP
// -----------------------------
const sendRecoveryPassword = async (to, otp) => {
  const subject = "Khôi phục mật khẩu - Mã OTP";
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:16px; color:#333;">
      <h2 style="color:#2d8cf0;">Khôi phục mật khẩu</h2>
      <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản.</p>
      <p><strong>Mã OTP của bạn là:</strong></p>
      <div style="font-size:24px; font-weight:bold; color:#2d8cf0;">${otp}</div>
      <p>Mã OTP này có hiệu lực trong 5 phút.</p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      <br/>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
    </div>
  `;
  await sendEmail(to, subject, html);
};

// -----------------------------
// 3️⃣ Mời tham gia board
// -----------------------------
const sendShareBoardEmail = async (
  to,
  inviterName,
  boardTitle,
  message,
  link
) => {
  const subject = `Lời mời tham gia bảng "${boardTitle}"`;
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:16px; color:#333; line-height:1.5;">
      <h2 style="color:#2d8cf0;">Mời bạn tham gia bảng làm việc</h2>
      <p><b>${inviterName}</b> đã mời bạn tham gia bảng <b>"${boardTitle}"</b>.</p>
      ${
        message
          ? `<blockquote style="margin:15px 0; padding:10px 15px; background:#f3f8ff; border-left:4px solid #2d8cf0;">${message}</blockquote>`
          : ""
      }
      <p>Bạn có thể truy cập bảng này tại liên kết sau:</p>
      <p style="text-align:center;">
        <a href="${link}" style="display:inline-block; background-color:#2d8cf0; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">Tham gia ngay</a>
      </p>
      <br/>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
      <hr style="margin-top:30px; border:none; border-top:1px solid #ccc;">
      <small style="color:#888;">Đây là email tự động, vui lòng không trả lời.</small>
    </div>
  `;
  await sendEmail(to, subject, html);
};

// -----------------------------
// 4️⃣ Thông báo assign task
// -----------------------------
const sendAssignTaskEmail = async (to, task, title, inviterName) => {
  const subject = `Bạn được chỉ định vào task "${task.title}"`;
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:16px; color:#333; line-height:1.5;">
      <h2 style="color:#2d8cf0;">Bạn được chỉ định vào task</h2>
      <p><b>${inviterName}</b> đã chỉ định bạn vào task <b>"${
    task.title
  }"</b> trên bảng <b>"${title}"</b>.</p>
      <p><strong>Mô tả:</strong> ${task.description || "Không có"}</p>
      <p><strong>Bắt đầu:</strong> ${
        task.startDate || "Chưa có"
      } | <strong>Hạn:</strong> ${task.dueDate || "Chưa có"}</p>
      <p>Hãy truy cập ứng dụng để xem chi tiết và thực hiện công việc.</p>
      <br/>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
      <hr style="margin-top:30px; border:none; border-top:1px solid #ccc;">
      <small style="color:#888;">Đây là email tự động, vui lòng không trả lời.</small>
    </div>
  `;
  await sendEmail(to, subject, html);
};

// -----------------------------
// 4️⃣ Thông báo remove member
// -----------------------------
const sendRemoveMemberEmail = async (to, task, title, inviterName) => {
  const subject = `Bạn được chỉ định vào task "${task.title}"`;
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:16px; color:#333; line-height:1.5;">
      <h2 style="color:#2d8cf0;">Bạn đã được loại bỏ ra khỏi task</h2>
      <p><b>${inviterName}</b> đã loại bạn ra khỏi task <b>"${task.title}"</b> trên bảng <b>"${title}"</b>.</p>
      <p>Hãy truy cập ứng dụng để xem chi tiết</p>
      <br/>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
      <hr style="margin-top:30px; border:none; border-top:1px solid #ccc;">
      <small style="color:#888;">Đây là email tự động, vui lòng không trả lời.</small>
    </div>
  `;
  await sendEmail(to, subject, html);
};

// -----------------------------
// 5️⃣ Nhắc deadline task
// -----------------------------
const sendTaskDeadlineEmail = async (to, task) => {
  const subject = `Task "${task.title}" sắp hết hạn`;
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:16px; color:#333; line-height:1.5;">
      <h2 style="color:#2d8cf0;">Nhắc nhở deadline task</h2>
      <p>Task <b>"${task.title}"</b> trên bảng <b>"${task.boardId.title}"</b> sẽ hết hạn trong <b>${task.reminderTime} phút</b>.</p>
      <p>Hãy hoàn thành task trước thời hạn.</p>
      <br/>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
      <hr style="margin-top:30px; border:none; border-top:1px solid #ccc;">
      <small style="color:#888;">Đây là email tự động, vui lòng không trả lời.</small>
    </div>
  `;
  await sendEmail(to, subject, html);
};

// Hàm thông báo email - xóa thành viên ra khỏi bảng làm việc
const sendRemoveFromBoardEmail = async (to, boardTitle) => {
  const subject = `Bạn đã bị xóa khỏi bảng "${boardTitle}"`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width:600px; margin:0 auto;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 28px;">Cập nhật bảng làm việc</h1>
      </div>

      <!-- Content -->
      <div style="background: #f8f9fa; padding: 40px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <div style="background: #fff; padding: 30px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Main Message -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 15px;">👋</div>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
              Xin thông báo rằng Quản trị viên đã xóa bạn khỏi bảng làm việc:
            </p>
          </div>

          <!-- Board Info Card -->
          <div style="background: #f0f2f5; border-left: 4px solid #667eea; padding: 20px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Bảng làm việc</p>
            <h2 style="margin: 8px 0 0 0; color: #333; font-size: 22px; font-weight: 600;">
              📋 ${boardTitle}
            </h2>
          </div>

          <!-- Info Text -->
          <div style="margin: 30px 0; padding: 20px; background: #e7f3ff; border-radius: 6px; border-left: 4px solid #667eea;">
            <p style="color: #0066cc; font-size: 14px; margin: 0; line-height: 1.6;">
              <strong>Điều này có nghĩa là:</strong>
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #0066cc; font-size: 14px;">
              <li style="margin: 5px 0;">Bạn sẽ không còn nhìn thấy bảng này trong danh sách bảng của mình</li>
              <li style="margin: 5px 0;">Bạn không thể truy cập hoặc chỉnh sửa các task trên bảng này</li>
              <li style="margin: 5px 0;">Bạn sẽ không nhận được thông báo từ bảng này nữa</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="text-align: center; color: #999; font-size: 12px; line-height: 1.6;">
            <p style="margin: 5px 0;">
              Đây là email tự động từ <b>Hệ thống quản lý công việc</b>
            </p>
            <p style="margin: 5px 0;">
              Nếu bạn có bất kỳ câu hỏi, vui lòng liên hệ với chúng tôi.
            </p>
          </div>
        </div>
      </div>

      <!-- Brand Footer -->
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2025 Hệ thống quản lý công việc. All rights reserved.</p>
      </div>
    </div>
  `;
  await sendEmail(to, subject, html);
};

// -----------------------------
// 6️⃣ Thông báo gán user vào check-item (mục việc cần làm)
// -----------------------------
const sendAssignCheckItemEmail = async (
  to,
  inviterName,
  boardTitle,
  taskTitle,
  checkItemTitle
) => {
  const subject = `Bạn được giao mục việc: "${checkItemTitle}"`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
          Công việc mới được giao
        </h1>
      </div>

      <!-- Main Content -->
      <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 30px;">
          Chào bạn,
        </p>
        <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
          <strong>${inviterName}</strong> đã giao cho bạn một mục việc cần thực hiện trong task.
        </p>

        <!-- Check Item Highlight -->
        <div style="background: #eef2ff; border-left: 4px solid #6366f1; padding: 20px; border-radius: 6px; margin: 30px 0;">
          <p style="margin: 0 0 8px 0; color: #6366f1; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
            Mục việc cần làm
          </p>
          <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">
            ${checkItemTitle}
          </h2>
        </div>

        <!-- Task & Board Context -->
        <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 30px 0;">
          <table style="width: 100%; font-size: 15px; color: #4b5563;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600;">Trong bảng:</td>
              <td style="padding: 8px 0;">${boardTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; width: 100px;">Thuộc task:</td>
              <td style="padding: 8px 0;">${taskTitle}</td>
            </tr>
          </table>
        </div>

        <!-- Suggestion -->
        <div style="background: #f0fdfa; padding: 20px; border-radius: 6px; border-left: 4px solid #14b8a6; margin: 30px 0;">
          <p style="margin: 0; color: #0f766e; font-size: 15px; line-height: 1.6;">
            <strong>Lời khuyên:</strong> Bạn vui lòng truy cập ứng dụng để xem chi tiết và đánh dấu hoàn thành khi đã thực hiện xong mục việc này.
          </p>
        </div>

        <!-- Closing -->
        <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin-top: 40px;">
          Trân trọng,<br>
          <strong>Đội ngũ Hệ thống quản lý công việc</strong>
        </p>

        <!-- Footer Note -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0 20px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          Đây là email tự động, vui lòng không trả lời email này.<br>
          Nếu bạn có thắc mắc, hãy liên hệ với quản trị viên của bảng làm việc.
        </p>
      </div>

      <!-- Brand Footer -->
      <div style="text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 12px; background: #f9fafb;">
        <p style="margin: 0;">
          © 2025 Hệ thống quản lý công việc. All rights reserved.
        </p>
      </div>
    </div>
  `;

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
