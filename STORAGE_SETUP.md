# Firebase Storage Setup Guide

## Issue
When publishing content with thumbnails, uploads fail with CORS errors because Firebase Storage is not set up.

## Solution

### Step 1: Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/project/dcci-ministries/storage)
2. Click "Get Started" to enable Firebase Storage
3. Choose a storage location (select the same region as your Firestore database for best performance)
4. Start in **production mode** (we have security rules configured)

### Step 2: Deploy Storage Rules

Once Storage is enabled, deploy the security rules:

```bash
firebase deploy --only storage
```

This will deploy the `storage.rules` file which allows:
- ✅ Admin users to upload thumbnails (max 5MB, images only)
- ✅ Everyone to read/view thumbnails
- ✅ Admin users to delete their own uploads

### Step 3: Verify Setup

After deploying, try uploading a thumbnail again. The upload should now work!

## Storage Structure

Files are organized as:
```
thumbnails/
  └── {userId}/
      └── {timestamp}_{filename}
```

Example:
```
thumbnails/abc123def456/1703123456789_my-image.jpg
```

## Security Rules Summary

The `storage.rules` file includes:
- **Admin-only uploads**: Only authenticated admin users can upload
- **Public reads**: Anyone can view thumbnails (needed for article lists)
- **Size limits**: 5MB for thumbnails, 10MB for content images
- **File type validation**: Only image files are allowed
- **User isolation**: Users can only upload to their own folder

## Troubleshooting

### Still getting CORS errors?
1. Make sure Firebase Storage is enabled (Step 1 above)
2. Make sure storage rules are deployed (Step 2 above)
3. Check that you're logged in as an admin user
4. Verify your admin status in Firestore: `adminUsers/{your-uid}` with `isAdmin: true`

### Getting "Permission denied" errors?
- Verify you're logged in as an admin
- Check browser console for detailed error messages
- Ensure `adminUsers/{your-uid}` document exists in Firestore with `isAdmin: true`

### Upload succeeds but image doesn't display?
- Check that the download URL is saved correctly in the content document
- Verify the image URL is publicly accessible (rules allow public read)

## Testing

To test the setup:
1. Log in as an admin
2. Create/edit an article
3. Upload a thumbnail image
4. Save/publish the article
5. Verify the thumbnail appears in the article list

