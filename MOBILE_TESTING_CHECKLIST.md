# Mobile App Testing Checklist — imbobi

Complete this checklist before submitting builds to App Store and Play Store.

**Platform:** iOS | Android (both)
**Version:** 1.0.0
**Date Tested:** ___________
**Tester:** ___________

---

## Pre-Build Checks

- [ ] Code pushed to main branch
- [ ] All dependencies resolved: `pnpm install`
- [ ] Type checking passes: `pnpm type-check`
- [ ] Linting passes: `pnpm lint`
- [ ] No console errors in development
- [ ] Version bumped in app.config.ts
- [ ] BuildNumber/versionCode incremented
- [ ] CHANGELOG updated
- [ ] Environment variables verified
- [ ] `.env` file not committed

---

## Build Checks

### iOS Build
- [ ] BuildNumber incremented
- [ ] iOS bundle identifier: com.imbobi.app
- [ ] Deployment target: iOS 13.4+
- [ ] All required icons provided (1024x1024 PNG)
- [ ] Splash image provided (1242x2208 PNG)
- [ ] Build completed without errors
- [ ] Build downloaded from EAS
- [ ] App signed correctly

### Android Build
- [ ] VersionCode incremented
- [ ] Package name: com.imbobi.app
- [ ] Min SDK: 24 (Android 7.0+)
- [ ] Target SDK: 34 (Android 14)
- [ ] All required icons provided (512x512 PNG)
- [ ] Build completed without errors
- [ ] AAB generated for production
- [ ] APK available for testing

---

## Launch & Stability

### iOS
- [ ] App launches without crash
- [ ] Splash screen displays correctly (1-2 seconds)
- [ ] App doesn't crash on cold start
- [ ] App doesn't crash on background/foreground switch
- [ ] No memory leaks visible in Xcode
- [ ] Navigation UI renders correctly
- [ ] No layout issues on iPhone 12-15 sizes
- [ ] Landscape mode works (if supported)

### Android
- [ ] App launches without crash
- [ ] Splash screen displays correctly (1-2 seconds)
- [ ] App doesn't crash on cold start
- [ ] App doesn't crash on background/foreground switch
- [ ] Android Studio debugger shows no errors
- [ ] Navigation UI renders correctly
- [ ] No layout issues on Pixel 6-8 devices
- [ ] Landscape mode works (if supported)

---

## Authentication Flow

### Sign Up
- [ ] Sign up screen loads
- [ ] Email validation works
- [ ] Password requirements enforced
- [ ] Terms & conditions link works
- [ ] Privacy policy link works
- [ ] Sign up button submits to API
- [ ] Loading indicator shows during signup
- [ ] Success message displays
- [ ] User automatically signed in after signup
- [ ] Verification email sent (check test inbox)

### Sign In
- [ ] Sign in screen loads
- [ ] Email field accepts valid email
- [ ] Password field masks input
- [ ] Remember me toggle works (if implemented)
- [ ] Sign in button submits to API
- [ ] Invalid credentials show error
- [ ] Valid credentials sign in user
- [ ] JWT token stored securely
- [ ] Refresh token stored securely
- [ ] Logout clears tokens

### Password Reset
- [ ] Forgot password link visible
- [ ] Email input validates
- [ ] Reset email sent
- [ ] Reset link works
- [ ] New password form shows
- [ ] Password requirements enforced
- [ ] Confirmation message displays
- [ ] User can sign in with new password

---

## Permissions (iOS & Android)

### Location Permission
- [ ] Permission prompt shows on first use
- [ ] Prompt text is clear and justified
- [ ] "Always" option available (iOS)
- [ ] "While Using" option available
- [ ] "Don't Allow" option available
- [ ] Location works when granted
- [ ] Feature disabled when denied
- [ ] User can change permission in Settings

### Camera Permission
- [ ] Permission prompt shows on first use
- [ ] Prompt text is clear
- [ ] Camera works when granted
- [ ] Error message when denied
- [ ] User can enable in Settings

### Photo Library Permission
- [ ] Permission prompt shows on first use
- [ ] Prompt text is clear
- [ ] Photo picker works when granted
- [ ] Error message when denied
- [ ] User can enable in Settings

### Platform-Specific (Android)
- [ ] CAMERA permission granted
- [ ] FINE_LOCATION permission granted
- [ ] COARSE_LOCATION permission granted
- [ ] READ_EXTERNAL_STORAGE permission granted (if API < 33)
- [ ] Runtime permission dialogs appear at right time

---

## KYC (Know Your Customer) Flow

