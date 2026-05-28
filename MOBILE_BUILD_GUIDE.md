# Mobile Build Guide — imbobi iOS & Android

This guide covers building, testing, and submitting the imbobi mobile app to iOS App Store and Google Play Store.

**Technology Stack:**
- Framework: Expo 51 with Expo Router 3.5
- Runtime: React Native 0.74
- Build Service: EAS (Expo Application Services)
- Distribution: iOS App Store & Google Play Store

---

## 1. Prerequisites

### Required Tools
```bash
# Node.js 18.x or higher
node --version  # v18.x+

# pnpm package manager
pnpm --version  # 8.x+

# Expo CLI (auto-installed via project dependencies)
pnpm exec eas --version

# Xcode (for iOS development) - macOS only
# Install from App Store or: xcode-select --install

# Android Studio (for Android development)
# Download from: https://developer.android.com/studio

# GitHub/CLI tools for submitting to stores
gh --version
```

### Accounts Required
- **Apple Account**: Apple Developer Program membership ($99/year)
- **Google Account**: Google Play Developer Console ($25 one-time)
- **Expo Account**: Free account at https://expo.dev (for EAS builds)
- **AWS S3**: For storage of evidence photos (optional, can use Cloudflare R2)

---

## 2. Build Configuration

### Configuration Files

**eas.json** — EAS build profiles
- `development`: Development client builds for testing (simulator only)
- `preview`: APK preview builds for Android device testing
- `production`: App Store & Play Store production builds (AAB for Android)

**app.config.ts** — Expo configuration
- App metadata and icons
- iOS bundle identifier: `com.imbobi.app`
- Android package: `com.imbobi.app`
- Permissions (location, camera, photo library)
- Build numbers and version management

### Key Build Parameters

**iOS Build Number (buildNumber in app.config.ts):**
- Format: String (e.g., "1", "2")
- Must increment with each iOS App Store submission
- Used internally by Apple, not displayed to users

**Android Version Code (versionCode in app.config.ts):**
- Format: Integer (e.g., 1, 2, 3)
- Must increment with each Play Store release
- Managed automatically in app.config.ts

**Semantic Version (version in app.config.ts):**
- Format: "MAJOR.MINOR.PATCH" (e.g., "1.0.0", "1.0.1", "1.1.0")
- Displayed to users in app stores
- Increment following semantic versioning

---

## 3. iOS Build Setup

### Step 1: Generate App Store Connect Certificate

```bash
# Create Apple Developer account at https://developer.apple.com
# Once enrolled in Apple Developer Program:

# 1. Go to https://appstoreconnect.apple.com
# 2. Create a new App ID:
#    - App ID: com.imbobi.app
#    - Capabilities: Push Notifications, Location Services, Camera, Photos

# 3. Create provisioning profile:
#    - Type: iOS App Store
#    - Bundle ID: com.imbobi.app
#    - Download provisioning profile

# 4. Create code signing certificate:
#    - Certificate type: Distribution
#    - Download certificate

# 5. Get Team ID:
#    - Settings > Membership
#    - Copy "Team ID"
```

### Step 2: Configure EAS with Apple Credentials

```bash
# Login to EAS
pnpm exec eas login

# Fetch Apple Team ID
pnpm exec eas credentials

# Set up iOS credentials in EAS
pnpm exec eas credentials -p ios

# When prompted:
# 1. Select "Production" distribution type
# 2. Choose "App Store Connect API Key" (recommended)
# 3. Create API key at: https://appstoreconnect.apple.com/access/api
#    - Key type: App Store Connect API
#    - Access level: App Manager or Admin
#    - Save key ID and Issuer ID
```

### Step 3: Create iOS Build

```bash
# Build for App Store (AAB - Apple App Bundle)
pnpm exec eas build --platform ios --profile production

# Build for simulator testing
pnpm exec eas build --platform ios --profile preview

# Monitor build status
pnpm exec eas build:list
```

### Step 4: Test iOS Build

**Option A: Simulator Testing**
```bash
# Download simulator build
pnpm exec eas build:list --platform ios
# Click "Install" button for preview build

# Or manually:
cd apps/mobile
pnpm ios
```

