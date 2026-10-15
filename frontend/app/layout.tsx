import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "UniReserve · พื้นที่สำหรับทุกไอเดีย",
  description: "จองห้องและอุปกรณ์มหาวิทยาลัย",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
