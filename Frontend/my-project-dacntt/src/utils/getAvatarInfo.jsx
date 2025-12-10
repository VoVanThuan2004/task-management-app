// utils/getAvatarInfo.js
const TRELLO_COLORS = [
  "#0079BF","#00C2E0","#51E898","#FFAB00","#FF7452","#268736","#D946EF","#FF78CB",
  "#8595A6","#FFC400","#344563","#172B4D","#4C9AFF","#00B8D9","#36B37E","#FFD500",
  "#FF5630","#6554C0","#FF8B94","#8C66FC","#B36BFF","#FF9F1C","#00C7E1","#5AAC44",
  "#FF6B00","#C377E0","#FF8F73","#4C9AFF","#00AECC","#57D9A3",
];

/**
 * Trả về initials + màu nền cố định theo tên
 * Dùng chung cho toàn app → nhất quán 100%
 */
export function getAvatarInfo(name = "User") {
  const trimmed = (name || "User").toString().trim();
  if (!trimmed) return { initials: "?", bg: "#0079BF" };

  // Tạo initials (giống Trello)
  const parts = trimmed.split(/\s+/);
  let initials = "";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else {
    initials = trimmed.slice(0, 2).toUpperCase();
  }

  // Hash đơn giản nhưng ổn định
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = ((hash << 5) - hash + trimmed.charCodeAt(i)) | 0;
  }
  const color = TRELLO_COLORS[Math.abs(hash) % TRELLO_COLORS.length];

  return { initials, bg: color };
}