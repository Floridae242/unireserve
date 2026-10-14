# Booking Service — member4

เจ้าของ: **member4** · branch: `folk` · บทบาท: Booking Developer

Express 5 + TypeScript โครงเดียวกับ member1/member2 (CommonJS, strict, `src → dist`) port 3004

## เริ่มใช้งาน

```bash
cd member4
npm ci
npm run typecheck
npm test
SERVICE_KEY=local-dev-service-key npm run dev
```

Node.js 24+; env: `PORT` (default 3004), `AUTH_URL` (default http://localhost:3001), `NOTIFICATION_URL` (default http://localhost:3002), `RESOURCE_URL` (default http://localhost:3003), `SERVICE_KEY` (บังคับ ≥16 ตัว ต้องตรงกับ Notification) แอปไม่โหลด `.env` อัตโนมัติ

## Business rules

- User เลือก resource + ช่วงเวลาแล้วจอง ระบบตรวจเวลาว่างและ **ยืนยันอัตโนมัติ** ไม่ต้องรอ admin อนุมัติ
- ช่วงเวลาเป็น `[start, end)` — จองต่อกันพอดี (จบ 10:00 / เริ่ม 10:00) ไม่ถือว่าซ้อน
- เวลาต้องเป็น ISO 8601 ที่มี timezone เช่น `2030-01-01T09:00:00Z` หรือ `2030-01-01T16:00:00+07:00`; ต้อง `start < end` และ start ต้องไม่อยู่ในอดีต
- ตรวจเวลาซ้อนและบันทึกแบบ synchronous ในจังหวะเดียว (ไม่มี `await` คั่น) request พร้อมกันจึงจองช่วงเดียวกันได้แค่รายการเดียว
- Status: `CONFIRMED` → `CANCELLED` (ยกเลิก) หรือ `COMPLETED` (คำนวณอัตโนมัติเมื่อเลยเวลาสิ้นสุด) Review ใช้ `COMPLETED` ตัดสินว่ารีวิวได้
- ยกเลิก: เจ้าของยกเลิกได้ก่อนเวลาเริ่ม; admin ยกเลิกได้จนถึงเวลาสิ้นสุด
- Admin เปิด/ปิดช่วงเวลาจองด้วย closures (ต่อ resource หรือทุก resource เมื่อไม่ระบุ `resourceId`) closure กันเฉพาะการจองใหม่ booking เดิมให้ admin ยกเลิกเอง
- Admin ดูรายการจองทั้งหมดและกรองตาม `resourceId`, `userId`, `status` ได้

## API

ทุก endpoint ยกเว้น `/health` ต้องมี `Authorization: Bearer <token>` ซึ่งตรวจกับ Auth `POST /auth/verify` ทุกครั้ง (timeout 3s) admin คือ user ที่ Auth คืน `role: "admin"`

| Method | Path | สิทธิ์ | Result |
|---|---|---|---|
| GET | /health | — | 200 status ok |
| POST | /bookings | user | 201 `{ booking, notificationSent }` |
| GET | /bookings | admin | 200 รายการทั้งหมด (query: `resourceId`, `userId`, `status`) |
| GET | /bookings/user/:userId | เจ้าของ / admin | 200 เรียงตาม startTime |
| GET | /bookings/:id | เจ้าของ / admin | 200 booking (Review ใช้ตรวจเจ้าของและ status) |
| PATCH | /bookings/:id/cancel | เจ้าของ / admin | 200 `{ booking, notificationSent }` |
| GET | /closures | user | 200 ช่วงที่ปิด (query `resourceId` คืนของ resource นั้น + แบบทุก resource) |
| POST | /closures | admin | 201 closure; body `startTime`, `endTime`, `resourceId` (optional), `reason` (optional ≤200) |
| DELETE | /closures/:id | admin | 204 เปิดช่วงเวลาคืน |

Body ของ POST /bookings: `resourceId` (≤64), `startTime`, `endTime`

```bash
curl -X POST http://localhost:3004/bookings \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"resourceId":"room-a","startTime":"2030-01-01T09:00:00Z","endTime":"2030-01-01T10:00:00Z"}'
```

Errors: 400 INVALID_INPUT/INVALID_TIME_RANGE/INVALID_JSON, 401 INVALID_TOKEN, 403 FORBIDDEN, 404 BOOKING_NOT_FOUND/CLOSURE_NOT_FOUND/RESOURCE_NOT_FOUND/NOT_FOUND, 409 BOOKING_TIME_CONFLICT/BOOKING_PERIOD_CLOSED/RESOURCE_INACTIVE/BOOKING_NOT_CANCELLABLE, 413 PAYLOAD_TOO_LARGE, 503 AUTH_UNAVAILABLE/RESOURCE_UNAVAILABLE

## การเรียก service อื่น

- **Auth (member1):** `POST /auth/verify` ด้วย Bearer token ของ user
- **Resource (member3) — contract ที่เสนอ รอ member3 ยืนยัน:** `GET /resources/:id` ส่ง Bearer token ของ user ต่อไป คาดว่าได้ `200 { "resource": { "id", "name", "active": boolean } }` หรือ `404` ถ้าไม่มี; `active: false` ได้ 409 RESOURCE_INACTIVE, error อื่น/timeout 3s ได้ 503 RESOURCE_UNAVAILABLE
- **Notification (member2):** `POST /notifications` ด้วย `X-Service-Key` ส่ง `BOOKING_CREATED` หลังจอง และ `BOOKING_CANCELLED` หลังยกเลิก (แจ้งเจ้าของ booking แม้ admin เป็นคนยกเลิก) แบบ best effort: booking บันทึกแล้วเสมอ ถ้า 5xx/timeout จะ retry 1 ครั้ง ล้มเหลวจะ log และตอบ `notificationSent: false` การ retry ปลอดภัยเพราะ Notification กันรายการซ้ำด้วย userId + bookingId + type

## Tests และ Docker

`tests/bookings.test.cjs` unit 7 cases; `tests/api.test.cjs` HTTP 6 cases (Auth/Resource ใช้ stub, client ใช้ fake HTTP server) ดู [test-spec.md](test-spec.md)

```bash
docker compose up -d --build --wait
curl --fail http://localhost:3004/health
docker compose down
```

Compose ชี้ Auth/Notification/Resource ไปที่ host port 3001/3002/3003 ข้อมูลเก็บใน memory จึงหายเมื่อ restart

CI: `.github/workflows/member4-ci.yml` ทำ install → typecheck → tests → Docker build → container health check

## ข้อจำกัด

- Auth ยังไม่มีวิธีสร้าง admin (self-register ได้ role student เสมอ) endpoint admin จึงใช้จริงได้เมื่อ member1 เพิ่ม admin provisioning; tests ใช้ stub admin
- Resource ยังไม่ implement จึงยังไม่มี Robot integration suite ของ Booking (TS-04 เต็ม, TS-05..07)
- Single process, in-memory: ไม่รองรับหลาย replicas

ผลตรวจล่าสุด: [Local verification](verification.md)
