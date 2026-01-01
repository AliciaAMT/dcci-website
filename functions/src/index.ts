import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as corsLib from "cors";
import * as nodemailer from "nodemailer";
import { sanitizeContactForm, escapeHtmlForEmail, sanitizeNewsletterForm } from "./sanitization";

admin.initializeApp();
const cors = corsLib({ origin: true });
const db = admin.firestore();

const user = functions.config().mail.user as string;
const pass = functions.config().mail.pass as string;
const to = functions.config().mail.to as string;

// Cooldown period in milliseconds (5 minutes)
const COOLDOWN_PERIOD = 5 * 60 * 1000;

const FREE_TIER_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GB free tier

function getDefaultBucketName(): string {
  const configuredBucket = admin.app().options.storageBucket;
  if (configuredBucket) {
    if (configuredBucket.endsWith('.firebasestorage.app')) {
      return configuredBucket.replace('.firebasestorage.app', '.appspot.com');
    }
    return configuredBucket;
  }
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'unknown-project';
  return `${projectId}.appspot.com`;
}

const tx = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user, pass },
});

export const submitContactForm = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

    const { name, email, subject, message, newsletter, website, formLoadTime, submissionTime } = req.body || {};
    // Get client IP from various sources
    const forwardedFor = req.headers['x-forwarded-for'];
    const firstForwardedIP = Array.isArray(forwardedFor)
      ? forwardedFor[0]?.trim()
      : forwardedFor?.split(',')[0]?.trim();

    const clientIP: string = req.ip ||
                    req.connection?.remoteAddress ||
                    req.socket?.remoteAddress ||
                    firstForwardedIP ||
                    (Array.isArray(req.headers['x-real-ip']) ? req.headers['x-real-ip'][0] : req.headers['x-real-ip']) ||
                    'unknown';

    console.log('Client IP detected:', clientIP);
    console.log('Request headers:', {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'req.ip': req.ip,
      'remoteAddress': req.connection?.remoteAddress
    });

    // IP blocking check - block common VPN/spam IP ranges
    const blockedRanges = ['111.', '185.', '45.', '91.', '104.']; // Common VPN/spam ranges
    const isBlockedIP = blockedRanges.some(range => clientIP.startsWith(range));

    if (isBlockedIP) {
      console.log('Blocked IP detected:', clientIP);
      res.status(403).json({
        error: "VPN detected",
        message: "We've detected that you're using a VPN. To help prevent spam, please turn off your VPN and try again. If you're not using a VPN, please contact us directly."
      });
      return;
    }

    // Honeypot check - if website field is filled, it's likely a bot
    if (website) {
      console.log('Bot detected via honeypot');
      res.status(204).end(); return; // Silently fail
    }

    // Sanitize and validate all input data
    const validation = sanitizeContactForm({ name, email, subject, message, newsletter, formLoadTime, submissionTime });

    if (!validation.isValid) {
      console.log('Input validation failed:', validation.errors);
      res.status(400).json({
        error: "Invalid input",
        message: "Please check your input and try again.",
        details: validation.errors
      });
      return;
    }

    const { name: sanitizedName, email: sanitizedEmail, subject: sanitizedSubject, message: sanitizedMessage, newsletter: sanitizedNewsletter, formLoadTime: sanitizedFormLoadTime, submissionTime: sanitizedSubmissionTime } = validation.sanitizedData!;

    try {
      // Simple cooldown check - get all contacts from this IP and check timestamps
      const allContacts = await db.collection('contacts').get();
      const recentSubmissions = allContacts.docs
        .filter(doc => doc.data().ipAddress === clientIP)
        .sort((a, b) => b.data().submittedAt?.toMillis() - a.data().submittedAt?.toMillis());

      if (recentSubmissions.length > 0) {
        const lastSubmission = recentSubmissions[0].data();
        const lastSubmissionTime = lastSubmission.submittedAt?.toMillis() || 0;
        const currentTime = Date.now();

        if (currentTime - lastSubmissionTime < COOLDOWN_PERIOD) {
          console.log('Cooldown period active for IP:', clientIP);
          res.status(429).json({
            error: "Please wait before submitting another message",
            retryAfter: Math.ceil((COOLDOWN_PERIOD - (currentTime - lastSubmissionTime)) / 1000)
          });
          return;
        }
      }

      // Store contact form data in Firestore (using sanitized data)
      const contactData = {
        name: sanitizedName,
        email: sanitizedEmail,
        subject: sanitizedSubject,
        message: sanitizedMessage,
        newsletter: sanitizedNewsletter,
        formLoadTime: sanitizedFormLoadTime,
        submissionTime: sanitizedSubmissionTime,
        timeToFill: sanitizedSubmissionTime - sanitizedFormLoadTime,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: clientIP,
        userAgent: req.get('User-Agent') || 'Unknown'
      };

      // Add to contacts collection
      const contactRef = await db.collection('contacts').add(contactData);
      console.log('Contact stored with ID:', contactRef.id);

      // If they want newsletter updates, add to subscribers collection
      if (sanitizedNewsletter) {
        const subscriberData = {
          email: sanitizedEmail,
          name: sanitizedName,
          subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'contact_form',
          status: 'active'
        };

        // Check if email already exists in subscribers
        const existingSubscriber = await db.collection('subscribers')
          .where('email', '==', sanitizedEmail)
          .limit(1)
          .get();

        if (existingSubscriber.empty) {
          await db.collection('subscribers').add(subscriberData);
          console.log('Added to newsletter subscribers:', sanitizedEmail);
        } else {
          console.log('Email already subscribed:', sanitizedEmail);
        }
      }

      // Send email notification (using sanitized data and escaped HTML)
      await tx.sendMail({
        from: `"DCCI Ministries Website" <${user}>`,
        to,
        replyTo: `${sanitizedName} <${sanitizedEmail}>`,
        subject: `Contact Form: ${sanitizedSubject}`,
        text: `Name: ${sanitizedName}\nEmail: ${sanitizedEmail}\nSubject: ${sanitizedSubject}\nNewsletter: ${sanitizedNewsletter ? 'Yes' : 'No'}\nIP: ${clientIP}\n\n${sanitizedMessage}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><b>Name:</b> ${escapeHtmlForEmail(sanitizedName)}</p>
          <p><b>Email:</b> ${escapeHtmlForEmail(sanitizedEmail)}</p>
          <p><b>Subject:</b> ${escapeHtmlForEmail(sanitizedSubject)}</p>
          <p><b>Newsletter Subscription:</b> ${sanitizedNewsletter ? 'Yes' : 'No'}</p>
          <p><b>IP Address:</b> ${escapeHtmlForEmail(clientIP)}</p>
          <hr>
          <p><b>Message:</b></p>
          <p>${escapeHtmlForEmail(sanitizedMessage)}</p>
          <hr>
          <p><small>This email was sent from the DCCI Ministries contact form.</small></p>
          <p><small>Contact ID: ${contactRef.id}</small></p>
        `
      });

      res.status(200).json({
        success: true,
        message: "Email sent successfully",
        contactId: contactRef.id
      });
    } catch (e) {
      console.error('Contact form error:', e);
      res.status(500).json({ error: "Failed to process contact form" });
    }
  });
});

