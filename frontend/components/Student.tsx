"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  CalendarDays,
  DoorOpen,
  Bell,
  Star,
  Clock,
  Check,
  ArrowLeft,
  Users,
} from "lucide-react";
import {
  api,
  filterResources,
  bookingRange,
  canCancel,
  dateTime,
} from "../lib/client";
import type {
  User,
  Resource,
  Booking,
  Notification,
  Review,
} from "../lib/types";
import {
  Heading,
  Notice,
  State,
  useData,
  RoomArt,
  ResourceCard,
} from "./shared";
export function Dashboard({ user }: { user: User }) {
  const resources = useData<{ resources: Resource[] }>("/resources"),
    bookings = useData<{ bookings: Booking[] }>(
      `/bookings/user/${encodeURIComponent(user.id)}`,
    ),
    notifications = useData<{ notifications: Notification[] }>(
      `/notifications/user/${encodeURIComponent(user.id)}`,
    );
  const upcoming =
    bookings.data?.bookings.filter((b) => b.status === "CONFIRMED") ?? [];
  return (
    <>
      <Heading
        eyebrow="YOUR CAMPUS WORKSPACE"
        title="วันนี้ เริ่มต้นสิ่งดี ๆ กัน"
        description="พื้นที่ อุปกรณ์ และทุกการจองของคุณ อยู่ที่นี่"
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> ROOM FOR YOUR NEXT BIG IDEA
          </span>
          <h2>
            พื้นที่พร้อมแล้ว
            <br />
            เหลือแค่ไอเดียของคุณ<span>.</span>
          </h2>
          <p>
            หาห้องที่ใช่ เลือกเวลาที่สะดวก
            <br />
            แล้วเริ่มทำสิ่งที่คุณตั้งใจ
          </p>
          <Link href="/resources" className="button light">
            สำรวจห้องและอุปกรณ์
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hero-art">
          <RoomArt />
          <span className="art-caption">
            <span /> A little space. A lot of possibility.
          </span>
        </div>
      </section>
      <div className="stats">
        {[
          [
            DoorOpen,
            "ทรัพยากรเปิดให้จอง",
            resources.data?.resources.filter((r) => r.active).length,
            resources.error,
          ],
          [
            CalendarDays,
            "การจองที่ยืนยัน",
            bookings.data ? upcoming.length : undefined,
            bookings.error,
          ],
          [
            Bell,
            "การแจ้งเตือนยังไม่อ่าน",
            notifications.data?.notifications.filter(
              (n) => !(n.read ?? n.isRead),
            ).length,
            notifications.error,
          ],
        ].map(([Icon, label, value, error], i) => {
          const C = Icon as typeof DoorOpen;
          return (
            <div className="stat" key={i}>
              <span className={`stat-icon color-${i}`}>
                <C size={21} />
              </span>
              <div>
                <p>{label as string}</p>
                <strong>
                  {error ? "—" : value === undefined ? "…" : (value as number)}
                </strong>
              </div>
              <span className="stat-decoration">↗</span>
            </div>
          );
        })}
      </div>
      <div className="section-title">
        <div>
          <span className="eyebrow">EXPLORE & RESERVE</span>
          <h2>ค้นพบพื้นที่ถัดไปของคุณ</h2>
        </div>
        <Link href="/resources" className="text-link">
          ดูทั้งหมด
          <ArrowRight size={17} />
        </Link>
      </div>
      <State {...resources} empty={resources.data?.resources.length === 0} />
      <div className="resource-grid">
        {!resources.loading &&
          !resources.error &&
          resources.data?.resources
            .slice(0, 3)
            .map((r, i) => <ResourceCard resource={r} index={i} key={r.id} />)}
      </div>
      <section className="upcoming">
        <div className="section-title">
          <h2>การจองที่กำลังมาถึง</h2>
          <Link className="text-link" href="/bookings">
            ประวัติการจอง
            <ArrowRight size={16} />
          </Link>
        </div>
        <State
          {...bookings}
          empty={bookings.data !== null && upcoming.length === 0}
        />
        {!bookings.loading &&
          !bookings.error &&
          upcoming
            .slice(0, 3)
            .map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                name={
                  resources.data?.resources.find((r) => r.id === b.resourceId)
                    ?.name
                }
              />
            ))}
      </section>
    </>
  );
}
export function Resources() {
  const data = useData<{ resources: Resource[] }>("/resources"),
    [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [capacity, setCapacity] = useState(0);
  const resources = data.data?.resources ?? [],
    filtered = filterResources(resources, query, type, capacity);
  return (
    <>
      <Heading
        eyebrow="FIND YOUR SPACE"
        title="ห้องและอุปกรณ์"
        description="เลือกพื้นที่ที่เหมาะกับแผนของคุณ แล้วจองเวลาได้เลย"
      />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="ค้นหาห้องหรืออุปกรณ์"
            placeholder="ค้นหาชื่อห้องหรืออุปกรณ์…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">ประเภท</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">ทุกประเภท</option>
            {Array.from(new Set(resources.map((r) => r.type))).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">จำนวนคนขั้นต่ำ</span>
          <select
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          >
            <option value={0}>ทุกขนาด</option>
            <option value={5}>5 คนขึ้นไป</option>
            <option value={10}>10 คนขึ้นไป</option>
            <option value={20}>20 คนขึ้นไป</option>
          </select>
        </label>
      </div>
      <div className="results-line">
        <span>
          {data.loading ? "กำลังค้นหา…" : `${filtered.length} รายการ`}
        </span>
        <span>พื้นที่สำหรับการเรียนรู้ร่วมกัน</span>
      </div>
      <State {...data} empty={data.data !== null && filtered.length === 0} />
      <div className="resource-grid">
        {!data.loading &&
          !data.error &&
          filtered.map((r, i) => (
            <ResourceCard key={r.id} resource={r} index={i} />
          ))}
      </div>
    </>
  );
}
export function ResourceDetail({ id }: { id: string }) {
  const data = useData<{ resource: Resource }>(
      `/resources/${encodeURIComponent(id)}`,
    ),
    reviews = useData<{ reviews: Review[] }>(
      `/reviews/resource/${encodeURIComponent(id)}`,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const resource = data.data?.resource;
  return (
    <>
      <Link href="/resources" className="back">
        <ArrowLeft size={17} />
        กลับไปห้องและอุปกรณ์
      </Link>
      <State {...data} />
      {!data.loading && !data.error && resource && (
        <>
          <Heading
            eyebrow={resource.type}
            title={resource.name}
            description={resource.description}
          />
          <div className="detail-grid">
            <section>
              <div className="detail-art">
                <RoomArt />
              </div>
              <div className="detail-summary">
                <span>
                  <Users size={19} />
                  {resource.capacity} คน
                </span>
                <span className={`badge ${resource.active ? "green" : "gray"}`}>
                  {resource.active ? "เปิดให้จอง" : "ไม่เปิดให้จอง"}
                </span>
              </div>
              <h2 className="subheading">รีวิวจากผู้ใช้งาน</h2>
              <State {...reviews} empty={reviews.data?.reviews.length === 0} />
              {!reviews.loading &&
                !reviews.error &&
                reviews.data?.reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
            </section>
            <section className="panel booking-panel">
              <span className="eyebrow">MAKE IT YOURS</span>
              <h2>จองช่วงเวลาของคุณ</h2>
              <p className="muted">เวลาแสดงตามเขตเวลาของอุปกรณ์นี้</p>
              <Notice error={error} success={success} />
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  setSuccess("");
                  setBusy(true);
                  const form = new FormData(e.currentTarget);
                  try {
                    const times = bookingRange(
                      String(form.get("start")),
                      String(form.get("end")),
                    );
                    const result = await api<{ notificationSent: boolean }>(
                      "/bookings",
                      "POST",
                      { resourceId: id, ...times },
                    );
                    setSuccess(
                      result.notificationSent
                        ? "จองสำเร็จ ดูรายการได้ใน “การจองของฉัน”"
                        : "จองสำเร็จ แต่ส่งการแจ้งเตือนไม่สำเร็จ กรุณาดูประวัติการจอง",
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  วันและเวลาเริ่ม
                  <input type="datetime-local" name="start" required />
                </label>
                <label>
                  วันและเวลาสิ้นสุด
                  <input type="datetime-local" name="end" required />
                </label>
                <button
                  className="button primary full"
                  disabled={busy || !resource.active}
                >
                  <CalendarDays size={18} />
                  {busy ? "กำลังจอง…" : "ยืนยันการจอง"}
                </button>
              </form>
              <p className="form-hint">
                <Clock size={15} />
                ระบบตรวจสอบเวลาซ้ำก่อนยืนยันทุกครั้ง
              </p>
            </section>
          </div>
        </>
      )}
    </>
  );
}
function BookingRow({
  booking: b,
  name,
  children,
}: {
  booking: Booking;
  name?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="booking-row">
      <div className="date-tile">
        <span>
          {new Date(b.startTime).toLocaleDateString("th-TH", {
            month: "short",
          })}
        </span>
        <strong>{new Date(b.startTime).getDate()}</strong>
      </div>
      <div className="booking-info">
        <h3>{name ?? b.resourceId}</h3>
        <p>
          {dateTime(b.startTime)} — {dateTime(b.endTime)}
        </p>
        <small>#{b.id.slice(0, 8)}</small>
      </div>
      <span
        className={`badge ${b.status === "CONFIRMED" ? "blue" : b.status === "COMPLETED" ? "green" : "gray"}`}
      >
        {(
          {
            CONFIRMED: "ยืนยันแล้ว",
            CANCELLED: "ยกเลิกแล้ว",
            COMPLETED: "ใช้งานแล้ว",
          } as Record<string, string>
        )[b.status] ?? b.status}
      </span>
      {children}
    </div>
  );
}
export function Bookings({ user }: { user: User }) {
  const data = useData<{ bookings: Booking[] }>(
      `/bookings/user/${encodeURIComponent(user.id)}`,
    ),
    resources = useData<{ resources: Resource[] }>("/resources"),
    [tab, setTab] = useState("ALL"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const items = (data.data?.bookings ?? []).filter(
    (b) => tab === "ALL" || b.status === tab,
  );
  return (
    <>
      <Heading
        eyebrow="YOUR PLANS, ORGANIZED"
        title="การจองของฉัน"
        description="ติดตามทุกแผน และจัดการช่วงเวลาของคุณ"
      >
        <Link className="button primary" href="/resources">
          จองเพิ่ม
          <ArrowRight size={17} />
        </Link>
      </Heading>
      <div className="tabs" role="group" aria-label="กรองสถานะการจอง">
        {[
          ["ALL", "ทั้งหมด"],
          ["CONFIRMED", "ยืนยันแล้ว"],
          ["COMPLETED", "ใช้งานแล้ว"],
          ["CANCELLED", "ยกเลิกแล้ว"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "selected" : ""}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <Notice error={error} />
      <State {...data} empty={data.data !== null && !items.length} />
      <div className="panel list-panel">
        {!data.loading &&
          !data.error &&
          items.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              name={
                resources.data?.resources.find((r) => r.id === b.resourceId)
                  ?.name
              }
            >
              {canCancel(b) && (
                <button
                  className="button secondary compact"
                  disabled={busy === b.id}
                  onClick={async () => {
                    if (!window.confirm("ยืนยันยกเลิกการจองนี้?")) return;
                    setBusy(b.id);
                    setError("");
                    try {
                      await api(
                        `/bookings/${encodeURIComponent(b.id)}/cancel`,
                        "PATCH",
                      );
                      data.reload();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === b.id ? "กำลังยกเลิก…" : "ยกเลิก"}
                </button>
              )}
            </BookingRow>
          ))}
      </div>
    </>
  );
}
export function Notifications({ user }: { user: User }) {
  const data = useData<{ notifications: Notification[] }>(
      `/notifications/user/${encodeURIComponent(user.id)}`,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  return (
    <>
      <Heading
        eyebrow="STAY IN THE LOOP"
        title="การแจ้งเตือน"
        description="อัปเดตการจองและข่าวสารที่เกี่ยวข้องกับคุณ"
      />
      <Notice error={error} />
      <State {...data} empty={data.data?.notifications.length === 0} />
      <section className="panel list-panel">
        {!data.loading &&
          !data.error &&
          data.data?.notifications.map((n) => (
            <article
              key={n.id}
              className={`notification-row ${(n.read ?? n.isRead) ? "" : "unread"}`}
            >
              <span className="stat-icon color-0">
                <Bell size={20} />
              </span>
              <div>
                <h3>{n.message}</h3>
                <p>{dateTime(n.createdAt)}</p>
              </div>
              {!(n.read ?? n.isRead) ? (
                <button
                  disabled={busy === n.id}
                  className="button secondary compact"
                  onClick={async () => {
                    setBusy(n.id);
                    setError("");
                    try {
                      await api(
                        `/notifications/${encodeURIComponent(n.id)}/read`,
                        "PATCH",
                      );
                      data.reload();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === n.id ? "กำลังบันทึก…" : "อ่านแล้ว"}
                </button>
              ) : (
                <Check size={18} aria-label="อ่านแล้ว" />
              )}
            </article>
          ))}
      </section>
    </>
  );
}
export function ReviewCard({ review: r }: { review: Review }) {
  return (
    <article className="review-card">
      <div className="stars" aria-label={`${r.rating} จาก 5 ดาว`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            size={16}
            key={i}
            fill={i < r.rating ? "currentColor" : "none"}
          />
        ))}
      </div>
      <p>{r.comment || "ไม่มีความคิดเห็นเพิ่มเติม"}</p>
      <small>การจอง #{r.bookingId.slice(0, 8)}</small>
    </article>
  );
}
export function Reviews({ user }: { user: User }) {
  const reviews = useData<{ reviews: Review[] }>(
      `/reviews/user/${encodeURIComponent(user.id)}`,
    ),
    bookings = useData<{ bookings: Booking[] }>(
      `/bookings/user/${encodeURIComponent(user.id)}`,
    ),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  const eligible =
    bookings.data?.bookings.filter(
      (b) =>
        b.status === "COMPLETED" &&
        !reviews.data?.reviews.some((r) => r.bookingId === b.id),
    ) ?? [];
  return (
    <>
      <Heading
        eyebrow="SHARE YOUR EXPERIENCE"
        title="รีวิวของฉัน"
        description="บอกเล่าประสบการณ์ เพื่อพื้นที่ที่ดีขึ้นสำหรับทุกคน"
      />
      <div className="detail-grid">
        <section>
          <State {...reviews} empty={reviews.data?.reviews.length === 0} />
          {!reviews.loading &&
            !reviews.error &&
            reviews.data?.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
        </section>
        <section className="panel">
          <h2>เขียนรีวิว</h2>
          <p className="muted">สำหรับการจองที่ใช้งานเสร็จแล้วเท่านั้น</p>
          <Notice error={error || bookings.error} success={success} />
          {reviews.error ? (
            <p className="muted">กรุณาโหลดรีวิวให้สำเร็จก่อนเขียนรายการใหม่</p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                setSuccess("");
                try {
                  await api("/reviews", "POST", {
                    bookingId: f.get("bookingId"),
                    rating: Number(f.get("rating")),
                    comment: f.get("comment"),
                  });
                  setSuccess("บันทึกรีวิวแล้ว");
                  reviews.reload();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                รายการจอง
                <select
                  name="bookingId"
                  required
                  disabled={bookings.loading || !eligible.length}
                >
                  <option value="">
                    {eligible.length
                      ? "เลือกรายการจอง"
                      : "ยังไม่มีรายการที่รีวิวได้"}
                  </option>
                  {eligible.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.resourceId} · {dateTime(b.startTime)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                คะแนน
                <select name="rating" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} ดาว
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ความคิดเห็น
                <textarea
                  name="comment"
                  maxLength={500}
                  rows={4}
                  placeholder="ประสบการณ์การใช้งานของคุณ…"
                />
              </label>
              <button
                className="button primary full"
                disabled={busy || !eligible.length || reviews.loading}
              >
                {busy ? "กำลังบันทึก…" : "เผยแพร่รีวิว"}
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
