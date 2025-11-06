import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Your App Name",
      link: "https://yourapp.com/",
    },
  });

  // ✅ Generate HTML and text versions
  const emailHTML = mailGenerator.generate(options.mailgenContent);
  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  // ✅ Configure transporter
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: Number(process.env.MAILTRAP_SMTP_PORT),
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  // ✅ Define mail
  const mail = {
    from: process.env.MAIL_FROM || "noreply@yourapp.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  // ✅ Send it
  try {
    await transporter.sendMail(mail);
    console.log(`✅ Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

// --- Mailgen Templates ---
const emailVerificationMailgenContent = (username, verificationUrl) => ({
  body: {
    name: username,
    intro: "Welcome to Your App! We're thrilled to have you on board.",
    action: {
      instructions: "To verify your email, please click the button below:",
      button: {
        color: "#22BC66",
        text: "Verify Your Email",
        link: verificationUrl,
      },
    },
    outro:
      "Need help or have questions? Just reply to this email — we’d love to help.",
  },
});

const forgotPasswordMailgenContent = (username, passwordResetUrl) => ({
  body: {
    name: username,
    intro: "You’ve requested to reset your password.",
    action: {
      instructions: "Click the button below to reset your password:",
      button: {
        color: "#DC4D2F",
        text: "Reset Your Password",
        link: passwordResetUrl,
      },
    },
    outro: "If you didn’t request this, you can safely ignore this email.",
  },
});

// ✅ Clean named exports
export { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail };
