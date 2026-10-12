# Test specification (planned)

ทุก test ด้านล่างยังไม่ได้ implement หรือ execute ใช้ข้อมูลทดสอบจำลองและ reset isolated test environment ก่อนแต่ละชุด

| ID | Trace | Preconditions / action | Expected |
|---|---|---|---|
| TS-01 | REQ-AUTH-01 | seeded user login ด้วย password ถูก | 200 และ token |
| TS-02 | REQ-AUTH-01 | login password ผิด | 401 ไม่มี token |
| TS-03 | REQ-RES-01 | seed active/inactive resources แล้ว list | เห็นเฉพาะ active |
| TS-04 | REQ-BOOK-01, REQ-NOTI-01 | login แล้วจองช่วงว่าง | 201 และ notification ตรง booking/user |
| TS-05 | REQ-BOOK-02 | จองทับ booking เดิม | 409 BOOKING_TIME_CONFLICT |
| TS-06 | REQ-BOOK-02 | จองเริ่มตรง end ของรายการเดิม | 201 |
| TS-07 | REQ-BOOK-01 | start >= end | 400 |
| TS-08 | REQ-REV-01 | owner review completed booking | 201 |
| TS-09 | REQ-REV-01 | non-owner review | 403 |
| TS-10 | REQ-REV-01 | review booking เดิมซ้ำ | 409 |

Unit tests: อย่างน้อย service ละ 1 ตามแผน; เพิ่ม meaningful positive, negative และ boundary cases ตาม logic

Integration: ทดสอบ Auth → Resource → Booking → Notification และ Review → Booking รวม concurrent booking conflict

เก็บ actual result, execution date, commit SHA และ test report เมื่อรันจริง ห้ามเติมสถานะผ่านล่วงหน้า
