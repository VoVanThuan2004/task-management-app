import { createElement, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Layers3,
  ListChecks,
  Menu,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { useUser } from "../components/useUser";

const features = [
  {
    icon: ListChecks,
    title: "Quản lý công việc rõ ràng",
    description: "Tạo task, thêm mô tả và theo dõi từng việc cần làm trong một nơi.",
  },
  {
    icon: Layers3,
    title: "Bảng Kanban trực quan",
    description: "Kéo công việc qua các cột để cả nhóm luôn biết dự án đang ở đâu.",
  },
  {
    icon: UsersRound,
    title: "Cộng tác cùng đội ngũ",
    description: "Phân công thành viên và phối hợp trên cùng một bảng làm việc.",
  },
  {
    icon: Zap,
    title: "Cập nhật kịp thời",
    description: "Nắm bắt thay đổi và hoạt động mới để không bỏ lỡ việc quan trọng.",
  },
  {
    icon: CalendarDays,
    title: "Theo sát thời hạn",
    description: "Đặt ngày đến hạn, sắp xếp ưu tiên và chủ động hoàn thành đúng lúc.",
  },
  {
    icon: CheckCheck,
    title: "Không gian gọn gàng",
    description: "Tổ chức các dự án theo bảng để tìm đúng việc, đúng ngữ cảnh.",
  },
];

const steps = [
  { number: "01", title: "Tạo không gian làm việc", description: "Bắt đầu bằng một dự án và mời đúng người cùng tham gia." },
  { number: "02", title: "Sắp xếp công việc", description: "Tạo task, thêm thời hạn rồi đặt chúng vào từng cột phù hợp." },
  { number: "03", title: "Theo dõi tiến độ", description: "Cùng cập nhật trạng thái và đưa dự án về đích đúng hạn." },
];

const demoColumns = [
  { title: "CẦN LÀM", tone: "bg-slate-100", cards: [{ title: "Lên kế hoạch sprint", tag: "Kế hoạch", color: "bg-blue-100 text-blue-700" }, { title: "Chuẩn bị nội dung", tag: "Marketing", color: "bg-violet-100 text-violet-700" }] },
  { title: "ĐANG THỰC HIỆN", tone: "bg-blue-50", cards: [{ title: "Thiết kế trang chủ", tag: "Thiết kế", color: "bg-amber-100 text-amber-700" }, { title: "Tích hợp đăng nhập", tag: "Phát triển", color: "bg-emerald-100 text-emerald-700" }] },
  { title: "HOÀN THÀNH", tone: "bg-emerald-50", cards: [{ title: "Tạo cấu trúc dự án", tag: "Phát triển", color: "bg-emerald-100 text-emerald-700" }] },
];

function Brand({ light = false }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`} aria-label="TaskFlow trang chủ">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><Check size={20} strokeWidth={3} /></span>
      <span className="text-xl">TaskFlow</span>
    </Link>
  );
}

function Navbar({ isAuthenticated }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: "#features", label: "Tính năng" },
    { href: "#how-it-works", label: "Cách hoạt động" },
    { href: "#about", label: "Giới thiệu" },
  ];
  const scrollToSection = (event, href) => {
    event.preventDefault();
    const target = document.getElementById(href.slice(1));

    if (!target) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", href);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10" aria-label="Điều hướng chính">
        <Brand />
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => <a key={link.href} href={link.href} onClick={(event) => scrollToSection(event, link.href)} className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">{link.label}</a>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <Link to="/home" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">Đến không gian làm việc <ArrowRight size={16} /></Link>
          ) : (
            <><Link to="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">Đăng nhập</Link><Link to="/register" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">Bắt đầu miễn phí</Link></>
          )}
        </div>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:hidden" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>
      {menuOpen && <div className="border-t border-slate-100 bg-white px-5 py-4 shadow-lg md:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-1">
        {links.map((link) => <a key={link.href} href={link.href} onClick={(event) => scrollToSection(event, link.href)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{link.label}</a>)}
        <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          {isAuthenticated ? <Link to="/home" onClick={() => setMenuOpen(false)} className="col-span-2 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">Đến không gian làm việc</Link> : <><Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">Đăng nhập</Link><Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">Bắt đầu</Link></>}
        </div>
      </div></div>}
    </header>
  );
}

function BoardMockup({ compact = false }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-950/10 ${compact ? "" : "min-w-[720px]"}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div><p className="text-xs font-medium text-slate-400">KHÔNG GIAN / DỰ ÁN</p><h3 className="mt-1 font-semibold text-slate-900">Ra mắt sản phẩm mới</h3></div>
        <div className="flex -space-x-2" aria-label="3 thành viên"><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-xs font-semibold text-blue-700">AM</span><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-xs font-semibold text-violet-700">LT</span><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-xs font-semibold text-amber-700">+1</span></div>
      </div>
      <div className="grid grid-cols-3 gap-3 bg-slate-50/80 p-4 sm:gap-4 sm:p-5">
        {demoColumns.map((column) => <div key={column.title} className={`min-h-48 rounded-xl p-2.5 sm:p-3 ${column.tone}`}><div className="mb-3 flex items-center justify-between px-1"><span className="text-[10px] font-bold tracking-wide text-slate-500 sm:text-[11px]">{column.title}</span><span className="text-xs text-slate-400">{column.cards.length}</span></div><div className="space-y-2.5">{column.cards.map((card) => <article key={card.title} className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm"><span className={`inline-block rounded px-1.5 py-1 text-[9px] font-semibold sm:text-[10px] ${card.color}`}>{card.tag}</span><h4 className="mt-2 text-[11px] font-semibold leading-snug text-slate-800 sm:text-xs">{card.title}</h4><div className="mt-3 flex items-center justify-between text-slate-400"><span className="flex items-center gap-1 text-[9px]"><Clock3 size={11} /> 12 Thg 6</span><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[8px] font-bold text-blue-700">A</span></div></article>)}</div></div>)}
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-10 lg:py-24">
        <div className="max-w-xl"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-600" />Một cách làm việc rõ ràng hơn</div>
          <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.65rem]">Quản lý công việc.<br /><span className="text-blue-600">Cùng nhau tiến xa.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Tập hợp công việc, đội ngũ và tiến độ dự án trong một không gian đơn giản. Để mọi người luôn biết việc tiếp theo là gì.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Bắt đầu miễn phí <ArrowRight size={17} /></Link><a href="#features" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Khám phá tính năng <ChevronRight size={17} /></a></div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-600" />Dễ bắt đầu</span><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-600" />Cộng tác liền mạch</span><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-600" />Theo sát tiến độ</span></div>
        </div>
        <div className="relative min-w-0"><div className="absolute -inset-4 rounded-[2rem] bg-blue-100/60 blur-xl" /><div className="relative rotate-0 lg:rotate-1"><BoardMockup compact /></div><div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-xl sm:left-8"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCheck size={19} /></span><span><span className="block text-xs font-semibold text-slate-800">Tiến độ được cập nhật</span><span className="mt-0.5 block text-[10px] text-slate-500">Mọi người cùng nắm rõ</span></span></div></div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return <section id="features" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-blue-600">Đủ dùng, dễ làm quen</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Mọi thứ cần có để quản lý công việc</h2><p className="mt-4 leading-7 text-slate-600">Công cụ gọn gàng giúp cá nhân và đội ngũ tập trung, phối hợp và hoàn thành mục tiêu.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon, title, description }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{createElement(icon, { size: 21 })}</span><h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></div></section>;
}

function HowItWorksSection() {
  return <section id="how-it-works" className="scroll-mt-20 bg-white py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-blue-600">Bắt đầu trong vài phút</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Cách hoạt động</h2><p className="mt-4 leading-7 text-slate-600">Từ ý tưởng đến kết quả, mọi thứ luôn có một bước tiếp theo rõ ràng.</p></div><div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">{steps.map((step, index) => <article key={step.number} className="relative text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-lg font-bold text-blue-700">{step.number}</span>{index < steps.length - 1 && <span className="absolute left-[calc(50%+3.25rem)] top-7 hidden h-px w-[calc(100%-3rem)] bg-blue-100 md:block" />}<h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">{step.description}</p></article>)}</div></div></section>;
}

function ProductPreview() {
  return <section className="overflow-hidden bg-slate-950 py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-blue-300">Không gian chung của bạn</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Tất cả trong một workspace</h2><p className="mt-4 leading-7 text-slate-300">Từ tổng quan dự án đến từng đầu việc, đội ngũ luôn nhìn thấy cùng một bức tranh.</p></div><div className="mt-12 overflow-x-auto rounded-2xl"><BoardMockup /></div><p className="mt-4 text-center text-xs text-slate-400">Một bảng Kanban mẫu để bạn hình dung cách nhóm phối hợp.</p></div></section>;
}

function AboutSection() {
  const values = [{ title: "Đơn giản", description: "Dễ hiểu và dễ sử dụng mỗi ngày." }, { title: "Linh hoạt", description: "Phù hợp với nhiều quy trình làm việc." }, { title: "Hiệu quả", description: "Dành thời gian cho công việc cần hoàn thành." }];
  return <section id="about" className="scroll-mt-20 bg-white py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><p className="text-sm font-bold uppercase tracking-widest text-blue-600">Về TaskFlow</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Thiết kế để công việc trở nên đơn giản hơn</h2><p className="mt-5 max-w-xl leading-7 text-slate-600">TaskFlow giúp đội ngũ tổ chức công việc, cộng tác hiệu quả và giữ cho dự án luôn tiến về phía trước.</p></div><div className="grid gap-4 sm:grid-cols-3">{values.map((value) => <article key={value.title} className="rounded-2xl border border-slate-200 p-5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Check size={18} /></span><h3 className="mt-4 font-semibold text-slate-900">{value.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{value.description}</p></article>)}</div></div></div></section>;
}

function CTASection() {
  return <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10"><div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-blue-600 px-6 py-12 text-center sm:px-12 sm:py-16"><p className="text-sm font-semibold text-blue-100">Sẵn sàng bắt đầu?</p><h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">Đưa công việc của bạn vào guồng</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-blue-100">Tạo workspace đầu tiên và cùng đội ngũ tiến gần hơn tới mục tiêu.</p><Link to="/register" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50">Bắt đầu miễn phí <ArrowRight size={17} /></Link></div></section>;
}

function Footer() {
  return <footer className="border-t border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-10"><div><Brand /><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">Không gian đơn giản để đội ngũ cùng tổ chức công việc và hoàn thành mục tiêu.</p></div><div><h3 className="text-sm font-semibold text-slate-900">Sản phẩm</h3><div className="mt-4 flex flex-col gap-3 text-sm text-slate-600"><a className="hover:text-blue-700" href="#features">Tính năng</a><a className="hover:text-blue-700" href="#how-it-works">Cách hoạt động</a></div></div><div><h3 className="text-sm font-semibold text-slate-900">Giới thiệu</h3><a className="mt-4 inline-block text-sm text-slate-600 hover:text-blue-700" href="#about">Về TaskFlow</a></div><div><h3 className="text-sm font-semibold text-slate-900">Tài khoản</h3><div className="mt-4 flex flex-col gap-3 text-sm text-slate-600"><Link className="hover:text-blue-700" to="/login">Đăng nhập</Link><Link className="hover:text-blue-700" to="/register">Đăng ký</Link></div></div></div><div className="border-t border-slate-100"><p className="mx-auto max-w-7xl px-5 py-5 text-xs text-slate-500 sm:px-8 lg:px-10">© 2026 TaskFlow. Bảo lưu mọi quyền.</p></div></footer>;
}

export default function LandingPage() {
  const { user } = useUser();
  const isAuthenticated = Boolean(user || localStorage.getItem("accessToken"));

  return <div className="min-h-screen overflow-x-clip bg-white font-sans text-slate-900"><Navbar isAuthenticated={isAuthenticated} /><main><HeroSection /><FeaturesSection /><HowItWorksSection /><ProductPreview /><AboutSection /><CTASection /></main><Footer /></div>;
}
