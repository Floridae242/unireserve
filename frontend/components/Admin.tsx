"use client";
import { useState } from "react";
import { api, bookingRange, dateTime } from "../lib/client";
import type { Resource, Booking, Closure, Review } from "../lib/types";
import { Heading, Notice, State, useData } from "./shared";
import { ReviewCard } from "./Student";
export default function Admin() {
  const [tab, setTab] = useState("resources");
  return (
    <>
      <Heading
        eyebrow="CAMPUS ADMINISTRATION"
        title="จัดการระบบ"
        description="ดูแลทรัพยากร การจอง และช่วงเวลาปิดบริการ"
      />
      <div className="tabs">
        {[
          ["resources", "ทรัพยากร"],
          ["bookings", "การจองทั้งหมด"],
          ["closures", "ปิดรับการจอง"],
          ["reviews", "รีวิวทั้งหมด"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "resources" ? (
        <ResourcesAdmin />
      ) : tab === "bookings" ? (
        <BookingsAdmin />
      ) : tab === "closures" ? (
        <ClosuresAdmin />
      ) : (
        <ReviewsAdmin />
      )}
    </>
  );
}
function ResourcesAdmin() {
  const data = useData<{ resources: Resource[] }>("/resources"),
    [editing, setEditing] = useState<Resource | null>(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  async function change(path: string, method: string, body: unknown = {}) {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await api(path, method, body);
      data.reload();
      setSuccess("บันทึกการเปลี่ยนแปลงแล้ว");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice error={error} success={success} />
      <div className="detail-grid">
        <section>
          <State {...data} empty={data.data?.resources.length === 0} />
          {!data.loading &&
            !data.error &&
            data.data?.resources.map((r) => (
              <article className="panel admin-resource" key={r.id}>
                <div>
                  <span className="eyebrow">
                    {r.type} · {r.capacity} คน
                  </span>
                  <h3>{r.name}</h3>
                  <p className="muted">{r.description}</p>
                  <span className={`badge ${r.active ? "green" : "gray"}`}>
                    {r.active ? "เปิดให้จอง" : "ปิดให้จอง"}
                  </span>
                </div>
                <div className="button-group">
                  <button
                    disabled={busy}
                    className="button secondary compact"
                    onClick={() => {
                      setEditing(r);
                      document.getElementById("resource-name")?.focus();
                    }}
                  >
                    แก้ไข
                  </button>
                  <button
                    disabled={busy}
                    className="button secondary compact"
                    onClick={() =>
                      change(
                        `/resources/${encodeURIComponent(r.id)}`,
                        "PATCH",
                        { active: !r.active },
                      )
                    }
                  >
                    {r.active ? "ปิดบริการ" : "เปิดบริการ"}
                  </button>
                  <button
                    disabled={busy}
                    className="button danger compact"
                    onClick={() => {
                      if (window.confirm(`ลบ ${r.name} ถาวร?`))
                        void change(
                          `/resources/${encodeURIComponent(r.id)}`,
                          "DELETE",
                        );
                    }}
                  >
                    ลบ
                  </button>
                </div>
              </article>
            ))}
        </section>
        <section className="panel">
          <h2>{editing ? "แก้ไขทรัพยากร" : "เพิ่มทรัพยากร"}</h2>
          <form
            key={editing?.id ?? "new"}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              const ok = await change(
                editing
                  ? `/resources/${encodeURIComponent(editing.id)}`
                  : "/resources",
                editing ? "PATCH" : "POST",
                {
                  name: f.get("name"),
                  type: f.get("type"),
                  capacity: Number(f.get("capacity")),
                  description: f.get("description"),
                  active: f.get("active") === "on",
                },
              );
              if (ok) {
                setEditing(null);
                form.reset();
              }
            }}
          >
            <label>
              ชื่อ
              <input
                id="resource-name"
                name="name"
                defaultValue={editing?.name}
                required
                maxLength={100}
              />
            </label>
            <label>
              ประเภท
              <select name="type" defaultValue={editing?.type ?? "room"}>
                <option value="room">ห้อง (room)</option>
                <option value="equipment">อุปกรณ์ (equipment)</option>
                <option value="lab">ห้องปฏิบัติการ (lab)</option>
                {editing && !["room", "equipment", "lab"].includes(editing.type) && (
                  <option value={editing.type}>{editing.type}</option>
                )}
              </select>
            </label>
            <label>
              ความจุ
              <input
                type="number"
                name="capacity"
                defaultValue={editing?.capacity ?? 1}
                min={1}
                max={10000}
                required
              />
            </label>
            <label>
              รายละเอียด
              <textarea
                name="description"
                defaultValue={editing?.description}
                maxLength={500}
              />
            </label>
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing?.active ?? true}
              />
              เปิดให้จอง
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            {editing && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                ยกเลิกแก้ไข
              </button>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
function BookingsAdmin() {
  const data = useData<{ bookings: Booking[] }>("/bookings"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  return (
    <>
      <Notice error={error} />
      <State {...data} empty={data.data?.bookings.length === 0} />
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>ทรัพยากร / ผู้จอง</th>
              <th>ช่วงเวลา</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {!data.loading &&
              !data.error &&
              data.data?.bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.resourceId}
                    <small>{b.userId}</small>
                  </td>
                  <td>
                    {dateTime(b.startTime)}
                    <small>ถึง {dateTime(b.endTime)}</small>
                  </td>
                  <td>
                    <span className="badge blue">{b.status}</span>
                  </td>
                  <td>
                    {b.status === "CONFIRMED" &&
                      new Date(b.endTime).getTime() > Date.now() && (
                        <button
                          className="button danger compact"
                          disabled={busy === b.id}
                          onClick={async () => {
                            if (
                              !window.confirm("ยืนยันยกเลิกการจองของผู้ใช้นี้?")
                            )
                              return;
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
                          ยกเลิก
                        </button>
                      )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function ClosuresAdmin() {
  const data = useData<{ closures: Closure[] }>("/closures"),
    resources = useData<{ resources: Resource[] }>("/resources"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Notice error={error} success={success} />
      <div className="detail-grid">
        <section>
          <State {...data} empty={data.data?.closures.length === 0} />
          {!data.loading &&
            !data.error &&
            data.data?.closures.map((c) => (
              <article className="panel" key={c.id}>
                <h3>
                  {c.resourceId
                    ? (resources.data?.resources.find(
                        (r) => r.id === c.resourceId,
                      )?.name ?? c.resourceId)
                    : "ทรัพยากรทั้งหมด"}
                </h3>
                <p>
                  {dateTime(c.startTime)} — {dateTime(c.endTime)}
                </p>
                <p className="muted">{c.reason}</p>
                <button
                  className="button danger compact"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("ลบช่วงเวลาปิดบริการนี้?")) return;
                    setBusy(true);
                    setError("");
                    try {
                      await api(
                        `/closures/${encodeURIComponent(c.id)}`,
                        "DELETE",
                      );
                      data.reload();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  ลบช่วงเวลา
                </button>
              </article>
            ))}
        </section>
        <section className="panel">
          <h2>เพิ่มช่วงเวลาปิดบริการ</h2>
          <p className="muted">
            ป้องกันการจองใหม่ การจองเดิมต้องยกเลิกแยกต่างหาก
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setSuccess("");
              const f = new FormData(e.currentTarget);
              try {
                await api("/closures", "POST", {
                  resourceId: f.get("resourceId") || null,
                  reason: f.get("reason"),
                  ...bookingRange(String(f.get("start")), String(f.get("end"))),
                });
                data.reload();
                setSuccess("เพิ่มช่วงเวลาปิดบริการแล้ว");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              ทรัพยากร
              <select name="resourceId">
                <option value="">ทั้งหมด</option>
                {resources.data?.resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              เริ่ม
              <input type="datetime-local" name="start" required />
            </label>
            <label>
              สิ้นสุด
              <input type="datetime-local" name="end" required />
            </label>
            <label>
              เหตุผล
              <textarea name="reason" maxLength={200} />
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "เพิ่มช่วงเวลา"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
function ReviewsAdmin() {
  const data = useData<{ reviews: Review[] }>("/reviews");
  return (
    <>
      <State {...data} empty={data.data?.reviews.length === 0} />
      {!data.loading &&
        !data.error &&
        data.data?.reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
    </>
  );
}
