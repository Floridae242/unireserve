# Authentication Service — member1 / Tle

เจ้าของ: **Tle** · branch: `Tle` · บทบาทตามแผน: Authentication Developer + PM

Express 5 + TypeScript ตาม starter `deploy2-2/tsconfig.zip` ใช้ CommonJS, strict mode, `src → dist`, Node watch mode และ port 3001 ตามตัวอย่างใน part2

## เริ่มใช้งาน

```bash
cd member1
npm ci
npm run typecheck
npm test
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Node.js 24+; default PORT=3001 และ TOKEN_TTL_SECONDS=3600 (1–86400) ใช้ `PORT=3002 npm start` เพื่อเปลี่ยน port `.env.example` เป็นตัวอย่างเท่านั้น แอปไม่โหลด `.env` อัตโนมัติ

## API

| Method | Path | Input / authorization | Result |
|---|---|---|---|
| GET | /health | — | 200 status ok |
| POST | /auth/register | JSON email/password | 201 user |
| POST | /auth/login | JSON email/password | 200 token, expiresIn, user |
| POST | /auth/verify | Authorization: Bearer token | 200 valid, user |
| GET | /users/:id | Authorization: Bearer token | 200 เฉพาะ user ตัวเอง |

Email normalize trim/lowercase; password 8–128 characters; self-registration ให้ role student เสมอ ยังไม่มี admin provisioning

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.test","password":"study-password"}'
curl -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.test","password":"study-password"}'
```

นำ token จาก login ใส่ `Authorization: Bearer <token>` เพื่อเรียก verify หรือ user API ส่วน service อื่นต้องเรียก Auth ทาง HTTP เพื่อ verify token ซึ่งเป็น opaque token ไม่ใช่ JWT

Errors: 400 INVALID_INPUT/INVALID_JSON, 401 INVALID_CREDENTIALS/INVALID_TOKEN, 403 FORBIDDEN, 409 EMAIL_ALREADY_EXISTS, 413 PAYLOAD_TOO_LARGE, 429 TOO_MANY_REQUESTS

## Tests และ Docker

`tests/auth.test.cjs`: unit cases สำหรับ validation, role, duplicate/concurrent registration, login และ expiry; `tests/api.test.cjs`: HTTP integration, authorization, JSON errors และ throttling ใช้ Node test runner + Supertest ไม่ใช่ E2E ทั้ง 5 services

```bash
docker compose up -d --build --wait
curl --fail http://localhost:3001/health
docker compose down
```

Dockerfile multi-stage ใช้ non-root user และ healthcheck; Compose bind host เฉพาะ loopback

CI: `.github/workflows/member1-ci.yml` ทำ install → typecheck → tests → Docker build → container health check ยังต้อง push และดูผล remote run จึงจะถือว่า CI verified

## ข้อจำกัดของรุ่นทดลอง

Users/sessions อยู่ใน memory และหายเมื่อ restart ไม่มี shared persistence/หลาย replicas; เก็บ password ด้วย salted scrypt และเก็บเฉพาะ token digest ฝั่ง server จำกัด `/auth/register` และ `/auth/login` รวม 30 requests/min/IP; `/auth/verify` ใช้ budget แยก 300 requests/min/IP ด้วย per-process store สำหรับ demo เท่านั้น ก่อนใช้งานจริงต้องมี database, shared rate limiter, HTTPS, session lifecycle และ admin provisioning

## แหล่งอ้างอิงวิชา

- `deploy2-2/งานกลุ่ม.pdf` หน้า 1: API authentication, PM test specs, unit tests, automation และ registry release
- `deploy2-2/สำเนาของ part2.pdf` หน้า 9–13: Express/TypeScript starter, nodemon, tsc build และส่วน GitHub Actions
- `deploy2-2/สำเนาของ software testing.pdf`: requirement/test traceability และ unit/integration/automation testing
- part3/part4: Docker และการ publish/deploy; implementation นี้ยังไม่ publish image
- Starter `tsconfig.zip`: ใช้ tsconfig.json เดิม; เปลี่ยน nodemon เป็น Node watch mode เพื่อเลี่ยง vulnerable dependency

ดู [Test spec](test-spec.md) และ [PM plan](pm-plan.md)

## Registry release ที่เตรียมไว้

`member1-release.yml` trigger เฉพาะ tag `member1-vX.Y.Z` แล้ว typecheck/tests/container smoke ก่อน publish image `ghcr.io/<owner-lowercase>/unireserve-auth:X.Y.Z` ผ่าน GITHUB_TOKEN ไม่ต้อง hardcode credentials

ยังไม่สร้าง/push tag หรือ publish image ต้องยืนยัน release commit และอนุญาต publication ก่อน Package visibility ของ GHCR ต้องตรวจแยกจาก repository visibility

ผลตรวจล่าสุด: [Local verification](verification.md)
