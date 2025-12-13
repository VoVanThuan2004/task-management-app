const sanitizeHtml = require("sanitize-html");

module.exports = function cleanText(html) {
  if (!html) return "";

  // 1. Thay <br>, <p>, <li> bằng xuống dòng
  const withBreaks = html
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n");

  // 2. Remove HTML
  return sanitizeHtml(withBreaks, {
    allowedTags: [],
    allowedAttributes: {}
  })
    .replace(/\n+/g, "\n")   // gộp newline
    .trim();
};
