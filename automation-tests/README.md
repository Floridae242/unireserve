# Automation tests (Robot Framework) — member2 / Tester

Integration tests ข้าม service จริง รันใน Docker ทั้งหมด (ไม่ต้องติดตั้ง Python ในเครื่อง) มี 2 ชุด:

- **API tests** (`suites/`) — Robot Framework + RequestsLibrary ยิง HTTP ตรงไปที่ 5 services
- **UI tests** (`ui-suites/`) — Robot Framework + SeleniumLibrary เปิดหน้าเว็บจริงใน Chrome แล้วคลิกตาม flow หลักของผู้ใช้

## รัน API tests

```bash
cd automation-tests
docker compose --profile test run --rm --build robot
docker compose --profile test down
```

คำสั่งแรก build และเปิดทั้ง 5 services จริง — Auth (member1), Resource (member3), Notification (member2), Booking (member4), Review (member5) — และ Booking อีก 3 ตัวสำหรับกรณี Notification ล่ม รอจน healthy แล้วรัน suites ใน container `robot` exit code ≠ 0 เมื่อมีเทสต์ไม่ผ่าน ผลอยู่ที่ `results/report.html` และ `results/log.html` (ไม่ commit)

CI: [.github/workflows/integration-tests.yml](../.github/workflows/integration-tests.yml) รันคำสั่งเดียวกันและแนบ `robot-results` เป็น artifact

ผลการรันจริงล่าสุด (วันที่, commit, ผลรายเทสต์, ลิงก์ CI): [test-report.md](test-report.md)

## รัน UI tests

```bash
cd automation-tests
docker compose --profile ui run --rm --build robot-ui
docker compose --profile ui --profile test down
```

เปิด 5 services + frontend (Next.js) + Chrome ใน container `selenium` (`selenium/standalone-chromium`) แล้ว container `robot-ui` สั่ง Chrome ผ่าน Remote WebDriver (port 4444) ผลอยู่ที่ `results/ui/report.html` ถ้าเทสต์ไม่ผ่านจะมี screenshot ใน `log.html` CI รันเป็น job `ui` แยกจาก API และแนบ `robot-ui-results`

**ดูเทสต์รันสด ๆ (noVNC):** รันแบบหน่วงเวลาแล้วเปิด http://localhost:7900 กด Connect

```bash
docker compose --profile ui run --rm --build -e SELENIUM_SPEED=1s robot-ui
```

Chrome ไม่เด้งบนหน้าจอเครื่องเรา เพราะอยู่ใน container (จอเสมือน) แบบเดียวกับ CI `SELENIUM_SPEED` default `0s`

**ห้ามรัน `robot` ตรง ๆ บนเครื่อง** — service ทุกตัวอยู่ใน Docker และเรียกกันด้วยชื่อ (`http://frontend:3000`) รันนอก compose จะต่อ `localhost` ไม่ได้

ครั้งแรกต้องดาวน์โหลด image Selenium ~1 GB (ใช้พื้นที่ ~3.4 GB หลังแตก) และ build frontend หลังจากนั้นใช้ cache

## โครงสร้าง

