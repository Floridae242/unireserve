# Automation tests (Robot Framework) — member2 / Tester

HTTP API integration tests ข้าม service จริง ใช้ Robot Framework + RequestsLibrary รันใน Docker ทั้งหมด (ไม่ต้องติดตั้ง Python ในเครื่อง)

## รัน

```bash
cd automation-tests
docker compose --profile test run --rm --build robot
docker compose --profile test down
```

คำสั่งแรก build และเปิด Auth (member1), Notification (member2), Booking (member4), Review (member5), Resource stub และ Booking อีก 3 ตัวสำหรับกรณี Notification ล่ม รอจน healthy แล้วรัน suites ใน container `robot` exit code ≠ 0 เมื่อมีเทสต์ไม่ผ่าน ผลอยู่ที่ `results/report.html` และ `results/log.html` (ไม่ commit)

CI: [.github/workflows/integration-tests.yml](../.github/workflows/integration-tests.yml) รันคำสั่งเดียวกันและแนบ `robot-results` เป็น artifact

ผลการรันจริงล่าสุด (วันที่, commit, ผลรายเทสต์, ลิงก์ CI): [test-report.md](test-report.md)

## โครงสร้าง

| Path | หน้าที่ |
|---|---|
| `compose.yaml` | environment รวม; service เรียกกันด้วยชื่อ เช่น `http://auth:3001` |
| `stubs/resource-stub.js` | **Resource ชั่วคราว** แทน member3 ตาม contract ที่ Booking ใช้ (`GET /resources/:id`): id ขึ้นต้น `missing-` → 404, `inactive-` → inactive, อื่น ๆ → active |
| `stubs/notification-500.js` | Notification ที่ตอบ 500 เสมอและนับจำนวนครั้งที่ถูกเรียก (`GET /calls`) ใช้ทดสอบ retry ของ Booking |
| `Dockerfile`, `requirements.txt` | image สำหรับรัน Robot (pin version) |
| `resources/common.resource` | ตัวแปร URL/key จาก env และ keywords เช่น `Create Logged In User`, `Create Notification`, `Create Booking`, `Create Review` |
| `resources/Parallel.py` | keyword `Post In Parallel` สำหรับยิง request พร้อมกัน |
| `suites/__init__.robot` | สร้าง user ทดสอบ `${ALICE}`, `${BOB}` ครั้งเดียวให้ทุก suite |
| `suites/01_auth.robot` | TS-01, TS-02, RF-AUTH-01 |
| `suites/02_notification.robot` | Notification API โดยตรง: RF-NOTI-01..05 และส่วน notification ของ TS-04 |
| `suites/03_booking.robot` | Auth → Resource → Booking → Notification: TS-04..07, RF-BOOK-01..05; Notification ล่ม RF-BOOK-06..08 ใช้ Booking แยก 3 ตัวใน compose (`booking-notify-500`, `booking-notify-down`, `booking-bad-key`) |
| `suites/04_review.robot` | Auth → Booking → Review: TS-08..10, RF-REV-01..02 |

## Coverage เทียบ docs/test-spec.md

| Test spec | สถานะ |
|---|---|
| TS-01, TS-02 | ✅ automated |
| TS-04, TS-05, TS-06, TS-07 | ✅ automated (Resource เป็น stub) |
| Concurrent booking (integration) | ✅ RF-BOOK-01: ยิง 4 requests พร้อมกัน ได้ 201 หนึ่งรายการ ที่เหลือ 409 |
| Notification ล่ม (member4 TS-BOOK-09) | ✅ RF-BOOK-06..08: 500 → retry 1 ครั้ง, ต่อไม่ได้, SERVICE_KEY ไม่ตรง → booking ยัง 201 และ `notificationSent: false` |
| TS-08, TS-09, TS-10 | ✅ automated (member5 Review) |
| TS-03 | ⏳ รอ member3 Resource |
| Admin flows (closures, admin cancel) | ⏳ รอ Auth มีวิธีสร้าง admin |

เมื่อ member3 พร้อม: เปลี่ยน service `resource` ใน `compose.yaml` เป็น `build: ../member3`, seed resource ตามที่ suite ต้องการ แล้วเพิ่ม suite TS-03 เมื่อ service อื่นพร้อม: เพิ่มใน `compose.yaml`, URL ใน `common.resource` และ suite ใหม่ใน `suites/`

## ข้อควรรู้

- ใช้ dummy users (`robot-xxxx@example.test`) ที่สุ่มใหม่ทุกครั้ง ห้ามใส่ token/credentials จริง
- `SERVICE_KEY` default เป็นค่า dev; override ผ่าน env ได้
- Booking ใช้วันที่คงที่ในอนาคต (2030-01-01) และแต่ละเทสต์ใช้ resource id ของตัวเอง จึงไม่ชนกันแม้รันซ้ำ
- Auth จำกัด register/login 30 requests/นาที/IP หนึ่งรอบใช้ 8 ครั้ง ถ้ารันซ้ำติดกันเกิน 3 รอบภายใน 1 นาทีโดยไม่ `down` จะเจอ 429 ใน suite setup
