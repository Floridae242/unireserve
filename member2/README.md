# Notification Service (member2)

สถานะ: โครงสร้างเริ่มต้น ยังไม่มี implementation

บทบาทที่เสนอ: **Tester** (กลุ่มสามารถปรับได้)

ขอบเขต: Notification API และ Robot Framework automation

พอร์ตที่วางแผน: `3002`

- `src/`: source code ของ service
- `tests/`: unit tests ของ service

ขั้นต่อไป: ตกลง API contract แล้วเพิ่ม `package.json`, lockfile, `tsconfig.json`, `Dockerfile`, `.dockerignore` และ `.env.example` โดยให้แต่ละ project build/test ได้ด้วยตัวเอง

เกณฑ์ตรวจรับ: `/health`, business rules, validation, authorization, unit tests และ Docker image ของ service นี้
