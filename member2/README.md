# Notification Service — member2 / phlu

เจ้าของ: **member2** · branch: `phlu` · บทบาท: Notification Developer + Tester

Express 5 + TypeScript โครงเดียวกับ member1 (CommonJS, strict, `src → dist`) port 3002

## เริ่มใช้งาน

```bash
cd member2
npm ci
npm run typecheck
npm test
SERVICE_KEY=local-dev-service-key npm run dev
```

Node.js 24+; env: `PORT` (default 3002), `AUTH_URL` (default http://localhost:3001), `SERVICE_KEY` (บังคับ ≥16 ตัว) แอปไม่โหลด `.env` อัตโนมัติ

## API

| Method | Path | Authorization | Result |
|---|---|---|---|
| GET | /health | — | 200 status ok |
| POST | /notifications | `X-Service-Key` (internal เท่านั้น) | 201 สร้างใหม่ / 200 ถ้า userId+bookingId+type ซ้ำ |
| GET | /notifications/user/:userId | Bearer token ของ user นั้น | 200 รายการ ใหม่สุดก่อน |
| PATCH | /notifications/:id/read | Bearer token ของเจ้าของ | 200 read: true |

Body ของ POST: `userId`, `type` (BOOKING_CREATED / BOOKING_CANCELLED / REVIEW_REMINDER), `message` (≤500), `bookingId` (optional)

Token ตรวจโดยเรียก Auth `POST /auth/verify` ทุกครั้ง (timeout 3s) Booking ต้องส่ง `SERVICE_KEY` เดียวกันใน header `X-Service-Key`

Errors: 400 INVALID_INPUT/INVALID_JSON, 401 INVALID_TOKEN/INVALID_SERVICE_KEY, 403 FORBIDDEN, 404 NOTIFICATION_NOT_FOUND/NOT_FOUND, 413 PAYLOAD_TOO_LARGE, 503 AUTH_UNAVAILABLE

## Tests และ Docker

`tests/notifications.test.cjs` unit 5 cases; `tests/api.test.cjs` HTTP 4 cases (Auth ใช้ stub/fake server) ดู [test-spec.md](test-spec.md)

```bash
docker compose up -d --build --wait
curl --fail http://localhost:3002/health
docker compose down
```

Compose ชี้ `AUTH_URL` ไปที่ Auth บน host port 3001 ข้อมูลเก็บใน memory จึงหายเมื่อ restart
