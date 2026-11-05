const ApiError = require("../errors/ApiError");

const normalizeError = (err) => {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      errorCode: err.errorCode,
    };
  }

  if (err.name === "CastError") {
    return {
      statusCode: 400,
      message: `ID không hợp lệ: ${err.value}`,
    };
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {})
      .map((item) => item.message)
      .join(", ");
    return {
      statusCode: 400,
      message: messages || "Dữ liệu không hợp lệ",
    };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(", ");
    return {
      statusCode: 400,
      message: `Dữ liệu đã tồn tại${field ? `: ${field}` : ""}`,
    };
  }

  if (err.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      message: "Token đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  if (err.name === "JsonWebTokenError") {
    return {
      statusCode: 401,
      message: "Token không hợp lệ",
    };
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return {
      statusCode: 400,
      message: "Dữ liệu JSON không hợp lệ",
    };
  }

  return {
    statusCode: err.statusCode || 500,
    message: err.message || "Lỗi hệ thống",
  };
};

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Không tìm thấy đường dẫn ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const normalized = normalizeError(err);

  if (normalized.statusCode >= 500) {
    console.error("Unhandled error:", err);
  }

  return res.status(normalized.statusCode).json({
    status: "error",
    code: normalized.statusCode,
    message: normalized.message,
    ...(normalized.errorCode ? { error: normalized.errorCode } : {}),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
