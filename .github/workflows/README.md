# Workflows

- member1-ci.yml: Tle/main/PR changes for member1; typecheck, tests, Docker build and health smoke
- member1-release.yml: member1-vX.Y.Z tags; tests and container smoke before GHCR publication
- member2-ci.yml: phlu/main/PR changes for member2; typecheck, tests, Docker build and health smoke
- member4-ci.yml: folk/main/PR changes for member4; typecheck, tests, Docker build and health smoke
- integration-tests.yml: member1/member2/automation-tests changes; runs Robot Framework suites in Docker against Auth + Notification and uploads the report

ยังไม่ execute บน GitHub และยังไม่ publish registry release ส่วน group-wide integration/release ยังต้องเพิ่มเมื่อครบ 5 services
