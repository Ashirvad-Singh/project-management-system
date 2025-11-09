import { User } from "../models/users.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { emailVerificationMailgenContent, sendEmail } from "../utils/mail.js";

// Generate Access & Refresh Tokens
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

// Register User
const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with given email or username already exists");
  }

  // Create new user
  const user = await User.create({
    email,
    username,
    password,
    role,
    isEmailVerified: false,
  });

  // Generate email verification token
  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await sendEmail({
      email: user.email,
      subject: "Please Verify Your Email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
      ),
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    // You could optionally throw new ApiError(500, "Failed to send verification email");
  }

  // Fetch user without sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Respond with success
  return res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", createdUser));
});

const login=asyncHandler(async(req,res)=>{
 const {email,password,username}=req.body

 if(!username || !email){
  throw new ApiError(400,"Username or email is required")
 }


 const user=await User.findOne({email});

 if(!user){
  throw new ApiErrora(400,"User doesn't Exist");

 }
 const isPasswordValid=await user.isPasswordCorrect(password);

 if(!isPasswordValid){
  throw new ApiError(400,"Invalid Credentials")
 }


 const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);

   // Fetch user without sensitive fields
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
  );

const options={
  httpOnly:true,
  secure:true,

}
return res.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
  new ApiResponse(
    200,
    {
      user:loggedInUser,
      accessToken,
      refreshToken
    },
    "User Logged In Successfully"

  )
)
});


export { registerUser, generateAccessAndRefreshToken,login };
