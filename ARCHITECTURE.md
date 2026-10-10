# Architecture

The Spotify clone is three apps. The listener and the admin call one Express API. PostgreSQL stores catalog metadata. Cloudinary stores cover images and audio. The player streams those Cloudinary URLs in the browser.

Both front ends call `https://spotify-clone-backend-rctz.onrender.com` through the legacy `/api` routes. The layered `/v1` API exists alongside them; the front ends move to it in Phase 0 milestone M6, and `/api` is then removed.

The million-user target, with diagrams and a phased build order, is in [SCALING-PLAN.md](SCALING-PLAN.md). Phase 0 progress is tracked in [PHASE_0_PLAN.md](PHASE_0_PLAN.md).

## System

```mermaid
flowchart LR
  subgraph clients [Browsers]
    Player["spotify-clone<br/>PlayerContext"]
    Admin["spotify-admin<br/>Add / List pages"]
  end

  subgraph docker [docker compose]
    API["Express API<br/>/v1 and legacy /api"]
    DB[("PostgreSQL 16<br/>database: spotify")]
  end
  CDN["Cloudinary<br/>images and audio"]

  Player -->|"GET /api/.../list"| API
  Admin -->|"POST /add  POST /remove  GET /list"| API
  API -->|"Prisma"| DB
  API -->|"upload files, store secure_url"| CDN
  Player -->|"play audio and show images"| CDN
```

Tracks reference albums and artists by ID, with foreign keys. The legacy `/api` responses still put the album's **name** in each song's `album` field, because the listener's album page shows songs where `item.album === album.name`.

## Backend layers

```mermaid
flowchart LR
  Route["routes<br/>URL + middleware"] --> Controller["controller<br/>parse request, shape response"]
  Controller --> Service["service<br/>business rules"]
  Service --> Repo["repository<br/>Prisma queries"]
  Repo --> DB[("PostgreSQL")]
  Service -.->|"other modules only via their service"| OtherService["another module's service"]
```

| Module | Routes | Notes |
| --- | --- | --- |
| `health` | `/v1/health`, `/v1/ready` | Liveness never touches the database; readiness pings it |
| `auth` | `/v1/auth/*` | Sessions: register, login, refresh rotation, logout. Owns `refresh_tokens`; reads accounts through `usersService` |
| `users` | `/v1/me` | Accounts and profiles; enforces the last-admin rule |
| `admin` | `/v1/admin/users*` | No repository; combines `usersService`, `artistsService` and `authService` |
| `albums` | `/v1/albums`, `/:id`, `/:id/tracks` | Album totals come from `tracksService`; deleting an album with tracks returns 409 `ALBUM_HAS_TRACKS`; adding a track goes through here |
| `artists` | `/v1/artists`, `/:id`, `/:id/albums`, `/:id/top-tracks` | Owns the "Unknown Artist" placeholder and artist ownership (`artists.access.ts`) |
| `tracks` | `/v1/tracks`, `/:id` | New tracks get the next track number in their album; `forViewer` swaps in the guest preview |
| `search` | `/v1/search` | No repository of its own; asks each catalog service to search |
| `legacy` | `/api/song/*`, `/api/album/*` | Translates the old contract onto the services above; writes need an admin |

Shared pieces in `src/shared`: the Prisma client (`db.ts`), pino logger, `AppError` and error codes, the response envelope, cursor pagination, Zod validation, password hashing, token signing, temp-file cleanup and guest preview URLs. `src/middleware` holds the error handler (it maps `AppError`, Prisma, Multer and body-parser errors to the envelope without leaking stack traces, and deletes temp upload files on failure), uploads, rate limits, and authentication.

Two deliberate exceptions to the layer rules:

- `artists.access.ts` reads `artistsRepository` directly and is imported by the albums and tracks services. Going through `artistsService` would create an import cycle, because that service already uses theirs.
- `albumsRepository.reassignArtist` also updates `tracks.artist_id` in the same transaction. A track's artist must always equal its album's artist, and splitting the update across two services would lose atomicity.

### Authentication and authorization

