# Local verification — 2026-10-14

Branch: phlu; executed on local working tree (not committed). Node 24.21.0, Docker 29.8.2.

| Check | Result |
|---|---|
| npm run typecheck | Passed |
| npm test | 9 passed: 5 unit, 4 HTTP (Auth stubbed / fake server) |
| npm audit | 0 vulnerabilities reported |
| Node processes: member1 Auth + member2 | register/login → create 201 → list own 200, other 403, fake token 401 |
| docker compose up -d --build --wait | Image built; container healthy; runs as user `node` |
| Container ↔ member1 Auth container (host port 3001) | create 201, list own 200, other user 403 |
| Auth container stopped | GET list → 503 AUTH_UNAVAILABLE |
| docker compose down | Containers/networks removed |

Not verified: remote GitHub Actions run, Booking → Notification call (Booking not implemented), Robot Framework suites, persistence across restarts.
