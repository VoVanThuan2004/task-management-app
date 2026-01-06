import re
import unicodedata
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List

# =========================
# CONFIG
# =========================
DEFAULT_LIST = "Todo"
LISTS = ["Todo", "Doing", "Done", "Backlog"]
PRIORITIES = ["Low", "Medium", "High", "Critical"]

DATE_PHRASES = [
    "hôm nay", "hom nay",
    "ngày mai", "ngay mai",
    "tuần này", "tuan nay",
    "tuần sau", "tuan sau",
    "sáng mai", "sang mai",
    "chiều nay", "chieu nay",
    "tối nay", "toi nay",
    "cuối tuần", "cuoi tuan",
    "cuối tháng", "cuoi thang",
    "đầu tuần", "dau tuan",
    "giữa tuần", "giua tuan",
]

OOS_KEYWORDS = [
    "label", "assign", "gán", "gan", "checklist", "đính kèm", "dinh kem",
    "attachment", "lặp lại", "lap lai", "recurring", "share", "comment",
    "đổi màu", "doi mau", "export", "excel"
]

# =========================
# UTILS
# =========================
def strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.replace("đ", "d").replace("Đ", "D")

def norm_spaces(s: str) -> str:
    s = str(s).strip()
    s = re.sub(r"\s+", " ", s)
    return s

def normalize_for_rules(s: str) -> str:
    return strip_accents(norm_spaces(s)).lower()

def find_list(raw: str) -> Optional[str]:
    for lst in LISTS:
        if re.search(rf"\b{re.escape(lst)}\b", raw, flags=re.IGNORECASE):
            return lst
    return None

def find_priority(raw: str) -> Optional[str]:
    for p in PRIORITIES:
        if re.search(rf"\b{re.escape(p)}\b", raw, flags=re.IGNORECASE):
            return p
    return None

def find_column_name(raw: str) -> Optional[str]:
    """
    Tìm tên cột từ câu nói của user
    Ví dụ: "tạo task vào cột a" -> "a"
           "vào cột Todo" -> "Todo"
           "ở cột Doing" -> "Doing"
    """
    raw_norm = normalize_for_rules(raw)
    
    # Pattern: "vào cột X", "ở cột X", "cột X"
    patterns = [
        r'vao\s+cot\s+([^\s,\.]+)',  # vào cột X
        r'o\s+cot\s+([^\s,\.]+)',     # ở cột X
        r'cot\s+([^\s,\.]+)',          # cột X
        r'vao\s+([^\s,\.]+)\s+cot',   # vào X cột (rare but possible)
    ]
    
    for pattern in patterns:
        match = re.search(pattern, raw_norm)
        if match:
            column_name = match.group(1).strip()
            # Return original case version from raw text
            # Find position in normalized text
            start_pos = match.start(1)
            # Map back to original
            # Simple approach: return capitalized version
            return column_name.capitalize() if column_name else None
    
    return None

def find_date_phrase(raw_norm: str) -> Optional[str]:
    # 1. Check Specific Date Pattern: dd/mm or dd-mm
    # Regex: \b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[0-2])(?:[\/\-](\d{4}))?\b
    date_pattern = r'\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[0-2])(?:[\/\-](\d{4}))?\b'
    m = re.search(date_pattern, raw_norm)
    if m:
        return m.group(0) # Return "20/10" or "20-10"

    # 2. Check Relative Keywords
    # Priority: "ngày kia", "ngày mốt" -> "ngay kia"
    if "ngay kia" in raw_norm or "ngay mot" in raw_norm or "ngay mốt" in raw_norm:
        return "ngay kia"
    
    # "ngày mai", "mai", "sang mai", "toi mai"...
    # Chỉ cần bắt từ "mai" là đủ hiểu +1 ngày.
    if "mai" in raw_norm:
        return "ngay mai"
        
    # "hôm nay", "nay", "toi nay"...
    if "hom nay" in raw_norm or "toi nay" in raw_norm or "chieu nay" in raw_norm or "sang nay" in raw_norm:
        return "hom nay"
    
    # "tuần sau"
    if "tuan sau" in raw_norm:
        return "tuan sau"
    
    # "tuần này"
    if "tuan nay" in raw_norm:
        return "tuan nay"

    return None

def parse_time(raw_norm: str) -> Optional[str]:
    t = raw_norm

    # 1. Pattern: HH:MM (vd: 14:30)
    m = re.search(r"\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)\b", t)
    if m:
        return f"{int(m.group(1)):02d}:{int(m.group(2)):02d}"

    # 2. Pattern: HH h MM (vd: 2h30, 2h30 chieu)
    m = re.search(r"\b([01]?\d|2[0-3])\s*(?:h|gio|g)\s*([0-5]\d)(?:\s*(sang|chieu|toi|pm|am))?\b", t)
    if m:
        hh = int(m.group(1))
        mm = int(m.group(2))
        part = m.group(3)
        if part in ["chieu", "toi", "pm"] and hh < 12: hh += 12
        elif part in ["sang", "am"] and hh == 12: hh = 0
        return f"{hh:02d}:{mm:02d}"

    # 3. Pattern: HH h (vd: 8h, 8h toi)
    m = re.search(r"\b([01]?\d|2[0-3])\s*(?:h|gio|g)(?:\s*(sang|chieu|toi|pm|am))?\b", t)
    if m:
        hh = int(m.group(1))
        part = m.group(2)
        if part in ["chieu", "toi", "pm"] and hh < 12: hh += 12
        elif part in ["sang", "am"] and hh == 12: hh = 0
        return f"{hh:02d}:00"
    
    # 4. Standalone Time Keywords (No numbers) -> Default times
    # "tối" -> 20:00, "chiều" -> 14:00, "sáng" -> 08:00, "trưa" -> 12:00
    if "toi" in t and "toi nay" not in t: # Tránh conflict nếu logic khác xử lý "toi nay"
        pass
    
    # Simple check keywords if no explicit time found yet
    if "toi" in t or "đêm" in t: return "20:00"
    if "chieu" in t: return "14:00"
    if "trua" in t: return "12:00"
    if "sang" in t: return "08:00"

    return None

def find_days_offset(raw_norm: str) -> Optional[int]:
    m = re.search(r'\b(\d+)\s*(ngay|ngày)', raw_norm)
    if m:
        try:
            return int(m.group(1))
        except:
            return None
    return None

def detect_date_intent(raw_norm: str) -> str:
    range_keywords = ["trong", "khoảng", "khong", "vòng", "vong", "tới", "dưới"]
    exact_keywords = ["đúng", "dung", "chính xác", "chinh xac", "vào", "vao"]
    if any(k in raw_norm for k in range_keywords): return "range"
    if any(k in raw_norm for k in exact_keywords): return "exact"
    return "ambiguous"

def contains_oos(raw_norm: str) -> bool:
    return any(k in raw_norm for k in OOS_KEYWORDS)

def try_extract_title(raw: str, raw_norm: str) -> str:
    t = raw_norm
    start_offset = 0

    prefixes = ["nhac toi ", "tao task ", "tao ", "them ", "add ", "new task "]
    for p in prefixes:
        if t.startswith(p):
            t = t[len(p):]
            start_offset = len(p)
            break

    # Cut at time patterns
    time_patterns = [
        r'\d{1,2}\s*:\s*\d{2}',
        r'\d{1,2}\s*h\s*\d{2}',
        r'\d{1,2}\s*h\b',
        r'\d{1,2}\s*gio\b',
        r'luc\s+\d',
    ]
    cut_idx = len(t)
    for pattern in time_patterns:
        m = re.search(pattern, t)
        if m:
            cut_idx = min(cut_idx, m.start())
    
    # Cut at keywords
    cut_keywords = [
        " hom nay", " ngay mai", " tuan nay", " tuan sau",
        " vao ", " vao list ", " uu tien ", " priority "
    ]
    for kw in cut_keywords:
        idx = t.find(kw)
        if idx != -1:
            cut_idx = min(cut_idx, idx)

    title_norm = t[:cut_idx].strip()

    orig = norm_spaces(raw)
    orig_norm = strip_accents(orig).lower()
    
    pos = orig_norm.find(title_norm, start_offset)
    if pos != -1 and title_norm:
        return orig[pos:pos+len(title_norm)].strip(" ,.-")

    return title_norm

def date_phrase_to_date(dp: Optional[str]) -> Optional[date]:
    if not dp: return None
    today = date.today()
    
    # Handle Specific Date (dd/mm or dd-mm)
    # Regex check again essentially
    if re.match(r'\d{1,2}[\/\-]\d{1,2}', dp):
        try:
            parts = re.split(r'[\/\-]', dp)
            d = int(parts[0])
            m = int(parts[1])
            y = int(parts[2]) if len(parts) > 2 else today.year
            
            target = date(y, m, d)
            # Nếu user không nhập năm, và ngày đã qua (vd nhập 1/1 mà nay là 2/1) -> Hiểu là năm sau
            if len(parts) <= 2 and target < today:
                target = date(y + 1, m, d)
            return target
        except:
            return None

    if dp == "hom nay": return today
    if dp == "ngay mai": return today + timedelta(days=1)
    if dp == "ngay kia": return today + timedelta(days=2) # Xử lý mốt/kia
    
    if dp in {"tuan sau", "tuần sau"}: return today + timedelta(days=7)
    if dp in {"tuan nay", "tuần này"}: return today # Cuối tuần này? Logic cũ return today
    
    return None

def parse_create_task(text: str) -> Dict[str, Any]:
    raw = norm_spaces(text)
    raw_norm = normalize_for_rules(raw)

    slots = {
        "title": None,
        "description": None,
        "time": None,
        "date_phrase": None,
        "priority": None,
        "list": None,
        "column_name": None  # Tên cột user muốn tạo task vào
    }

    slots["list"] = find_list(raw)
    slots["priority"] = find_priority(raw)
    slots["column_name"] = find_column_name(raw)  # Parse tên cột
    slots["date_phrase"] = find_date_phrase(raw_norm)
    slots["time"] = parse_time(raw_norm)
    
    # Parse description (split by "mô tả" or ":")
    description = None
    title_text = raw_norm
    
    # Check for "mô tả" or "mo ta"
    desc_match = re.search(r'\s+(mo ta|mô tả)\s+(.+)', raw_norm)
    if desc_match:
        description = raw[desc_match.start(2):].strip()
        title_text = raw_norm[:desc_match.start()].strip()
    else:
        # Check for ":"
        colon_idx = raw_norm.find(':')
        if colon_idx != -1:
            description = raw[colon_idx+1:].strip()
            title_text = raw_norm[:colon_idx].strip()
    
    slots["description"] = description
    slots["title"] = try_extract_title(raw if not description else raw[:raw_norm.find(description.lower()) if description else len(raw)], title_text)

    if slots["title"]:
        slots["title"] = slots["title"].strip()
    return slots
