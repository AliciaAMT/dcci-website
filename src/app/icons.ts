import { addIcons, setAssetPath } from 'ionicons';
import * as i from 'ionicons/icons';

let registered = false;
export function registerIonicons(): void {
  if (registered) return;
  registered = true;

  // Set asset path - use static path for production builds
  try {
    // For production builds, always use root path to avoid base URL issues
    setAssetPath('/');
  } catch (error) {
    console.warn('Failed to set asset path:', error);
  }

  addIcons({
    // ✱ include EVERY name you use in templates:
    'home-outline': i.homeOutline,
    'construct-outline': i.constructOutline,
    'hammer-outline': i.hammerOutline,
    'videocam-outline': i.videocamOutline,
    'phone-portrait-outline': i.phonePortraitOutline,
    'search-outline': i.searchOutline,
    'eye-outline': i.eyeOutline,
    'shield-checkmark-outline': i.shieldCheckmarkOutline,
    'archive-outline': i.archiveOutline,
    'open-outline': i.openOutline,
    'information-circle-outline': i.informationCircleOutline,
    'mail-outline': i.mailOutline,
    'logo-youtube': i.logoYoutube,
    'card-outline': i.cardOutline,
    'heart-outline': i.heartOutline,
    'close-outline': i.closeOutline,
    'wallet-outline': i.walletOutline,
    'time-outline': i.timeOutline,
    // Contact form icons
    'share-social-outline': i.shareSocialOutline,
    'send-outline': i.sendOutline,
    'checkmark-circle-outline': i.checkmarkCircleOutline,
    'alert-circle-outline': i.alertCircleOutline,
    // Admin login icons
    'lock-closed-outline': i.lockClosedOutline,
    'eye-off-outline': i.eyeOffOutline,
  });
}
