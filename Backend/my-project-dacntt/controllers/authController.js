const catchAsync = require("../utils/catchAsync");
const authService = require("../services/authService");

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login({
    email,
    password,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Đăng nhập thành công",
    data,
  });
});

const loginSocialAccount = catchAsync(async (req, res) => {
  const { provider, idToken } = req.body;
  const data = await authService.loginSocialAccount({
    provider,
    idToken,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Đăng nhập tài khoản Google thành công",
    data,
  });
});

const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout({ refreshToken });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Đăng xuất tài khoản thành công",
  });
});

const registerAccount = catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.registerAccount({ email });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Mã OTP đã được gửi đến email của bạn",
  });
});

const verifyOTPCreateAccount = catchAsync(async (req, res) => {
  const { email, fullName, otp, password } = req.body;
  await authService.verifyOTPCreateAccount({
    email,
    fullName,
    otp,
    password,
  });

  return res.status(201).json({
    status: "success",
    code: 201,
    message: "Tạo tài khoản thành công",
  });
});

const recoveryPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.recoveryPassword({ email });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Mã OTP đã được gửi đến email của bạn",
  });
});

const verifyOTPRecoveryPassword = catchAsync(async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;
  await authService.verifyOTPRecoveryPassword({
    email,
    otp,
    password,
    confirmPassword,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Khôi phục mật khẩu thành công",
  });
});

const changePassword = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const { password, newPassword, confirmNewPassword } = req.body;
  await authService.changePassword({
    userId,
    password,
    newPassword,
    confirmNewPassword,
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Thay đổi mật khẩu thành công",
  });
});

module.exports = {
  login,
  loginSocialAccount,
  logout,
  registerAccount,
  verifyOTPCreateAccount,
  recoveryPassword,
  verifyOTPRecoveryPassword,
  changePassword,
};
