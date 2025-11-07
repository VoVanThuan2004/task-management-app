const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "DACNTT",
    // Rất quan trọng: Tự động phát hiện loại file
    resource_type: "auto",

    // Thêm các định dạng file văn phòng
    allowed_formats: [
      // Ảnh
      "jpg",
      "png",
      "jpeg",
      "webp",
      "gif",
      // Tài liệu
      "pdf",
      "doc",
      "docx",
      "txt",
      // Powerpoint
      "ppt",
      "pptx",
      // Excel
      "xls",
      "xlsx",
      // Video/Audio
      "mp4",
      "mov",
      "mp3",
    ],
  },
});

module.exports = storage;
