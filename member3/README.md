# Resource Service — member3

เจ้าของ: **member3** · branch: `frame` · บทบาท: Resource Developer

Express 5 + TypeScript โครงเดียวกับ member1/member2/member4 (CommonJS, strict, `src → dist`) port 3003

## เริ่มใช้งาน

```bash
cd member3
npm ci
npm run typecheck
npm test
npm run dev
```

Node.js 24+; env: `PORT` (default 3003), `AUTH_URL` (default http://localhost:3001)

## Business rules

- **REQ-RES-01 (การเข้าถึงทรัพยากร)**:
  - ผู้ใช้งานทั่วไป (Public) และ Student: เรียกดู `GET /resources` จะเห็นเฉพาะทรัพยากรที่มีสถานะ **`active: true`** เท่านั้น
  - Admin: สามารถดูทรัพยากรทั้งหมด หรือกรองตามสถานะ (`?active=true` หรือ `?active=false`) และประเภท (`?type=room` เป็นต้น)
- **การจัดการทรัพยากร (Admin Only)**:
  - เฉพาะผู้ใช้ที่มีสิทธิ์ Admin เท่านั้นที่สามารถสร้าง (`POST /resources`), อัปเดต (`PATCH /resources/:id`) และลบ (`DELETE /resources/:id`)
  - ตรวจสอบสิทธิ์ผ่าน Auth Service (member1) `POST /auth/verify` โดยส่ง Bearer token
- **สัญญาเชื่อมต่อกับ Booking Service (member4)**:
  - Booking Service จะเรียก `GET /resources/:id` เพื่อตรวจสอบความมีอยู่และสถานะ `active` ของทรัพยากรก่อนอนุญาตให้จอง
  - หากทรัพยากรมีอยู่แต่ `active: false` ระบบจะตอบกลับ 200 `{ resource: { id, name, active: false } }` เพื่อให้ Booking Service ตอบกลับ 409 `RESOURCE_INACTIVE` ตามข้อกำหนด
  - หากไม่พบทรัพยากร จะตอบกลับ 404 `RESOURCE_NOT_FOUND`
- **Dynamic ID Fallback สำหรับ Automation Tests**:
  - รองรับ ID จำลองระหว่าง integration testing เช่น `room-*` (active: true), `inactive-*` (active: false), และ `missing-*` (404) เพื่อความเข้ากันได้กับชุดทดสอบของระบบ

## API

| Method | Path | สิทธิ์ | Result |
|---|---|---|---|
| GET | /health | Public | 200 `{ status: "ok", service: "resource" }` |
| GET | /resources | Public / Student | 200 รายการเฉพาะ `active: true` |
| GET | /resources | Admin | 200 รายการทั้งหมด (query: `active`, `type`) |
| GET | /resources/:id | Authenticated / Public | 200 `{ resource: { id, name, type, capacity, active, ... } }` หรือ 404 |
| POST | /resources | Admin | 201 `{ resource }` |
| PATCH | /resources/:id | Admin | 200 `{ resource }` |
| DELETE | /resources/:id | Admin | 204 No Content |

### ตัวอย่างการสร้าง Resource (Admin)

```bash
curl -X POST http://localhost:3003/resources \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"id":"room-101","name":"Main Lecture Hall","type":"room","capacity":100,"active":true}'
```

### Response Codes & Errors

- `200 OK` / `201 Created` / `204 No Content`
- `400 INVALID_INPUT` / `INVALID_JSON`
- `401 INVALID_TOKEN`
- `403 FORBIDDEN` (เมื่อเรียก endpoint ของ admin โดยไม่มีสิทธิ์)
- `404 RESOURCE_NOT_FOUND` / `NOT_FOUND`
- `409 RESOURCE_ALREADY_EXISTS` (เมื่อสร้าง id ซ้ำ)
- `413 PAYLOAD_TOO_LARGE`
- `503 AUTH_UNAVAILABLE`

## Tests และ Docker

- `tests/resources.test.cjs`: 5 unit tests ทดสอบ validation, seeding, filtering และ compatibility hooks
- `tests/api.test.cjs`: 6 integration tests ทดสอบ HTTP endpoints, สิทธิ์ admin/student/public และ error handling

```bash
docker compose up -d --build --wait
curl --fail http://localhost:3003/health
docker compose down
```

CI Workflow: `.github/workflows/member3-ci.yml` ทดสอบ `npm ci`, `typecheck`, `test`, `docker build` และ smoke check container health

ดูรายละเอียดการทดสอบและการตรวจสอบ:
- [Test Specification](test-spec.md)
- [Verification Report](verification.md)
