# Mobile Build Quick Reference — imbobi

Fast lookup for common mobile build and deployment tasks.

---

## Quick Commands

### Development
```bash
pnpm install                    # Install all dependencies
pnpm dev                        # Start web + API
cd apps/mobile && pnpm ios      # Run on iOS simulator
cd apps/mobile && pnpm android  # Run on Android emulator
pnpm type-check                 # Type checking
pnpm lint                       # Linting
```

### Build & Submit
```bash
cd apps/mobile

# Preview builds (APK, simulator-compatible)
pnpm build:preview:ios          # iOS preview
pnpm build:preview:android      # Android preview
pnpm build:preview              # Both platforms

# Production builds (App Store, Play Store)
pnpm build:production:ios       # iOS AAB
pnpm build:production:android   # Android AAB
pnpm build:production           # Both platforms

# Check build status
pnpm build:list                 # List all builds

# Submit to stores
pnpm submit:ios                 # Submit iOS to App Store
pnpm submit:android             # Submit Android to Play Store
pnpm submit:production          # Submit both

# Over-the-air updates
pnpm update:ios                 # Update iOS build
pnpm update:android             # Update Android build
pnpm update:all                 # Update both

# Credentials
pnpm credentials                # Manage all credentials
pnpm exec eas credentials -p ios      # iOS credentials
pnpm exec eas credentials -p android  # Android credentials
```

---

## Version Bumping

### Before every release:

1. **Update app.config.ts:**
```ts
// Semantic version (displayed to users)
version: "1.0.1"

// iOS build number (must increment)
ios: { buildNumber: "2" }

// Android version code (must increment)
android: { versionCode: 2 }
```

2. **Update CHANGELOG.md**
3. **Commit and push:**
```bash
git commit -am "chore: bump mobile version to 1.0.1"
git push origin main
```

---

## Configuration Files

### eas.json
- **Location:** `/home/user/alagami-site/eas.json`
- **Profiles:**
  - `development`: Dev client builds
  - `preview`: APK/simulator builds
  - `production`: App Store & Play Store builds

### app.config.ts
- **Location:** `/home/user/alagami-site/apps/mobile/app.config.ts`
- **Bundle ID:** `com.imbobi.app`
- **Package:** `com.imbobi.app`
- **Version:** Semantic (1.0.0)
- **buildNumber:** iOS integer
- **versionCode:** Android integer

---

## Environment Variables

```bash
# Required for builds
EXPO_PUBLIC_API_URL=https://api.imbobi.com
EAS_PROJECT_ID=your-project-id

# Optional for local development
EXPO_PUBLIC_ENVIRONMENT=production
```

---

## Build Times

| Platform | Profile     | Time  | Output         |
|----------|-------------|-------|----------------|
| iOS      | production  | 30m   | AAB            |
| iOS      | preview     | 25m   | Simulator-compatible |
| Android  | production  | 35m   | AAB            |
| Android  | preview     | 30m   | APK            |

---

## Artifact Locations

After builds complete:

| Platform | Type       | Location             |
|----------|------------|----------------------|
| iOS      | Production | EAS Download         |
| iOS      | Preview    | EAS Download or TestFlight |
| Android  | Production | EAS Download         |
| Android  | Preview    | EAS Download         |

---

## Store Links

**App Store Connect:** https://appstoreconnect.apple.com
- **Bundle ID:** com.imbobi.app
- **App ID:** [Find in Your Apps]

**Google Play Console:** https://play.google.com/console
- **Package Name:** com.imbobi.app
- **App ID:** [Find in Your Apps]

---

## Testing Shortcuts

### iOS Simulator
```bash
cd apps/mobile
pnpm ios
# Simulator opens automatically
# Press 'i' in Terminal to reload
```

### Android Emulator
```bash
cd apps/mobile
pnpm android
# Emulator must be running
# Press 'a' in Terminal to reload
```

### Type Check
```bash
pnpm type-check
# Must pass before build
```

### Lint Check
```bash
pnpm lint
# Must pass before submission
```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "No provisioning profiles" | `pnpm exec eas credentials -p ios --clear && pnpm exec eas credentials -p ios` |
| "Gradle build failed" | `rm -rf ~/.gradle && cd apps/mobile && ./gradlew wrapper` |
| "Build timeout" | Resubmit build (EAS will retry) |
| "Module not found" | `pnpm install && pnpm prebuild` |
| "Type errors" | Run `pnpm type-check` and fix |
| "Lint errors" | Run `pnpm lint` and fix |
| "App crashes on launch" | Test preview build first |

---

## Monitoring

### Crash Reports
- **iOS:** App Store Connect > TestFlight > Crashes
- **Android:** Play Console > Quality > Crashes & ANRs

### Performance Metrics
- **iOS:** App Store Connect > Metrics
- **Android:** Play Console > Quality > Vitals

### User Reviews
- **iOS:** App Store Connect > Reviews
- **Android:** Play Console > Reviews

---

## Key Contacts

- **Apple Developer Support:** https://developer.apple.com/contact
- **Google Play Support:** https://support.google.com/googleplay/android-developer
- **Expo Support:** https://discord.gg/expo
- **React Native Docs:** https://reactnative.dev

---

## Checklist Before Submission

- [ ] Version bumped
- [ ] BuildNumber/versionCode incremented
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Tests pass (if applicable)
- [ ] Build completed without errors
- [ ] Build tested on device
- [ ] Screenshots uploaded
- [ ] Description updated
- [ ] Privacy policy linked
- [ ] API URL set to production
- [ ] No secrets in code

---

**Last Updated:** May 28, 2026
