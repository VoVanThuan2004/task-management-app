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

def find_date_phrase(raw_norm: str) -> Optional[str]:
    for d in DATE_PHRASES:
        if d in raw_norm:
            if d == "hôm nay": return "hom nay"
            if d == "ngày mai": return "ngay mai"
            return d
    return None

def parse_time(raw_norm: str) -> Optional[str]:
    t = raw_norm

    m = re.search(r"\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)\b", t)
    if m:
        return f"{int(m.group(1)):02d}:{int(m.group(2)):02d}"

    m = re.search(r"\b([01]?\d|2[0-3])\s*h\s*([0-5]\d)\b", t)
    if m:
        return f"{int(m.group(1)):02d}:{int(m.group(2)):02d}"

    m = re.search(r"\b([01]?\d|2[0-3])\s*h\b", t)
    if m:
        return f"{int(m.group(1)):02d}:00"

    m = re.search(r"\b([01]?\d|2[0-3])\s*gio(?:\s*(sang|chieu|toi))?\b", t)
    if m:
        hh = int(m.group(1))
        part = m.group(2)
        if part in {"chieu", "toi"} and hh < 12:
            hh += 12
        return f"{hh:02d}:00"

    # Capture simple "2h" or "14h" without minutes if implied?
    # Usually "2h" is captured above.
    return None

def contains_oos(raw_norm: str) -> bool:
    return any(k in raw_norm for k in OOS_KEYWORDS)

def try_extract_title(raw: str, raw_norm: str) -> str:
    t = raw_norm

    prefixes = ["nhac toi ", "tao task ", "tao ", "them ", "add ", "new task "]
    for p in prefixes:
        if t.startswith(p):
            t = t[len(p):]
            break

    # Cut at time patterns first (e.g., "2h", "14:00", "luc 2h")
    time_patterns = [
        r'\d{1,2}\s*:\s*\d{2}',  # 14:00, 2:30
        r'\d{1,2}\s*h\s*\d{2}',  # 2h30
        r'\d{1,2}\s*h\b',  # 2h, 14h
        r'\d{1,2}\s*gio\b',  # 2 gio
        r'luc\s+\d',  # luc 2
    ]
    cut_idx = len(t)
    for pattern in time_patterns:
        m = re.search(pattern, t)
        if m:
            cut_idx = min(cut_idx, m.start())
    
    # Then cut at date/other keywords
    cut_keywords = [
        " hom nay", " ngay mai", " tuan nay", " tuan sau",
        " vao ", " vao list ", " uu tien ", " priority "
    ]
    for kw in cut_keywords:
        idx = t.find(kw)
        if idx != -1:
            cut_idx = min(cut_idx, idx)

    title_norm = t[:cut_idx].strip()

    # map back to original substring
    orig = norm_spaces(raw)
    orig_norm = strip_accents(orig).lower()
    pos = orig_norm.find(title_norm)
    if pos != -1 and title_norm:
        return orig[pos:pos+len(title_norm)].strip(" ,.-")

    return title_norm

def date_phrase_to_date(dp: Optional[str]) -> Optional[date]:
    if not dp:
        return None
    today = date.today()
    if dp == "hom nay":
        return today
    if dp == "ngay mai":
        return today + timedelta(days=1)
    if dp in {"tuan sau", "tuần sau"}:
        return today + timedelta(days=7)
    if dp in {"tuan nay", "tuần này"}:
        return today
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
        "list": None
    }

    slots["list"] = find_list(raw)
    slots["priority"] = find_priority(raw)
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