```mermaid
sequenceDiagram
  participant App
  participant API
  participant DB as PostgreSQL
  App->>API: POST /v1/auth/login
  API->>DB: verify argon2id hash, insert refresh token (HMAC-SHA256 hash, new family)
  API-->>App: access JWT (15 min) in body, refresh token in httpOnly cookie (path /v1/auth)
  App->>API: GET /v1/... with Authorization: Bearer
  API->>DB: load role and disabled flag for the token's user
  App->>API: POST /v1/auth/refresh (cookie)
  API->>DB: revoke the presented token (only if still active), insert its successor in the same family
  Note over API,DB: a token that was already revoked means it was copied: the whole family is revoked
```

- `authenticate` requires a valid token. `optionalAuthenticate` lets guests through but still rejects a bad token, so clients refresh instead of silently getting guest data. `requireRole(...)` is `authenticate` plus a role check: 401 for guests, 403 for other roles.
- Ownership is checked in services (`assertCanManageArtist`), not in routes, because it needs the database.
- The access token carries only the user ID. Role changes and disabling apply on the next request, at the cost of one indexed lookup per authenticated request.
- Rate-limit counters are in memory and per instance. Phase 1 moves them to Redis.

### Pagination

Lists fetch `limit + 1` rows. The extra row only signals another page. `meta.nextCursor` is base64url JSON holding the last row's ID, which Prisma uses as a keyset cursor. IDs are UUIDv7, so they sort by creation time. Search pages by offset, since its order is by relevance.

### Search

`pg_trgm` GIN indexes on `tracks.title`, `albums.title`, and `artists.name` back two conditions: `ILIKE '%q%'` for substrings, and `q <% column` (word similarity of at least 0.6) for typos such as "midnite" finding "Midnight Drive". Results are ordered by word similarity, then whole-string similarity.

## Data model

```mermaid
erDiagram
  USERS ||--o{ REFRESH_TOKENS : has
  USERS ||--o| ARTISTS : "may own"
  USERS ||--o{ PLAYLISTS : owns
  USERS ||--o{ LIKED_TRACKS : likes
  USERS ||--o{ PLAY_HISTORY : plays
  ARTISTS ||--o{ ALBUMS : releases
  ARTISTS ||--o{ TRACKS : performs
  ALBUMS ||--o{ TRACKS : contains
  PLAYLISTS ||--o{ PLAYLIST_TRACKS : includes
  TRACKS ||--o{ PLAYLIST_TRACKS : "appears in"
  TRACKS ||--o{ LIKED_TRACKS : "liked by"
  TRACKS ||--o{ PLAY_HISTORY : "played as"
```

The full schema is [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). Delete behaviour is deliberate: albums and tracks are `RESTRICT`, so an album with tracks and an artist with albums cannot be deleted; user-owned rows such as playlists, likes, and history cascade. Check constraints in the first migration keep emails lowercase, track numbers positive, and volume between 0 and 100. `legacy_mongo_id` on albums and tracks traces rows back to MongoDB and is dropped in Phase 1.

## Code map

```text
Spotify-clone/
├── docker-compose.yml      postgres, api; pgadmin + mailpit (profile dev); mongo (profile migration)
├── docker/                 postgres init (creates spotify_test), pgadmin server list
├── spotify-clone/          Listener UI
│   └── src/
│       ├── main.jsx        Router + PlayerContextProvider
│       ├── App.jsx         Sidebar, Display, Player, audio element
│       ├── context/PlayerContext.jsx
│       └── components/     Display, DisplayHome, DisplayAlbum, Player, Sidebar, Navbar
├── spotify-admin/          Catalog admin
│   └── src/
│       ├── App.jsx         Sidebar routes and API base URL
│       ├── components/     Sidebar, Navbar
│       └── pages/          AddSong, ListSong, AddAlbum, ListAlbum
└── backend/
    ├── Dockerfile          dev target (tsx watch) and runtime target (compiled, non-root)
    ├── prisma/             schema and migrations
    ├── scripts/            legacy backup and Mongo-to-Postgres migration
    ├── test/               integration tests
    └── src/
        ├── server.ts, app.ts
        ├── config/         env (Zod-validated), cloudinary
        ├── shared/         db, logger, errors, response, pagination, validate, search
        ├── middleware/     error-handler, upload
        └── modules/        health, albums, artists, tracks, search, legacy
```

