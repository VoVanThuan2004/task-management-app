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
const sendShareBoardEmail = async (
  to,
  inviterName,
  boardTitle,
  message,
  link
) => {
  const subject = `Lời mời tham gia bảng "${boardTitle}"`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7;">
      <strong>${inviterName}</strong> đã mời bạn tham gia bảng làm việc <strong>"${boardTitle}"</strong>.
    </p>
    ${
      message
        ? `<blockquote style="margin: 30px 0; padding: 20px; background: #f0f9ff; border-left: 4px solid #0079bf; border-radius: 6px; color: #374151;">${message}</blockquote>`
        : ""
    }
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${link}" style="display: inline-block; background-color: #0079bf; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Tham gia ngay
      </a>
    </div>
  `;

  const html = getNotificationTemplate(
    "Mời tham gia bảng làm việc",
    contentBlocks
  );
  await sendEmail(to, subject, html);
};

// -----------------------------
// 4️⃣ Assign task
// -----------------------------
const sendAssignTaskEmail = async (to, task, boardTitle, inviterName, link) => {
  const subject = `Bạn được chỉ định vào task "${task.title}"`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      <strong>${inviterName}</strong> đã chỉ định bạn vào task trên bảng <strong>"${boardTitle}"</strong>.
    </p>

    <div style="background: #eef2ff; border-left: 4px solid #0079bf; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 8px 0; color: #0079bf; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Task</p>
      <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">${
        task.title
      }</h2>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <table style="width: 100%; font-size: 15px; color: #4b5563;">
        <tr>
        <td style="padding: 8px 0; font-weight: 600;">Bắt đầu:</td>
        <td style="padding: 8px 0;">
          ${
            task.startDate
              ? new Date(task.startDate).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Chưa có"
          }
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600;">Hạn:</td>
        <td style="padding: 8px 0;">
          ${
            task.dueDate
              ? new Date(task.dueDate).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Chưa có"
          }
        </td>
      </tr>
      </table>
    </div>

    <!-- Nút CTA nổi bật + Link -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="${link}" 
         style="display: inline-block; padding: 14px 32px; background: #0079bf; color: white; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,121,191,0.3); transition: all 0.3s ease;">
        Xem chi tiết & thực hiện task ngay
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
      Email này được gửi tự động từ hệ thống. Nếu bạn không phải là người nhận, vui lòng bỏ qua.
    </p>
  `;

  const html = getNotificationTemplate(
    "Bạn được chỉ định task mới",
    contentBlocks
  );
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

  const html = getNotificationTemplate(
    "Cập nhật quyền truy cập task",
    contentBlocks
  );
  await sendEmail(to, subject, html);
};

// -----------------------------
// 5️⃣ Nhắc deadline task
// -----------------------------
const sendTaskDeadlineEmail = async (to, task, link) => {
  const subject = `Task "${task.title}" đã hết hạn`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      Task trên bảng <strong>"${task.boardId.title}"</strong> đã hết hạn.
    </p>

    <div style="background: #ffedd5; border-left: 4px solid #f97316; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 8px 0; color: #f97316; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Task đã hết hạn</p>
      <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">${task.title}</h2>
    </div>

    <!-- Nút CTA nổi bật -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="${link}" 
         style="display: inline-block; padding: 16px 36px; background: #f97316; color: white; font-size: 17px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 6px 16px rgba(249, 115, 22, 0.3); transition: all 0.3s ease;">
        Mở task ngay để hoàn thành
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
      Email nhắc nhở được gửi tự động. Vui lòng không trả lời email này.
    </p>
  `;

  const html = getNotificationTemplate("Nhắc nhở deadline", contentBlocks);
  await sendEmail(to, subject, html);
};

// -----------------------------
// 🔔 Nhắc task sắp tới hạn
// -----------------------------
const sendTaskNearDeadlineEmail = async (
  to,
  task,
  link,
  reminderTime // số phút còn lại
) => {
  const remainingTimeText = formatRemainingTime(reminderTime);

  const subject = `Task "${task.title}" sắp hết hạn`;

  const contentBlocks = `
    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
      Task trên bảng <strong>"${task.boardId.title}"</strong> sắp tới hạn.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 8px 0; color: #f59e0b; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        Task sắp hết hạn
      </p>

      <h2 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 600;">
        ${task.title}
      </h2>

      <p style="margin-top: 12px; font-size: 15px; color: #92400e;">
        Thời gian còn lại: <strong>${remainingTimeText}</strong>
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="${link}"
         style="display: inline-block; padding: 16px 36px; background: #f59e0b; color: white; font-size: 17px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);">
        Mở task để xử lý ngay
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
      Email nhắc nhở được gửi tự động. Vui lòng không trả lời email này.
    </p>
  `;

  const html = getNotificationTemplate(
    "Nhắc nhở task sắp tới hạn",
    contentBlocks
  );

  await sendEmail(to, subject, html);
};

const formatRemainingTime = (minutes) => {
  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${remainingMinutes} phút`;
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

  const html = getNotificationTemplate(
    "Cập nhật thành viên bảng",
    contentBlocks,
    "Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ quản trị viên."
  );
  await sendEmail(to, subject, html);
};

