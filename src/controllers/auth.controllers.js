import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/users.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { emailVerificationMailgenContent, sendEmail } from "../utils/mail.js";

/** ---------------------- COOKIE OPTIONS ---------------------- */
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
});

/** ---------------------- TOKEN GENERATOR ---------------------- */
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

/** ---------------------- REGISTER ---------------------- */
const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new ApiError(409, "User with given email or username already exists");
  }

  const user = await User.create({
    email,
    username,
    password,
    role,
    isEmailVerified: false,
  });

  // ✅ Correct naming consistency
  const { unhashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "Please Verify Your Email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unhashedToken}`
      ),
    });
  } catch (error) {
    console.error("Email sending failed:", error);
  }

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordExpiry"
  );

  if (!createdUser) throw new ApiError(500, "Something went wrong while registering the user");

  return res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));
});

/** ---------------------- LOGIN ---------------------- */
const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email && !username) throw new ApiError(400, "Either username or email is required");

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) throw new ApiError(400, "User doesn't exist");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(400, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordExpiry"
  );

  const options = cookieOptions();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, "User logged in successfully", { user: loggedInUser, accessToken, refreshToken }));
});

/** ---------------------- LOGOUT ---------------------- */
const logout = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized request");

  await User.findByIdAndUpdate(userId, { $set: { refreshToken: "" } }, { new: true });

  const options = cookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully"));
});

/** ---------------------- GET CURRENT USER ---------------------- */
const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, "Current user loaded successfully", req.user));
});

/** ---------------------- VERIFY EMAIL ---------------------- */
const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken) throw new ApiError(400, "Email verification token is missing");

  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Token is invalid or expired");

  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;
  user.isEmailVerified = true;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, "Email verified successfully"));
});

/** ---------------------- RESEND EMAIL VERIFICATION ---------------------- */
const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) throw new ApiError(404, "User doesn't exist");
  if (user.isEmailVerified) throw new ApiError(409, "Email is already verified");

  const { unhashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "Resend: Verify Your Email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unhashedToken}`
      ),
    });
  } catch (error) {
    console.error("❌ Failed to send verification email:", error.message);
    throw new ApiError(500, "Failed to send verification email");
  }

  return res.status(200).json(new ApiResponse(200, "Verification email resent successfully"));
});

/** ---------------------- REFRESH TOKEN ---------------------- */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request: No refresh token provided");

  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) throw new ApiError(401, "Invalid refresh token");

    if (user.refreshToken !== incomingRefreshToken)
      throw new ApiError(401, "Refresh token is expired or invalid");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const options = cookieOptions();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, "Access token refreshed successfully", { accessToken, refreshToken }));
  } catch (error) {
    console.error("Error refreshing token:", error.message);
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});

/** ---------------------- FORGOT PASSWORD ---------------------- */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const unhashedToken = user.generateForgotPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/users/reset-password/${unhashedToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      mailgenContent: {
        body: {
          name: user.username,
          intro: "You requested to reset your password.",
          action: {
            instructions: "Click the button below to reset it:",
            button: { color: "#DC4D2F", text: "Reset Your Password", link: resetUrl },
          },
          outro: "If you didn’t request this, you can safely ignore this email.",
        },
      },
    });

    return res.status(200).json(new ApiResponse(200, "Password reset email sent successfully"));
  } catch (err) {
    console.error("❌ Error sending password reset email:", err.message);
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Failed to send password reset email");
  }
});

/** ---------------------- RESET PASSWORD ---------------------- */
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  if (!resetToken) throw new ApiError(400, "Reset token is missing");
  if (!newPassword) throw new ApiError(400, "New password is required");

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Token is invalid or expired");

  user.password = newPassword;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.refreshToken = undefined;

  await user.save();

  return res.status(200).json(new ApiResponse(200, "Password reset successfully. Please log in again."));
});

/** ---------------------- CHANGE CURRENT PASSWORD ---------------------- */
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    throw new ApiError(400, "Both current and new passwords are required");

  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized: User not found");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) throw new ApiError(400, "Current password is incorrect");

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully. Please log in again."));
});

/** ---------------------- EXPORTS ---------------------- */
export {
  registerUser,
  generateAccessAndRefreshToken,
  login,
  logout,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changeCurrentPassword,
};
