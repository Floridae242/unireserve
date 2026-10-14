# Booking test specification — member4

| ID | Requirement | Scenario | Expected | Test |
|---|---|---|---|---|
| TS-BOOK-01 | REQ-BOOK-01 | authenticated user จอง resource active ช่วงว่าง | 201 CONFIRMED อัตโนมัติ | UT-BOOK-02, IT-BOOK-01 |
| TS-BOOK-02 | REQ-BOOK-01 | input ผิด / เวลาไม่มี timezone / วันที่ไม่มีจริง | 400 INVALID_INPUT | UT-BOOK-01, IT-BOOK-06 |
| TS-BOOK-03 | REQ-BOOK-01 | start >= end หรือ start อยู่ในอดีต | 400 INVALID_TIME_RANGE | UT-BOOK-01/02, IT-BOOK-02 |
| TS-BOOK-04 | REQ-BOOK-01 | resource ไม่มี / inactive / Resource ล่ม | 404 RESOURCE_NOT_FOUND / 409 RESOURCE_INACTIVE / 503 RESOURCE_UNAVAILABLE | IT-BOOK-02, IT-BOOK-05 |
| TS-BOOK-05 | REQ-BOOK-02 | จองทับช่วงเดิมบน resource เดียวกัน | 409 BOOKING_TIME_CONFLICT | UT-BOOK-03, IT-BOOK-02 |
| TS-BOOK-06 | REQ-BOOK-02 | จองเริ่มตรง end ของรายการเดิม / resource อื่น / ช่วงที่ยกเลิกแล้ว | 201 | UT-BOOK-03, IT-BOOK-02 |
| TS-BOOK-07 | REQ-BOOK-02 | request พร้อมกันหลายรายการช่วงเดียวกัน | 201 หนึ่งรายการ ที่เหลือ 409 | IT-BOOK-02 |
| TS-BOOK-08 | REQ-NOTI-01 | จอง/ยกเลิกสำเร็จ | ส่ง BOOKING_CREATED / BOOKING_CANCELLED ผูก booking + user | IT-BOOK-01, IT-BOOK-03 |
| TS-BOOK-09 | REQ-NOTI-01 | Notification ล่ม (5xx / timeout) | ยัง 201, retry 1 ครั้ง, notificationSent false; 4xx ไม่ retry | IT-BOOK-04 |
| TS-BOOK-10 | REQ-BOOK-01 | ดู booking ของคนอื่น / ไม่มี token / token ผิด / Auth ล่ม | 403 / 401 / 401 / 503 | UT-BOOK-07, IT-BOOK-01, IT-BOOK-06 |
| TS-BOOK-11 | REQ-BOOK-01 | ยกเลิก: เจ้าของก่อนเริ่ม, admin ก่อนจบ, ซ้ำ/เลยเวลา, คนอื่น | 200 / 200 / 409 BOOKING_NOT_CANCELLABLE / 403 | UT-BOOK-06, IT-BOOK-03 |
| TS-BOOK-12 | REQ-REV-01 | booking เลยเวลาสิ้นสุด | status COMPLETED (ยกเลิกแล้วยังเป็น CANCELLED) | UT-BOOK-05 |
| TS-BOOK-13 | REQ-BOOK-01 | admin ปิดช่วงเวลา (ต่อ resource / ทั้งหมด) แล้วเปิดคืน | จองในช่วงปิด 409 BOOKING_PERIOD_CLOSED; หลังลบจองได้ 201 | UT-BOOK-04, IT-BOOK-03 |
| TS-BOOK-14 | REQ-BOOK-01 | student เรียก endpoint admin (list ทั้งหมด, closures) | 403 FORBIDDEN | UT-BOOK-04/07, IT-BOOK-03 |

Preconditions: fresh BookingService per test with injected clock fixed at 2030-01-01T08:00Z; dummy data; Auth และ Resource ใช้ stub ใน IT-BOOK-01..03, fake HTTP server ใน IT-BOOK-04..06. Group-wide specs (TS-04..07) อยู่ใน ../docs/test-spec.md และจะเพิ่มใน ../automation-tests เมื่อ Resource พร้อม
