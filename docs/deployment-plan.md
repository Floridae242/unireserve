# Deployment plan (not implemented)

## CI

PR/main → install จาก lockfile → type-check/build → unit tests ทั้ง 5 → Docker build → Compose health checks → Robot integration tests → upload reports

ใช้ matrix ต่อ service และ separate integration job; teardown containers แม้ tests ล้มเหลว

## Release

Tag v1.0.0 → ตรวจ source commit ด้วย tests → build 5 images → publish Docker Hub หรือ GHCR → GitHub Release

ยังไม่เลือก registry และยังไม่มี credentials/workflows/images/releases ใช้ GitHub Secrets และ minimum permissions เมื่อ implement

## Evidence checklist

- [ ] 5 services build/test ได้อิสระ
- [ ] Authentication และ business flow ทำงาน
- [ ] Unit และ Robot integration reports
- [ ] Docker Compose runtime/health evidence
- [ ] GitHub Actions success สำหรับ release commit
- [ ] 5 images มี version tags ใน registry
- [ ] Release version และ notes ตรงกับ source commit

Azure เป็น optional ตามรายงาน ต้องตรวจ rubric ต้นฉบับหรือคำสั่งเพิ่มเติมก่อนสรุป
