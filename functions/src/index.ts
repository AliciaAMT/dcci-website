import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as corsLib from "cors";
import nodemailer from "nodemailer";

admin.initializeApp();
const cors = corsLib({ origin: true });

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
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const { name, email, subject, message, website } = req.body || {};

    // Honeypot check - if website field is filled, it's likely a bot
    if (website) {
      console.log('Bot detected via honeypot');
      return res.status(204).end(); // Silently fail
    }

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      await tx.sendMail({
        from: `"DCCI Ministries Website" <${user}>`,
        to,
        replyTo: `${name} <${email}>`,
        subject: `Contact Form: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Subject:</b> ${subject}</p>
          <hr>
          <p><b>Message:</b></p>
          <p>${String(message).replace(/\n/g, "<br>")}</p>
          <hr>
          <p><small>This email was sent from the DCCI Ministries contact form.</small></p>
        `
      });

      res.status(200).json({ success: true, message: "Email sent successfully" });
    } catch (e) {
      console.error('Email sending error:', e);
      res.status(500).json({ error: "Failed to send email" });
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
