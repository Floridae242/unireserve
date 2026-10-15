# Test specification

ใช้ข้อมูลทดสอบจำลองและ reset isolated test environment ก่อนแต่ละชุด สถานะด้านล่างมาจากการรันจริงล่าสุดใน [automation-tests/test-report.md](../automation-tests/test-report.md) (release candidate `c035991`, 2026-10-15 UTC, ทั้ง 5 services จริง; UI flows หลักผ่าน 3/3 ด้วย SeleniumLibrary; unit tests ทุก service ผ่าน) — อัปเดตเมื่อรันใหม่เท่านั้น

| ID | Trace | Preconditions / action | Expected | Automated test | Actual (latest run) |
|---|---|---|---|---|---|
| TS-01 | REQ-AUTH-01 | seeded user login ด้วย password ถูก | 200 และ token | `01_auth` TS-01 | ✅ PASS |
| TS-02 | REQ-AUTH-01 | login password ผิด | 401 ไม่มี token | `01_auth` TS-02 | ✅ PASS |
| TS-03 | REQ-RES-01 | seed active/inactive resources แล้ว list | เห็นเฉพาะ active | `02_resource` TS-03 | ✅ PASS |
| TS-04 | REQ-BOOK-01, REQ-NOTI-01 | login แล้วจองช่วงว่าง | 201 และ notification ตรง booking/user | `04_booking` TS-04 | ✅ PASS |
| TS-05 | REQ-BOOK-02 | จองทับ booking เดิม | 409 BOOKING_TIME_CONFLICT | `04_booking` TS-05 | ✅ PASS |
| TS-06 | REQ-BOOK-02 | จองเริ่มตรง end ของรายการเดิม | 201 | `04_booking` TS-06 | ✅ PASS |
| TS-07 | REQ-BOOK-01 | start >= end | 400 | `04_booking` TS-07 | ✅ PASS — ได้ 400 INVALID_TIME_RANGE |
| TS-08 | REQ-REV-01 | owner review completed booking | 201 | `05_review` TS-08 | ✅ PASS |
| TS-09 | REQ-REV-01 | non-owner review | 403 | `05_review` TS-09 | ✅ PASS |
| TS-10 | REQ-REV-01 | review booking เดิมซ้ำ | 409 | `05_review` TS-10 | ✅ PASS |

Unit tests: อย่างน้อย service ละ 1 ตามแผน; เพิ่ม meaningful positive, negative และ boundary cases ตาม logic — ปัจจุบันมีครบทั้ง member1–member5 (ดู `memberN/test-spec.md` และ CI ของแต่ละ service)

Integration: ทดสอบ Auth → Resource → Booking → Notification และ Review → Booking รวม concurrent booking conflict — ผ่านทั้งหมดบน service จริง: Auth → Resource → Booking → Notification (`04_booking`), concurrent booking (RF-BOOK-01), Notification ล่ม (RF-BOOK-06..08) และ Review → Booking (`05_review` TS-08..10, RF-REV-01..02)

เก็บ actual result, execution date, commit SHA และ test report เมื่อรันจริง ห้ามเติมสถานะผ่านล่วงหน้า
