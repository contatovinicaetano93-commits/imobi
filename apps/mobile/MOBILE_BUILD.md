# imobi Mobile App — Build & Deployment Guide

## Prerequisites

1. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli@latest
   ```

2. **Expo Account**: Create at [expo.dev](https://expo.dev)
   ```bash
   eas login
   ```

3. **Environment Variables**:
   - Add `EAS_PROJECT_ID` to your `.env.local`
   - Configure API URLs per environment in `eas.json`

4. **Apple Developer & Google Play Accounts** (for production submissions)
   - Apple Developer Program membership ($99/year)
   - Google Play Developer account ($25 one-time)

## Build Profiles

### Development
Local testing with Expo Go or development client:
```bash
pnpm dev
```

### Preview
Internal distribution (APK/Simulator for testing):
```bash
pnpm build:preview
```
- **Environment**: Staging API (`https://staging-api.imbobi.com`)
- **iOS**: Simulator build (testflight requires production profile)
- **Android**: APK for direct installation

### Staging
Internal TestFlight/Google Play track:
```bash
pnpm build:staging
```
- **Environment**: Staging API
- **iOS**: Ad-hoc provisioning (install via TestFlight)
- **Android**: Internal testing track

### Production
App Store & Google Play:
```bash
pnpm build:production
```
- **Environment**: Production API (`https://api.imbobi.com`)
- **Credentials**: Remote (managed by EAS)
- **Auto-increment**: Version automatically bumped per build
- **Submission**: Included (builds auto-submit to stores)

## Workflow

### Local Development
```bash
cd apps/mobile
pnpm install
pnpm type-check
pnpm dev
```

### Building for Testing
```bash
# First build: create credentials
eas build --platform ios --profile preview
eas build --platform android --profile preview

# View build status
eas build:list
```

### Staging Release
1. Merge to `releases/staging` branch
2. GitHub Actions runs automated build (see workflow)
3. Monitor: `eas build:list`
4. TestFlight link: Check EAS dashboard

### Production Release
1. Bump version in `app.config.ts`
2. Merge to `releases/production` branch
3. GitHub Actions runs build & submission
4. Both stores receive build simultaneously
5. Manual approval required in App Store Connect
6. Google Play auto-approves (configure review time in Play Console)

## Credentials Management

### First-time Setup
EAS will prompt you to:
1. Create signing certificates (iOS)
2. Create keystore (Android)
3. Store them securely in EAS servers

### Regenerate Credentials
```bash
# iOS certificate
eas credentials --platform ios

# Android keystore
eas credentials --platform android
```

## Environment Configuration

Modify `eas.json` > `build.{profile}.env` for API URLs:

```json
{
  "build": {
    "staging": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.imbobi.com"
      }
    }
  }
}
```

Access in code via `process.env.EXPO_PUBLIC_API_URL` or native code.

## Troubleshooting

### Build Fails: "Credentials Not Found"
```bash
eas credentials --platform ios --clear
eas build --platform ios --profile production
```

### Build Stuck
```bash
# Cancel and retry
eas build:cancel [BUILD_ID]
eas build --platform ios --profile production
```

### Version Conflicts
- Ensure `app.config.ts` version < highest build version
- Production auto-increments; don't manually bump after first prod build
- Check `eas build:list` for existing versions

## GitHub Actions Integration

Automated builds on pushes to `releases/*` branches (see workflow file).

**What happens**:
- Push to `releases/staging` → Internal preview build
- Push to `releases/production` → Store submission build
- Logs available in GitHub Actions tab

**Trigger manually**:
```bash
git push origin release-branch --force  # re-run workflow
```

## Security Checklist

- [x] `.env` files are in `.gitignore`
- [x] Credentials stored remotely (EAS managed)
- [x] No hardcoded API keys in source
- [x] EXPO_PUBLIC_* prefix on public env vars only
- [x] Private vars (secrets) handled via GitHub Actions secrets

## Performance Tips

- Use `--skip-credentials-check` if credentials already cached
- Parallel builds: `eas build --platform ios --platform android`
- Check build logs: `eas build:log [BUILD_ID]`
- Cache optimization: EAS caches dependencies automatically

## References

- [EAS Build Docs](https://docs.expo.dev/eas-update/build/)
- [App.config.ts Config](https://docs.expo.dev/versions/latest/config/app/)
- [Credentials Docs](https://docs.expo.dev/app-signing/managing-credentials/)
- [GitHub Actions for EAS](https://docs.expo.dev/eas/github-actions/)