| App | Stack | Role |
| --- | --- | --- |
| `spotify-clone` | React 18, React Router 6, Axios, Tailwind | Browse and play |
| `spotify-admin` | React 18, React Router 6, Axios, MUI, Toastify, Tailwind | Add and remove catalog items |
| `backend` | Express 5, TypeScript, Prisma 6, PostgreSQL 16, Zod, pino, helmet, Multer, Cloudinary | Persist metadata and files |

## Playback

`PlayerContext` owns songs, albums, the current track, play state, and seek time. Every playback control reads that context.

```mermaid
sequenceDiagram
  participant UI as App
  participant Ctx as PlayerContext
  participant API as Express
  participant CDN as Cloudinary

  UI->>Ctx: mount
  Ctx->>API: GET /api/song/list
  Ctx->>API: GET /api/album/list
  API-->>Ctx: songs and albums
  Ctx-->>UI: songsData, albumData, first track
  UI->>UI: render home rows
  Note over UI: user clicks a song card or an album track
  UI->>Ctx: playWithId(id)
  Ctx->>Ctx: setTrack(selected song)
  Ctx->>CDN: audio.src = track.file
  CDN-->>UI: audio stream
  UI->>UI: timeupdate moves the seek bar
```

| Step | Where | What happens |
| --- | --- | --- |
| 1 | `main.jsx` | Wraps the tree in `BrowserRouter` and `PlayerContextProvider`. |
| 2 | `PlayerContext` | Loads both lists and sets the first song as `track`. |
| 3 | `App` | After songs arrive, renders the sidebar, display, player, and a hidden `<audio>` tag. |
| 4 | `/` | Albums in “Featured Charts”. Songs in “Today's biggest hits”. |
| 5 | `/album/:id` | Gradient from `bgColor`. Track list filtered by album name. Row click calls `playWithId`. |
| 6 | `Player` | Play, pause, next, previous, and seek drive the audio element. |

## Upload

Admin writes use `multipart/form-data`. Multer checks file type and size and writes to the OS temp folder under a random name. The service uploads to Cloudinary, stores the URLs in PostgreSQL, and deletes the temp files.

```mermaid
sequenceDiagram
  participant Admin as Add Song form
  participant API as POST /api/song/add
  participant CDN as Cloudinary
  participant DB as PostgreSQL

  Admin->>API: name, desc, album name, image, audio
  API->>DB: find exactly one album with that name
  API->>CDN: image as image, audio as video
  CDN-->>API: secure_url and duration
  API->>DB: insert track (duration_ms, next track_number)
  DB-->>Admin: 201, success true
```

| Admin route | Page | API |
| --- | --- | --- |
| `/add-album` | `AddAlbum` | `POST /api/album/add` |
| `/list-album` | `ListAlbum` | `GET /api/album/list`, `POST /api/album/remove` |
| `/add-song` | `AddSong` | `POST /api/song/add` |
| `/list-song` | `ListSong` | `GET /api/song/list`, `POST /api/song/remove` |

Deleting a song or album removes the database row and leaves the Cloudinary file in place.

## Decisions recorded for Phase 0

| Question | Decision |
| --- | --- |
| Backend language | TypeScript |
| Can guests play music? | 30-second preview through Cloudinary's `du_30` transformation on every `/v1` track response. Legacy lists keep full URLs until M6. Not DRM: the full file stays public until Phase 2. |
| Legacy write routes once accounts exist | Admin only (the old admin app regains writes when it gets sign-in in M6) |
| Refresh token storage | httpOnly cookie scoped to `/v1/auth`; rotated on every use; stored as an HMAC so a database leak alone cannot replay tokens |
| Deleting an album that has tracks | Blocked with 409 `ALBUM_HAS_TRACKS` |
| Old songs without an artist | Placeholder "Unknown Artist", fixed later in the admin app |
