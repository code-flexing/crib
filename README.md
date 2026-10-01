# SafeCrib

SafeCrib is organized as a monorepo with separate frontend and backend projects.

## Projects

- [`safecrib-frontend/`](safecrib-frontend/): Next.js web application and Cloudflare deployment configuration. See its [README](safecrib-frontend/README.md) for frontend setup and workflows.
- [`safecrib-backend/`](safecrib-backend/): backend repository snapshot. The NestJS application is currently in [`safecrib-backend/safecrib-backend/`](safecrib-backend/safecrib-backend/), with its own README, API docs, and package scripts.

## Start locally

Frontend:

```sh
cd safecrib-frontend
npm install
npm run dev
```

Backend:

```sh
cd safecrib-backend/safecrib-backend
npm install
npm run start:dev
```

The backend requires its configured services and environment variables. See its [README](safecrib-backend/README.md) and [environment example](safecrib-backend/safecrib-backend/.env.example) before starting it.

The backend source was imported into this monorepo without its standalone `.git` metadata. The existing SafeCrib repository history remains at the monorepo root.