import { getAvatarInfo } from "../utils/getAvatarInfo";

export default function Avatar({ user, size = "w-7 h-7", className = "" }) {
  const hasAvatar = user?.avatar && user.avatar.trim() && user.avatar !== "null";
  const { initials, bg } = getAvatarInfo(user?.fullName);

  return (
    <div className={`${size} ${className} rounded-full overflow-hidden border-2 border-gray-200 shadow-sm`}>
      {hasAvatar ? (
        <img
          src={user.avatar}
          alt={user.fullName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}

      {/* Fallback: chữ cái + màu tự động */}
      <div
        className={`w-full h-full flex items-center justify-center text-white font-bold text-lg ${
          hasAvatar ? "hidden" : "flex"
        }`}
        style={{ backgroundColor: bg }}
      >
        {initials}
      </div>
    </div>
  );
}