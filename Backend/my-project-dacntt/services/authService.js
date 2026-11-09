require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");

const Role = require("../models/role");
const User = require("../models/user");
const RefreshToken = require("../models/refreshToken");
const SocialAccount = require("../models/socialAccount");
const { sendCreateAccount } = require("../config/mailConfig");
const emailQueue = require("../jobs/emailQueue");
const ApiError = require("../errors/ApiError");

const ACCESS_TOKEN_TTL = "30d";
const REFRESH_TOKEN_TTL = "60d";
const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

const googleClient = new OAuth2Client(process.env.CLIENT_ID);

const withSystemError = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.internal("Lỗi hệ thống: " + error.message);
  }
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const setOtp = async (user) => {
  const otp = generateOtp();
  user.resetOtp = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  user.resetOtpExpired = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  return otp;
};

const verifyOtp = async (user, otp) => {
  if (!(await bcrypt.compare(otp, user.resetOtp))) {
    throw ApiError.badRequest("Mã OTP không hợp lệ");
  }

  if (user.resetOtpExpired < Date.now()) {
    throw ApiError.badRequest("Mã OTP đã hết hạn, vui lòng đăng ký lại");
  }
};

const clearOtp = (user) => {
  user.resetOtp = null;
  user.resetOtpExpired = null;
};

const issueTokens = async ({ user, roleName, userAgent, ipAddress }) => {
  const payload = {
    userId: user._id,
    fullName: user.fullName,
    roleName,
  };

  const accessToken = jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

  const refreshToken = jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

  await RefreshToken.create({
    userId: user._id,
    refreshToken,
    userAgent,
    ipAddress,
    expiredAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken };
};

const login = withSystemError(
  async ({ email, password, userAgent, ipAddress }) => {
    if (!email || !password) {
      throw ApiError.badRequest(
        "Vui lòng nhập thông tin: email và mật khẩu"
      );
    }

    const user = await User.findOne({ email }).populate("roleId");
    if (!user) {
      throw ApiError.notFound("Email không hợp lệ");
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw ApiError.badRequest("Mật khẩu không hợp lệ");
    }

    if (!user.isActive) {
      throw ApiError.badRequest("Tài khoản đã bị khóa");
    }

    const { accessToken, refreshToken } = await issueTokens({
      user,
      roleName: user.roleId.roleName,
      userAgent,
      ipAddress,
    });

    return {
      fullName: user.fullName,
      avatar: user?.avatar,
      email: user.email,
      accessToken,
      refreshToken,
    };
  }
);

const loginSocialAccount = withSystemError(
  async ({ provider, idToken, userAgent, ipAddress }) => {
    if (!provider || !idToken) {
      throw ApiError.badRequest(
        "Vui lòng nhập thông tin: provider, idToken"
      );
    }

    if (provider !== "google") {
      throw ApiError.badRequest("Nhà cung cấp không được hỗ trợ");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const fullName =
      payload.name ||
      `${payload.given_name || ""} ${payload.family_name || ""}`.trim();
    const avatar = payload.avatar;
    const provider_user_id = payload.sub;

    const role = await Role.findOne({ roleName: "USER" });
    if (!role) {
      throw ApiError.notFound("Vai trò dành cho người dùng không tồn tại");
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        roleId: role._id,
        email,
        fullName,
        password: "",
        avatar,
        isActive: true,
      });
    }

    let socialAccount = await SocialAccount.findOne({
      provider,
      provider_user_id,
    });
    if (!socialAccount) {
      socialAccount = await SocialAccount.create({
        userId: user._id,
        provider,
        provider_user_id,
      });
    }

    const { accessToken, refreshToken } = await issueTokens({
      user,
      roleName: role.roleName,
      userAgent,
      ipAddress,
    });

    return {
      fullName: user.fullName,
      avatar: user.avatar,
      email: user.email,
      accessToken,
      refreshToken,
    };
  }
);

const logout = withSystemError(async ({ refreshToken }) => {
  if (!refreshToken) {
    throw ApiError.badRequest("Vui lòng nhập mã refresh token");
  }

  const refreshTokenDB = await RefreshToken.findOne({ refreshToken });
  if (!refreshTokenDB) {
    throw ApiError.notFound("Mã refresh token không hợp lệ");
  }

  await RefreshToken.deleteOne({ _id: refreshTokenDB._id });
});

const registerAccount = withSystemError(async ({ email }) => {
  if (!email) {
    throw ApiError.badRequest("Vui lòng nhập email");
  }

  const user = await User.findOne({ email });
  const role = await Role.findOne({ roleName: "USER" });
  if (!role) {
    throw ApiError.notFound("Vai trò dành cho người dùng không tồn tại");
  }

  if (!user) {
    await emailQueue.add("createAccountEmail", { email });
    return;
  }

  if (user.password === "") {
    const otp = await setOtp(user);
    await sendCreateAccount(email, otp);
    return;
  }

  throw ApiError.badRequest("Tài khoản đã tồn tại");
});

const verifyOTPCreateAccount = withSystemError(
  async ({ email, fullName, otp, password }) => {
    if (!email || !fullName || !otp || !password) {
      throw ApiError.badRequest(
        "Vui lòng nhập đầy đủ thông tin: email, fullName, otp, password"
      );
    }

    if (password.length < 8) {
      throw ApiError.badRequest("Mật khẩu phải có ít nhất 8 ký tự");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw ApiError.notFound("Email không hợp lệ");
    }

    await verifyOtp(user, otp);

    user.fullName = fullName;
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.isActive = true;
    clearOtp(user);
    await user.save();
  }
);

const recoveryPassword = withSystemError(async ({ email }) => {
  if (!email) {
    throw ApiError.badRequest("Vui lòng nhập email");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.notFound("Email không hợp lệ");
  }

  const otp = await setOtp(user);
  await emailQueue.add("recoveryPasswordEmail", { email, OTP: otp });
});

const verifyOTPRecoveryPassword = withSystemError(
  async ({ email, otp, password, confirmPassword }) => {
    if (!email || !otp || !password || !confirmPassword) {
      throw ApiError.badRequest("Vui lòng nhập thông tin: email, otp, password");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw ApiError.notFound("Email không hợp lệ");
    }

    await verifyOtp(user, otp);

    if (password !== confirmPassword) {
      throw ApiError.badRequest("Mật khẩu xác nhận không khớp");
    }

    if (password.length < 8) {
      throw ApiError.badRequest("Mật khẩu phải có ít nhất 8 ký tự");
    }

    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    clearOtp(user);
    await user.save();
  }
);

const changePassword = withSystemError(
  async ({ userId, password, newPassword, confirmNewPassword }) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest("ID của người dùng không hợp lệ");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("Người dùng không tồn tại");
    }

    if (!password || !newPassword || !confirmNewPassword) {
      throw ApiError.badRequest(
        "Vui lòng nhập thông tin mật khẩu, mật khẩu mới"
      );
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw ApiError.badRequest("Mật khẩu hiện tại không đúng");
    }

    if (password === newPassword || password === confirmNewPassword) {
      throw ApiError.badRequest(
        "Mật khẩu hiện tại đang trùng với mật khẩu mới"
      );
    }

    if (newPassword !== confirmNewPassword) {
      throw ApiError.badRequest("Mật khẩu xác nhận không khớp");
    }

    if (newPassword.length < 8) {
      throw ApiError.badRequest("Mật khẩu phải có ít nhất 8 ký tự");
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.save();
  }
);

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
