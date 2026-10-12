# Authentication Service (member1)

สถานะ: โครงสร้างเริ่มต้น ยังไม่มี implementation

บทบาทที่เสนอ: **PM** (กลุ่มสามารถปรับได้)

ขอบเขต: Login, Register, Token, User

พอร์ตที่วางแผน: `3001`

- `src/`: source code ของ service
- `tests/`: unit tests ของ service

ขั้นต่อไป: ตกลง API contract แล้วเพิ่ม `package.json`, lockfile, `tsconfig.json`, `Dockerfile`, `.dockerignore` และ `.env.example` โดยให้แต่ละ project build/test ได้ด้วยตัวเอง

เกณฑ์ตรวจรับ: `/health`, business rules, validation, authorization, unit tests และ Docker image ของ service นี้
