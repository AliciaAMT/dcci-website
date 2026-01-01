
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as corsLib from "cors";
import * as nodemailer from "nodemailer";
import * as https from "https";
import { sanitizeContactForm, escapeHtmlForEmail, sanitizeNewsletterForm } from "./sanitization";

// Load environment variables from .env file for local development
// This only runs in local/emulator environment, not in production
if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV !== 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config();
  } catch (e) {
    // dotenv not installed, that's okay - will use Firebase config instead
  }
}

// YouTube API response types
interface YouTubePlaylistItem {
  snippet: {
    resourceId: {
      videoId: string;
    };
    publishedAt: string;
    title: string;
    description?: string;
    thumbnails: {
      maxres?: { url: string };
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubePlaylistResponse {
  items?: YouTubePlaylistItem[];
  nextPageToken?: string;
}

interface YouTubeVideoSnippet {
  title: string;
  description?: string;
  publishedAt: string;
  channelId: string;
  tags?: string[];
  thumbnails: {
    maxres?: { url: string };
    high?: { url: string };
    default?: { url: string };
  };
}

interface YouTubeVideoItem {
  snippet: YouTubeVideoSnippet;
}

interface YouTubeVideoResponse {
  items?: YouTubeVideoItem[];
}

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

/**
 * Strip promotional boilerplate blocks from YouTube description
 * Removes footer-style promotional content while preserving teaching content
 */
function stripBoilerplateFromDescription(description: string): string {
  if (!description || description.trim().length === 0) {
    return '';
  }

  // Boilerplate markers that indicate the start of promotional footer content
  // These patterns are checked case-insensitively
  const boilerplateMarkers = [
    // Confessional slogans as footer
    /^jesus is lord$/i,
    /^jesus christ is lord$/i,

    // Contact information
    /contact.*?:/i,
    /email.*?:/i,
    /skype.*?:/i,
    /reach.*?us/i,

    // Donation links
    /donate/i,
    /paypal/i,
    /cashapp/i,
    /cash app/i,
    /support.*?ministry/i,

    // Social media follow links
    /follow.*?us/i,
    /follow.*?on/i,
    /twitter.*?:/i,
    /rumble.*?:/i,
    /website.*?:/i,
    /visit.*?website/i,

    // Speaking invitations
    /speaking.*?invitation/i,
    /invite.*?speak/i,
    /book.*?speaker/i,

    // Copyright/disclaimers
    /copyright/i,
    /fair use/i,
    /disclaimer/i,
    /all rights reserved/i,

    // Comment moderation
    /no.*?weblinks/i,
    /comment.*?policy/i,
    /moderation/i,

    // Repeated Scripture as footer (John 20:31 pattern when standalone)
    /^john\s+20:31/i,
    /^john\s+20:\s*31/i,
  ];

  const lines = description.split('\n');
  let boilerplateStartIndex = -1;

  // Scan from the end backwards to find the first boilerplate marker
  // Only check the last portion of the description (last 10 lines) to avoid false positives
  const linesToCheck = Math.min(10, lines.length);

  for (let i = lines.length - 1; i >= Math.max(0, lines.length - linesToCheck); i--) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    // Check if this line matches any boilerplate marker
    const isBoilerplate = boilerplateMarkers.some(marker => {
      // Check if marker matches the line or appears at the start of the line
      return marker.test(line) || marker.test(line.split(/[:\-]/)[0]?.trim() || '');
    });

    if (isBoilerplate) {
      boilerplateStartIndex = i;
      // Continue checking backwards for multi-line boilerplate blocks
      // Look for empty lines or continuation patterns
      let j = i - 1;
      while (j >= 0 && j >= Math.max(0, lines.length - linesToCheck - 5)) {
        const prevLine = lines[j].trim();
        if (prevLine.length === 0) {
          // Found empty line, check if next non-empty line is also boilerplate
          let k = j - 1;
          while (k >= 0 && lines[k].trim().length === 0) k--;
          if (k >= 0) {
            const checkLine = lines[k].trim();
            const isAlsoBoilerplate = boilerplateMarkers.some(marker =>
              marker.test(checkLine) || marker.test(checkLine.split(/[:\-]/)[0]?.trim() || '')
            );
            if (isAlsoBoilerplate) {
              boilerplateStartIndex = k;
              j = k - 1;
              continue;
            }
          }
          break;
        }
        // Check if previous line is also boilerplate
        const isAlsoBoilerplate = boilerplateMarkers.some(marker =>
          marker.test(prevLine) || marker.test(prevLine.split(/[:\-]/)[0]?.trim() || '')
        );
        if (isAlsoBoilerplate) {
          boilerplateStartIndex = j;
          j--;
        } else {
          break;
        }
      }
      break;
    }
  }

  // If boilerplate found, remove everything from that point to the end
  if (boilerplateStartIndex >= 0) {
    lines.splice(boilerplateStartIndex);
  }

  // Clean up: remove trailing empty lines and whitespace
  let cleaned = lines.join('\n')
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/\s+$/gm, '') // Trim trailing whitespace on each line
    .trim();

  return cleaned;
}

/**
 * Extract tags from YouTube description and remove tag block from description
 *
 * Extracts:
 * 1. Hashtags (#tag format) from anywhere in description
 * 2. Comma-separated tag block near the end (10+ tokens, mostly words)
 *
 * Test cases:
 *
 * Case 1: No tags
 * Input: "This is a video about faith and hope. Watch and share!"
 * Output: { description: "This is a video about faith and hope. Watch and share!", tags: [] }
 *
 * Case 2: Tags at bottom
 * Input: "Video description here.\n\nfaith, hope, love, prayer, worship, bible, jesus, christian, god, holy spirit, salvation, grace, mercy, peace, joy"
 * Output: { description: "Video description here.", tags: ["faith", "hope", "love", "prayer", "worship", "bible", "jesus", "christian", "god", "holy spirit", "salvation", "grace", "mercy", "peace", "joy"] }
 *
 * Case 3: Hashtags only
 * Input: "Check out this video! #faith #hope #love #prayer"
 * Output: { description: "Check out this video!", tags: ["faith", "hope", "love", "prayer"] }
 */
function extractTagsFromDescription(description: string): { description: string; tags: string[] } {
  if (!description || description.trim().length === 0) {
    return { description: '', tags: [] };
  }

  let cleanedDescription = description;
  const extractedTags: Set<string> = new Set();
  const MAX_TAGS = 50;

  // Step 1: Extract hashtags (#tag format) from anywhere in description
  const hashtagRegex = /#(\w+)/g;
  let match;
  // Reset regex lastIndex to ensure we start from beginning
  hashtagRegex.lastIndex = 0;
  while ((match = hashtagRegex.exec(description)) !== null) {
    const tag = match[1].toLowerCase().trim();
    if (tag.length > 0) {
      extractedTags.add(tag);
    }
  }
  // Remove hashtags from description (use a new regex instance to avoid lastIndex issues)
  cleanedDescription = cleanedDescription.replace(/#\w+/g, '');

  // Step 2: Detect and extract comma-separated tag block near the end
  // Look for a pattern of 10+ comma-separated tokens in the last portion of description
  const lines = cleanedDescription.split('\n');

  // Check last few lines for tag block pattern
  const linesToCheck = Math.min(5, lines.length); // Check last 5 lines
  let tagBlockStartIndex = -1;
  let tagBlockEndIndex = lines.length;

  // Start from the end and work backwards
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - linesToCheck); i--) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    // Count comma-separated tokens in this line
    const tokens = line.split(',').map(t => t.trim()).filter(t => t.length > 0);

