# PM deployment plan — Tle

Confirmed source: งานกลุ่ม.pdf หน้า 1 requires API/login, test specs and unit tests at least group size, remote repository, automation to registry release and participation.

1. ทุกคนพัฒนาใน branch ของตน โดย Tle รับ member1; ยังไม่กำหนด mapping member2–5 กับรายชื่ออื่น
2. ทุก service ตกลง HTTP contracts และ test data แล้ว build/test independently
3. Tester รวม Robot Framework flow ตาม docs/test-spec.md เมื่อ dependencies พร้อม
4. Member1 CI ตรวจ tests/build/container; เพิ่ม group integration workflow หลังอีก 4 services พร้อม
5. Release version เช่น v1.0.0 เมื่อ tests ผ่านบน source commit; build/publish 5 images ไป Docker Hub/GHCR ผ่าน automation
6. ตรวจ image tags, digests, registry visibility และเก็บ CI/test evidence ก่อนส่งงาน

Registry namespace, credentials และ release workflow ต้องกลุ่มตกลงก่อน ยังไม่มี release หรือ registry publication ในงานส่วนนี้
