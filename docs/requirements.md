# Requirements (proposed)

เอกสารนี้เป็นแผนจากรายงาน ยังไม่ใช่หลักฐานการทำงานหรือ rubric ที่ตรวจยืนยันแล้ว

| ID | Requirement | Acceptance criteria |
|---|---|---|
| REQ-AUTH-01 | Login | credentials ถูกต้องได้ token; ผิดได้ 401 |
| REQ-RES-01 | ดู resource | public/student list คืนเฉพาะ active resources |
| REQ-BOOK-01 | จอง | authenticated user จอง resource ที่ active ด้วย start < end ได้ 201 |
| REQ-BOOK-02 | ป้องกันเวลาซ้อน | resource เดียวกัน ช่วงเวลาซ้อนได้ 409 |
| REQ-NOTI-01 | แจ้งผลจอง | booking สำเร็จมี notification ผูกกับ booking และ user |
| REQ-REV-01 | Review | เจ้าของ booking ที่สิ้นสุดแล้วให้ rating 1–5 ได้ครั้งเดียว |

ทุก service ต้องตรวจ authentication/authorization ตาม endpoint ห้าม client กำหนด role admin เองหรืออ่านข้อมูลผู้ใช้อื่น

ต้องตกลงก่อน implement: persistence, token expiry, completion rule, notification failure handling และการจองพร้อมกัน
