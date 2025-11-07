require("dotenv").config();
const amqp = require("amqplib");
const { sendDeclineInvite } = require("../config/mailConfig");
const ActivityLog = require("../models/activityLog");
const Notification = require("../models/notification");

const declineInviteWorker = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  const queue = "email_decline_invite_queue";

  await channel.assertQueue(queue, { durable: true });
  console.log("Email worker decline invite waiting for messages...");

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const { email, projectId, projectName, userId, fullName, inviterId, inviterName } =
        JSON.parse(msg.content.toString());
      console.log("Received email invite member job:", data);

      try {
        // 1. Tạo Activity Logs
        const activityLog = await ActivityLog.create({
          userId: userId,
          projectId,
          action: "DECLINE_INVITE",
          description: `${fullName} đã từ chối lời mời tham gia dự án: ${projectName}`,
        });

        // 2. Tạo Notification
        const notification = await Notification.create({
          activityLogId: activityLog._id,
          userId: inviterId,
          message: `${projectName}: Thành viên ${fullName} đã từ chối lời mời tham gia dự án`,
          isRead: false,
          deliveryMethod: "email",
        });

        // 3. Gửi email thông báo đến member
        await sendDeclineInvite(
          email,
          projectName,
          fullName,
          inviterName,
          notification.message
        );
        channel.ack(msg);
      } catch (err) {
        console.error("❌ Error sending email:", err);
        channel.nack(msg); // không ack để có thể retry
      }
    }
  });
};

declineInviteWorker();

