<!-- @format -->

@AGENTS.md

# Claude Code Project Guidelines

## Persona and Explanation Style

- Target Audience: Explain concepts as if I am completely new to programming.
- Style: Use simple, plain English, short sentences, and everyday analogies.
- Process: Break down complex logic into small, sequential, step-by-step pieces.

## Token Optimization Rules (Strict)

- Answer Budget: Keep all non-code explanations under 150 words.
- Zero Filler: Eliminate pleasantries (e.g., "Certainly!", "Hope this helps!"). Start directly with the answer.
- Context Awareness: Do not re-read files unless explicitly instructed or if contents have changed.
- Concise Code: When showing edits, only output the specific lines changing. Do not reprint unchanged blocks.

Here is the last compact I ran:

## DuoCanvas — Session Continuity Notes

### Architecture

- React Native (Expo) + Supabase. No auth — identity is a UUID stored in `expo-secure-store` (keychain-backed).
- `lib/userId.ts`: persistent device ID (`duocanvas-user-id` key in SecureStore).
- `lib/displayName.ts`: cosmetic screen name (`duocanvas-display-name` key). Separate from identity so renaming doesn't break history.
- `lib/rooms.ts`: all Supabase room operations (create, join, history, delete, rename, membership).

### Database Tables (Supabase)

- `rooms`: `id` (uuid), `name` (text, default 'Untitled Canvas'), `created_at`
- `strokes`: `room_id` → rooms (cascade delete)
- `room_members`: `room_id`, `user_id`, `display_name`, `joined_at` — tracks which device joined which room
- pg_cron job deletes rooms older than **7 days** (not 24h)
- RLS policies: open access (anyone with room UUID can read/write/delete/update)

### SQL migrations run (in `supabase/` folder as reference)

All of these have already been applied to Supabase:

- `schema.sql` — base rooms + strokes tables
- `expiry.sql` — pg_cron 7-day cleanup
- `room_members.sql` — membership table
- `delete_room.sql` — delete policy on rooms
- `room_details.sql` — adds `name` column to rooms, `display_name` to room_members, update policy

### Key UI flows

- Gate screen → Create room (names it `"${displayName}'s Canvas"`) or Join by code → Canvas screen
- Canvas header: back chevron (top-left) | canvas name + member names (center, tap to rename via Alert.prompt) | share icon (top-right, native iOS share sheet)
- History button at bottom of gate screen → RoomHistory component (FlatList, tap to rejoin, trash to delete)
- First launch: prompted for screen name before gate screen

### Widget snapshot fix

`<Canvas key={roomId} .../>` — the `key` prop forces a fresh mount per room, resetting `hasPushedInitialSnapshotRef` so the widget always reflects the most recently opened canvas.

### Security

- `.env` holds Supabase keys — gitignored, never paste in chat
- No login needed; UUID unguessability is the access model
