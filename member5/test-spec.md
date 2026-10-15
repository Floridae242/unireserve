# Review test specification — member5

| ID | Requirement | Scenario | Expected | Test |
|---|---|---|---|---|
| TS-REV-01 | REQ-REV-01 | owner review completed booking | 201 Created พร้อมข้อมูลรีวิว | UT-REV-02, IT-REV-01 (TS-08) |
| TS-REV-02 | REQ-REV-01 | non-owner review booking | 403 FORBIDDEN | UT-REV-04, IT-REV-02 (TS-09) |
| TS-REV-03 | REQ-REV-01 | review booking เดิมซ้ำ | 409 REVIEW_ALREADY_EXISTS | UT-REV-03, IT-REV-03 (TS-10) |
| TS-REV-04 | REQ-REV-01 | review booking ที่ยังไม่เสร็จ (CONFIRMED หรือ CANCELLED) | 409 BOOKING_NOT_COMPLETED | UT-REV-05, IT-REV-04 |
| TS-REV-05 | REQ-REV-01 | booking ไม่มีอยู่จริง | 404 BOOKING_NOT_FOUND | IT-REV-05 |
| TS-REV-06 | REQ-REV-01 | rating นอกช่วง 1–5, ทศนิยม, ไม่ใช่ตัวเลข, comment เกิน 500 อักษร, bookingId ไม่ถูกต้อง | 400 INVALID_INPUT | UT-REV-01, IT-REV-06 |
| TS-REV-07 | REQ-REV-01 | ดูรายการรีวิวของ resource | 200 รายการรีวิวเฉพาะของ resource นั้น เรียงใหม่สุดก่อน | UT-REV-06, IT-REV-07 |
| TS-REV-08 | REQ-REV-01 | ดูรายการรีวิวของ user (เจ้าของ / admin / คนอื่น) | 200 / 200 / 403 FORBIDDEN | UT-REV-07, IT-REV-08 |
| TS-REV-09 | REQ-REV-01 | ดูรีวิวตาม ID ที่มีอยู่จริง / ไม่มีอยู่จริง | 200 / 404 REVIEW_NOT_FOUND | UT-REV-08, IT-REV-09 |
| TS-REV-10 | REQ-REV-01 | Admin ดูรีวิวทั้งหมด และกรองตาม resourceId/userId/rating | 200 (นักศึกษาเรียกได้ 403) | UT-REV-09, IT-REV-10 |
| TS-REV-11 | REQ-AUTH-01 | ไม่มี token / token ไม่ถูกต้อง / Auth service ล่ม | 401 INVALID_TOKEN / 503 AUTH_UNAVAILABLE | IT-REV-11 |
| TS-REV-12 | REQ-REV-01 | Booking service ล่ม หรือ network error | 503 BOOKING_UNAVAILABLE | IT-REV-12 |
| TS-REV-13 | REQ-REV-01 | Health check endpoint | 200 `{ status: "ok", service: "review" }` | IT-REV-13 |

Preconditions: In-memory ReviewService per test; Auth and Booking use stubs in IT-REV-01..10, fake HTTP server in IT-REV-11, unreachable URL in IT-REV-12. Group-wide specs (TS-08..10) อยู่ใน [docs/test-spec.md](../docs/test-spec.md).