**Option B: TestFlight Testing**
```bash
# After production iOS build completes:
# 1. Go to https://appstoreconnect.apple.com
# 2. TestFlight tab
# 3. Add testers (Apple ID emails)
# 4. Install TestFlight app on iOS device
# 5. Accept TestFlight invitation
# 6. Install app and test core flows
```

### Core iOS Testing Checklist
- [ ] App launches without crashes
- [ ] Login/register flow works
- [ ] Location permission prompt appears
- [ ] Camera permission prompt appears
- [ ] Photo library permission prompt appears
- [ ] KYC image upload works
- [ ] Map displays correctly
- [ ] Evidence capture and upload works
- [ ] Offline functionality (async storage)
- [ ] Push notifications received
- [ ] App version displays correctly in Settings

---

## 4. Android Build Setup

### Step 1: Generate Android Keystore

```bash
# Generate keystore for signing
keytool -genkey -v -keystore imbobi-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -alias imbobi-key

# When prompted:
# Keystore password: [strong-password-min-16-chars]
# Key password: [same as keystore or different]
# Fill in certificate details:
#   - First/Last Name: imbobi App
#   - Organization: imbobi Inc
#   - City: [your-city]
#   - State: [your-state]
#   - Country: [your-country-code-eg-BR]

# Output: imbobi-release.keystore file created
# IMPORTANT: Keep this file safe and backed up!
# Loss means you cannot update the app on Play Store

# Store keystore securely (NOT in git):
# Option A: AWS Secrets Manager
# Option B: GitHub Secrets
# Option C: Encrypted on CI/CD system
```

### Step 2: Create Google Play Service Account

```bash
# Go to: https://console.cloud.google.com
# 1. Create new project: "imbobi-mobile"
# 2. Enable Google Play Android Developer API
# 3. Create Service Account:
#    - Service account name: imbobi-play-deploy
#    - Grant role: Editor
#    - Create JSON key
#    - Download google-play-key.json (KEEP SECURE!)

# Alternatively, use EAS internal app signing:
# EAS can manage signing for you (simpler, recommended)
```

### Step 3: Configure EAS with Android Credentials

```bash
# Login to EAS
pnpm exec eas login

# Set up Android credentials
pnpm exec eas credentials -p android

# Options:
# Option A: Let EAS manage signing (simpler)
#   - Select "Build using EAS"
#   - EAS generates and manages keystore
#
# Option B: Use custom keystore
#   - Select "Use your own keystore"
#   - Upload imbobi-release.keystore
#   - Provide passwords

# Recommended: Use EAS managed signing for simplicity
```

### Step 4: Create Android Build

```bash
# Build APK for testing (TestFlight-like distribution)
pnpm exec eas build --platform android --profile preview

# Build AAB for Play Store (production)
pnpm exec eas build --platform android --profile production

# Monitor build
pnpm exec eas build:list --platform android
```

### Step 5: Test Android Build

**Option A: Emulator Testing**
```bash
# Download preview APK from EAS
pnpm exec eas build:list --platform android

# Install on emulator
# Android Studio > Device Manager > Start emulator
# Drag APK to emulator or:
adb install downloaded-apk.apk

# Test core flows
```

**Option B: Physical Device Testing**
```bash
# Download preview APK
# Email APK link to testers
# Testers enable: Settings > Unknown sources > Install APK
# Or use Google Play beta testing (requires Play Store setup)
```

### Core Android Testing Checklist
- [ ] App launches without crashes
- [ ] Login/register flow works
- [ ] Runtime permissions prompts appear (location, camera, photos)
- [ ] KYC image upload works
- [ ] Map displays correctly
- [ ] Evidence capture and upload works
- [ ] Offline functionality works
- [ ] Push notifications received
- [ ] App version displays correctly in About
- [ ] Manifest validates (no missing permissions)

---

## 5. Core Feature Testing

Test these flows on both iOS and Android:

