"use client";
import { useEffect, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  Users,
  DoorOpen,
  Projector,
} from "lucide-react";
import Link from "next/link";
import { api } from "../lib/client";
import type { Resource } from "../lib/types";
export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<T>(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="notice error">
          <AlertCircle size={18} />
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="notice success">
          {success}
        </p>
      )}
    </>
  );
}
export function State({
  loading,
  error,
  reload,
  empty = false,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
  empty?: boolean;
}) {
  if (loading)
    return (
      <p className="state" role="status">
        <RefreshCw size={20} className="spin" />
        กำลังโหลดข้อมูล…
      </p>
    );
  if (error)
    return (
      <div className="state">
        <Notice error={error} />
        <button className="button secondary" onClick={reload}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <DoorOpen size={30} />
        <h3>ยังไม่มีรายการ</h3>
        <p>รายการของคุณจะแสดงที่นี่เมื่อมีข้อมูล</p>
      </div>
    );
  return null;
}
export function RoomArt({ variant = 0 }: { variant?: number }) {
  return (
    <div className={`room-art art-${variant % 3}`} aria-hidden="true">
      <div className="art-window" />
      <div className="art-board" />
      <div className="art-desk" />
      <div className="art-chair chair-one" />
      <div className="art-chair chair-two" />
      <div className="art-plant" />
      <span className="art-grid" />
    </div>
  );
}
export function ResourceCard({
  resource,
  index = 0,
}: {
  resource: Resource;
  index?: number;
}) {
  return (
    <Link
      className="resource-card"
      href={`/resources/${encodeURIComponent(resource.id)}`}
    >
      <div className="card-art">
        <RoomArt variant={index} />
        <span className={`availability ${resource.active ? "" : "inactive"}`}>
          {resource.active ? "เปิดให้จอง" : "ไม่เปิดให้จอง"}
        </span>
      </div>
      <div className="card-body">
        <span className="eyebrow">{resource.type}</span>
        <h3>
          {resource.name}
          <ArrowUpRight size={19} />
        </h3>
        <p>
          {resource.description || "พื้นที่และอุปกรณ์สำหรับการเรียนรู้ร่วมกัน"}
        </p>
        <div className="card-meta">
          <span>
            <Users size={15} />
            {resource.capacity} คน
          </span>
          <span>
            <Projector size={15} />
            ดูรายละเอียด
          </span>
        </div>
      </div>
    </Link>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </header>
  );
}
