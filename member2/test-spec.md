# Notification test specification — member2

| ID | Requirement | Scenario | Expected | Test |
|---|---|---|---|---|
| TS-NOTI-01 | REQ-NOTI-01 | Booking สร้าง notification ด้วย service key | 201 unread, ผูก bookingId + userId | UT-NOTI-02, IT-NOTI-01 |
| TS-NOTI-02 | REQ-NOTI-01 | ส่ง event booking เดิมซ้ำ (retry) | 200 record เดิม ไม่สร้างซ้ำ | UT-NOTI-03, IT-NOTI-01 |
| TS-NOTI-03 | REQ-NOTI-01 | สร้างโดยไม่มี/ผิด service key หรือใช้ user token | 401 INVALID_SERVICE_KEY | IT-NOTI-02 |
| TS-NOTI-04 | REQ-NOTI-01 | user ดู notification ของตัวเอง | 200 เฉพาะของตัวเอง เรียงใหม่สุดก่อน | UT-NOTI-04, IT-NOTI-01 |
| TS-NOTI-05 | REQ-NOTI-01 | ดู/อ่าน notification ของคนอื่น | 403 FORBIDDEN | UT-NOTI-05, IT-NOTI-01 |
| TS-NOTI-06 | REQ-NOTI-01 | ไม่มี token / token ไม่ถูกต้อง | 401 INVALID_TOKEN | IT-NOTI-01, IT-NOTI-04 |
| TS-NOTI-07 | REQ-NOTI-01 | mark read id ที่ไม่มี | 404 NOTIFICATION_NOT_FOUND | UT-NOTI-05, IT-NOTI-01 |
| TS-NOTI-08 | REQ-NOTI-01 | input ผิด / JSON เสีย / body ใหญ่เกิน | 400 / 400 / 413 | UT-NOTI-01, IT-NOTI-03 |
| TS-NOTI-09 | REQ-NOTI-01 | Auth service ล่มหรือ timeout | 503 AUTH_UNAVAILABLE | IT-NOTI-04 |

Preconditions: fresh NotificationService per test; dummy data; IT-NOTI-01..03 ใช้ stub แทน Auth, IT-NOTI-04 ใช้ fake HTTP Auth server. การทดสอบข้าม service จริงอยู่ใน ../automation-tests (Robot Framework).
