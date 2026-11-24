
import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,

    auth: {
      user: process.env.EMAIL_USER?.trim(),
      pass: process.env.EMAIL_APP_PASSWORD?.replace(/\s/g, ""),
    },

    family: 4,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  // Verify Gmail SMTP connection and authentication
  await transporter.verify();

  console.log("Gmail SMTP connection verified successfully");

  await transporter.sendMail({
    from: `"LeaveDesk" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

export default sendEmail;
