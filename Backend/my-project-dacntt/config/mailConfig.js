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
const sendShareBoardEmail = async (to, inviterName, boardTitle, message, link) => {
  const subject = `Lời mời tham gia bảng "${boardTitle}"`;
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:16px; color:#333; line-height:1.5;">
      <h2 style="color:#2d8cf0;">Mời bạn tham gia bảng làm việc</h2>
      <p><b>${inviterName}</b> đã mời bạn tham gia bảng <b>"${boardTitle}"</b>.</p>
      ${message ? `<blockquote style="margin:15px 0; padding:10px 15px; background:#f3f8ff; border-left:4px solid #2d8cf0;">${message}</blockquote>` : ""}
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
      <p><b>${inviterName}</b> đã chỉ định bạn vào task <b>"${task.title}"</b> trên bảng <b>"${title}"</b>.</p>
      <p><strong>Mô tả:</strong> ${task.description || 'Không có'}</p>
      <p><strong>Bắt đầu:</strong> ${task.startDate || 'Chưa có'} | <strong>Hạn:</strong> ${task.dueDate || 'Chưa có'}</p>
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


module.exports = {
  sendCreateAccount,
  sendRecoveryPassword,
  sendShareBoardEmail,
  sendAssignTaskEmail,
  sendTaskDeadlineEmail,
  sendRemoveMemberEmail
};
