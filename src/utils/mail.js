import nodemailer from "nodemailer";
import Mailgen from "mailgen";

/**
 * ===============================
 * 💌 EMAIL UTILITY
 * Handles sending and generating beautiful transactional emails.
 * ===============================
 */

/**
 * @desc Sends an email using Nodemailer + Mailgen
 * @param {Object} options
 * @param {string} options.email - Recipient's email
 * @param {string} options.subject - Email subject line
 * @param {Object} options.mailgenContent - Mailgen content object
 */
const sendEmail = async ({ email, subject, mailgenContent }) => {
  // --- Configure Mailgen ---
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: process.env.APP_NAME || "MyApp",
      link: process.env.FRONTEND_URL || "https://myapp.com",
      logo: process.env.APP_LOGO_URL || "https://placehold.co/100x100",
      logoHeight: "40px",
    },
  });

  // --- Generate HTML and text versions ---
  const emailHTML = mailGenerator.generate(mailgenContent);
  const emailText = mailGenerator.generatePlaintext(mailgenContent);

  // --- Configure transport ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.MAILTRAP_SMTP_HOST,
    port: Number(process.env.SMTP_PORT || process.env.MAILTRAP_SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER || process.env.MAILTRAP_SMTP_USER,
      pass: process.env.SMTP_PASS || process.env.MAILTRAP_SMTP_PASS,
    },
  });

  // --- Define the message ---
  const mailOptions = {
    from: process.env.MAIL_FROM || `"${process.env.APP_NAME || "MyApp"}" <noreply@myapp.com>`,
    to: email,
    subject,
    text: emailText,
    html: emailHTML,
  };

  // --- Send the email ---
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent successfully to: ${email}`);
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
    throw new Error("Email delivery failed. Please try again later.");
  }
};

/**
 * ===============================
 * 📩 MAILGEN TEMPLATES
 * Reusable, clean Mailgen content builders.
 * ===============================
 */

// --- 1️⃣ Email Verification Template ---
const emailVerificationMailgenContent = (username, verificationUrl) => ({
  body: {
    name: username,
    intro: `Welcome to ${process.env.APP_NAME || "Our App"}! We’re excited to have you.`,
    action: {
      instructions: "To verify your email, please click the button below:",
      button: {
        color: "#22BC66",
        text: "Verify Your Email",
        link: verificationUrl,
      },
    },
    outro: "If you didn’t create this account, you can safely ignore this email.",
  },
});

// --- 2️⃣ Forgot Password Template ---
const forgotPasswordMailgenContent = (username, resetUrl) => ({
  body: {
    name: username,
    intro: "You requested a password reset.",
    action: {
      instructions: "Click the button below to set a new password:",
      button: {
        color: "#DC4D2F",
        text: "Reset Password",
        link: resetUrl,
      },
    },
    outro: "If you didn’t request this, you can safely ignore this email.",
  },
});

// --- 3️⃣ Optional: Generic Info Email Template ---
const genericMailgenContent = (username, message) => ({
  body: {
    name: username,
    intro: message,
    outro: "Need help? Just reply to this email.",
  },
});

// ✅ Clean exports
export {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  genericMailgenContent,
};
