# YouTube Sync Function Setup

## Important Security Note
⚠️ **Your YouTube API key has been exposed in this conversation. Please regenerate it immediately:**
1. Go to [Google Cloud Console - API Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your YouTube Data API key
3. Delete the old key and create a new one
4. Update the key in both local `.env` file and Firebase Functions config

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
YOUTUBE_UPLOADS_PLAYLIST_ID=UUf0MDB_oF7huA78BNADx9sQ
YOUTUBE_AUTHOR_EMAIL=your_email@example.com
YOUTUBE_AUTHOR_ID=your_author_id_here
```

3. Install dependencies (if not already done):
```bash
npm install
```

**Note:** The `.env` file is already in `.gitignore` and will not be committed to version control.

### Option 2: Production (using Firebase Functions Config)

For production deployment, set the configuration using Firebase Functions config:

```bash
firebase functions:config:set youtube.api_key="your_youtube_api_key_here"
firebase functions:config:set youtube.uploads_playlist_id="UUf0MDB_oF7huA78BNADx9sQ"
firebase functions:config:set youtube.author_email="your_email@example.com"
firebase functions:config:set youtube.author_id="your_author_id_here"
```

After setting config, redeploy the function:
```bash
firebase deploy --only functions:syncYouTubeUploads
```

### Option 3: Using Firebase Secrets (Recommended for Production)

For sensitive data like API keys, use Firebase Secrets:

```bash
# Set the secret
echo -n "your_youtube_api_key_here" | firebase functions:secrets:set YOUTUBE_API_KEY

# Update your function to use the secret (requires code changes)
```

## Current Configuration Priority

The function reads configuration in this order:
1. Firebase Functions config (`functions.config().youtube.*`)
2. Environment variables (`process.env.YOUTUBE_*`)
3. Default values (for playlist ID only)

## How It Works

### Automatic Sync Process

The `syncYouTubeUploads` function runs every hour and performs the following:

1. **Checks for New Videos**:
   - Fetches videos from the uploads playlist (up to 50 per run)
   - Creates new articles for videos that don't exist in Firestore
   - Stops when it finds a video that already exists (videos are processed in date order)

2. **Detects Removed Videos** (NEW):
   - Collects all video IDs from the uploads playlist (up to 500 videos)
   - Checks all existing YouTube articles in Firestore
   - Verifies video existence via YouTube API
   - Automatically deletes articles when:
     - Video is not in the uploads playlist, OR
     - Video doesn't exist in YouTube API, OR
     - Video is private/unlisted
   - **Use Case**: Handles livestreams that get removed and replaced with new videos

3. **Logging**:
   - Logs created, skipped, and deleted counts
   - Provides detailed console output for debugging

### Removed Video Detection

The function now automatically cleans up articles for videos that have been removed. This is particularly useful for:
- **Livestreams**: When a livestream is removed and replaced with a new video, the old article is automatically deleted
- **Deleted Videos**: If a video is deleted from YouTube, its article is removed from the site
- **Private Videos**: If a video is made private/unlisted, its article is removed

The removal check happens before new video processing to ensure the playlist state is current.

## Verify Configuration

After setting up, you can verify the function is working by checking the logs:
```bash
firebase functions:log --only syncYouTubeUploads
```

Look for log messages like:
- `Collected X video IDs from playlist for removal check`
- `Found X existing YouTube articles to check`
- `Deleted article X for removed video Y`
- `YouTube sync complete. Created: X, Skipped: Y, Deleted: Z`