- [ ] KYC prompt appears after signup
- [ ] "Take Photo" option works
- [ ] "Choose from Library" option works
- [ ] Camera opens correctly
- [ ] Photo selected displays preview
- [ ] Cropping tool works (if implemented)
- [ ] Submit button uploads to API
- [ ] Loading indicator shows during upload
- [ ] Success message displays
- [ ] KYC status updates in profile
- [ ] User can retry if submission fails
- [ ] Large images compressed before upload
- [ ] Upload handles poor network gracefully

---

## Obra List & Map

- [ ] Obra list screen loads
- [ ] Obas load from API
- [ ] List displays obra names and locations
- [ ] Map shows obra pins
- [ ] Tap obra in list navigates to detail
- [ ] Tap obra pin navigates to detail
- [ ] Search/filter works (if implemented)
- [ ] Pull-to-refresh works
- [ ] Pagination works (if applicable)
- [ ] Offline: cached obas display
- [ ] Offline: cannot sync new obas
- [ ] Reconnect: list refreshes automatically

---

## Obra Detail Screen

- [ ] Detail screen loads obra data
- [ ] Address displays correctly
- [ ] Photos/evidence gallery works
- [ ] Evidence timeline displays
- [ ] Evidence is chronologically ordered
- [ ] Tap evidence photo enlarges it
- [ ] Obra status badge displays
- [ ] Progress indicator shows (if applicable)
- [ ] Edit button works (if owner)
- [ ] Share button works
- [ ] Map shows obra location
- [ ] Back navigation works
- [ ] Offline: detail data cached

---

## Evidence Capture

- [ ] Evidence button on obra detail
- [ ] "Take Photo" option opens camera
- [ ] Camera displays live preview
- [ ] Capture button takes photo
- [ ] Photo preview shows after capture
- [ ] Retake option works
- [ ] Use photo option submits
- [ ] Location validation passes (within geofence)
- [ ] Upload progress shows
- [ ] Success message displays
- [ ] Photo appears in timeline
- [ ] Failed upload shows retry option
- [ ] Offline: photo queued for upload
- [ ] Offline: upload completes when online

---

## Credit Simulator

- [ ] Simulator screen loads
- [ ] Loan amount input accepts numbers
- [ ] Loan term dropdown works
- [ ] Loan purpose dropdown works
- [ ] Simulate button submits
- [ ] Interest rate displays
- [ ] Monthly payment displays
- [ ] Total amount displays
- [ ] Calculations are correct
- [ ] Share button works
- [ ] Error message on invalid input

---

## User Profile & Settings

- [ ] Profile screen loads
- [ ] User name displays
- [ ] User email displays
- [ ] Profile photo displays
- [ ] Edit profile button works
- [ ] Edit profile saves changes
- [ ] Change password form works
- [ ] Settings screen accessible
- [ ] App version displays
- [ ] Build number displays (iOS)
- [ ] Version code displays (Android)
- [ ] Environment indicator shows (if not prod)
- [ ] Logout button works
- [ ] Logout clears all data

---

## Offline Functionality

- [ ] Enable Airplane Mode on device
- [ ] App displays cached data
- [ ] Offline indicator shows (if implemented)
- [ ] Cached evidence loads
- [ ] Cached obas load
- [ ] Cannot create new evidence (disabled or error)
- [ ] Cannot upload new photos
- [ ] Offline flag stored in async storage
- [ ] Disable Airplane Mode
- [ ] App reconnects automatically
- [ ] Queued actions sync to server
- [ ] UI updates after sync
- [ ] No duplicate data after sync

---

## Push Notifications

- [ ] Firebase Cloud Messaging configured
- [ ] Device receives test notification
- [ ] Notification displays in foreground
- [ ] Notification displays in background
- [ ] Tap notification opens app
- [ ] Notification deeplink works
- [ ] Badge count increments (iOS)
- [ ] Sound plays (if enabled)
- [ ] User can disable notifications in settings

---

## Network & API

- [ ] API URL points to correct environment
- [ ] All API calls use HTTPS
- [ ] JWT tokens sent in Authorization header
- [ ] Refresh token used when access token expires
- [ ] 401 error triggers re-login
- [ ] 403 error displays permission error
- [ ] 404 error displays not found message
- [ ] 500 error shows retry option
- [ ] Network timeout handled gracefully
- [ ] Slow network shows loading indicators

---

## Storage & Data

- [ ] Local data persists after app close
- [ ] Local data persists after device restart
- [ ] Secure storage used for tokens
- [ ] Sensitive data encrypted
- [ ] Cache cleared on logout
- [ ] Database migrations work (if applicable)
- [ ] Large images stored in file system (not memory)