### Authentication
```
1. Open app
2. Tap "Create Account"
3. Enter email, password, name
4. Receive verification email
5. Click verification link
6. Sign in with credentials
7. Verify JWT tokens work
```

### KYC Upload
```
1. After sign-in, KYC prompt appears
2. Select "Take Photo" or "Upload from Library"
3. Capture/select valid ID image
4. Tap "Submit"
5. Verify server validation (PostGIS coordinates required)
6. KYC status updates in API
```

### Obra List & Details
```
1. Navigate to "Minhas Obras"
2. List displays obra locations (map view)
3. Tap obra details
4. View obra information (address, photos, timeline)
5. Verify offline data caching
```

### Evidence Capture
```
1. Navigate to obra detail
2. Tap "Adicionar Evidência"
3. Device requests location and camera permissions
4. Capture photo
5. App validates location is within geofence (PostGIS)
6. Upload photo to S3
7. Verify photo appears in timeline
```

### Credit Simulator
```
1. Navigate to "Simular Crédito"
2. Enter loan amount, term, purpose
3. Tap "Simular"
4. View interest rate, monthly payment
5. Verify calculations are correct
6. Share simulation
```

### Offline Functionality
```
1. Enable airplane mode
2. App displays cached data
3. Actions queued in local storage
4. Disable airplane mode
5. App syncs queued actions
6. Verify all data updated
```

### Push Notifications
```
1. Ensure Firebase Cloud Messaging configured
2. Send test notification from Firebase Console
3. App receives notification in foreground
4. Tap notification while app in background
5. Navigate to corresponding section
```

---

## 6. Store Submission

### iOS App Store Submission

**Pre-Submission:**
```bash
# Version must be incremented
# Update version in app.config.ts: "1.0.0" -> "1.0.1"
# Update buildNumber: "1" -> "2"
# Commit and push

# Verify all required keys in app.config.ts:
# - Icon: 1024x1024 PNG
# - Splash: 1242x2208 PNG
# - Screenshots: 1242x2208 PNG (required for each screen)
# - Description, keywords, category filled in
```

**Submit to App Store Connect:**
```bash
# Option A: Automatic submission via EAS
pnpm exec eas submit --platform ios --profile production

# When prompted:
# 1. Apple ID email
# 2. App-specific password (generated at https://appleid.apple.com)
# 3. Review and confirm submission details

# Option B: Manual submission via Transporter
# 1. Download build from EAS
# 2. Open Xcode > Organizer
# 3. Validate and submit build
```

**Review Process:**
- Apple review typically takes 24-48 hours
- Common rejection reasons:
  - Missing privacy policy
  - Location usage not clearly explained
  - Camera/photo permissions required but not justified
  - Crashes on test devices
- Address feedback and resubmit

**Post-Approval:**
- Build moves to "Ready for Sale"
- Set release date (Automatic or Manual)
- Monitor crash reports in TestFlight

### Google Play Store Submission

**Pre-Submission:**
```bash
# Version must be incremented
# Update version in app.config.ts: "1.0.0" -> "1.0.1"
# Update versionCode: 1 -> 2
# Commit and push

# Prepare store assets:
# - App icon: 512x512 PNG
# - Feature graphic: 1024x500 PNG
# - Screenshots: 1080x1920 PNG (phone) + 2560x1600 PNG (tablet)
# - Description, short description, category
# - Privacy policy URL (must be HTTPS)
# - Content rating (questionnaire)
```

**Create Play Store Listing:**
```bash
# Go to: https://play.google.com/console

# 1. Create new app
#    - Name: "imbobi"
#    - Default language: Portuguese (Brazil)
#    - Category: Finance
#    - Content rating: Fill questionnaire

# 2. Fill store listing
#    - Short description: < 80 chars
#    - Full description: 4000 chars max
#    - Screenshots: Upload 2-8 for each device type
#    - Feature graphic, icon, promo image

# 3. Content rating
#    - Complete IARC questionnaire
#    - Get rating certificate

# 4. Privacy policy
#    - Link to https://yoursite.com/privacy-policy
#    - Must explain location, camera, photo permissions
```

