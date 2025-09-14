# Firebase Functions - Contact Form Email

This directory contains Firebase Functions for handling the contact form submissions from the DCCI Ministries website.

## Setup Instructions

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Build the Functions
```bash
npm run build
```

### 3. Set Environment Variables
You need to configure email credentials for sending emails. You can do this in two ways:

#### Option A: Firebase Functions Config (Recommended for production)
```bash
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.pass="your-app-password"
```

#### Option B: Environment Variables (for local development)
Create a `.env` file in the functions directory:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Important:** Use an App Password, not your regular Gmail password. To generate an App Password:
1. Go to your Google Account settings
2. Enable 2-Factor Authentication if not already enabled
3. Generate an App Password for "Mail"

### 4. Deploy Functions
```bash
firebase deploy --only functions
```

## Available Functions

### `sendContactEmail`
- **Endpoint:** `https://[region]-[project-id].cloudfunctions.net/sendContactEmail`
- **Method:** POST
- **Purpose:** Receives contact form submissions and sends emails to hatun@dcciministries.com
- **Email Format:** Subject will be "Contact Form: {user_subject}" for easy sorting

### `testContactForm`
- **Endpoint:** `https://[region]-[project-id].cloudfunctions.net/testContactForm`
- **Method:** GET
- **Purpose:** Test endpoint to verify the function is working

## Email Configuration

The function uses Gmail SMTP with nodemailer. The email will be sent from the configured email address to hatun@dcciministries.com with:

- **From:** Your configured email address
- **To:** hatun@dcciministries.com
- **Subject:** "Contact Form: {user_subject}"
- **Body:** Formatted message with user details and timestamp

## Security Features

- CORS enabled for web requests
- Input validation for all fields
- Email format validation
- Rate limiting (Firebase Functions built-in)
- Secure credential storage via Firebase Config

## Local Development

To test functions locally:

```bash
npm run serve
```

This will start the Firebase emulator and allow you to test the functions locally.

## Troubleshooting

### Common Issues

1. **Email not sending:** Check your Gmail App Password and 2FA settings
2. **CORS errors:** Ensure the function is properly deployed
3. **Build errors:** Make sure TypeScript is properly configured

### Logs

View function logs:
```bash
firebase functions:log
```

## Notes

- The function automatically formats the email subject as "Contact Form: {subject}" to help Hatun sort these emails
- All form submissions are logged to Firebase Functions logs
- The function includes proper error handling and validation
- CORS is configured to allow requests from any origin (can be restricted if needed) 
