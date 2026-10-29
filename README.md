# KKM Games backend (Express + MongoDB Atlas)
Local: `npm install`, copy `.env.example` to `.env` and fill it in, `npm run check-db`, `npm start` -> http://localhost:5000 (health check at `/`).
Vercel: see the deployment steps in the chat. Environment variables: MONGODB_URI, JWT_SECRET, STARTING_POINTS, CLIENT_ORIGIN.

API
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/auth/check-id?id= | no | is this player ID valid and free? |
| POST | /api/auth/register | no | name, playerId, password |
| POST | /api/auth/login | no | playerId, password |
| GET | /api/auth/me | yes | current user |
| PUT | /api/profile | yes | name, description |
| POST | /api/points | yes | add points (1-500) |
| POST | /api/shop/buy | yes | kind (avatar/banner), id |
| POST | /api/shop/equip | yes | kind, id |
| GET | /api/leaderboard | no | top 50 by points |
| GET | /api/players/search?q= | no | find players by ID or name |
| GET | /api/players/:playerId | no | one profile + rank |

Accounts from the old email login are upgraded to player IDs automatically on the first request (see the logs).