**Submit APK/AAB:**
```bash
# Option A: Automatic via EAS
pnpm exec eas submit --platform android --profile production

# When prompted:
# 1. Path to google-play-key.json
# 2. Release track: internal -> alpha -> beta -> production

# Option B: Manual upload
# 1. Go to Play Console > Your app > Release > Production
# 2. Upload AAB from EAS downloads
# 3. Review content rating, pricing, target countries

# Recommended: Use internal testing track first
pnpm exec eas submit --platform android \
  --profile production \
  --track internal
```

**Review Process:**
- Google Play review typically takes 24-48 hours (sometimes faster)
- Automated review checks:
  - Malware scanning
  - Policy compliance (permissions, ads, content)
  - Crashes on test devices
- Manual review for policy violations
- Pre-registration available before launch

**Post-Approval:**
- Build enters staged rollout
- Start with 10% of users
- Monitor crash rate, ratings, reviews
- Increase rollout to 50%, then 100%
- Monitor ANRs (Application Not Responding)

---

## 7. Update Strategy

### Over-The-Air Updates (EAS Updates)

For non-critical bug fixes and feature improvements without app store resubmission:

```bash
# Configure EAS Updates in eas.json:
{
  "updates": {
    "url": "https://u.expo.dev/PROJECT_ID"
  }
}

# Create and publish update:
pnpm exec eas update --platform ios --message "Fix login bug"
pnpm exec eas update --platform android --message "Fix login bug"

# Update deploys in ~5 minutes to all users
# Limited to JavaScript changes (no native code)
# Max update size: 50MB
```

### Version Management Strategy

```
1.0.0  - Initial App Store release
1.0.1  - Bug fix release (app store)
1.1.0  - New feature (app store + OTA update for JS)
1.1.1  - OTA hotfix (no app store submission needed)
1.2.0  - Major feature (app store + native changes)
```

**When to use App Store vs OTA:**
- App Store (new version code): Changes to native code, permissions, or assets
- OTA Update: JavaScript-only fixes, feature toggles, API endpoint changes
- OTA is faster but limited in scope
- Plan major releases quarterly, hotfixes as needed

---

## 8. Monitoring & Support

### Crash Reporting

**TestFlight Crash Reports (iOS):**
- TestFlight automatically collects crashes
- View in App Store Connect > TestFlight > Crashes
- Filter by OS version, device, or date range
- Stack traces help identify issues

**Firebase Crashlytics (Recommended):**
```bash
# Install Firebase SDK
pnpm add firebase @react-native-firebase/app @react-native-firebase/crashlytics

# Configure in app
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  apiKey: process.env.FIREBASE_API_KEY,
  // ...
};

const app = initializeApp(firebaseConfig);
```

**Google Play Crash Reports:**
- View in Play Console > Your app > Quality > Crashes & ANRs
- Detailed stack traces and affected user counts
- Set ANR thresholds for alerts

### User Feedback

**App Store Reviews:**
- Monitor ratings in App Store Connect
- Respond to reviews directly from ASC
- Rating trends indicate quality issues

**Play Store Reviews:**
- View reviews in Play Console
- Reply to reviews (appears for all users)
- Analyze negative reviews for patterns

### Performance Metrics

**Key Metrics to Monitor:**
- Crash rate: < 0.1% (9.9% success)
- ANR rate: < 0.5% (99.5% responsive)
- App size: Keep < 100MB (iOS), < 150MB (Android)
- Startup time: < 2 seconds
- Average rating: Target 4.5+ stars

---

## 9. Troubleshooting

### iOS Build Issues

**"No provisioning profiles with a valid signing certificate found"**
```bash
# Regenerate iOS credentials
pnpm exec eas credentials -p ios --clear
pnpm exec eas credentials -p ios

# Ensure Apple Team ID and Bundle ID match
cat eas.json | grep -A5 '"ios"'
```

**"Unable to activate Distribution certificate"**
- Login to https://developer.apple.com/account
- Go to Certificates, Identifiers & Profiles
- Check certificate is not expired
- Regenerate if needed

