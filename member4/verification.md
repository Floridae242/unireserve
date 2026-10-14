# Local verification — 2026-10-14

Branch: folk; executed on local working tree (not committed). Node 24.15.0, Docker 29.8.2.

| Check | Result |
|---|---|
| npm run typecheck | Passed |
| npm test | 13 passed: 7 unit, 6 HTTP (Auth/Resource stubbed, fake HTTP servers for clients) |
| npm audit | 0 vulnerabilities reported |
| docker compose up -d --build --wait | Image built; container healthy; runs as user `node` |
| Booking container + member1 Auth + member2 Notification containers, fake Resource on host port 3003 | create 201; overlap 409; back-to-back 201; start >= end 400; inactive 409; unknown 404; 4 concurrent same-slot requests gave 201,409,409,409 |
| Same environment, access checks | other user 403; student on admin list/closures 403; fake token 401 |
| Same environment, notifications | owner cancel 200; member2 lists BOOKING_CREATED and BOOKING_CANCELLED for the booking |
| Notification container stopped | booking still 201 (notification failure logged) |
| Fake Resource stopped / Auth container stopped | 503 RESOURCE_UNAVAILABLE / 503 AUTH_UNAVAILABLE |
| docker compose down (member1, member2, member4) | Containers/networks removed |
| GitHub Actions Member4 Booking CI on f9dbb8a | Success: [run 38583766557](https://github.com/Floridae242/unireserve/actions/runs/38583766557) |

Not verified: real member3 Resource (contract proposed, not implemented), admin flow against real Auth (no admin provisioning yet), Robot Framework suites, persistence across restarts.
