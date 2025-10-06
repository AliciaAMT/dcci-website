# IP Blocking for Contact Form

## Overview

This implementation adds IP-based spam prevention to the DCCI Ministries contact form to block requests from known VPN/spam IP ranges while providing user-friendly feedback.

## Features

- **IP Range Blocking**: Automatically blocks IP addresses from common VPN/spam ranges
- **User-Friendly Messages**: Shows helpful message asking users to disable VPN
- **Comprehensive Coverage**: Blocks multiple IP ranges commonly used for spam
- **Graceful Handling**: Maintains existing honeypot and cooldown protections

## Blocked IP Ranges

The system currently blocks the following IP ranges:
- `111.x.x.x` - Common VPN range (original spam source)
- `185.x.x.x` - Known VPN/spam range
- `45.x.x.x` - Common VPN range
- `91.x.x.x` - Known VPN range
- `104.x.x.x` - Common VPN range

## Implementation Details

### Backend (Firebase Functions)

**File**: `functions/src/index.ts`

```typescript
// IP blocking check - block common VPN/spam IP ranges
const blockedRanges = ['111.', '185.', '45.', '91.', '104.'];
const isBlockedIP = blockedRanges.some(range => clientIP.startsWith(range));

if (isBlockedIP) {
  console.log('Blocked IP detected:', clientIP);
  res.status(403).json({ 
    error: "VPN detected",
    message: "We've detected that you're using a VPN. To help prevent spam, please turn off your VPN and try again. If you're not using a VPN, please contact us directly."
  });
  return;
}
```

### Frontend (Angular Component)

**File**: `src/app/components/contact-form.component.ts`

```typescript
catch (error: any) {
  // Check for VPN detection error
  if (error.error?.error === 'VPN detected') {
    this.submitError = error.error.message || 'VPN detected. Please turn off your VPN and try again.';
  } else {
    this.submitError = 'Failed to send message. Please try again.';
  }
  console.error('Contact form submission error:', error);
}
```

## User Experience

When a user with a blocked IP tries to submit the contact form:

1. **Backend Response**: Returns HTTP 403 with VPN detection message
2. **Frontend Display**: Shows user-friendly error message
3. **User Action**: User can disable VPN and try again, or contact directly

## Testing

### Manual Testing

Use the provided test script to verify functionality:

```bash
node test-ip-blocking.js
```

### Test Scenarios

1. **Blocked IPs**: `111.x.x.x`, `185.x.x.x`, `45.x.x.x`, `91.x.x.x`, `104.x.x.x`
2. **Allowed IPs**: `192.168.x.x`, `8.8.8.8`, `unknown`

### Expected Results

- **Blocked IPs**: HTTP 403 with VPN detection message
- **Allowed IPs**: HTTP 200 (success) or HTTP 429 (rate limited)

## Deployment

### Deploy Functions

```bash
# Deploy only functions
node scripts/deploy-functions.js

# Or deploy everything
firebase deploy --only functions
```

### Verify Deployment

1. Check Firebase Functions logs for successful deployment
2. Test with blocked IP using the test script
3. Verify user-facing error messages display correctly

## Maintenance

### Adding New Blocked Ranges

To add new IP ranges to block:

1. Edit `functions/src/index.ts`
2. Add new range to `blockedRanges` array
3. Deploy functions: `firebase deploy --only functions`
4. Test new ranges

### Monitoring

- Check Firebase Functions logs for blocked IP attempts
- Monitor contact form success rates
- Review user feedback for false positives

## Security Considerations

- **False Positives**: Legitimate users with VPNs will see the message
- **Bypass Attempts**: Users can disable VPN to submit forms
- **IP Spoofing**: Advanced attackers might spoof IP headers
- **Logging**: All blocked attempts are logged with IP addresses

## Future Enhancements

- **Dynamic IP Lists**: Integrate with threat intelligence feeds
- **Whitelist Management**: Allow trusted VPN providers
- **Geolocation Blocking**: Block by country/region if needed
- **Rate Limiting**: Enhanced rate limiting by IP ranges
- **Machine Learning**: AI-based spam detection

## Support

For issues or questions about IP blocking:

1. Check Firebase Functions logs
2. Review test script results
3. Verify IP ranges in blocked list
4. Test with known good/bad IPs



