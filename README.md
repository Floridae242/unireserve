# UniReserve

Campus Room & Equipment Booking Platform — โครงสร้างเริ่มต้นสำหรับงานกลุ่ม 5 คน / 5 independent services

## สถานะ

Authentication Service (member1), Notification Service (member2), Booking Service (member4) และ Review Service (member5) พร้อมใช้งาน มี API, tests, Dockerfile และ CI definition เรียบร้อยแล้ว ดู README ในโฟลเดอร์ของแต่ละ member ส่วน member3 (Resource) อยู่ระหว่างพัฒนา โดย integration tests ใช้ resource-stub แทนชั่วคราว

## เป้าหมาย MVP

Student login → ดู resource → จองช่วงเวลา → ตรวจเวลาซ้อน → สร้าง notification → review หลังสิ้นสุดการใช้งาน ส่วน admin จัดการ resource ได้

## การแบ่งงานที่เสนอ

| Project | Service | Role | Port |
|---|---|---|---|
| member1 | Authentication | PM | 3001 |
| member2 | Notification | Tester | 3002 |
| member3 | Resource | Developer | 3003 |
| member4 | Booking | Developer | 3004 |
| member5 | Review | Developer | 3005 |

ชื่อสมาชิกและบทบาทจริงให้กลุ่มตกลงก่อนเริ่ม implementation

## File structure

```text
unireserve/
├── member1/ … member5/
│   ├── src/.gitkeep
│   ├── tests/.gitkeep
│   └── README.md
├── automation-tests/
│   ├── resources/.gitkeep
│   └── README.md
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── test-spec.md
│   └── deployment-plan.md
├── .github/workflows/
│   ├── .gitkeep
│   └── README.md
├── .gitignore
└── README.md
```

## เอกสาร

- [Requirements](docs/requirements.md)
- [Architecture และ API ที่เสนอ](docs/architecture.md)
- [Test specification](docs/test-spec.md)
- [Deployment plan](docs/deployment-plan.md)
- [Automation tests](automation-tests/README.md)

## เริ่มพัฒนา

1. ตกลงเจ้าของ service, API contract และรูปแบบข้อมูลร่วมกัน
2. สร้าง TypeScript project ที่ build/test ได้อิสระในแต่ละ member folder
3. เพิ่ม `/health` และ unit tests ก่อนเชื่อม business flow
4. เพิ่ม Dockerfile ทั้ง 5 และ Compose ที่ root
5. เพิ่ม Robot Framework integration tests และ GitHub Actions
6. ตรวจทุกขั้นแล้วจึง publish images และ release

สำหรับแต่ละ service ที่เสร็จแล้ว (member1, member2, member4, member5) ใช้ `cd memberN`, `npm ci`, `npm test`, `npm run dev` ส่วน member3 อยู่ระหว่างพัฒนา

## ขอบเขตและแหล่งข้อมูล

แผนนี้ดัดแปลงจาก `deep-research-report-7.md` ที่ผู้ใช้ให้มา สำหรับ member1 ได้อ่าน `deploy2-2/งานกลุ่ม.pdf`, part2, software testing และ starter โดยตรงแล้ว ควรยืนยันว่าอาจารย์ยอมรับ monorepo ที่มี 5 projects ก่อนส่งงาน

ห้าม commit secrets หรือข้อมูลส่วนบุคคล ใช้ environment variables และ dummy test data
