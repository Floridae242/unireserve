# Docker Hub release

The `Docker Hub Release` workflow runs when a stable GitHub Release is published
with a tag such as `v1.0.0`. It tests all six services, builds and smoke-tests the
complete application, then publishes Linux amd64 and arm64 images to Docker Hub.
A failed verification prevents publication. Publishing images is not atomic; if
one image fails, rerun failed jobs before announcing the release as ready.

## Maintainer setup

- Public repositories: `floridae/unireserve-{auth,notification,resource,booking,review,frontend}`.
- GitHub Actions secret: `DOCKERHUB_TOKEN` with Docker Hub Read & Write permission.
- Publish a GitHub Release from the reviewed main commit with a stable `vX.Y.Z` tag.
- Wait for all release jobs to pass. The workflow attaches the Compose file and environment template.
- For versions after v1.0.0 set `UNIRESERVE_VERSION` to the desired release tag.

## Run on another computer

Download `compose.release.yaml` and `.env.example` from the release into one folder.
Copy `.env.example` to `.env` and set a strong `ADMIN_PASSWORD` and random `SERVICE_KEY`.
Set `ADMIN_EMAIL` for your own admin account. Never commit or share `.env`.

```sh
cp .env.example .env
# Edit .env before continuing.
docker compose -f compose.release.yaml pull
docker compose -f compose.release.yaml up -d --wait
```

Open http://localhost:3000. If changing FRONTEND_PORT, change APP_ORIGIN to match.
All backend services remain internal to the Docker network.

```sh
docker compose -f compose.release.yaml down
```

Data is in memory: restarting backend containers removes accounts, bookings,
notifications and reviews. This release is a coursework demonstration, without
persistent storage. Admin is recreated from environment settings at startup.
