# EAS Setup Checklist

Quick reference for setting up EAS (Expo Application Services) for imobi mobile builds.

## One-Time Setup

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli@latest
   ```

2. **Create Expo Account** (if needed)
   - Visit https://expo.dev and sign up
   - Confirm email

3. **Login to EAS**
   ```bash
   eas login
   ```

4. **Link EAS Project**
   ```bash
   cd apps/mobile
   eas project:info
   ```
   - If first time, EAS will create a project automatically
   - Copy the `EAS_PROJECT_ID` and add to `.env.local`

5. **Setup GitHub Actions Secrets**
   - Go to repo Settings > Secrets and variables > Actions
   - Add `EAS_TOKEN`:
     ```bash
     eas token create --non-interactive
     ```
   - Add `SLACK_WEBHOOK_URL` (optional, for notifications)

## Build Commands

```bash
# Development (local testing)
pnpm dev

# Preview (internal APK/simulator)
cd apps/mobile && pnpm build:preview

# Staging (TestFlight/internal track)
pnpm build:staging

# Staging iOS only
pnpm build:staging:ios

# Staging Android only
pnpm build:staging:android

# Production (App Store & Play Store)
pnpm build:production
```

## Automated Workflow

Pushes to branches trigger automatic builds:
- `releases/staging` → Internal staging build
- `releases/production` → Store submission build

Monitor in GitHub Actions tab.

## Initial Credentials Setup

First build on each platform will prompt for credentials:
- **iOS**: Apple Developer account (required for app signing)
- **Android**: Keystore generation (automatic)

EAS stores them securely and reuses for future builds.

## Environment Variables

Set per-profile in `eas.json`:
- `EXPO_PUBLIC_API_URL` — points to staging/production API
- `EXPO_PUBLIC_*` — public (visible in app)
- Other vars require GitHub Actions secrets if not in `eas.json`

## Documentation

- **Full guide**: `apps/mobile/MOBILE_BUILD.md`
- **Configuration**: `apps/mobile/eas.json`
- **Workflow**: `.github/workflows/eas-build.yml`
- **Example env**: `apps/mobile/.env.example`

## Troubleshooting

**Can't find EAS_PROJECT_ID?**
```bash
cd apps/mobile && eas project:info
```

**Credentials error?**
```bash
eas credentials --platform ios  # or android
```

**Build status?**
```bash
eas build:list
```

**Recent logs?**
```bash
eas build:log [BUILD_ID]
```
