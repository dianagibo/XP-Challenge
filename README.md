# XP Challenge

XP Challenge is a family gamification application designed to encourage positive habits, autonomy and shared growth.

## Requirements

- Node.js 20 or newer
- MongoDB 7+ locally or a MongoDB Atlas database

## Local configuration

Copy `.env.example` to `.env` and replace every placeholder. Generate a long session secret, for example with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env` or real passwords.

## Create the initial family accounts

The seed creates or updates Diana, Sofi and Mom in MongoDB. Passwords are hashed with bcrypt before storage.

```bash
npm install
npm run seed
```

The seed is idempotent, so it can safely be run again to update the initial passwords.

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Current increment

US-01 introduces database-backed users, family memberships and roles, hashed passwords, MongoDB-backed sessions, login throttling, CSRF protection, protected routes and logout. Game progress remains demo data until the next stories connect the dashboard and activities to MongoDB.