**"Build succeeded but app crashes on launch"**
- Check native module versions compatibility
- Run `pnpm outdated` to identify version conflicts
- Test on simulator first: `pnpm exec eas build --platform ios --profile preview`

### Android Build Issues

**"Gradle build failed"**
```bash
# Clear Gradle cache
rm -rf ~/.gradle

# Regenerate Gradle wrapper
cd apps/mobile && ./gradlew wrapper
```

**"Unable to find keystore file"**
- Verify keystore exists and is readable
- Check keystore password is correct
- Regenerate if lost:
```bash
keytool -genkey -v -keystore imbobi-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10950 -alias imbobi-key
```

**"App crashes on Android 12+ (manifest merge conflict)"**
- Check `app.config.ts` for conflicting permissions
- Ensure Android target SDK is 31+ for Android 12 support
- Run manifest validation:
```bash
adb shell dumpsys package com.imbobi.app | grep -i permission
```

### Network/API Issues

**"API calls return 401 (Unauthorized)"**
- Verify `EXPO_PUBLIC_API_URL` in eas.json matches environment
- Check JWT tokens are stored and sent correctly
- Ensure refresh token logic works offline

**"S3 uploads fail in production"**
- Verify AWS credentials are correct
- Check S3 bucket CORS configuration:
```json
{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedOrigins": ["*"],
  "ExposeHeaders": ["ETag"]
}
```
- Test with signed URL instead of temporary credentials

---

## 10. Quick Reference Commands

```bash
# Development
pnpm dev                           # Start dev server
cd apps/mobile && pnpm ios        # Test on iOS simulator
cd apps/mobile && pnpm android    # Test on Android emulator

# Build
pnpm exec eas build --platform ios --profile preview
pnpm exec eas build --platform android --profile preview
pnpm exec eas build --platform ios --profile production
pnpm exec eas build --platform android --profile production

# List builds
pnpm exec eas build:list

# Submit to stores
pnpm exec eas submit --platform ios --profile production
pnpm exec eas submit --platform android --profile production

# Over-the-air updates
pnpm exec eas update --platform ios
pnpm exec eas update --platform android

# Check credentials
pnpm exec eas credentials -p ios
pnpm exec eas credentials -p android

# Type checking
pnpm type-check

# Linting
pnpm exec eslint apps/mobile/app --ext .ts,.tsx
```

---

## 11. Security Checklist

- [ ] Keystore file backed up and secured (not in git)
- [ ] Google Play key.json backed up and secured (not in git)
- [ ] API URLs point to production server
- [ ] JWT secret is strong (> 64 chars, random)
- [ ] S3 bucket has proper access controls (not public)
- [ ] Privacy policy published and linked in app stores
- [ ] Firebase Cloud Messaging credentials secured
- [ ] No credentials in app.config.ts (use env vars)
- [ ] App implements certificate pinning (recommended)
- [ ] Code signing verification enabled

---

## 12. Release Checklist

Before every production release:

- [ ] Increment version in app.config.ts
- [ ] Increment buildNumber (iOS) / versionCode (Android)
- [ ] Update CHANGELOG with user-facing changes
- [ ] Run full test suite: `pnpm test`
- [ ] Run type checking: `pnpm type-check`
- [ ] Build locally: `pnpm build`
- [ ] Test on simulator/emulator
- [ ] Merge to main branch
- [ ] Create git tag: `git tag v1.0.1`
- [ ] Push tags: `git push origin --tags`
- [ ] Create GitHub release with changelog
- [ ] Build iOS: `eas build --platform ios --profile production`
- [ ] Build Android: `eas build --platform android --profile production`
- [ ] Test both builds on real devices
- [ ] Submit to App Store
- [ ] Submit to Play Store
- [ ] Monitor crashes for 24 hours after release
- [ ] Monitor user ratings and reviews

---

## Contact & Support

For issues with:
- **Expo/EAS**: https://discord.gg/expo
- **React Native**: https://reactnative.dev/help
- **App Store**: developer.apple.com/contact
- **Play Store**: support.google.com/googleplay/android-developer

---

**Last Updated:** May 28, 2026
**Maintained By:** imbobi Engineering Team
