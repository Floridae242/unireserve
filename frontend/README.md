# UniReserve Frontend

Next.js16 + React19 + TypeScript ภาษาไทย รองรับ desktop/mobile

มี Login/Register, Dashboard, Resource search/detail/booking, Booking history/cancel,
Notification inbox/read, completed-booking Reviews และ Admin Resource CRUD/Bookings/Closures/Reviews
ใช้ข้อมูลจาก5servicesจริง รูปห้องเป็น CSS illustration ไม่ใช่ภาพสถานที่จริง

## Docker ครบระบบ

จาก root repository:

```bash
cp .env.example .env
```

แก้ ADMIN_EMAIL, ADMIN_PASSWORD (8–128ตัว), SERVICE_KEY (อย่างน้อย16ตัว) เป็นค่าของ lab
ตั้ง FRONTEND_PORT และ APP_ORIGIN ให้ตรง URL browser เช่น3300กับ http://localhost:3300
ใช้รหัสสุ่มใหม่ ไม่ใช้รหัส CI กับระบบจริง และไม่ commit .env

```bash
docker compose -f compose.web.yaml up -d --build --wait
```

เปิด http://localhost:3000 ตามค่าเริ่มต้น เปลี่ยนพอร์ตได้ใน .env
บริการbackendไม่เปิดพอร์ตhost มีเพียงfrontendบนloopback

## พัฒนาแยก

รันbackend3001–3005ก่อน แล้วจาก frontend:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Production ต้องตั้ง APP_ORIGIN; HTTPS ต้อง COOKIE_SECURE=true

## ตรวจสอบ

```bash
npm run typecheck
npm test
npm run build
APP_URL=http://localhost:3300 node scripts/smoke.mjs
```

Smoke สร้างบัญชี/booking/reviewทดสอบจริง ใช้เฉพาะstack lab/CI
เพิ่ม ADMIN_EMAIL/PASSWORD ในenvironmentเพื่อทดสอบadmin CRUD/closuresด้วย
CI รันbuild/testsและDockerครบ6containers ไม่publishimage

## ข้อจำกัด

HttpOnly/SameSite cookie, same-origin mutations และ fixed upstream allowlist;
backendตรวจtoken/สิทธิ์จริง ไม่ใช้เพียงUIซ่อนปุ่ม
Logoutล้างcookie แต่tokenเดิมหมดอายุตามTTL เพราะAuthไม่มีrevokeAPI
ข้อมูลbackendอยู่ในmemory หายเมื่อrestart และยังไม่รองรับshared multi-replica persistence
