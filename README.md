# Honk Messaging App

Honk is a playful courier-themed messaging experience built with Next.js and Supabase. This repository contains both the real-time messaging interface and the supporting API routes that power device-to-device delivery, leaderboard stats, and notification flows.

## Project Structure

- `app/` – Route handlers, server components, and API endpoints.
- `src/` – Client components, hooks, contexts, and service layer.
- `public/` – Static assets such as sprites and audio.
- `data/` – Local SQLite database used during development.

## Seamless Courier ID Authentication

Traditional email/password login has been retired in favor of automatic Courier IDs. When a visitor arrives, the client bootstraps their session by collecting non-identifying device characteristics (user agent, viewport size, locale, etc.) and posting them to the `/api/auth/device` endpoint. The server either finds an existing user whose device fingerprint matches or provisions a new courier with a secure 32-character identifier. A JSON Web Token (JWT) tied to that courier ID is returned and stored in both cookies and `localStorage` so the session survives reloads.【F:src/contexts/AuthContext.tsx†L49-L119】【F:app/api/auth/device/route.ts†L1-L56】

On subsequent visits, the auth context first verifies any stored token. If the token is invalid or missing, it transparently repeats the device bootstrap flow so the user never sees a login form. The courier ID itself is surfaced in the UI for copying, which allows support staff or other devices to recognize the account.【F:src/contexts/AuthContext.tsx†L32-L207】【F:src/components/form-auth.tsx†L1-L99】

### Linking Additional Devices

Users can pair a second device by requesting a six-digit link code from `/api/auth/generate-code`. Entering that code on another device posts to `/api/auth/link-device`, which verifies that the code is active, marks it as used, and issues a new JWT for the requesting hardware. Behind the scenes the service updates the stored device fingerprint so returning devices are recognized instantly in the future.【F:app/api/auth/generate-code/route.ts†L1-L33】【F:app/api/auth/link-device/route.ts†L1-L59】【F:src/services/seamlessAuth.ts†L63-L176】

### Why Courier IDs?

Courier IDs are deterministic enough to reconnect a returning visitor, but random enough to avoid leaking personal information. They are derived from UUIDs with extra entropy, hashed, and truncated before being stored. This keeps identifiers opaque while still allowing us to display a friendly handle (for example `User1234abcd`) in the interface.【F:src/services/seamlessAuth.ts†L33-L112】

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and provide the required secrets (JWT secret, Supabase keys, etc.).
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Visit [http://localhost:3000](http://localhost:3000) to use the app.

The default SQLite database in `data/demo.db` is migrated automatically the first time you hit an auth endpoint.

## Testing & Linting

- `npm run lint` – Run ESLint across the monorepo (currently fails due to pre-existing issues).
- `npm run test` – Execute the Vitest unit test suite.

## Deployment

Deployments require setting the same environment variables used in development. The API routes run within the Next.js server runtime, so no separate backend service is needed.
