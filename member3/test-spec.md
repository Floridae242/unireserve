# Resource test specification — member3

| ID | Requirement | Scenario | Expected | Test |
|---|---|---|---|---|
| TS-RES-01 | REQ-RES-01 | public หรือ student เรียก `GET /resources` | คืนเฉพาะรายการที่ `active: true` | UT-RES-03, IT-RES-02 |
| TS-RES-02 | REQ-RES-01 | admin เรียก `GET /resources` (ดูทั้งหมด หรือฟิลเตอร์ `?active=false`) | ดูได้ทุกรายการตามฟิลเตอร์ | UT-RES-03, IT-RES-03 |
| TS-RES-03 | REQ-RES-01 | เรียก `GET /resources/:id` รายการที่มีอยู่ (active หรือ inactive) | 200 `{ resource: { id, name, active, ... } }` | UT-RES-02, IT-RES-04 |
| TS-RES-04 | REQ-RES-01 | เรียก `GET /resources/:id` รายการที่ไม่มีอยู่ | 404 RESOURCE_NOT_FOUND | UT-RES-04, IT-RES-04 |
| TS-RES-05 | REQ-RES-01 | admin สร้าง resource ด้วย `POST /resources` ข้อมูลถูกต้อง | 201 `{ resource }` | UT-RES-02, IT-RES-05 |
| TS-RES-06 | REQ-RES-01 | admin แก้ไข resource ด้วย `PATCH /resources/:id` | 200 `{ resource }` พร้อมข้อมูลที่อัปเดต | UT-RES-02, IT-RES-05 |
| TS-RES-07 | REQ-RES-01 | admin ลบ resource ด้วย `DELETE /resources/:id` | 204 No Content | UT-RES-02, IT-RES-05 |
| TS-RES-08 | REQ-RES-01 | non-admin (student) หรือ unauthenticated เรียก endpoints จัดการ (POST, PATCH, DELETE) | 403 FORBIDDEN / 401 INVALID_TOKEN | IT-RES-05 |
| TS-RES-09 | REQ-RES-01 | ส่งข้อมูลผิดรูปแบบ เช่น ชื่อว่าง, id รูปแบบผิด, capacity ติดลบ | 400 INVALID_INPUT | UT-RES-01, IT-RES-06 |
| TS-RES-10 | REQ-RES-01 | dynamic test stubs compatibility (`room-*`, `inactive-*`, `missing-*`) | รองรับ automation tests ทันที | UT-RES-05 |

Preconditions: In-memory ResourceService per test instance, dummy users/tokens, mock Auth verifier. Group-wide spec TS-03 อยู่ใน [docs/test-spec.md](../docs/test-spec.md).
