require("dotenv").config();
const amqp = require("amqplib");
const { sendInviteMember } = require("../config/mailConfig");
const ActivityLog = require("../models/activityLog");
const Notification = require("../models/notification");

const emailInviteMembWorker = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  const queue = "email_invite_member_queue";

  await channel.assertQueue(queue, { durable: true });
  console.log("Email worker invite member waiting for messages...");

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const {
        email,
        projectId,
        projectName,
        inviterId,
        inviterName,
        memberId,
        memberName,
        inviteLink,
      } = JSON.parse(msg.content.toString());
      console.log("Received email invite member job:", data);

      try {
        // 1. Tạo Activity Logs
        const activityLog = await ActivityLog.create({
          userId: inviterId,
          projectId,
          action: "INVITE_MEMBER",
          description: `Bạn đã mời ${memberName} vào dự án: ${projectName}`,
        });

        // 2. Tạo Notification
        await Notification.create({
          activityLogId: activityLog._id,
          userId: memberId,
          message: `${projectName}: Bạn được ${inviterName} mời tham gia dự án`,
          isRead: false,
          deliveryMethod: "email",
        });

        // 3. Gửi email thông báo đến member
        await sendInviteMember(email, inviterName, memberName, projectName, inviteLink);
        channel.ack(msg);
      } catch (err) {
        console.error("❌ Error sending email:", err);
        channel.nack(msg); // không ack để có thể retry
      }
    }
  });
};

emailInviteMembWorker();