// Test endpoint to verify function deployment
export const testContactForm = functions.https.onRequest((req, res) => {
  res.json({
    message: "Contact form function is working!",
    timestamp: new Date().toISOString(),
    config: {
      user: user ? "Configured" : "Not configured",
      pass: pass ? "Configured" : "Not configured",
      to: to ? "Configured" : "Not configured"
    }
  });
});

// Newsletter subscription endpoint
export const subscribeToNewsletter = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

    const { name, email } = req.body || {};

    // Get client IP from various sources
    const forwardedFor = req.headers['x-forwarded-for'];
    const firstForwardedIP = Array.isArray(forwardedFor)
      ? forwardedFor[0]?.trim()
      : forwardedFor?.split(',')[0]?.trim();

    const clientIP: string = req.ip ||
                    req.connection?.remoteAddress ||
                    req.socket?.remoteAddress ||
                    firstForwardedIP ||
                    (Array.isArray(req.headers['x-real-ip']) ? req.headers['x-real-ip'][0] : req.headers['x-real-ip']) ||
                    'unknown';

    console.log('Newsletter subscription - Client IP detected:', clientIP);

    // IP blocking check - block common VPN/spam IP ranges
    const blockedRanges = ['111.', '185.', '45.', '91.', '104.']; // Common VPN/spam ranges
    const isBlockedIP = blockedRanges.some(range => clientIP.startsWith(range));

    if (isBlockedIP) {
      console.log('Blocked IP detected for newsletter subscription:', clientIP);
      res.status(403).json({
        error: "VPN detected",
        message: "We've detected that you're using a VPN. To help prevent spam, please turn off your VPN and try again. If you're not using a VPN, please contact us directly."
      });
      return;
    }

    // Sanitize and validate input data
    const validation = sanitizeNewsletterForm({ name, email });

    if (!validation.isValid) {
      console.log('Newsletter subscription validation failed:', validation.errors);
      res.status(400).json({
        error: "Invalid input",
        message: "Please check your input and try again.",
        details: validation.errors
      });
      return;
    }

    const { name: sanitizedName, email: sanitizedEmail } = validation.sanitizedData!;

    try {
      // Check if email already exists in subscribers
      const existingSubscriber = await db.collection('subscribers')
        .where('email', '==', sanitizedEmail)
        .limit(1)
        .get();

      if (!existingSubscriber.empty) {
        console.log('Email already subscribed:', sanitizedEmail);
        res.status(409).json({
          error: "Already subscribed",
          message: "This email address is already subscribed to our newsletter."
        });
        return;
      }

      // Add to subscribers collection
      const subscriberData = {
        email: sanitizedEmail,
        name: sanitizedName,
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'newsletter_signup',
        status: 'active',
        ipAddress: clientIP,
        userAgent: req.get('User-Agent') || 'Unknown'
      };

      const subscriberRef = await db.collection('subscribers').add(subscriberData);
      console.log('Newsletter subscription added with ID:', subscriberRef.id);

      // Send email notification to admin
      await tx.sendMail({
        from: `"DCCI Ministries Website" <${user}>`,
        to,
        subject: `New Newsletter Subscription: ${sanitizedName}`,
        text: `Name: ${sanitizedName}\nEmail: ${sanitizedEmail}\nIP: ${clientIP}\n\nThis person subscribed to the newsletter through the standalone signup form.`,
        html: `
          <h3>New Newsletter Subscription</h3>
          <p><b>Name:</b> ${escapeHtmlForEmail(sanitizedName)}</p>
          <p><b>Email:</b> ${escapeHtmlForEmail(sanitizedEmail)}</p>
          <p><b>IP Address:</b> ${escapeHtmlForEmail(clientIP)}</p>
          <hr>
          <p><small>This subscription was made through the standalone newsletter signup form.</small></p>
          <p><small>Subscriber ID: ${subscriberRef.id}</small></p>
        `
      });

      res.status(200).json({
        success: true,
        message: "Successfully subscribed to newsletter",
        subscriberId: subscriberRef.id
      });
    } catch (e) {
      console.error('Newsletter subscription error:', e);
      res.status(500).json({ error: "Failed to process newsletter subscription" });
    }
  });
});