    // Check if this looks like a tag block:
    // - Has 10+ tokens, OR
    // - Has 5+ tokens and previous line also had 5+ tokens (multi-line tag block)
    const isTagBlock = tokens.length >= 10 ||
                       (tokens.length >= 5 && i < lines.length - 1 &&
                        lines[i + 1].split(',').map(t => t.trim()).filter(t => t.length > 0).length >= 5);

    if (isTagBlock) {
      tagBlockEndIndex = i + 1;
      // Continue checking backwards for multi-line tag blocks
      let j = i - 1;
      while (j >= 0 && j >= Math.max(0, lines.length - linesToCheck)) {
        const prevLine = lines[j].trim();
        if (prevLine.length === 0) {
          tagBlockStartIndex = j + 1;
          break;
        }
        const prevTokens = prevLine.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (prevTokens.length >= 5) {
          j--;
        } else {
          tagBlockStartIndex = j + 1;
          break;
        }
      }
      if (tagBlockStartIndex === -1) {
        tagBlockStartIndex = Math.max(0, j + 1);
      }
      break;
    }
  }

  // Extract tags from the detected tag block
  if (tagBlockStartIndex >= 0 && tagBlockStartIndex < tagBlockEndIndex) {
    const tagBlockLines = lines.slice(tagBlockStartIndex, tagBlockEndIndex);
    const tagBlockText = tagBlockLines.join(', ');

    // Split on commas and extract tags
    const commaTags = tagBlockText
      .split(',')
      .map(t => t.trim())
      .filter(t => {
        // Filter out tokens that look like sentences (too long, contain periods, etc.)
        if (t.length > 50) return false;
        if (t.includes('. ') || t.includes('! ') || t.includes('? ')) return false;
        // Must be mostly alphanumeric with some spaces/hyphens
        return /^[a-zA-Z0-9\s\-']+$/.test(t);
      })
      .map(t => t.toLowerCase())
      .filter(t => t.length > 0);

    commaTags.forEach(tag => {
      if (extractedTags.size < MAX_TAGS) {
        extractedTags.add(tag);
      }
    });

    // Remove tag block from description
    lines.splice(tagBlockStartIndex, tagBlockEndIndex - tagBlockStartIndex);
    cleanedDescription = lines.join('\n').trim();
  }

  // Clean up description: remove extra whitespace, empty lines at end
  cleanedDescription = cleanedDescription
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/\s+$/gm, '') // Trim trailing whitespace on each line
    .trim();

  const tagsArray = Array.from(extractedTags).slice(0, MAX_TAGS);

  return {
    description: cleanedDescription,
    tags: tagsArray
  };
}

