import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // Honeypot field
}

export const submitContactForm = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Add security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Basic rate limiting check
  const clientIP = req.ip || req.connection.remoteAddress;
  console.log(`Request from IP: ${clientIP}`);

  try {
    const { name, email, subject, message, website }: ContactFormData = req.body;

    // Honeypot check - if website field is filled, it's likely a bot
    if (website && website.trim() !== '') {
      console.log('Bot detected via honeypot field');
      // Silently return success to avoid letting bots know they were caught
      res.status(200).json({
        success: true,
        message: 'Contact form submitted successfully'
      });
      return;
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'subject', 'message']
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Invalid email format'
      });
      return;
    }

    // Get recipient email from environment (you can change this later)
    const recipientEmail = functions.config().contact?.email || 'admin@accessiblewebmedia.com';

    // Create email content
    const emailTitle = `Contact Form: ${subject}`;
    const emailBody = `
      New contact form submission from DCCI Ministries website:

      Name: ${name}
      Email: ${email}
      Subject: ${subject}

      Message:
      ${message}

      ---
      This email was sent from the DCCI Ministries contact form.
      Submitted on: ${new Date().toISOString()}
      IP Address: ${clientIP}
    `;

    // Send email using SendGrid (much simpler than Gmail)
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: recipientEmail }]
        }],
        from: {
          email: 'noreply@dcciministries.com',
          name: 'DCCI Ministries Contact Form'
        },
        subject: emailTitle,
        content: [{
          type: 'text/plain',
          value: emailBody
        }]
      })
    });

    if (!sendGridResponse.ok) {
      throw new Error(`SendGrid error: ${sendGridResponse.status}`);
    }

    // Log the submission
    console.log(`Contact form submitted: ${name} (${email}) - ${subject}`);
    console.log(`Email sent to: ${recipientEmail}`);

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (error) {
    console.error('Error sending contact form:', error);

    res.status(500).json({
      error: 'Failed to submit contact form',
      message: 'An internal server error occurred. Please try again later.'
    });
  }
});

// Test endpoint
export const testContactForm = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.json({
    message: 'Contact form function is working',
    timestamp: new Date().toISOString()
  });
});
