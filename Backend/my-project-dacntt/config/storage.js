const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const rawTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];

    const isRaw = rawTypes.includes(file.mimetype);

    return {
      folder: "DACNTT",
      resource_type: isRaw ? "raw" : "auto",
      access_mode: "public",
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});

module.exports = storage;
