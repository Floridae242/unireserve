# Auth test specification — Tle

| ID | Requirement | Scenario | Expected | Test |
|---|---|---|---|---|
| TS-AUTH-01 | REQ-AUTH-01 | register student; supplied role admin | 201 student, no password/hash | UT-AUTH-02, IT-AUTH-01 |
| TS-AUTH-02 | REQ-AUTH-01 | valid login | 200 token + expiresIn + user | UT-AUTH-05, IT-AUTH-01 |
| TS-AUTH-03 | REQ-AUTH-01 | wrong password / unknown email | 401 INVALID_CREDENTIALS | UT-AUTH-04 |
| TS-AUTH-04 | REQ-AUTH-01 | verify missing, altered or expired token | 401 INVALID_TOKEN | UT-AUTH-05, IT-AUTH-01 |
| TS-AUTH-05 | REQ-AUTH-01 | get another user's record | 403 FORBIDDEN | IT-AUTH-01 |
| TS-AUTH-06 | REQ-AUTH-01 | duplicate/concurrent registration | one created, others 409 | UT-AUTH-02/03 |
| TS-AUTH-07 | REQ-AUTH-01 | invalid input / malformed / oversized JSON | 400 / 413 | UT-AUTH-01, IT-AUTH-02 |
| TS-AUTH-08 | REQ-AUTH-01 | more than 30 auth requests/min/IP | 429 | IT-AUTH-03 |

Preconditions: fresh AuthService per test; dummy data; expiry uses injected clock. Tests belong to member1 only. Group-wide planned specs remain in ../docs/test-spec.md.
