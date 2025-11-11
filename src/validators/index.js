import { body } from "express-validator";

const userRegisterValidator = () => [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is invalid"),

  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLowercase()
    .withMessage("Username must be in lowercase")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .escape(),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("fullName")
    .optional()
    .trim()
    .escape(),
];

const userLoginValidator=()=>{
  return [
    body("email")
    .optional()
    .isEmail()
    .withMessage("Email is invalid"),
    body("password")
    .notEmpty()
    .withMessage("Password is Required")
  ]
}

const userChangeCurrentPasswordValidator=()=>{
  return[
    body("oldPassword").notEmpty().withMessage("Old Password is Required"),
    body("newPassword").notEmpty().withMessage("New Password is Required")

  ]
}

const userForgotPasswordValidator=()=>{
  return[
    body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is invalid"),
  ]
}
const userResetPasswordValidator=()=>{
  return[
    body("newPassword").notEmpty().withMessage("New Password is Required")
  ]
}

export { userRegisterValidator,userLoginValidator, userChangeCurrentPasswordValidator, userForgotPasswordValidator, userResetPasswordValidator };
