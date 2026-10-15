# Integration test report — member2 / Tester

บันทึกผลการรันจริงของ Robot Framework integration suites ตาม [docs/test-spec.md](../docs/test-spec.md) อัปเดตทุกครั้งที่รันรอบสำคัญ (เพิ่ม service / ก่อน release) ห้ามเติมผลที่ไม่ได้รันจริง

## Run ล่าสุด

| Item | Value |
|---|---|
| Commit | `0be135e` (branch `phlu`, ต่อจาก `main` `f5cc079`) |
| วันที่รัน (local) | 2026-10-15 14:08 UTC (21:08 +07) |
| คำสั่ง | `docker compose --profile test run --rm --build robot` บน stack ใหม่ (`down` ก่อนรัน) |
| Environment | Windows 11, Docker 29.8.2; Robot Framework 7.5, RequestsLibrary 0.9.7, Python 3.12 |
| Services | **ทั้ง 5 services จริง** build จาก source: member1 Auth, member3 Resource, member2 Notification, member4 Booking, member5 Review — ไม่มี stub แทน service ใด; RF-BOOK-06..08 ใช้ Booking เพิ่ม 3 ตัวต่อกับ Notification ที่เสีย (`stubs/notification-500.js`, ที่อยู่ที่ไม่มี service, SERVICE_KEY ผิด) |
| ผลรวม | **29 tests, 29 passed, 0 failed, 0 skipped** |
| CI ยืนยัน | รอผล Integration Tests บน `0be135e` หลัง push — run ล่าสุดบน `main`: [38741034089](https://github.com/Floridae242/unireserve/actions/runs/38741034089) success บน `42ebe3a` |

Report ฉบับเต็ม (`report.html`, `log.html`, `output.xml`) อยู่ใน `results/` ตอนรัน local (ไม่ commit) และใน artifact `robot-results` ของ CI

## ผลรายเทสต์

| Suite | Robot test | Spec | Services ที่เกี่ยวข้อง | Result |
|---|---|---|---|---|
| 01_auth | TS-01 Valid Login Returns Token For Registered User | TS-01 | Auth | PASS |
| 01_auth | TS-02 Wrong Password Returns 401 Without Token | TS-02 | Auth | PASS |
| 01_auth | RF-AUTH-01 Unknown Token Is Rejected | — | Auth | PASS |
| 02_resource | TS-03 Public List Returns Only Active Resources | TS-03 | Auth, Resource | PASS |
| 02_resource | RF-RES-01 GET Single Resource Returns 200 For Active And Inactive And 404 For Missing | — (contract ที่ Booking ใช้) | Auth, Resource | PASS |
| 02_resource | RF-RES-02 Unauthenticated And Student Cannot Create Update Or Delete Resources | — | Auth, Resource | PASS |
| 03_notification | TS-04 (Notification Part) Notification Is Linked To Booking And User | TS-04 | Auth, Notification | PASS |
| 03_notification | RF-NOTI-01 Retrying The Same Booking Event Does Not Duplicate | — | Auth, Notification | PASS |
| 03_notification | RF-NOTI-02 Owner Can Mark Notification As Read | — | Auth, Notification | PASS |
| 03_notification | RF-NOTI-03 Other User Cannot See Or Mark Someone Else's Notifications | — | Auth, Notification | PASS |
| 03_notification | RF-NOTI-04 Invalid Or Missing Token Is Rejected Via Auth | — | Auth, Notification | PASS |
| 03_notification | RF-NOTI-05 Only Internal Services Can Create Notifications | — | Notification | PASS |
| 04_booking | TS-04 Booking A Free Slot Creates A Linked Notification | TS-04 | Auth, Resource, Booking, Notification | PASS |
| 04_booking | TS-05 Overlapping Booking On Same Resource Returns 409 | TS-05 | Auth, Resource, Booking | PASS |
| 04_booking | TS-06 Booking Starting Exactly At Previous End Is Allowed | TS-06 | Auth, Resource, Booking | PASS |
| 04_booking | TS-07 Start Not Before End Returns 400 | TS-07 | Auth, Booking | PASS |
| 04_booking | RF-BOOK-01 Concurrent Requests For One Slot Have A Single Winner | — (integration: concurrent booking) | Auth, Resource, Booking | PASS |
| 04_booking | RF-BOOK-02 Owner Cancels And Gets Notified; Slot Becomes Free Again | — | Auth, Resource, Booking, Notification | PASS |
| 04_booking | RF-BOOK-03 Other User Cannot View Or Cancel A Booking | — | Auth, Resource, Booking | PASS |
| 04_booking | RF-BOOK-04 Missing Or Inactive Resource Is Rejected | — | Auth, Resource, Booking | PASS |
| 04_booking | RF-BOOK-05 Booking Requires A Valid Token And Students Cannot Use Admin Endpoints | — | Auth, Booking | PASS |
| 04_booking | RF-BOOK-06 Notification 500 Is Retried Once And Booking Still Succeeds | — (member4 TS-BOOK-09) | Auth, Resource, Booking, Notification 500 stub | PASS |
| 04_booking | RF-BOOK-07 Unreachable Notification Does Not Block Booking Or Cancel | — (member4 TS-BOOK-09) | Auth, Resource, Booking (Notification ต่อไม่ได้) | PASS |
| 04_booking | RF-BOOK-08 Mismatched Service Key Is Rejected By Notification But Booking Succeeds | — (member4 TS-BOOK-09) | Auth, Resource, Booking, Notification | PASS |
| 05_review | TS-08 Owner Review Completed Booking | TS-08 | Auth, Resource, Booking, Review | PASS |
| 05_review | TS-09 Non-Owner Review | TS-09 | Auth, Booking, Review | PASS |
| 05_review | TS-10 Review Booking เดิมซ้ำ | TS-10 | Auth, Booking, Review | PASS |
| 05_review | RF-REV-01 Review Uncompleted Booking Returns 409 | — | Auth, Resource, Booking, Review | PASS |
| 05_review | RF-REV-02 Query Reviews For Resource And User | — | Auth, Review | PASS |

## CI ของแต่ละ service (unit + HTTP tests, Docker build, health)

| Workflow | Commit | Result |
|---|---|---|
| Member1 Auth CI | `42ebe3a` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38741033857) |
| Member2 Notification CI | `e682c98` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38543973555) |
| Member3 Resource CI | `42ebe3a` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38741033746) |
| Member4 Booking CI | `c4f5699` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38584347169) |
| Member5 Review CI | `c9e3f1c` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38741019187) |
| Frontend CI | `f5cc079` (main) | [success](https://github.com/Floridae242/unireserve/actions/runs/38745268427) |

แต่ละ workflow รันเมื่อโฟลเดอร์ของ service นั้นเปลี่ยน จึงเป็นคนละ commit กัน — แสดง run ล่าสุดบน `main` ของแต่ละตัว

## ข้อจำกัดของผลนี้

- ยังไม่มี Robot test สำหรับ admin flows ของ Booking (closures, admin cancel) — Auth สร้าง admin ได้แล้ว จึงเพิ่มได้
- Frontend ไม่อยู่ใน Robot suites (ทดสอบด้วย Frontend CI และ `docs/frontend-verification.md`)
- TS-08 (Review) อาศัยเวลาจริง: จองให้เริ่มอีก ~1 วินาทีแล้ว `Sleep 4s` — ถ้า CI ช้ามากอาจได้ 400 จาก start time ที่กลายเป็นอดีต (ยังไม่เคยเกิด; เป็นความเสี่ยงจากการอ่านโค้ด)
- กรณี Notification ตอบ 4xx แล้ว Booking ต้องไม่ retry: Robot นับจำนวนครั้งไม่ได้เพราะ RF-BOOK-08 ใช้ Notification จริง — ครอบคลุมด้วย unit/HTTP tests ของ member4
- ข้อมูลทุก service อยู่ใน memory: ไม่ได้ทดสอบ persistence หรือหลาย replicas
