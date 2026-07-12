# YouTube Sync Function Setup

## Channels

| Channel | Channel ID | Uploads playlist ID |
|---------|------------|---------------------|
| @DCCIMinistries | `UCf0MDB_oF7huA78BNADx9sQ` | `UUf0MDB_oF7huA78BNADx9sQ` |
| @HatunTashDCCIMinistries | `UCy5H0uunC2qMk0iOF4SHKUw` | `UUy5H0uunC2qMk0iOF4SHKUw` |

## Setup Instructions

### Option 1: Local Development (using .env file)

1. Create a `.env` file in the `functions` directory:
```bash
cd functions
touch .env
```

2. Add your configuration to `.env`:
```env
YOUTUBE_API_KEY=your_youtube_api_key_here
YOUTUBE_UPLOADS_PLAYLIST_IDS=UUf0MDB_oF7huA78BNADx9sQ,UUy5H0uunC2qMk0iOF4SHKUw
YOUTUBE_AUTHOR_EMAIL=your_email@example.com
YOUTUBE_AUTHOR_ID=your_author_id_here
YOUTUBE_BACKFILL_TOKEN=a-long-random-secret
```

Legacy single-playlist env still works: `YOUTUBE_UPLOADS_PLAYLIST_ID=...`

3. Install dependencies (if not already done):
```bash
npm install
```

**Note:** The `.env` file is already in `.gitignore` and will not be committed to version control.

### Option 2: Production (using Firebase Functions Config)

After deploying the code change, set multi-playlist config (keeps the same API key):

```bash
firebase functions:config:set youtube.uploads_playlist_ids="UUf0MDB_oF7huA78BNADx9sQ,UUy5H0uunC2qMk0iOF4SHKUw"
```

If the API key / author / backfill token are not already set:

```bash
firebase functions:config:set youtube.api_key="YOUR_EXISTING_YOUTUBE_API_KEY"
firebase functions:config:set youtube.author_email="your_email@example.com"
firebase functions:config:set youtube.author_id="your_author_id_here"
firebase functions:config:set youtube.backfill_token="a-long-random-secret"
```

Legacy single value still works: `youtube.uploads_playlist_id` (singular). Prefer `uploads_playlist_ids` going forward.

Deploy the sync + Hatun backfill functions:

```bash
firebase deploy --only functions:syncYouTubeUploads,functions:backfillHatunYouTubeUploads
```

## Configuration Priority

1. `youtube.uploads_playlist_ids` / `YOUTUBE_UPLOADS_PLAYLIST_IDS` (comma-separated or array)
2. Legacy `youtube.uploads_playlist_id` / `YOUTUBE_UPLOADS_PLAYLIST_ID` (single playlist)
3. Default: both DCCI and Hatun uploads playlists

Same YouTube Data API key for all playlists: `youtube.api_key` / `YOUTUBE_API_KEY`.

## How Scheduled Sync Works

`syncYouTubeUploads` runs every hour and:

1. **New videos (both channels)**  
   - Walks each configured uploads playlist newest → oldest  
   - Creates articles for videos whose `youtubeVideoId` is not already in `content`  
   - Stops that playlist when it hits an existing video ID (incremental import only)  
   - Dedupes across channels by YouTube video ID  

2. **Shorts → draft**  
   - Videos ≤60s or marked `#shorts` are saved as `status: 'draft'` until you decide to publish them  
   - Regular videos (including livestream VODs) stay `published`  

3. **Removed / replaced videos**  
   - Builds a **union** of video IDs from all configured playlists  
   - Deletes a YouTube article only if its video ID is missing from **every** configured playlist  
   - This preserves DCCI articles when Hatun’s playlist is also configured  
   - Public videos missing from the uploads playlist are still removed (livestream replaced by a later upload)  

## Historical backfill (Hatun + DCCI)

Scheduled sync only picks up **new** uploads. To import older videos in ~3-month batches:

| Channel | Function | State doc |
|---------|----------|-----------|
| @HatunTashDCCIMinistries | `backfillHatunYouTubeUploads` | `settings/youtubeHatunBackfill` |
| @DCCIMinistries | `backfillDcciYouTubeUploads` | `settings/youtubeDcciBackfill` |

**Batch size:** about **3 months** of playlist history per run (newest → oldest from the cursor), safety cap 300 creates  
**Dedup:** skips any video ID already in `content`  
**Timeout:** up to 9 minutes per run

### Run one batch

```bash
# Hatun
curl "https://us-central1-dcci-ministries.cloudfunctions.net/backfillHatunYouTubeUploads?token=YOUR_BACKFILL_TOKEN"

# DCCI (older videos the hourly sync never walked)
curl "https://us-central1-dcci-ministries.cloudfunctions.net/backfillDcciYouTubeUploads?token=YOUR_BACKFILL_TOKEN"
```

Call again for the next ~3 months. Existing video IDs are skipped, so early DCCI runs may create few articles until you reach older uploads. Cursor advances automatically.

### Check status / stop / reset

```bash
curl ".../backfillHatunYouTubeUploads?token=TOKEN&action=status"
curl ".../backfillDcciYouTubeUploads?token=TOKEN&action=status"
# action=stop or action=reset on either URL
```

When a playlist is exhausted, status becomes `completed`. Use `action=reset` only if you intentionally want to walk that playlist again (existing IDs are still skipped).

## Verify Configuration

```bash
firebase functions:log --only syncYouTubeUploads
firebase functions:log --only backfillHatunYouTubeUploads
firebase functions:log --only backfillDcciYouTubeUploads
```

Look for:
- `Syncing uploads playlists: UUf0MDB_..., UUy5H0uun...`
- `Collected X video IDs from N playlist(s) for removal check`
- `YouTube sync complete. Created: X (drafts: Y), Skipped: Z, Deleted: W`
- Backfill: \`Starting Hatun/DCCI backfill batch\` / \`backfill completed\`
