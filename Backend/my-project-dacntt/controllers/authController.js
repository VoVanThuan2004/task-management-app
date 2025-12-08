require("dotenv").config();
const Role = require("../models/role");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/refreshToken");
const {
  sendCreateAccount,
  sendRecoveryPassword,
} = require("../config/mailConfig");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.CLIENT_ID);
const SocialAccount = require("../models/socialAccount");

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập thông tin: email và mật khẩu",
    });
  }

  try {
    // Tìm user
    const user = await User.findOne({ email }).populate("roleId");
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Email không hợp lệ",
      });
    }

    // So sánh password có khớp
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu không hợp lệ",
      });
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Tài khoản đã bị khóa",
      });
    }

    // Tạo mã token, refreshToken
    const accessToken = jwt.sign(
      {
        userId: user._id,
        fullName: user.fullName,
        roleName: user.roleId.roleName,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: "30d",
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id,
        fullName: user.fullName,
        roleName: user.roleId.roleName,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: "60d",
      }
    );

    await RefreshToken.create({
      userId: user._id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiredAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 30 ngày
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Đăng nhập thành công",
      data: {
        fullName: user.fullName,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const loginSocialAccount = async (req, res) => {
  const { provider, idToken } = req.body;
  if (!provider || !idToken) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập thông tin: provider, idToken",
    });
  }

  if (provider !== "google") {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Nhà cung cấp không được hỗ trợ",
    });
  }

  try {
    // Verify token với google
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Lấy thông tin user từ google
    const email = payload.email;
    const fullName = payload.fullName;
    const avatar = payload.avatar;
    const provider_user_id = payload.sub;

    const role = await Role.findOne({ roleName: "USER" });
    if (!role) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Vai trò dành cho người dùng không tồn tại",
      });
    }

    // Kiểm tra user có tồn tại chưa
    let user = await User.findOne({ email });
    if (!user) {
      // user chưa tồn tại tạo tài khoản
      user = await User.create({
        roleId: role._id,
        email: email,
        fullName: fullName,
        password: "",
        avatar: avatar,
        isActive: true,
      });
    }

    // Kiểm tra xem tồn tại SocialAccount chưa
    let socialAccount = await SocialAccount.findOne({
      provider,
      provider_user_id,
    });
    if (!socialAccount) {
      socialAccount = await SocialAccount.create({
        userId: user._id,
        provider: provider,
        provider_user_id: provider_user_id,
      });
    }

    const SECRET_KEY = process.env.SECRET_KEY;

    // Tạo ra mã accessToken
    const accessToken = jwt.sign(
      {
        userId: user._id,
        fullName: user.fullName,
        roleName: role.roleName,
      },
      SECRET_KEY,
      {
        expiresIn: "30d",
      }
    );

    // Tạo ra mã refreshToken
    const refreshToken = jwt.sign(
      {
        userId: user._id,
        fullName: user.fullName,
        roleName: role.roleName,
      },
      SECRET_KEY,
      {
        expiresIn: "60d",
      }
    );

    await RefreshToken.create({
      userId: user._id,
      refreshToken: refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiredAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 ngày
    });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Đăng nhập tài khoản Google thành công",
      data: {
        fullName: fullName,
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập mã refresh token",
    });
  }

  try {
    const refreshTokenDB = await RefreshToken.findOne({ refreshToken });
    if (!refreshTokenDB) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Mã refresh token không hợp lệ",
      });
    }

    // Xóa mã refresh token
    await RefreshToken.deleteOne({ _id: refreshTokenDB._id });

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Đăng xuất tài khoản thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const registerAccount = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập email",
    });
  }

  try {
    // Kiểm tra tài khoản có tồn tại
    const user = await User.findOne({ email });
    const role = await Role.findOne({ roleName: "USER" });
    if (!role) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Vai trò dành cho người dùng không tồn tại",
      });
    }

    if (!user) {
      // Tạo mã otp
      const OTP = Math.floor(100000 + Math.random() * 900000).toString();
      const OTPHashed = await bcrypt.hash(OTP, 10);

      await User.create({
        roleId: role._id,
        email: email,
        fullName: "",
        password: "",
        isActive: false,
        resetOtp: OTPHashed,
        resetOtpExpired: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
      });

      // Gửi email
      await sendCreateAccount(email, OTP);

      return res.status(200).json({
        status: "success",
        code: 200,
        message: "Mã OTP đã được gửi đến email của bạn",
      });
    }
    // TH2. User có tồn tại
    else {
      // Kiểm tra xem có tài khoản social account không
      if (user.password === "") {
        // Tạo mã otp
        const OTP = Math.floor(100000 + Math.random() * 900000).toString();
        const OTPHashed = await bcrypt.hash(OTP, 10);

        // Cập nhật mã reset otp
        user.resetOtp = OTPHashed;
        user.resetOtpExpired = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
        await user.save();

        // Gửi email
        await sendCreateAccount(email, OTP);

        return res.status(200).json({
          status: "success",
          code: 200,
          message: "Mã OTP đã được gửi đến email của bạn",
        });
      } else {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Tài khoản đã tồn tại",
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const verifyOTPCreateAccount = async (req, res) => {
  const { email, fullName, otp, password } = req.body;

  if (!email || !fullName || !otp || !password) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập đầy đủ thông tin: email, fullName, otp, password",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Mật khẩu phải có ít nhất 8 ký tự",
    });
  }

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Email không hợp lệ",
      });
    }

    // Kiểm tra mã otp có khớp hay không
    if (!(await bcrypt.compare(otp, user.resetOtp))) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mã OTP không hợp lệ",
      });
    }

    // Kiểm tra thời gian hết hạn mã otp
    if (user.resetOtpExpired < Date.now()) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mã OTP đã hết hạn, vui lòng đăng ký lại",
      });
    }

    const passwordHashed = await bcrypt.hash(password, 10);

    // Tạo tài khoản
    user.fullName = fullName;
    user.password = passwordHashed;
    user.isActive = true;
    user.resetOtp = null;
    user.resetOtpExpired = null;
    await user.save();

    return res.status(201).json({
      status: "success",
      code: 201,
      message: "Tạo tài khoản thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const recoveryPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập email",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Email không hợp lệ",
      });
    }

    const OTP = Math.floor(100000 + Math.random() * 900000).toString();
    const OTPHashed = await bcrypt.hash(OTP, 10);

    user.resetOtp = OTPHashed;
    user.resetOtpExpired = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    await user.save();

    // gửi email
    await sendRecoveryPassword(email, OTP);

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Mã OTP đã được gửi đến email của bạn",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const verifyOTPRecoveryPassword = async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;
  if (!email || !otp || !password || !confirmPassword) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Vui lòng nhập thông tin: email, otp, password",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Email không hợp lệ",
      });
    }

    // Kiểm tra mã otp có hợp lệ
    if (!(await bcrypt.compare(otp, user.resetOtp))) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mã OTP không hợp lệ",
      });
    }

    // Kiểm tra thời gian hết hạn mã otp
    if (user.resetOtpExpired < Date.now()) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mã OTP đã hết hạn, vui lòng đăng ký lại",
      });
    }

    // Kiểm tra password
    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu phải có ít nhất 8 ký tự",
      });
    }

    // Tạo password mới cho user
    const passwordHashed = await bcrypt.hash(password, 10);
    user.password = passwordHashed;
    user.resetOtp = null;
    user.resetOtpExpired = null;
    await user.save();

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Khôi phục mật khẩu thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

const changePassword = async (req, res) => {
  // Lấy userId từ người dùng
  const userId = req.user.userId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "ID của người dùng không hợp lệ",
    });
  }

  const { password, newPassword, confirmNewPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Người dùng không tồn tại",
      });
    }

    if (!password || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Vui lòng nhập thông tin mật khẩu, mật khẩu mới",
      });
    }

    // Kiểm tra mật khẩu cũ có đúng
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    // Kiểm tra password cũ và password mới trùng nhau
    if (password === newPassword || password === confirmNewPassword) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu hiện tại đang trùng với mật khẩu mới",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    // Kiểm tra độ dài password mới
    if (newPassword.length < 8) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Mật khẩu phải có ít nhất 8 ký tự",
      });
    }

    // Cập nhật mật khẩu cho người dùng
    const passwordHashed = await bcrypt.hash(newPassword, 10);
    user.password = passwordHashed;
    await user.save();

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "Thay đổi mật khẩu thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Lỗi hệ thống: " + error.message,
    });
  }
};

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
