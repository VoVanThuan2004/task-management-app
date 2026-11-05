const cloudinary = require("../config/cloudinary");
const ApiError = require("../errors/ApiError");

const removeCloudinaryFile = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

const assertImageFile = (file, maxSize = 5 * 1024 * 1024) => {
  if (!file) {
    throw ApiError.badRequest("Vui lòng upload ảnh");
  }

  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw ApiError.badRequest("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)");
  }

  if (file.size > maxSize) {
    throw ApiError.badRequest("Kích thước ảnh không được vượt quá 5MB");
  }
};

module.exports = {
  removeCloudinaryFile,
  assertImageFile,
};