| Path | หน้าที่ |
|---|---|
| `compose.yaml` | environment รวม; service เรียกกันด้วยชื่อ เช่น `http://auth:3001` |
| `stubs/notification-500.js` | stub เดียวที่เหลือ: Notification ที่ตอบ 500 เสมอและนับจำนวนครั้งที่ถูกเรียก (`GET /calls`) ใช้ทดสอบ retry ของ Booking |
| `Dockerfile`, `requirements.txt` | image สำหรับรัน Robot (pin version) |
| `resources/common.resource` | ตัวแปร URL/key จาก env และ keywords เช่น `Create Logged In User`, `Create Notification`, `Create Booking`, `Create Review`; `Ensure Booking Resource Exists` สร้าง resource fixture ผ่าน admin API ของ Resource จริง (id ขึ้นต้น `room-` → active, `inactive-` → inactive, `missing-` → ไม่สร้าง จึงได้ 404) |
| `resources/Parallel.py` | keyword `Post In Parallel` สำหรับยิง request พร้อมกัน |
| `suites/__init__.robot` | login admin (`${ADMIN_HEADERS}`) และสร้าง user ทดสอบ `${ALICE}`, `${BOB}` ครั้งเดียวให้ทุก suite |
| `suites/01_auth.robot` | TS-01, TS-02, RF-AUTH-01 |
| `suites/02_resource.robot` | Resource: TS-03, RF-RES-01..02 (contract `GET /resources/:id` ที่ Booking ใช้, สิทธิ์ admin) |
| `suites/03_notification.robot` | Notification API โดยตรง: RF-NOTI-01..05 และส่วน notification ของ TS-04 |
| `suites/04_booking.robot` | Auth → Resource → Booking → Notification: TS-04..07, RF-BOOK-01..05; Notification ล่ม RF-BOOK-06..08 ใช้ Booking แยก 3 ตัวใน compose (`booking-notify-500`, `booking-notify-down`, `booking-bad-key`) |
| `resources/ui.resource` | keywords ของ UI test: `Open UniReserve`, `Register Via UI`, `Login Via UI`, `Logout Via UI`, `Set Datetime Field` (ตั้งค่า datetime-local ด้วย JavaScript เพราะการพิมพ์ขึ้นกับ locale ของ browser) |
| `ui-suites/01_main_flows.robot` | UI-01 สมัคร + login, UI-02 จอง → เห็นการจองและแจ้งเตือน → กดอ่านแล้ว, UI-03 student เข้า /admin ไม่ได้ / admin เข้าได้ |
| `suites/05_review.robot` | Auth → Booking → Review: TS-08..10, RF-REV-01..02 |

## Coverage เทียบ docs/test-spec.md

| Test spec | สถานะ |
|---|---|
| TS-01, TS-02 | ✅ automated |
| TS-03 | ✅ automated (member3 Resource) |
| TS-04, TS-05, TS-06, TS-07 | ✅ automated (Resource จริง) |
| Concurrent booking (integration) | ✅ RF-BOOK-01: ยิง 4 requests พร้อมกัน ได้ 201 หนึ่งรายการ ที่เหลือ 409 |
| Notification ล่ม (member4 TS-BOOK-09) | ✅ RF-BOOK-06..08: 500 → retry 1 ครั้ง, ต่อไม่ได้, SERVICE_KEY ไม่ตรง → booking ยัง 201 และ `notificationSent: false` |
| TS-08, TS-09, TS-10 | ✅ automated (member5 Review) |
| Flow หลักผ่านหน้าเว็บ | ✅ UI-01..03 (SeleniumLibrary + Chrome กับ frontend จริง) |
| Admin flows ของ Booking (closures, admin cancel) | ⏳ ยังไม่มี Robot test — Auth สร้าง admin ได้แล้ว (ใช้สร้าง resource fixture) จึงเขียนเพิ่มได้ |

ไฟล์ suite มีเลขนำหน้าตามลำดับการเรียกใช้ (Auth → Resource → Notification → Booking → Review) เพิ่ม suite ใหม่ให้ใช้เลขถัดไป และเพิ่ม service ใน `compose.yaml` + URL ใน `common.resource`

## ข้อควรรู้

- ใช้ dummy users (`robot-xxxx@example.test`) ที่สุ่มใหม่ทุกครั้ง ห้ามใส่ token/credentials จริง
- `SERVICE_KEY` default เป็นค่า dev; override ผ่าน env ได้
- Booking ใช้วันที่คงที่ในอนาคต (2030-01-01) และแต่ละเทสต์ใช้ resource id ของตัวเอง จึงไม่ชนกันแม้รันซ้ำ ยกเว้น TS-08 (Review) ที่ต้องจองเวลาจริง (เริ่มอีก 3 วินาที, ลองใหม่ถ้า start เลยไปแล้ว) และ poll จน booking เป็น COMPLETED
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` ใน compose เป็นค่าสำหรับเทสต์เท่านั้น
- UI tests ใช้ข้อความภาษาไทยบนหน้าเว็บเป็นตัวหา element (เช่น ปุ่ม "ยืนยันการจอง") ถ้า frontend เปลี่ยนข้อความ ต้องแก้ `ui.resource` / `01_main_flows.robot` ตาม
- Auth จำกัด register/login 30 requests/นาที/IP หนึ่งรอบใช้ 9 ครั้ง (admin 1 + user 2 × 2 + `01_auth` 4) ถ้ารันซ้ำติดกันเกิน 3 รอบภายใน 1 นาทีโดยไม่ `down` จะเจอ 429 ใน suite setup
