import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as corsLib from "cors";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const cors = corsLib({ origin: true });
const db = admin.firestore();

const user = functions.config().mail.user as string;
const pass = functions.config().mail.pass as string;
const to = functions.config().mail.to as string;

const tx = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user, pass },
});

export const submitContactForm = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

    const { name, email, subject, message, newsletter, website } = req.body || {};
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Honeypot check - if website field is filled, it's likely a bot
    if (website) {
      console.log('Bot detected via honeypot');
      res.status(204).end(); return; // Silently fail
    }

    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }

    try {
      // Store contact form data in Firestore
      const contactData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        newsletter: Boolean(newsletter),
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: clientIP,
        userAgent: req.get('User-Agent') || 'Unknown'
      };

      // Add to contacts collection
      const contactRef = await db.collection('contacts').add(contactData);
      console.log('Contact stored with ID:', contactRef.id);

      // If they want newsletter updates, add to subscribers collection
      if (newsletter) {
        const subscriberData = {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'contact_form',
          status: 'active'
        };

        // Check if email already exists in subscribers
        const existingSubscriber = await db.collection('subscribers')
          .where('email', '==', email.trim().toLowerCase())
          .limit(1)
          .get();

        if (existingSubscriber.empty) {
          await db.collection('subscribers').add(subscriberData);
          console.log('Added to newsletter subscribers:', email);
        } else {
          console.log('Email already subscribed:', email);
        }
      }

      // Send email notification
      await tx.sendMail({
        from: `"DCCI Ministries Website" <${user}>`,
        to,
        replyTo: `${name} <${email}>`,
        subject: `Contact Form: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nNewsletter: ${newsletter ? 'Yes' : 'No'}\nIP: ${clientIP}\n\n${message}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Subject:</b> ${subject}</p>
          <p><b>Newsletter Subscription:</b> ${newsletter ? 'Yes' : 'No'}</p>
          <p><b>IP Address:</b> ${clientIP}</p>
          <hr>
          <p><b>Message:</b></p>
          <p>${String(message).replace(/\n/g, "<br>")}</p>
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
