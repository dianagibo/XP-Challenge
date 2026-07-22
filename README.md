# XP Challenge

XP Challenge is a private family application for missions, approvals, XP, coins, rewards, recurring responsibilities, achievements and weekly goals.

## Requirements

- Node.js 20 or newer
- MongoDB Atlas or MongoDB 7+

## Run locally

Copy `.env.example` to `.env`, replace every placeholder and run:

```bash
npm ci
npm run seed
npm run check
npm run dev
```

Open `http://localhost:3000`. Generate a session secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env`, database credentials or family passwords.

## Production deployment on Render

The repository includes `render.yaml`. In Render, create a Blueprint from the GitHub repository and use `main` as the production branch. Configure these secret environment variables:

- `MONGODB_URI`: Atlas connection string for a dedicated application database user.
- `SESSION_SECRET`: generated automatically by the Blueprint, or a random value of at least 32 characters.

`NODE_ENV=production`, `npm ci`, `npm start` and `/health` are already configured. The health endpoint returns HTTP 200 only while MongoDB is connected.

### MongoDB Atlas

1. Create a dedicated database user with access only to the XP Challenge database.
2. Add Render's outbound range to Atlas Network Access when a stable range is available. For the free Render plan, `0.0.0.0/0` may be required; use a strong unique password and replace this rule when moving to fixed egress.
3. Put the Atlas URI only in Render's secret `MONGODB_URI` variable.
4. Do not place seed passwords in the permanent web-service environment.

### Seed production once

Before the first family login, run `npm run seed` once from a trusted local terminal using the production `MONGODB_URI` and temporary `SEED_*_PASSWORD` values. Remove those values immediately afterward. The seed is idempotent, but running it again resets the three passwords.

### Spanish localization migration

For an existing database created before US-12, run this command exactly once from a trusted local terminal with its `MONGODB_URI`:

```bash
npm run migrate:spanish
```

The migration is idempotent. It only renames the original `Mom` user to `Mamá` and the default family name to `Familia XP Challenge`. It does not change usernames, passwords, missions, balances, achievements, rewards or history. Do not run the seed again for localization.

### Release checklist

1. Confirm the Render deploy is green and `/health` returns `{"status":"ok","database":"connected"}`.
2. Sign in as Diana, Sofi and Mom using a private browser window for each role.
3. Create a mission, submit it, request changes, resubmit and approve it.
4. Confirm XP/coins, achievements and weekly-goal progress.
5. Redeem a reward and mark it delivered.
6. Pause and reactivate a recurring mission.
7. Confirm logout works for every role on desktop and mobile.
8. Confirm unknown routes and unexpected errors do not expose stack traces.

If a release fails, roll back to the previous successful Render deploy. Database records are retained; do not rerun the seed as a rollback step.

## Production behavior

- HTTPS-only, HTTP-only session cookies behind Render's trusted proxy.
- MongoDB-backed sessions and login rate limiting.
- CSRF validation on state-changing requests.
- Graceful HTTP and database shutdown on deploy or restart.
- No public registration or password recovery.
