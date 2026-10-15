# Integration test report — member2 / Tester

บันทึกผลการรันจริงของ Robot Framework integration suites ตาม [docs/test-spec.md](../docs/test-spec.md) อัปเดตทุกครั้งที่รันรอบสำคัญ (เพิ่ม service / ก่อน release) ห้ามเติมผลที่ไม่ได้รันจริง

## Run ล่าสุด

| Item | Value |
|---|---|
| Commit | `bdc38f5` (branch `phlu`) |
| วันที่รัน (local) | 2026-10-14 19:40 UTC (2026-10-15 02:40 +07) |
| คำสั่ง | `docker compose --profile test run --rm --build robot` บน stack ใหม่ (`down` ก่อนรัน) |
| Environment | Windows 11, Docker 29.8.2; Robot Framework 7.5, RequestsLibrary 0.9.7, Python 3.12 |
| Services | member1 Auth, member2 Notification, member4 Booking (build จาก source), Resource = **stub** (`stubs/resource-stub.js`); สำหรับ RF-BOOK-06..08 มี Booking เพิ่ม 3 ตัวต่อกับ Notification ที่เสีย (`stubs/notification-500.js`, ที่อยู่ที่ไม่มี service, SERVICE_KEY ผิด) |
| ผลรวม | **21 tests, 21 passed, 0 failed, 0 skipped** |
| CI ยืนยัน | [Integration Tests run 38625752844](https://github.com/Floridae242/unireserve/actions/runs/38625752844) — success บน `44e176e` (โค้ดเทสต์เหมือน `bdc38f5`; commit นี้แก้แค่ไฟล์ .md) ผ่านใน attempt 2 — attempt 1 ล้มตอน build image เพราะ `npm ci` ECONNRESET (เน็ตขาดชั่วคราว) ก่อนเทสต์เริ่ม |

Report ฉบับเต็ม (`report.html`, `log.html`, `output.xml`) อยู่ใน `results/` ตอนรัน local (ไม่ commit) และใน artifact `robot-results` ของ CI run ข้างต้น

## ผลรายเทสต์

| Robot test | Spec | Services ที่เกี่ยวข้อง | Result |
|---|---|---|---|
| TS-01 Valid Login Returns Token For Registered User | TS-01 | Auth | PASS |
| TS-02 Wrong Password Returns 401 Without Token | TS-02 | Auth | PASS |
| RF-AUTH-01 Unknown Token Is Rejected | — (เพิ่มเติม) | Auth | PASS |
| TS-04 (Notification Part) Notification Is Linked To Booking And User | TS-04 | Auth, Notification | PASS |
| RF-NOTI-01 Retrying The Same Booking Event Does Not Duplicate | — | Auth, Notification | PASS |
| RF-NOTI-02 Owner Can Mark Notification As Read | — | Auth, Notification | PASS |
| RF-NOTI-03 Other User Cannot See Or Mark Someone Else's Notifications | — | Auth, Notification | PASS |
| RF-NOTI-04 Invalid Or Missing Token Is Rejected Via Auth | — | Auth, Notification | PASS |
| RF-NOTI-05 Only Internal Services Can Create Notifications | — | Notification | PASS |
| TS-04 Booking A Free Slot Creates A Linked Notification | TS-04 | Auth, Resource stub, Booking, Notification | PASS |
| TS-05 Overlapping Booking On Same Resource Returns 409 | TS-05 | Auth, Resource stub, Booking | PASS |
| TS-06 Booking Starting Exactly At Previous End Is Allowed | TS-06 | Auth, Resource stub, Booking | PASS |
| TS-07 Start Not Before End Returns 400 | TS-07 | Auth, Booking | PASS |
| RF-BOOK-01 Concurrent Requests For One Slot Have A Single Winner | — (integration: concurrent booking) | Auth, Resource stub, Booking | PASS |
| RF-BOOK-02 Owner Cancels And Gets Notified; Slot Becomes Free Again | — | Auth, Resource stub, Booking, Notification | PASS |
| RF-BOOK-03 Other User Cannot View Or Cancel A Booking | — | Auth, Resource stub, Booking | PASS |
| RF-BOOK-04 Missing Or Inactive Resource Is Rejected | — | Auth, Resource stub, Booking | PASS |
| RF-BOOK-05 Booking Requires A Valid Token And Students Cannot Use Admin Endpoints | — | Auth, Booking | PASS |
| RF-BOOK-06 Notification 500 Is Retried Once And Booking Still Succeeds | — (member4 TS-BOOK-09) | Auth, Resource stub, Booking, Notification 500 stub | PASS |
| RF-BOOK-07 Unreachable Notification Does Not Block Booking Or Cancel | — (member4 TS-BOOK-09) | Auth, Resource stub, Booking (Notification ต่อไม่ได้) | PASS |
| RF-BOOK-08 Mismatched Service Key Is Rejected By Notification But Booking Succeeds | — (member4 TS-BOOK-09) | Auth, Resource stub, Booking, Notification | PASS |

## CI ของแต่ละ service (unit + HTTP tests, Docker build, health)

| Workflow | Commit | Result |
|---|---|---|
| Member1 Auth CI | `e682c98` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38543973528) |
| Member2 Notification CI | `959fc38` (phlu) | [success](https://github.com/Floridae242/unireserve/actions/runs/38621513825) |
| Member4 Booking CI | `c4f5699` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38584347169) |
| Member3 Resource / Member5 Review | — | ยังไม่มี service |

## ข้อจำกัดของผลนี้

- Resource เป็น stub ตาม contract ที่ Booking เสนอ (`GET /resources/:id` → `{ resource: { id, name, active } }`) ยังไม่ได้ยืนยันกับ member3 ผล TS-04..07 ต้องรันซ้ำเมื่อมี Resource จริง
- ยังไม่ได้ทดสอบ: TS-03 (Resource), TS-08..10 (Review), admin flows (Auth ยังสร้าง admin ไม่ได้)
- กรณี Notification ตอบ 4xx แล้ว Booking ต้องไม่ retry: Robot นับจำนวนครั้งไม่ได้เพราะ RF-BOOK-08 ใช้ Notification จริง — ครอบคลุมด้วย unit/HTTP tests ของ member4
- ข้อมูลทุก service อยู่ใน memory: ไม่ได้ทดสอบ persistence หรือหลาย replicas
