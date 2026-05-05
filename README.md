# Blood on the Clocktower — API (portfolio)

This repository is a **portfolio backend** (plus a **React** UI in `client/`) built to demonstrate practical skills in **Node.js**, **Express**, and **PostgreSQL**. It powers a web-style API for hosting and managing *Blood on the Clocktower*–style games: accounts, character data, custom scripts, and game sessions with storyteller-oriented controls. **[How the backend and client fit together over time](#project-timeline)** is summarized at the end of this README.

---

## How this project was built

I started with a **detailed written prompt** describing the product I wanted (architecture, data model, API shape, and real-time ideas). I used an **AI agent** to turn that into a structured project plan I could follow, and change during implementation where it made sense: [botc-project-plan.md](./botc-project-plan.md). **I implemented the backend myself.**

For the server code specifically, I **did not use an AI agent to write implementation for me**. Instead I:

- **Learned from videos and docs** on topics such as Express patterns, Knex migrations, PostgreSQL design, and JWT-based auth.
- Used **Cursor in Ask mode** the way I would use a senior engineer: to **compare approaches**, **sanity-check decisions**, and **review code I had already written**—not to author the codebase.

While building this out, I used **Postman** against a locally running server to hit each route, carry cookies and bearer tokens correctly, and confirm responses matched what I intended. I used **TablePlus** with a **local PostgreSQL** instance to **seed and inspect data**, run **ad hoc queries**, and double-check that rows and constraints looked right after migrations, seeds, and API calls—so I could trust both the database and the HTTP layer before moving on.

The result is code I can explain line by line and defend in an interview.

---

## Tech stack

- **Runtime:** Node.js (ES modules)
- **HTTP:** Express 5
- **Database:** PostgreSQL, accessed with **Knex** (migrations, query builder)
- **Auth:** `jsonwebtoken`, `bcrypt`, `cookie-parser`
- **Real-time:** `socket.io` (game rooms; used by the web client—see [timeline](#project-timeline))
- **Other:** `helmet`, `cors`, `dotenv`, `nanoid` (invite codes)

---

## Authentication (JWT) and why it is “industry shaped”

The API uses a **stateless access token** plus a **server-stored refresh session**, which is a common pattern for SPAs and mobile clients:

- **Access token (JWT)** — Short-lived. Returned in the JSON body on register/login/refresh. Sent by clients on protected routes via the `Authorization: Bearer <token>` header (verified in middleware).
- **Refresh token (JWT)** — Longer-lived. Issued on register/login/refresh and sent to the browser as an **HTTP-only cookie** (not readable from JavaScript, which mitigates XSS token theft). Cookie options include `sameSite`, `secure` in production, and a narrow `path` scoped to auth routes.
- **Refresh token storage** — Only a **SHA-256 hash** of the refresh JWT is stored in PostgreSQL (`refresh_tokens`), not the raw token. That way a database leak does not immediately expose usable refresh tokens.
- **Rotation** — On successful refresh, a **new** refresh token is issued and the **old** row is removed, which supports revocation and reduces replay window.
- **Passwords** — Hashed with **bcrypt** (12 rounds) before persistence.

Together this mirrors patterns you see in production APIs: short-lived access credentials, refresh handled via cookie + server-side tracking, and hashed secrets at rest.

---

## Database schema

Table layouts, enums, indexes, and relationships are documented in [schema.md](./schema.md) at the root of this repository. That file reflects what the **Knex migrations** define (users, characters, scripts, games, players, reminder definitions, etc.).

The **`script_characters`** join table stores a **`sort_order`** per row because a script is an **ordered list**: when someone creates or edits a script, the character names arrive in a sequence that matters for readability and for in-game tooling (for example, reminder definitions tied to the active script are ordered consistently). Relational joins alone do not guarantee that order, so the migration enforces it in the database and the API **returns characters in the same order they were saved**—typically by selecting with `ORDER BY sort_order`.

---

## API overview

The full, current endpoint list lives in [`api-overview.md`](./api-overview.md).

---

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables** — Create a `.env` file. You need PostgreSQL connection settings (see `knexfile.mjs`: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) plus JWT secrets and expiry settings used in `src/utils/jwt.js` (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`). Optional: `PORT`, `CORS_ORIGIN`, `NODE_ENV`.

3. **Migrations and seeds**

   ```bash
   npm run migrate:latest
   npm run seed
   ```

4. **Run the server**

   ```bash
   npm run dev
   ```

---

## Docker deployment

I added Docker support because I plan to host this project on my home server, with a Cloudflare Tunnel in front and Portainer as my main container management UI. The Docker setup is also useful for anyone cloning this repo who wants a one-command stack (Postgres + API + client) without manual local DB setup.

### What is containerized

- **Postgres** (`botc-db`) from the official `postgres:16` image
- **Backend API** (`botc-api`) from `Dockerfile.backend`
- **Frontend** (`botc-client`) from `client/Dockerfile.client` (Vite build served by Nginx)

The frontend Nginx config (`client/nginx.conf`) proxies both `/api` and `/socket.io` to the API container, so the browser can use one origin while still reaching Express + Socket.IO.

### Files involved

- `docker-compose.yml`
- `Dockerfile.backend`
- `client/Dockerfile.client`
- `client/nginx.conf`
- `.dockerignore`
- `.env.docker` (not committed; create your own)

### Quick start (for anyone cloning)

1. **Clone and enter the project**

   ```bash
   git clone <your-fork-or-repo-url>
   cd botc-node
   ```

2. **Create `.env.docker` at the project root**

   ```env
   PGUSER=botc_user
   PGPASSWORD=change_me_strong_password
   PGDATABASE=botc_db
   PGPORT=5432

   PORT=3000
   NODE_ENV=production
   CORS_ORIGIN=http://localhost:8080

   JWT_ACCESS_SECRET=replace_with_long_random_access_secret
   JWT_REFRESH_SECRET=replace_with_long_random_refresh_secret
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   ```

   Notes:
   - Compose interpolation in `docker-compose.yml` uses `${PGUSER}`, `${PGPASSWORD}`, `${PGDATABASE}`, so these keys must be present.
   - Use quotes around values if they include special characters (especially `#`).
   - `PGHOST` is set in compose to the service name `botc-db` for container networking.

3. **Build and start**

   ```bash
   docker compose --env-file .env.docker up -d --build
   ```

4. **Run migrations and seeds**

   ```bash
   docker compose --env-file .env.docker exec botc-api npm run migrate:latest
   docker compose --env-file .env.docker exec botc-api npm run seed
   ```

5. **Open the app**

   - Frontend: `http://localhost:8080`
   - API (direct): `http://localhost:3000`

### Day-2 commands

- Stop stack:

  ```bash
  docker compose --env-file .env.docker down
  ```

- Full reset (including DB volume):

  ```bash
  docker compose --env-file .env.docker down -v --remove-orphans
  ```

- Tail logs:

  ```bash
  docker compose --env-file .env.docker logs -f botc-db botc-api botc-client
  ```

### Home server + Portainer notes

- This compose setup can be deployed directly as a Portainer stack.
- You can deploy from:
  - a Git repo (Portainer builds with `build:`), or
  - prebuilt images in a registry (faster repeated deployments).
- With Cloudflare Tunnel, expose the frontend service through your tunnel/public hostname and set `CORS_ORIGIN` to that public frontend origin.
- Keep secrets in an env file that is **not** committed (for example `.env.docker` or `.env.production`), and store production values securely in Portainer/environment management.

---

## Project timeline

Work happened in two main phases: **the API and database first**, then **the web client** alongside **targeted changes to the server** where the UI needed new behavior or data.

### 1. Backend first

I designed and implemented **Express**, **Knex**, and **PostgreSQL** end to end—migrations, seeds, JWT auth, game and script routes, and validation against real HTTP and SQL—**without using a coding agent to write server code**. That phase is what [How this project was built](#how-this-project-was-built) describes: learning from docs and videos, Cursor in **Ask mode** for review and tradeoffs, Postman and TablePlus for verification. The portfolio goal here was **Node and Postgres depth**, not a polished UI.

### 2. Web client, then follow-on API work

After the backend was in place, I added the **`client/`** app: a **Vite + React** SPA (React Router) for registration/login, the character catalog, creating and editing scripts, joining games, and storyteller tooling (roster, phase, reminders, and related flows).

**How the client was built:** The **frontend is 100% vibe-coded in Cursor**. I **did not write the React/JSX/CSS myself**; I **deliberately and meticulously prompted** the agent **step by step** so the UI matched what I wanted, while keeping my own focus on the skills this repo is meant to showcase.

**Who changed the server in this phase:** Any **API, schema, or Socket.IO changes** made **while building or integrating the client** were **written by me**, not delegated to an agent. The backend remains work I can explain in detail.

**Socket.IO:** The server runs **Socket.IO** on the same HTTP server as Express (`src/index.js`). The browser connects with the same **access JWT** as REST, joins a room `game:{game_id}` via **`game:join`** after the user is a player or storyteller, and leaves with **`game:leave`**. Handlers emit **small notification events** to that room (`game:created`, `game:player_joined`, `game:player_left`, **`game:state_updated`** with `game_id` and `updated_by`, `game:ended`, etc.)—**not** full game payloads.

I chose **simplicity over fine-grained sync:** when the client hears one of these events for the game it is viewing, it **refetches the entire game** with **`GET /api/games/:id`** and replaces its snapshot, instead of pushing partial diffs over the socket. That reuses the same response shape as the initial load and avoids a second protocol to maintain. It is a good fit here because **players do not see a high rate of game-state changes** during a session. The client **skips** that refetch for **`game:state_updated`** when **`updated_by`** is the **current user**, since their own HTTP response already updated the UI.

**Run the client** (API should already be running; set `CORS_ORIGIN` to the Vite origin, e.g. `http://localhost:5173`):

```bash
cd client
npm install
npm run dev
```

Vite proxies `/api` and `/socket.io` to the API in development (`client/vite.config.js`).

---

## License

ISC (see `package.json`).
