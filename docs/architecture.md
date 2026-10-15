# Architecture (proposed)

ใช้ monorepo โดยแต่ละ member เป็น independent TypeScript service มี dependencies, tests และ Docker image ของตนเอง

Booking เรียก Auth เพื่อตรวจ token, Resource เพื่อตรวจ resource และ Notification หลังบันทึก booking; Review เรียก Booking เพื่อตรวจสิทธิ์และสถานะ

| Service | Proposed endpoints |
|---|---|
| Auth | POST /auth/register, /auth/login, /auth/verify; GET /users/:id |
| Notification | POST /notifications; GET /notifications/user/:userId; PATCH /notifications/:id/read |
| Resource | GET/POST /resources; GET/PATCH/DELETE /resources/:id |
| Booking | POST /bookings; GET /bookings (admin), /bookings/:id, /bookings/user/:userId; PATCH /bookings/:id/cancel; GET/POST /closures, DELETE /closures/:id (admin) — implemented, see member4/README.md |
| Review | POST /reviews; GET /reviews/resource/:resourceId, /reviews/user/:userId, /reviews/:id, GET /reviews (admin) — implemented, see member5/README.md |

ทุก service มี GET /health; member1, member2, member4 และ member5 พร้อมใช้งานแล้ว

## Business decisions ที่ต้องตกลง

- ใช้ช่วงเวลาแบบ `[start, end)` เพื่อให้ booking ที่ต่อกันพอดีไม่ conflict
- ตรวจและบันทึก booking แบบ atomic เพื่อป้องกัน concurrent requests จองซ้ำ
- กำหนดว่า booking completed จากเวลาสิ้นสุดหรือ explicit status transition และทดสอบด้วย clock ที่ควบคุมได้
- กำหนด durable persistence และ data ownership ต่อ service
- แยกสิทธิ์ user/admin/internal service โดยเฉพาะการสร้าง notification
- กำหนด timeout, error responses และ retry/idempotency เมื่อ Notification ล้มเหลวหลังสร้าง booking
- ห้ามส่ง password/hash ใน API response; hash password และเก็บ secrets นอก Git
