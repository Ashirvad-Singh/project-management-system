import { Router } from "express";
import {
  registerUser,
  login,
  logout,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changeCurrentPassword,
} from "../controllers/auth.controllers.js";

import { validate } from "../middlewares/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetPasswordValidator,
} from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/* ===============================
   🔐 AUTHENTICATION ROUTES
================================= */

// ✅ Register
router.post("/register", userRegisterValidator(), validate, registerUser);

// ✅ Login
router.post("/login", userLoginValidator(), validate, login);

// ✅ Logout (protected)
router.post("/logout", verifyJWT, logout);

// ✅ Refresh Token
router.post("/refresh-token", refreshAccessToken);

/* ===============================
   📩 EMAIL VERIFICATION ROUTES
================================= */

// ✅ Verify Email
router.get("/verify-email/:verificationToken", verifyEmail);

// ✅ Resend Verification Email (protected)
router.post("/resend-email-verification", verifyJWT, resendEmailVerification);

/* ===============================
   🔑 PASSWORD MANAGEMENT ROUTES
================================= */

// ✅ Forgot Password (send reset link)
router.post("/forgot-password", userForgotPasswordValidator(), validate, forgotPassword);

// ✅ Reset Password (using token from email)
router.post("/reset-password/:resetToken", userResetPasswordValidator(), validate, resetPassword);

// ✅ Change Current Password (requires login)
router.post(
  "/change-password",
  verifyJWT,
  userChangeCurrentPasswordValidator(),
  validate,
  changeCurrentPassword
);

/* ===============================
   👤 USER ROUTES
================================= */

// ✅ Get current logged-in user
router.get("/current-user", verifyJWT, getCurrentUser);

export default router;