---

## UI/UX & Accessibility

- [ ] Font sizes readable (not too small)
- [ ] Colors have sufficient contrast
- [ ] Buttons are easily tappable (>44x44 points)
- [ ] Links are underlined or clearly styled
- [ ] Form labels are clear
- [ ] Error messages are helpful
- [ ] Loading states are visible
- [ ] Back gesture works (iOS)
- [ ] Hardware back button works (Android)
- [ ] Keyboard appears/disappears correctly
- [ ] VoiceOver works (iOS)
- [ ] TalkBack works (Android)
- [ ] Right-to-left language layout (if supported)

---

## Performance

- [ ] App startup time < 2 seconds
- [ ] List scroll smooth (60 FPS)
- [ ] Map pan/zoom smooth
- [ ] No visible jank or stuttering
- [ ] Memory usage reasonable
- [ ] Battery usage reasonable
- [ ] Network requests optimized
- [ ] Images cached appropriately

---

## Security

- [ ] API calls use HTTPS only
- [ ] JWT tokens stored securely
- [ ] Refresh tokens stored securely
- [ ] Sensitive data not logged
- [ ] No credentials in app config
- [ ] No hardcoded API keys
- [ ] CSRF protection (if applicable)
- [ ] Input validation on forms
- [ ] SQL injection protection (API level)
- [ ] XSS protection (if webview used)

---

## Device-Specific Tests

### iOS
- [ ] iPhone SE (small screen)
- [ ] iPhone 15 (standard screen)
- [ ] iPhone 15 Pro Max (large screen)
- [ ] iPad (if supported)
- [ ] Safe area respected (notch, home indicator)
- [ ] Landscape orientation (if supported)
- [ ] Portrait orientation only (if design requires)

### Android
- [ ] Pixel 6 (5.8", ~2.75x scale)
- [ ] Pixel 8 (6.7", ~2.75x scale)
- [ ] Samsung Galaxy S21 (6.2")
- [ ] Samsung Galaxy Tab (if supported)
- [ ] Android 8 (API 26) - min supported
- [ ] Android 14 (API 34) - latest
- [ ] Landscape orientation (if supported)

---

## Store Submission Checklist

### App Information
- [ ] App name finalized
- [ ] App description written
- [ ] Category selected (Finance)
- [ ] Keywords/tags relevant
- [ ] Content rating completed
- [ ] Privacy policy URL (HTTPS)
- [ ] Support email provided
- [ ] Website URL provided

### Metadata & Assets
- [ ] App icon (1024x1024 PNG)
- [ ] Feature graphic (iOS: 1200x630, Android: 1024x500)
- [ ] Screenshots (min 2, max 10)
- [ ] Preview video (optional, recommended)
- [ ] Promotional image (800x600 PNG)

### iOS App Store
- [ ] App Store Connect account created
- [ ] App ID created with capabilities
- [ ] Provisioning profile generated
- [ ] Distribution certificate valid
- [ ] TestFlight build tested
- [ ] All app information filled in
- [ ] Screenshots in all required languages
- [ ] App Review Information filled in
- [ ] License agreement selected
- [ ] Export Compliance completed
- [ ] Advertising Identifier (IDFA) disclosed

### Google Play Store
- [ ] Google Play Console account created
- [ ] App bundle (AAB) generated
- [ ] Content rating completed (IARC)
- [ ] Data privacy & security questionnaire completed
- [ ] Privacy policy linked
- [ ] Content guidelines accepted
- [ ] App store listing complete
- [ ] Screenshots uploaded
- [ ] Feature graphic uploaded
- [ ] Release notes written
- [ ] Testing status: Internal > Staging > Production

---

## Post-Launch Monitoring

- [ ] Crash reporting enabled (Firebase Crashlytics)
- [ ] Analytics enabled (Firebase Analytics)
- [ ] Error tracking enabled (Sentry if implemented)
- [ ] Monitor crash rate in console
- [ ] Review user feedback daily for first week
- [ ] Monitor ratings and reviews
- [ ] Check for critical bugs requiring hotfix
- [ ] Plan for version updates if needed

---

## Sign-Off

- [ ] All critical tests passed
- [ ] All major tests passed
- [ ] Known issues documented
- [ ] Ready for app store submission
- [ ] Approved by product team
- [ ] Approved by security team (if applicable)

**Tester Signature:** ___________

**Date:** ___________

**Notes:**
```
[Add any additional notes or observations]
```

---

**This checklist should be completed before each production release.**
