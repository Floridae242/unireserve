# Automation tests (Robot Framework) — member2 / Tester

HTTP API integration tests ข้าม service จริง ใช้ Robot Framework + RequestsLibrary รันใน Docker ทั้งหมด (ไม่ต้องติดตั้ง Python ในเครื่อง)

## รัน

```bash
cd automation-tests
docker compose --profile test run --rm --build robot
docker compose --profile test down
```

คำสั่งแรก build และเปิด Auth (member1) + Notification (member2) รอจน healthy แล้วรัน suites ใน container `robot` exit code ≠ 0 เมื่อมีเทสต์ไม่ผ่าน ผลอยู่ที่ `results/report.html` และ `results/log.html` (ไม่ commit)

CI: [.github/workflows/integration-tests.yml](../.github/workflows/integration-tests.yml) รันคำสั่งเดียวกันและแนบ `robot-results` เป็น artifact

## โครงสร้าง

| Path | หน้าที่ |
|---|---|
| `compose.yaml` | environment รวม; service เรียกกันด้วยชื่อ เช่น `http://auth:3001` |
| `Dockerfile`, `requirements.txt` | image สำหรับรัน Robot (pin version) |
| `resources/common.resource` | ตัวแปร URL/key จาก env และ keywords เช่น `Create Logged In User`, `Create Notification` |
| `suites/01_auth.robot` | TS-01, TS-02, RF-AUTH-01 |
| `suites/02_notification.robot` | TS-04 (ส่วน notification), RF-NOTI-01..05 |

## Coverage เทียบ docs/test-spec.md

| Test spec | สถานะ |
|---|---|
| TS-01, TS-02 | ✅ automated |
| TS-04 | ⚠️ เฉพาะส่วน notification — suite ทำหน้าที่แทน Booking ด้วยการเรียก `POST /notifications` เอง |
| TS-03 | ⏳ รอ member3 Resource |
| TS-04 (เต็ม), TS-05..07 | ⏳ รอ member4 Booking |
| TS-08..10 | ⏳ รอ member5 Review |

เมื่อ service ใหม่พร้อม: เพิ่ม service ใน `compose.yaml`, URL ใน `common.resource` และ suite ใหม่ใน `suites/`

## ข้อควรรู้

- ใช้ dummy users (`robot-xxxx@example.test`) ที่สุ่มใหม่ทุกครั้ง ห้ามใส่ token/credentials จริง
- `SERVICE_KEY` default เป็นค่า dev; override ผ่าน env ได้
- Auth จำกัด 30 requests/นาที/IP ที่ `/auth/*` — suites ตอนนี้ใช้ไม่ถึง แต่ถ้ารันซ้ำติดกันหลายรอบโดยไม่ `down` อาจเจอ 429