// -----------------------------
// 6️⃣ Gán check-item
// -----------------------------
const sendAssignCheckItemEmail = async (
  to,
  inviterName,
  boardTitle,
  taskTitle,
  checkItemTitle,
  link
) => {
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

    <!-- Nút CTA nổi bật - Mở task ngay -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="${link}" 
         style="display: inline-block; padding: 16px 36px; background: #0079bf; color: white; font-size: 17px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 6px 16px rgba(0,121,191,0.3); transition: all 0.3s ease;">
        Mở task để xem & hoàn thành
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
      Email được gửi tự động từ hệ thống. Vui lòng không trả lời email này.
    </p>
  `;

  const html = getNotificationTemplate(
    "Công việc mới được giao",
    contentBlocks
  );
  await sendEmail(to, subject, html);
};

// -----------------------------
// Email xác nhận nâng cấp VIP thành công
// -----------------------------
const getVipSuccessTemplate = (
  orderCode,
  amount,
  expirationDate,
  paymentMethod
) => {
  const formattedAmount =
    new Intl.NumberFormat("vi-VN").format(amount) + " VND";
  const expDate = new Date(expirationDate);
  const formattedExpiration = expDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const contentBlocks = `
    <h2 style="font-size: 24px; color: #111827; text-align: center; margin: 30px 0 20px;">
      Chúc mừng bạn đã nâng cấp thành công gói <strong style="color: #0079bf;">VIP</strong>!
    </h2>

    <p style="font-size: 16px; color: #374151; line-height: 1.7; text-align: center; margin-bottom: 40px;">
      Bạn giờ đây bạn có thể sử dụng đầy đủ các tính năng cao cấp: tạo bảng không giới hạn, thẻ không giới hạn và đặc biệt là <strong>gợi ý checklist bằng AI thông minh</strong>.
    </p>

    <!-- Thông tin đơn hàng -->
    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <h3 style="font-size: 18px; color: #0369a1; margin: 0 0 20px 0; text-align: center;">
        Chi tiết thanh toán
      </h3>

      <table style="width: 100%; font-size: 15px; color: #374151;">
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Mã thanh toán:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #0079bf; font-weight: 600;">
            ${orderCode}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Số tiền thanh toán:</td>
          <td style="padding: 8px 0; text-align: right; color: #dc2626; font-weight: 600; font-size: 18px;">
            ${formattedAmount}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Thời hạn gói VIP:</td>
          <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 600;">
            Đến ngày <strong>${formattedExpiration}</strong><br>
            <span style="font-size: 13px; color: #6b7280;">(30 ngày kể từ ngày thanh toán)</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Số tiền thanh toán:</td>
          <td style="padding: 8px 0; text-align: right; color: #dc2626; font-weight: 600; font-size: 18px;">
            ${formattedAmount}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Phương thức thanh toán:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #0079bf; font-weight: 600;">
            ${paymentMethod}
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${process.env.FE_URL}" style="display: inline-block; background: linear-gradient(135deg, #0079bf 0%, #0065a5 100%); color: #ffffff; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(0, 121, 191, 0.3);">
        Trở về hệ thống và trải nghiệm ngay
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
      Cảm ơn bạn đã tin tưởng và đồng hành cùng chúng tôi!<br>
      Nếu có bất kỳ câu hỏi nào, hãy liên hệ hỗ trợ ngay trong ứng dụng.
    </p>
  `;

  return getNotificationTemplate("Nâng cấp VIP thành công", contentBlocks);
};

// Hàm gửi email VIP thành công
const sendRegisterVipEmail = async (
  toEmail,
  orderCode,
  amount,
  expirationDate,
  paymentMethod
) => {
  const subject = `Xác nhận nâng cấp gói VIP thành công - Mã thanh toán: ${orderCode}`;
  const html = getVipSuccessTemplate(
    orderCode,
    amount,
    expirationDate,
    paymentMethod
  );

  await sendEmail(toEmail, subject, html);
};

// -----------------------------
// Email nhắc nhở gói VIP sắp hết hạn (gửi trước 1 ngày)
// -----------------------------
const getVipReminderTemplate = (expirationDate) => {
  const expDate = new Date(expirationDate);

  const formattedExpiration = expDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const contentBlocks = `
    <h2 style="font-size: 24px; color: #111827; text-align: center; margin: 30px 0 20px;">
      Gói <strong style="color: #0079bf;">VIP</strong> của bạn sắp hết hạn!
    </h2>

    <p style="font-size: 16px; color: #374151; line-height: 1.7; text-align: center; margin-bottom: 40px;">
      Thời hạn sử dụng gói VIP hiện tại sẽ kết thúc vào <strong>ngày mai</strong>.<br>
      Sau đó, bạn sẽ quay về gói miễn phí với một số giới hạn về số lượng bảng và tính năng AI.
    </p>

    <!-- Thông tin hết hạn -->
    <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <h3 style="font-size: 18px; color: #b45309; margin: 0 0 16px 0; text-align: center;">
        Thời gian còn lại
      </h3>
      <p style="font-size: 20px; text-align: center; color: #b45309; font-weight: 600; margin: 0;">
        Hết hạn vào: <span style="font-size: 24px;">${formattedExpiration}</span>
      </p>
      <p style="font-size: 14px; text-align: center; color: #92400e; margin-top: 12px;">
        Chỉ còn <strong>1 ngày</strong> để tiếp tục trải nghiệm đầy đủ!
      </p>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${process.env.FE_URL}/home" style="display: inline-block; background: linear-gradient(135deg, #0079bf 0%, #0065a5 100%); color: #ffffff; font-weight: 600; padding: 16px 36px; border-radius: 8px; text-decoration: none; font-size: 17px; box-shadow: 0 6px 16px rgba(0, 121, 191, 0.3);">
        Gia hạn VIP ngay (100.000 VND)
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
      Gia hạn ngay hôm nay để không gián đoạn trải nghiệm!<br>
      Chúng tôi luôn sẵn sàng hỗ trợ bạn.
    </p>
  `;

  return getNotificationTemplate(
    "Nhắc nhở: Gói VIP sắp hết hạn",
    contentBlocks
  );
};

// Hàm gửi email nhắc nhở (gọi từ queue)
const sendVipReminderEmail = async (toEmail, expirationDate) => {
  const subject = "Gói VIP của bạn sắp hết hạn vào ngày mai!";
  const html = getVipReminderTemplate(expirationDate);

  await sendEmail(toEmail, subject, html);
};

// -----------------------------
// Email thông báo gói VIP đã hết hạn
// -----------------------------
const getVipExpiredTemplate = (expirationDate) => {
  const expDate = new Date(expirationDate);
  const formattedExpiration = expDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const contentBlocks = `
    <h2 style="font-size: 24px; color: #111827; text-align: center; margin: 30px 0 20px;">
      Gói <strong style="color: #0079bf;">VIP</strong> của bạn đã hết hạn
    </h2>

    <p style="font-size: 16px; color: #374151; line-height: 1.7; text-align: center; margin-bottom: 40px;">
      Kể từ hôm nay, tài khoản của bạn đã trở về gói miễn phí.<br>
      Bạn vẫn có thể sử dụng hệ thống bình thường, nhưng sẽ bị giới hạn số lượng bảng, thẻ và không dùng được tính năng AI gợi ý việc cần làm.
    </p>

    <!-- Thông tin hết hạn -->
    <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <h3 style="font-size: 18px; color: #b91c1c; margin: 0 0 16px 0; text-align: center;">
        Gói VIP đã kết thúc
      </h3>
      <p style="font-size: 18px; text-align: center; color: #991b1b; font-weight: 600; margin: 0;">
        Hết hạn vào: <span style="font-size: 22px;">${formattedExpiration}</span>
      </p>
      <p style="font-size: 15px; text-align: center; color: #7f1d1d; margin-top: 12px;">
        Bạn hiện đang sử dụng gói miễn phí
      </p>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${process.env.FE_URL}/home" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 600; padding: 16px 36px; border-radius: 8px; text-decoration: none; font-size: 17px; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);">
        Nâng cấp lại VIP ngay (100.000 VND)
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
      Nâng cấp lại bất kỳ lúc nào để tiếp tục trải nghiệm không giới hạn!<br>
      Chúng tôi rất mong được đồng hành cùng bạn.
    </p>
  `;

  return getNotificationTemplate("Gói VIP đã hết hạn", contentBlocks);
};

// Hàm gửi email hết hạn (gọi từ queue)
const sendVipExpiredEmail = async (toEmail, expirationDate) => {
  const subject = "Gói VIP của bạn đã hết hạn";
  const html = getVipExpiredTemplate(expirationDate);

  await sendEmail(toEmail, subject, html);
};

module.exports = {
  sendCreateAccount,
  sendRecoveryPassword,
  sendShareBoardEmail,
  sendAssignTaskEmail,
  sendTaskDeadlineEmail,
  sendTaskNearDeadlineEmail,
  sendRemoveMemberEmail,
  sendRemoveFromBoardEmail,
  sendAssignCheckItemEmail,
  sendRegisterVipEmail,
  sendVipReminderEmail,
  sendVipExpiredEmail,
};
