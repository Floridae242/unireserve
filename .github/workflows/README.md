# Member1 workflows

- member1-ci.yml: Tle/main/PR changes for member1; typecheck, tests, Docker build and health smoke
- member1-release.yml: member1-vX.Y.Z tags; tests and container smoke before GHCR publication

ยังไม่ execute บน GitHub และยังไม่ publish registry release ส่วน group-wide integration/release ยังต้องเพิ่มเมื่อครบ 5 services
