# API overview

Base URL in development is typically `http://localhost:3000` (or the port set by `PORT`). JSON request bodies are expected where noted.

## Auth — `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Create an account; returns user summary and access token; sets refresh cookie. |
| `POST` | `/login` | Authenticate; returns user summary and access token; sets refresh cookie. |
| `GET` | `/me` | **Requires auth.** Returns profile fields for the current user. |
| `PUT` | `/me` | **Requires auth.** Partial update of user fields (`username`, `email`, `display_name`, optional `password`). |
| `POST` | `/refresh` | Use refresh cookie to obtain a new access token (and rotated refresh). |
| `POST` | `/logout` | Revoke the current refresh session and clear the cookie. |

Protected routes expect: `Authorization: Bearer <access_token>`.

## Characters — `/api/characters`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List catalog characters (ordered by type then name). Optional `type` filter via query string. |
| `GET` | `/:id` | Single character including flavor text and wiki link key. |

## Scripts — `/api/scripts`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Public listing of community scripts (`is_official = false`), newest first, limited batch. |
| `GET` | `/base-scripts` | Listing of official/base scripts (`is_official = true`). |
| `GET` | `/my_scripts` | **Requires auth.** Scripts owned by the current user. |
| `GET` | `/search?q=...` | Name search (`ILIKE`) with escaping and max length guard. |
| `POST` | `/` | **Requires auth.** Create a script from an ordered list of character names; writes `script_characters.sort_order`. |
| `GET` | `/:id` | Script metadata plus ordered characters. |
| `PUT` | `/:id` | **Requires auth.** Update a script if you own it; rewrites linked characters in order. |
| `DELETE` | `/:id` | **Requires auth.** Delete a script if you own it. |

## Games — `/api/games`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/current_game` | **Requires auth.** Returns the user’s active lobby/in-progress game (storyteller or player), if any. |
| `POST` | `/` | **Requires auth.** Create a game; returns `game_id` and unique `invite_code`. |
| `POST` | `/join` | **Requires auth.** Join a game by `invite_code`. |
| `POST` | `/:id/leave` | **Requires auth.** Remove yourself from a game roster. |
| `PATCH` | `/:id` | **Requires auth.** Storyteller-only update of game fields (`script_id`, `name`, `phase`, `day_number`, `status`). |
| `PATCH` | `/:gameID/player/:playerID` | **Requires auth.** Storyteller-only update of a player row (character, seat, life/vote state, notes, alignment). `:playerID` is the player **user id**. |
| `GET` | `/:id` | **Requires auth.** Game snapshot. Response is richer for storyteller (includes reminders and private fields) and reduced for players. |
| `GET` | `/:id/reminders` | **Requires auth.** Storyteller-only list of reminder definitions available from the game’s active script. |
| `POST` | `/:id/reminders` | **Requires auth.** Storyteller-only place a reminder token on a target player (`reminder_token_id`, `player_id`, optional `text`). |
| `DELETE` | `/:id/reminders` | **Requires auth.** Storyteller-only remove a placed reminder token (`reminder_token_id` in request body). |
| `DELETE` | `/:id` | **Requires auth.** Storyteller-only end/delete game. |

## Socket.IO events (game rooms)

The server uses room names `game:{game_id}` and emits lightweight event payloads:

- `game:created`
- `game:player_joined`
- `game:player_left`
- `game:state_updated` (includes `updated_by`)
- `game:ended`
- `game:joined` and `game:left` on socket join/leave flow

