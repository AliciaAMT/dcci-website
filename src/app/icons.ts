import { addIcons, setAssetPath } from 'ionicons';
import * as i from 'ionicons/icons';

let registered = false;
export function registerIonicons(): void {
  if (registered) return;
  registered = true;

  // Avoid "Invalid base URL" if the loader ever fetches by URL
  try {
    setAssetPath(document.baseURI || '/');
  } catch {}

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
  });
}
