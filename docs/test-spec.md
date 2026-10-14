# Test specification

ใช้ข้อมูลทดสอบจำลองและ reset isolated test environment ก่อนแต่ละชุด สถานะด้านล่างมาจากการรันจริงล่าสุดใน [automation-tests/test-report.md](../automation-tests/test-report.md) (commit `959fc38`, 2026-10-14 UTC) — อัปเดตเมื่อรันใหม่เท่านั้น

| ID | Trace | Preconditions / action | Expected | Automated test | Actual (latest run) |
|---|---|---|---|---|---|
| TS-01 | REQ-AUTH-01 | seeded user login ด้วย password ถูก | 200 และ token | `01_auth` TS-01 | ✅ PASS |
| TS-02 | REQ-AUTH-01 | login password ผิด | 401 ไม่มี token | `01_auth` TS-02 | ✅ PASS |
| TS-03 | REQ-RES-01 | seed active/inactive resources แล้ว list | เห็นเฉพาะ active | — | ⏳ ยังไม่ execute: รอ member3 Resource |
| TS-04 | REQ-BOOK-01, REQ-NOTI-01 | login แล้วจองช่วงว่าง | 201 และ notification ตรง booking/user | `03_booking` TS-04 | ✅ PASS (Resource = stub) |
| TS-05 | REQ-BOOK-02 | จองทับ booking เดิม | 409 BOOKING_TIME_CONFLICT | `03_booking` TS-05 | ✅ PASS (Resource = stub) |
| TS-06 | REQ-BOOK-02 | จองเริ่มตรง end ของรายการเดิม | 201 | `03_booking` TS-06 | ✅ PASS (Resource = stub) |
| TS-07 | REQ-BOOK-01 | start >= end | 400 | `03_booking` TS-07 | ✅ PASS — ได้ 400 INVALID_TIME_RANGE |
| TS-08 | REQ-REV-01 | owner review completed booking | 201 | — | ⏳ ยังไม่ execute: รอ member5 Review |
| TS-09 | REQ-REV-01 | non-owner review | 403 | — | ⏳ ยังไม่ execute: รอ member5 Review |
| TS-10 | REQ-REV-01 | review booking เดิมซ้ำ | 409 | — | ⏳ ยังไม่ execute: รอ member5 Review |

Unit tests: อย่างน้อย service ละ 1 ตามแผน; เพิ่ม meaningful positive, negative และ boundary cases ตาม logic — ปัจจุบันมีใน member1, member2, member4 (ดู `memberN/test-spec.md` และ CI ของแต่ละ service)

Integration: ทดสอบ Auth → Resource → Booking → Notification และ Review → Booking รวม concurrent booking conflict — ส่วน Auth → Booking → Notification และ concurrent booking (RF-BOOK-01) ผ่านแล้วโดยใช้ Resource stub; Review → Booking ยังไม่มี

เก็บ actual result, execution date, commit SHA และ test report เมื่อรันจริง ห้ามเติมสถานะผ่านล่วงหน้า