// Function to get contact statistics (for admin use)
export const getContactStats = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const contactsSnapshot = await db.collection('contacts').get();
      const subscribersSnapshot = await db.collection('subscribers').get();

      const totalContacts = contactsSnapshot.size;
      const totalSubscribers = subscribersSnapshot.size;

      // Count newsletter subscribers from contacts
      const newsletterSubscribers = contactsSnapshot.docs.filter(doc =>
        doc.data().newsletter === true
      ).length;

      res.json({
        totalContacts,
        totalSubscribers,
        newsletterSubscribers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });
});

// Track unique page views (approximate real users)
export const trackPageView = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }

      const { path } = req.body || {};

      // Basic validation
      if (typeof path !== "string" || !path) {
        res.status(400).json({ error: "Invalid path" });
        return;
      }

      const userAgent = (req.get("User-Agent") || "").toLowerCase();

      // Very basic bot filtering
      const botSignatures = [
        "bot",
        "crawler",
        "spider",
        "crawl",
        "slurp",
        "bingpreview",
        "facebookexternalhit",
        "monitor",
      ];

      if (!userAgent || botSignatures.some((sig) => userAgent.includes(sig))) {
        console.log("Skipping bot or unknown user agent for page view");
        res.status(204).end();
        return;
      }

      // Build a coarse fingerprint (no PII stored directly)
      const forwardedFor = req.headers["x-forwarded-for"];
      const firstForwardedIP = Array.isArray(forwardedFor)
        ? forwardedFor[0]?.trim()
        : forwardedFor?.split(",")[0]?.trim();

      const clientIP: string =
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        firstForwardedIP ||
        (Array.isArray(req.headers["x-real-ip"])
          ? req.headers["x-real-ip"][0]
          : (req.headers["x-real-ip"] as string | undefined)) ||
        "unknown";

      const today = new Date();
      const dayKey = `${today.getUTCFullYear()}-${
        today.getUTCMonth() + 1
      }-${today.getUTCDate()}`;

      const fingerprintSource = `${clientIP}|${userAgent}|${dayKey}`;
      const fingerprintId = Buffer.from(fingerprintSource).toString("base64");

      const viewDocRef = db.collection("pageViews").doc(fingerprintId);
      const statsDocRef = db.collection("stats").doc("siteStats");

      await db.runTransaction(async (tx) => {
        const existingView = await tx.get(viewDocRef);

        // If we've already seen this fingerprint today, don't double-count
        if (existingView.exists) {
          return;
        }

        tx.set(viewDocRef, {
          path,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          dayKey,
        });

        tx.set(
          statsDocRef,
          {
            totalUniqueVisitors: admin.firestore.FieldValue.increment(1),
          },
          { merge: true }
        );
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error tracking page view:", error);
      res.status(500).json({ error: "Failed to track page view" });
    }
  });
});

