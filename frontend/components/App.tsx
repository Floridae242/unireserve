"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  LayoutDashboard,
  DoorOpen,
  CalendarDays,
  Bell,
  Star,
  Settings,
  LogOut,
  Menu,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { api, ApiError } from "../lib/client";
import type { User } from "../lib/types";
import { Notice, State } from "./shared";
import {
  Dashboard,
  Resources,
  ResourceDetail,
  Bookings,
  Notifications,
  Reviews,
} from "./Student";
import Admin from "./Admin";
const links = [
  ["/", "ภาพรวม", LayoutDashboard],
  ["/resources", "ห้องและอุปกรณ์", DoorOpen],
  ["/bookings", "การจองของฉัน", CalendarDays],
  ["/notifications", "การแจ้งเตือน", Bell],
  ["/reviews", "รีวิวของฉัน", Star],
] as const;
export default function App() {
  const path = usePathname(),
    [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false);
  const load = () => {
    setLoading(true);
    setError("");
    api<{ user: User | null }>("/auth/session")
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setUser(null);
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => setMenu(false), [path]);
  if (loading)
    return (
      <div className="boot">
        <BookOpen size={34} />
        <State loading error="" reload={load} />
      </div>
    );
  if (error)
    return (
      <div className="boot">
        <State loading={false} error={error} reload={load} />
      </div>
    );
  if (!user) return <Auth onLogin={setUser} />;
  return (
    <div className="shell">
      <a className="skip" href="#main">
        ข้ามไปเนื้อหา
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          UniReserve<span className="brand-dot">.</span>
        </Link>
        <span className="sidebar-label">YOUR CAMPUS, CONNECTED</span>
        <nav aria-label="เมนูหลัก">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              className={
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "nav active"
                  : "nav"
              }
              href={href}
            >
              <Icon size={19} />
              {label}
              {href === "/resources" && <span className="nav-dot" />}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link
              className={`nav ${path === "/admin" ? "active" : ""}`}
              href="/admin"
            >
              <Settings size={19} />
              จัดการระบบ
            </Link>
          )}
        </nav>
        <div className="sidebar-note">
          <span className="note-orbit">✦</span>
          <h3>
            Make room
            <br />
            for your next idea.
          </h3>
          <p>พื้นที่ดี ๆ เพื่อสิ่งที่คุณอยากเริ่ม</p>
          <Link href="/resources">
            ค้นหาพื้นที่ <ArrowRight size={15} />
          </Link>
        </div>
        <div className="profile">
          <span className="avatar">{user.email.charAt(0).toUpperCase()}</span>
          <div>
            <strong>
              {user.role === "admin" ? "ผู้ดูแลระบบ" : "สมาชิก UniReserve"}
            </strong>
            <span title={user.email}>{user.email}</span>
          </div>
          <button
            aria-label="ออกจากระบบ"
            className="icon-button"
            onClick={async () => {
              try {
                await api("/auth/logout", "POST");
                setUser(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="เปิดเมนู"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span className="top-breadcrumb">
            UNIVERSITY <span>/</span> RESERVATION PORTAL
          </span>
          <div className="top-right">
            <span className="campus-tag">
              <span />
              Campus workspace
            </span>
            <Link
              href="/notifications"
              className="icon-button"
              aria-label="การแจ้งเตือน"
            >
              <Bell size={20} />
            </Link>
            <span className="avatar small">
              {user.email.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {path.startsWith("/resources/") ? (
            <ResourceDetail id={decodeURIComponent(path.split("/")[2])} />
          ) : path === "/resources" ? (
            <Resources />
          ) : path === "/bookings" ? (
            <Bookings user={user} />
          ) : path === "/notifications" ? (
            <Notifications user={user} />
          ) : path === "/reviews" ? (
            <Reviews user={user} />
          ) : path === "/admin" ? (
            user.role === "admin" ? (
              <Admin />
            ) : (
              <Notice error="คุณไม่มีสิทธิ์เข้าถึงหน้านี้" />
            )
          ) : (
            <Dashboard user={user} />
          )}
        </main>
        <footer>
          UniReserve{" "}
          <span>พื้นที่สำหรับทุกไอเดีย · เรียนรู้และทำงานร่วมกัน</span>
        </footer>
      </div>
    </div>
  );
}
function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Link className="brand" href="/">
          <BookOpen />
          UniReserve.
        </Link>
        <div>
          <span className="eyebrow">A SPACE TO BEGIN</span>
          <h1>
            ไอเดียดี ๆ<br />
            เริ่มต้นที่
            <br />
            <em>พื้นที่ของคุณ.</em>
          </h1>
          <p>
            ค้นหาห้อง จองอุปกรณ์ และสร้างสรรค์สิ่งใหม่
            <br />
            ทั้งหมดในพื้นที่เดียวสำหรับชาวมหาวิทยาลัย
          </p>
          <div className="story-floor">
            <div />
            <div />
            <div />
          </div>
        </div>
        <p className="auth-bottom">YOUR CAMPUS. YOUR POSSIBILITIES.</p>
      </section>
      <main className="auth-form">
        <span className="auth-badge">
          <ShieldCheck size={18} /> CAMPUS RESERVATION
        </span>
        <h2>{register ? "เริ่มต้นกับ UniReserve" : "ยินดีต้อนรับกลับมา"}</h2>
        <p className="muted">
          {register
            ? "สร้างบัญชีเพื่อค้นหาพื้นที่สำหรับไอเดียถัดไป"
            : "เข้าสู่ระบบเพื่อจัดการการจองของคุณ"}
        </p>
        <Notice error={error} success={success} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            setSuccess("");
            try {
              const body = {
                email: data.get("email"),
                password: data.get("password"),
              };
              if (register) {
                await api("/auth/register", "POST", body);
                setRegister(false);
                setSuccess("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
              } else {
                const result = await api<{ user: User }>(
                  "/auth/login",
                  "POST",
                  body,
                );
                onLogin(result.user);
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            อีเมล
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@university.ac.th"
              maxLength={254}
            />
          </label>
          <label>
            รหัสผ่าน
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={register ? 8 : 1}
              required
              placeholder={
                register ? "อย่างน้อย 8 ตัวอักษร" : "กรอกรหัสผ่านของคุณ"
              }
              maxLength={128}
            />
          </label>
          <button className="button primary full" disabled={busy}>
            {busy ? "กำลังดำเนินการ…" : register ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}{" "}
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError("");
              setSuccess("");
            }}
          >
            {register ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </p>
        <p className="auth-fine">จองห้องและอุปกรณ์ได้ตามสิทธิ์ของบัญชีคุณ</p>
      </main>
    </div>
  );
}
