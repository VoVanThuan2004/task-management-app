class ApiError extends Error {
  constructor(statusCode, message, errorCode) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message, errorCode) {
    return new ApiError(400, message, errorCode);
  }

  static unauthorized(message = "Chưa xác thực", errorCode) {
    return new ApiError(401, message, errorCode);
  }

  static forbidden(message = "Không có quyền truy cập", errorCode) {
    return new ApiError(403, message, errorCode);
  }

  static notFound(message = "Không tìm thấy tài nguyên", errorCode) {
    return new ApiError(404, message, errorCode);
  }

  static conflict(message, errorCode) {
    return new ApiError(409, message, errorCode);
  }

  static internal(message = "Lỗi hệ thống", errorCode) {
    return new ApiError(500, message, errorCode);
  }
}

module.exports = ApiError;