// Get Firebase Storage usage vs. free-tier allowance
export const getStorageUsage = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const bucket = admin.storage().bucket(getDefaultBucketName());
      let totalBytes = 0;
      let nextQuery: { autoPaginate: false; pageToken?: string } = { autoPaginate: false };

      do {
        const [files, queryResult] = await bucket.getFiles(nextQuery);
        files.forEach(file => {
          const size = Number(file.metadata?.size || 0);
          if (!Number.isNaN(size)) {
            totalBytes += size;
          }
        });
        nextQuery.pageToken = queryResult?.pageToken;
      } while (nextQuery.pageToken);

      const bytesRemaining = Math.max(0, FREE_TIER_STORAGE_BYTES - totalBytes);
      const percentUsed = Math.min(
        100,
        Number(((totalBytes / FREE_TIER_STORAGE_BYTES) * 100).toFixed(2))
      );

      res.json({
        totalBytes,
        freeTierBytes: FREE_TIER_STORAGE_BYTES,
        bytesRemaining,
        percentUsed
      });
    } catch (error: any) {
      if (error?.code === 404 || error?.message?.includes('bucket does not exist')) {
        res.json({
          totalBytes: 0,
          freeTierBytes: FREE_TIER_STORAGE_BYTES,
          bytesRemaining: FREE_TIER_STORAGE_BYTES,
          percentUsed: 0,
          note: 'Bucket not found; returning zero usage.'
        });
        return;
      }
      console.error("Error getting storage usage:", error);
      res.status(500).json({ error: "Failed to get storage usage" });
    }
  });
});

// Helper function to slugify a string
function slugify(text: string): string {
  if (!text) return 'untitled';

  let slug = text
    .trim()
    .toLowerCase();

  // Transliterate common diacritics
  slug = slug
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c');

  // Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-');

  // Remove all non-alphanumeric characters except hyphens
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // Collapse multiple consecutive hyphens into a single hyphen
  slug = slug.replace(/-+/g, '-');

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // Ensure slug is not empty
  if (!slug) {
    slug = 'untitled';
  }

  return slug;
}

// Helper function to check if a slug exists and generate unique one
async function getUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.collection('content')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (existing.empty) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// Helper function to get thumbnail URL (prefer maxres, else high, else default)
function getThumbnailUrl(thumbnails: any): string {
  if (thumbnails?.maxres?.url) return thumbnails.maxres.url;
  if (thumbnails?.high?.url) return thumbnails.high.url;
  if (thumbnails?.default?.url) return thumbnails.default.url;
  return '';
}

