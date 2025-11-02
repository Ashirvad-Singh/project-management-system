import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema({
  avatar: {
    url: { type: String, default: "https://placehold.co/200x200" },
    localPath: { type: String, default: "" }
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"]
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  refreshToken: String,
  forgotPasswordToken: String,
  forgotPasswordExpiry: Date,
  emailVerificationToken: String,
  emailVerificationExpiry: Date
}, {
  timestamps: true,
  versionKey: false
});

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