// Helper function to make HTTP GET requests using https module
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
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

      let playlistData: YouTubePlaylistResponse;
      try {
        const playlistResponseText = await httpsGet(playlistUrl);
        playlistData = JSON.parse(playlistResponseText) as YouTubePlaylistResponse;
      } catch (error: any) {
        console.error('YouTube API playlistItems error:', error.message);
        throw new Error(`YouTube API error: ${error.message}`);
      }

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

      // Step 4: Get video details from YouTube API (include status to check if public)
      const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${newestVideoId}&key=${youtubeApiKey}`;

      let videoData: YouTubeVideoResponse;
      try {
        const videoResponseText = await httpsGet(videoUrl);
        videoData = JSON.parse(videoResponseText) as YouTubeVideoResponse;
      } catch (error: any) {
        console.error('YouTube API videos error:', error.message);
        throw new Error(`YouTube API error: ${error.message}`);
      }

      if (!videoData.items || videoData.items.length === 0) {
        console.log('Video not found in YouTube API:', newestVideoId);
        return null;
      }

      // Check if video is public (ignore private/unlisted)
      const videoStatus = (videoData.items[0] as any).status;
      if (videoStatus?.privacyStatus !== 'public') {
        console.log(`Video ${newestVideoId} is not public (${videoStatus?.privacyStatus}), skipping`);
        return null;
      }

      const snippet = videoData.items[0].snippet;
      const title = snippet.title;
      const rawDescription = snippet.description || '';
      const thumbnails = snippet.thumbnails;
      const channelIdFromVideo = snippet.channelId;
      const videoTags = snippet.tags || []; // YouTube video tags (preferred source)

      // Step 1: Strip boilerplate from description (before tag extraction)
      const descriptionWithoutBoilerplate = stripBoilerplateFromDescription(rawDescription);

      // Step 2: Extract tags from cleaned description (hashtags and comma-separated blocks)
      const { description: cleanedDescription, tags: extractedTags } = extractTagsFromDescription(descriptionWithoutBoilerplate);

      // Step 3: Use YouTube video tags if available, otherwise use extracted tags
      // Normalize: lowercase, trim, remove leading '#', deduplicate
      const allTags = new Set<string>();
      if (videoTags && videoTags.length > 0) {
        // Prefer YouTube video tags
        videoTags.forEach(tag => {
          const normalized = tag.toLowerCase().trim();
          if (normalized.length > 0) {
            allTags.add(normalized);
          }
        });
      } else {
        // Fallback to extracted tags from description
        extractedTags.forEach(tag => {
          const normalized = tag.toLowerCase().trim().replace(/^#+/, '');
          if (normalized.length > 0) {
            allTags.add(normalized);
          }
        });
      }
      const finalTags = Array.from(allTags).slice(0, 50);

      // Generate slug
      const baseSlug = slugify(title);
      const uniqueSlug = await getUniqueSlug(baseSlug);

      // Generate excerpt (first 160 chars of cleaned description, plain text)
      const excerpt = cleanedDescription
        .replace(/\n/g, ' ')
        .replace(/<[^>]*>/g, '')
        .trim()
        .substring(0, 160) || '';

      // Generate content HTML from cleaned description (without boilerplate and tag block)
      // Escape HTML and convert newlines to <br> within a single <p> tag
      const escapedDescription = cleanedDescription
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
      const contentData: any = {
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
        thumbnailUrl,
        // Source metadata
        source: {
          type: 'youtube',
          videoId: newestVideoId,
          channelId: channelIdFromVideo,
          publishedAt: admin.firestore.FieldValue.serverTimestamp(),
          backfilled: false
        },
        // Store raw and cleaned descriptions for reference
        youtube: {
          descriptionRaw: rawDescription,
          descriptionClean: cleanedDescription
        }
      };

      // Store tags at top level (only if tags exist)
      if (finalTags.length > 0) {
        contentData.tags = finalTags;
      }

      const docRef = await db.collection('content').add(contentData);
      console.log('Created new YouTube post:', docRef.id, 'for video:', newestVideoId);

      return null;
    } catch (error) {
      console.error('Error syncing YouTube uploads:', error);
      throw error;
    }
  });

// One-time backfill function to import YouTube uploads from last 30 days
export const backfillYouTubeUploads = functions.https.onRequest(async (req, res) => {
  try {
    // Security: Check token
    const providedToken = req.query.token as string;
    const expectedToken = functions.config().youtube?.backfill_token || process.env.YOUTUBE_BACKFILL_TOKEN;

    if (!expectedToken || providedToken !== expectedToken) {
      res.status(403).json({ error: 'Unauthorized: Invalid or missing token' });
      return;
    }

    // Get config
    const youtubeApiKey = functions.config().youtube?.api_key || process.env.YOUTUBE_API_KEY;
    const channelId = functions.config().youtube?.channel_id || process.env.YOUTUBE_CHANNEL_ID || 'UCf0MDB_oF7huA78BNADx9sQ';
    const authorEmail = functions.config().youtube?.author_email || process.env.YOUTUBE_AUTHOR_EMAIL || '';
    const authorId = functions.config().youtube?.author_id || process.env.YOUTUBE_AUTHOR_ID || '';

    if (!youtubeApiKey) {
      res.status(500).json({ error: 'YouTube API key not configured' });
      return;
    }

    // Fixed: Only import videos from last 30 days
    const days = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const publishedAfter = cutoffDate.toISOString();
    console.log(`Starting backfill for last ${days} days (publishedAfter: ${publishedAfter})`);

    let createdCount = 0;
    let skippedCount = 0;
    let processedCount = 0;
    let nextPageToken: string | undefined = undefined;
    const MAX_VIDEOS = 200; // Safety cap

    // Use YouTube Search API with publishedAfter filter instead of playlist items
    // This allows us to filter by date and only get public videos
    while (processedCount < MAX_VIDEOS) {
      // Build search URL with publishedAfter filter
      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&publishedAfter=${publishedAfter}&maxResults=50&key=${youtubeApiKey}`;
      if (nextPageToken) {
        searchUrl += `&pageToken=${nextPageToken}`;
      }

      let searchData: any;
      try {
        const searchResponseText = await httpsGet(searchUrl);
        searchData = JSON.parse(searchResponseText);
      } catch (error: any) {
        console.error('YouTube API search error:', error.message);
        res.status(500).json({ error: `YouTube API error: ${error.message}` });
        return;
      }

      if (!searchData.items || searchData.items.length === 0) {
        console.log('No more videos found');
        break;
      }

      // Process each video in this page
      for (const item of searchData.items) {
        if (processedCount >= MAX_VIDEOS) {
          console.log(`Reached safety cap of ${MAX_VIDEOS} videos`);
          break;
        }

        const videoId = item.id.videoId;
        const publishedAtStr = item.snippet.publishedAt;
        const publishedAtDate = new Date(publishedAtStr);

        // Double-check date (should already be filtered by API, but verify)
        if (publishedAtDate < cutoffDate) {
          console.log(`Video ${videoId} is older than cutoff, skipping`);
          continue;
        }

        // Only process public videos (privacyStatus should be 'public' in full video data)
        processedCount++;
        console.log(`Processing video ${processedCount}: ${videoId} (published: ${publishedAtStr})`);

        // Check if video already exists in Firestore (idempotent)
        const existingVideoQuery = await db.collection('content')
          .where('youtubeVideoId', '==', videoId)
          .limit(1)
          .get();

        if (!existingVideoQuery.empty) {
          skippedCount++;
          console.log(`Video ${videoId} already exists, skipping`);
          continue;
        }

        // Get full video details (we need snippet with tags, thumbnails, and status)
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${videoId}&key=${youtubeApiKey}`;

        let videoData: YouTubeVideoResponse;
        try {
          const videoResponseText = await httpsGet(videoUrl);
          videoData = JSON.parse(videoResponseText) as YouTubeVideoResponse;
        } catch (error: any) {
          console.error(`Error fetching video ${videoId}:`, error.message);
          skippedCount++;
          continue;
        }

        if (!videoData.items || videoData.items.length === 0) {
          console.log(`Video ${videoId} not found in YouTube API`);
          skippedCount++;
          continue;
        }

        // Check if video is public (ignore private/unlisted)
        const videoStatus = (videoData.items[0] as any).status;
        if (videoStatus?.privacyStatus !== 'public') {
          console.log(`Video ${videoId} is not public (${videoStatus?.privacyStatus}), skipping`);
          skippedCount++;
          continue;
        }

        const snippet = videoData.items[0].snippet;
        const title = snippet.title;
        const rawDescription = snippet.description || '';
        const thumbnails = snippet.thumbnails;
        const videoPublishedAtStr = snippet.publishedAt;
        const channelIdFromVideo = snippet.channelId;
        const videoTags = snippet.tags || []; // YouTube video tags (preferred source)

        // Step 1: Strip boilerplate from description (before tag extraction)
        const descriptionWithoutBoilerplate = stripBoilerplateFromDescription(rawDescription);

        // Step 2: Extract tags from cleaned description (hashtags and comma-separated blocks)
        const { description: cleanedDescription, tags: extractedTags } = extractTagsFromDescription(descriptionWithoutBoilerplate);

        // Step 3: Use YouTube video tags if available, otherwise use extracted tags
        // Normalize: lowercase, trim, remove leading '#', deduplicate
        const allTags = new Set<string>();
        if (videoTags && videoTags.length > 0) {
          // Prefer YouTube video tags
          videoTags.forEach(tag => {
            const normalized = tag.toLowerCase().trim();
            if (normalized.length > 0) {
              allTags.add(normalized);
            }
          });
        } else {
          // Fallback to extracted tags from description
          extractedTags.forEach(tag => {
            const normalized = tag.toLowerCase().trim().replace(/^#+/, '');
            if (normalized.length > 0) {
              allTags.add(normalized);
            }
          });
        }
        const finalTags = Array.from(allTags).slice(0, 50);

        // Generate slug
        const baseSlug = slugify(title);
        const uniqueSlug = await getUniqueSlug(baseSlug);

        // Generate excerpt (first 160 chars of cleaned description, plain text)
        const excerpt = cleanedDescription
          .replace(/\n/g, ' ')
          .replace(/<[^>]*>/g, '')
          .trim()
          .substring(0, 160) || '';

        // Generate content HTML from cleaned description (without boilerplate and tag block)
        const escapedDescription = cleanedDescription
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');

        const descriptionHtml = `<p>${escapedDescription}</p>`;
        const embedHtml = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        const content = `${descriptionHtml}\n\n${embedHtml}`;

        // Get thumbnail URL
        const thumbnailUrl = getThumbnailUrl(thumbnails);

        // Convert YouTube publishedAt to Firestore Timestamp (use video's actual publishedAt)
        const videoPublishedAtDate = new Date(videoPublishedAtStr);
        const publishedAtTimestamp = admin.firestore.Timestamp.fromDate(videoPublishedAtDate);

        // Create Firestore document with source metadata
        const contentData: any = {
          title,
          slug: uniqueSlug,
          status: 'published',
          content,
          excerpt,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          publishedAt: publishedAtTimestamp, // Use video's actual published date
          authorEmail: authorEmail || '',
          authorId: authorId || '',
          type: 'youtube',
          youtubeVideoId: videoId,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl,
          // Source metadata
          source: {
            type: 'youtube',
            videoId: videoId,
            channelId: channelIdFromVideo,
            publishedAt: publishedAtTimestamp,
            backfilled: true
          },
          // Store raw and cleaned descriptions for reference
          youtube: {
            descriptionRaw: rawDescription,
            descriptionClean: cleanedDescription
          }
        };

        // Store tags at top level (only if tags exist)
        if (finalTags.length > 0) {
          contentData.tags = finalTags;
        }

        await db.collection('content').add(contentData);
        createdCount++;
        console.log(`Created new YouTube post for video: ${videoId}`);
      }

      // Check if there are more pages
      if (searchData.nextPageToken) {
        nextPageToken = searchData.nextPageToken;
      } else {
        break; // No more pages
      }
    }

    const summary = {
      days: 30,
      publishedAfter,
      createdCount,
      skippedCount,
      processedCount
    };

    console.log('Backfill complete:', summary);
    res.status(200).json(summary);

  } catch (error) {
    console.error('Error in backfill:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});