// Scheduled function to sync YouTube uploads
export const syncYouTubeUploads = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting YouTube sync...');

      // Get config from functions config or environment variables
      const youtubeApiKey = functions.config().youtube?.api_key || process.env.YOUTUBE_API_KEY;
      const playlistId = functions.config().youtube?.uploads_playlist_id || process.env.YOUTUBE_UPLOADS_PLAYLIST_ID || 'UUf0MDB_oF7huA78BNADx9sQ';
      const authorEmail = functions.config().youtube?.author_email || process.env.YOUTUBE_AUTHOR_EMAIL || '';
      const authorId = functions.config().youtube?.author_id || process.env.YOUTUBE_AUTHOR_ID || '';

      if (!youtubeApiKey) {
        console.error('YouTube API key not configured. Set youtube.api_key in functions config or YOUTUBE_API_KEY env var.');
        // TODO: YouTube API key missing
        return null;
      }

      // Step 1: Query Firestore for last known YouTube video
      const lastKnownVideoQuery = await db.collection('content')
        .where('type', '==', 'youtube')
        .orderBy('publishedAt', 'desc')
        .limit(1)
        .get();

      let lastKnownVideoId: string | null = null;
      if (!lastKnownVideoQuery.empty) {
        const lastDoc = lastKnownVideoQuery.docs[0].data();
        lastKnownVideoId = lastDoc.youtubeVideoId || null;
        console.log('Last known video ID:', lastKnownVideoId);
      } else {
        console.log('No existing YouTube videos found (first run)');
      }

      // Step 2: Call YouTube Data API to get newest video from uploads playlist
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1&order=date&key=${youtubeApiKey}`;
      
      const playlistResponse = await fetch(playlistUrl);
      if (!playlistResponse.ok) {
        const errorText = await playlistResponse.text();
        console.error('YouTube API playlistItems error:', playlistResponse.status, errorText);
        throw new Error(`YouTube API error: ${playlistResponse.status}`);
      }

      const playlistData = await playlistResponse.json();
      
      if (!playlistData.items || playlistData.items.length === 0) {
        console.log('No videos found in uploads playlist');
        return null;
      }

      const newestVideoId = playlistData.items[0].snippet.resourceId.videoId;
      console.log('Newest video ID from playlist:', newestVideoId);

      // Step 3: Check if this video already exists in Firestore
      const existingVideoQuery = await db.collection('content')
        .where('youtubeVideoId', '==', newestVideoId)
        .limit(1)
        .get();

      if (!existingVideoQuery.empty) {
        console.log('Video already exists in Firestore, skipping:', newestVideoId);
        return null;
      }

      // Step 4: Get video details from YouTube API
      const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${newestVideoId}&key=${youtubeApiKey}`;
      
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error('YouTube API videos error:', videoResponse.status, errorText);
        throw new Error(`YouTube API error: ${videoResponse.status}`);
      }

      const videoData = await videoResponse.json();
      
      if (!videoData.items || videoData.items.length === 0) {
        console.log('Video not found in YouTube API:', newestVideoId);
        return null;
      }

      const snippet = videoData.items[0].snippet;
      const title = snippet.title;
      const description = snippet.description || '';
      const thumbnails = snippet.thumbnails;

      // Generate slug
      const baseSlug = slugify(title);
      const uniqueSlug = await getUniqueSlug(baseSlug);

      // Generate excerpt (first 160 chars of description, plain text)
      const excerpt = description
        .replace(/\n/g, ' ')
        .replace(/<[^>]*>/g, '')
        .trim()
        .substring(0, 160) || '';

      // Generate content HTML
      // Escape HTML and convert newlines to <br> within a single <p> tag
      const escapedDescription = description
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      
      const descriptionHtml = `<p>${escapedDescription}</p>`;

      const embedHtml = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${newestVideoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

      const content = `${descriptionHtml}\n\n${embedHtml}`;

      // Get thumbnail URL
      const thumbnailUrl = getThumbnailUrl(thumbnails);

      // Create Firestore document
      const contentData = {
        title,
        slug: uniqueSlug,
        status: 'published',
        content,
        excerpt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        authorEmail: authorEmail || '',
        authorId: authorId || '',
        type: 'youtube',
        youtubeVideoId: newestVideoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${newestVideoId}`,
        thumbnailUrl
      };

      const docRef = await db.collection('content').add(contentData);
      console.log('Created new YouTube post:', docRef.id, 'for video:', newestVideoId);

      return null;
    } catch (error) {
      console.error('Error syncing YouTube uploads:', error);
      throw error;
    }
  });
