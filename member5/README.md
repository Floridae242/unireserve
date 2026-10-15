# Review Service — member5

เจ้าของ: **member5** · branch: `titan` · บทบาท: Review Developer

Express 5 + TypeScript โครงเดียวกับ member1/member2/member4 (CommonJS, strict, `src → dist`) port 3005

## เริ่มใช้งาน

```bash
cd member5
npm ci
npm run typecheck
npm test
npm run dev
```

Node.js 24+; env: `PORT` (default 3005), `AUTH_URL` (default http://localhost:3001), `BOOKING_URL` (default http://localhost:3004) แอปไม่โหลด `.env` อัตโนมัติ

## Business rules

- ผู้ใช้สามารถให้คะแนนและรีวิวหลังการใช้งานเสร็จสิ้น (REQ-REV-01)
- ตรวจสอบสิทธิ์โดยเชื่อมต่อกับ **Auth Service** (ตรวจ token) และ **Booking Service** (ตรวจเจ้าของและสถานะของ booking)
- **เจ้าของ booking เท่านั้น** ที่สามารถรีวิวได้ (หากผู้ใช้อื่นพยายามรีวิว จะได้รับ `403 FORBIDDEN`)
- รีวิวได้เฉพาะรายการจองที่สถานะเป็น **`COMPLETED`** แล้วเท่านั้น (หากยังไม่เริ่ม หรือถูกยกเลิก จะได้รับ `409 BOOKING_NOT_COMPLETED`)
- **รีวิวได้เพียงครั้งเดียวต่อหนึ่ง booking** (หากส่งซ้ำ จะได้รับ `409 REVIEW_ALREADY_EXISTS`)
- **Rating:** ตัวเลขจำนวนเต็ม 1 ถึง 5 ดาว
- **Comment:** ข้อความความเห็นเพิ่มเติม (ไม่บังคับ ความยาวไม่เกิน 500 ตัวอักษร)
- ข้อมูลจัดเก็บใน Memory ตามโครงสร้าง classroom (ข้อมูลจะรีเซ็ตเมื่อ restart service)

## API

ทุก endpoint ยกเว้น `/health` ต้องมี `Authorization: Bearer <token>`

| Method | Path | สิทธิ์ | Result |
|---|---|---|---|
| GET | /health | — | 200 `{ status: "ok", service: "review" }` |
| POST | /reviews | เจ้าของ booking | 201 `{ review }` |
| GET | /reviews/resource/:resourceId | authenticated user | 200 `{ reviews: [...] }` เรียงใหม่สุดก่อน |
| GET | /reviews/user/:userId | เจ้าของ / admin | 200 `{ reviews: [...] }` เรียงใหม่สุดก่อน |
| GET | /reviews/:id | authenticated user | 200 `{ review }` |
| GET | /reviews | admin | 200 `{ reviews: [...] }` กรองตาม `resourceId`, `userId`, `rating` ได้ |

### Body ของ POST /reviews

```json
{
  "bookingId": "uuid-of-booking",
  "rating": 5,
  "comment": "ห้องสะอาด แอร์เย็นมาก"
}
```

### ตัวอย่างการเรียกใช้งาน

```bash
curl -X POST http://localhost:3005/reviews \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"bookingId":"b-completed-id","rating":5,"comment":"บริการดีมาก"}'
```

### Errors

- `400`: `INVALID_INPUT`, `INVALID_JSON`
- `401`: `INVALID_TOKEN`
- `403`: `FORBIDDEN` (ไม่ใช่เจ้าของ booking หรือนักศึกษาพยายามเข้าถึงข้อมูลคนอื่น/admin endpoint)
- `404`: `BOOKING_NOT_FOUND`, `REVIEW_NOT_FOUND`, `NOT_FOUND`
- `409`: `REVIEW_ALREADY_EXISTS` (รีวิวซ้ำ), `BOOKING_NOT_COMPLETED` (booking ยังไม่สิ้นสุด)
- `413`: `PAYLOAD_TOO_LARGE`
- `503`: `AUTH_UNAVAILABLE`, `BOOKING_UNAVAILABLE`

## การเรียก Service อื่น

- **Auth (member1):** `POST /auth/verify` ส่ง Bearer token เพื่อยืนยันตัวตนและ role
- **Booking (member4):** `GET /bookings/:id` ส่ง Bearer token เพื่อดึงข้อมูล booking และตรวจ ownership/status

## Tests และ Docker

- Unit tests (`tests/reviews.test.cjs`): 9 tests
- HTTP tests (`tests/api.test.cjs`): 13 tests ครอบคลุม TS-08, TS-09, TS-10, input validation, errors และ healthcheck
- รายละเอียด Test Cases ทั้งหมด: [test-spec.md](test-spec.md)
- ผลการทดสอบ Local: [verification.md](verification.md)

```bash
docker compose up -d --build --wait
curl --fail http://localhost:3005/health
docker compose down
```
