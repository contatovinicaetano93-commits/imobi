# Mobile Release Checklist — imbobi

Complete this checklist for every production release to iOS App Store and Google Play Store.

---

## Pre-Release Phase (1-2 days before)

### Code Preparation
- [ ] Feature branch merged to `main`
- [ ] All pull requests reviewed and approved
- [ ] Code conflicts resolved
- [ ] `main` branch is stable
- [ ] Latest code pulled: `git pull origin main`

### Version Management
- [ ] Determine new version: `MAJOR.MINOR.PATCH`
- [ ] Update version in `apps/mobile/app.config.ts`
  - `version: "X.Y.Z"`
  - `ios.buildNumber: "N"`
  - `android.versionCode: N`
- [ ] Update CHANGELOG.md with user-facing changes
- [ ] Commit version changes: `git commit -am "chore: bump version to X.Y.Z"`

### Testing Preparation
- [ ] Ensure `pnpm install` completes without errors
- [ ] Run type checking: `pnpm type-check` (all pass)
- [ ] Run linting: `pnpm lint` (no errors)
- [ ] Run unit tests: `pnpm test` (all pass, if applicable)
- [ ] Run e2e tests: `pnpm test:e2e` (all pass, if applicable)

### Environment Configuration
- [ ] Verify `EXPO_PUBLIC_API_URL` points to production API
- [ ] Verify `EAS_PROJECT_ID` is set correctly
- [ ] Verify no secrets in `.env` file
- [ ] Verify `.env` file not in git: `git check-ignore .env`
- [ ] All environment variables in `eas.json` correct

### Build Configuration Review
- [ ] `apps/mobile/app.config.ts`:
  - [ ] Bundle identifier: `com.imbobi.app`
  - [ ] Package name: `com.imbobi.app`
  - [ ] Min SDK: 24 (Android)
  - [ ] Target SDK: 34 (Android)
  - [ ] Deployment target: 13.4 (iOS)
  - [ ] All permissions listed
  - [ ] All plugins configured
  - [ ] Icons and splash images referenced
- [ ] `eas.json`:
  - [ ] Profile `production` defined
  - [ ] iOS build settings correct
  - [ ] Android build settings correct
  - [ ] iOS submit credentials valid
  - [ ] Android submit credentials valid

---

## Build Phase (1 day before submission)

### Local Verification
- [ ] Clear node_modules if needed: `rm -rf node_modules && pnpm install`
- [ ] Verify app.config.ts syntax: `pnpm exec expo prebuild --clean`
- [ ] Verify no native code changes without build
- [ ] No uncommitted changes: `git status` (clean)

### iOS Build
- [ ] Check EAS credentials: `pnpm exec eas credentials -p ios`
- [ ] Start iOS production build: `cd apps/mobile && pnpm build:production:ios`
- [ ] Monitor build status: `pnpm exec eas build:list --platform ios`
- [ ] Wait for build to complete (typically 30-60 minutes)
- [ ] Download build when ready
- [ ] Verify build signed correctly
- [ ] Record build ID for reference

### Android Build
- [ ] Check EAS credentials: `pnpm exec eas credentials -p android`
- [ ] Start Android production build: `cd apps/mobile && pnpm build:production:android`
- [ ] Monitor build status: `pnpm exec eas build:list --platform android`
- [ ] Wait for build to complete (typically 30-60 minutes)
- [ ] Verify AAB file generated
- [ ] Record build ID for reference

### Build Testing
- [ ] Download iOS build (or use TestFlight automatic build)
- [ ] Download Android build (APK for testing, AAB for store)
- [ ] Test on physical iOS device (if possible)
- [ ] Test on physical Android device (if possible)
- [ ] Verify app launches without crashes
- [ ] Verify core features work:
  - [ ] Login/Register
  - [ ] KYC Upload
  - [ ] Obra List
  - [ ] Evidence Capture
  - [ ] Push Notifications
- [ ] Verify permissions work correctly
- [ ] Verify version displays correctly
- [ ] Verify build number/version code correct

---

## Submission Phase (submission day)

### Final Checks
- [ ] All testing completed and passed
- [ ] No open critical/blocking issues
- [ ] No new errors in logs
- [ ] Builds available for submission
- [ ] Team sign-off obtained

### iOS App Store Submission

#### Pre-Submission Checklist
- [ ] Login to App Store Connect: https://appstoreconnect.apple.com
- [ ] Select app "imbobi"
- [ ] Navigate to latest TestFlight build
- [ ] Verify version and build number
- [ ] Review app metadata:
  - [ ] App name: "imbobi"
  - [ ] Subtitle: (if applicable)
  - [ ] Description: Clear and up-to-date
  - [ ] Keywords: Relevant (fintech, crédito, etc.)
  - [ ] Category: Finance
  - [ ] Privacy policy: Valid HTTPS link
  - [ ] Support website: Valid HTTPS link
  - [ ] Support email: Valid and monitored

#### Assets
- [ ] App icon (1024x1024): Present
- [ ] Screenshots (1242x2208 or larger):
  - [ ] Sign-in screen
  - [ ] Obra list view
  - [ ] Evidence capture
  - [ ] Credit simulator
  - [ ] User profile
- [ ] Preview video (optional): Present (recommended)
- [ ] App Preview (optional): Present (recommended)

#### App Review Information
- [ ] Contact email provided
- [ ] Phone number provided (optional)
- [ ] Demo account credentials provided (if needed)
- [ ] Notes for reviewer:
  - [ ] "First release" or "Update from v1.X.X"
  - [ ] Describe major changes
  - [ ] Note any permission changes
  - [ ] Add testing instructions if complex
- [ ] Version release notes provided
- [ ] Export compliance completed (typically "Not Encryption" for fintech)
- [ ] Content rights confirmed
- [ ] IDFA usage confirmed (or noted as not used)

#### Submission
- [ ] Click "Submit for Review"
- [ ] Review final checklist
- [ ] Confirm and submit
- [ ] Record submission timestamp
- [ ] Monitor App Store Connect for review status
- [ ] Expect review in 24-48 hours

### Google Play Store Submission

#### Pre-Submission Checklist
- [ ] Login to Google Play Console: https://play.google.com/console
- [ ] Select app "imbobi"
- [ ] Navigate to "Releases" > "Production"
- [ ] Click "Create new release"

#### Build
- [ ] Upload AAB from EAS
- [ ] Verify version and version code
- [ ] Verify bundle size acceptable

#### Store Listing Review
- [ ] Title: "imbobi"
- [ ] Short description: < 80 characters
- [ ] Full description: Updated with latest changes
- [ ] Category: Finance
- [ ] Content rating: Valid
- [ ] Privacy policy: Valid HTTPS link
- [ ] Website: Valid HTTPS link

#### Screenshots & Graphics
- [ ] Feature graphic (1024x500 PNG)
- [ ] Phone screenshots (1080x1920 or larger):
  - [ ] Sign-in screen
  - [ ] Obra list view
  - [ ] Evidence capture
  - [ ] Credit simulator
  - [ ] User profile
- [ ] Tablet screenshots (if supported)

#### Release Notes
- [ ] Release notes written in Portuguese (Brazil)
- [ ] Release notes describe new features/fixes
- [ ] Release notes are concise (< 500 chars)

#### Content Rating
- [ ] IARC questionnaire completed (if not already)
- [ ] Content rating valid

#### Rollout Strategy
- [ ] Start with staged rollout: 10% of users
- [ ] Set release date (auto or scheduled)
- [ ] Click "Review release"

#### Submission
- [ ] Review all information
- [ ] Click "Start rollout to production"
- [ ] Confirm staged rollout percentage
- [ ] Record submission timestamp
- [ ] Monitor Play Console for review status
- [ ] Expect review in 24-48 hours

---

## Post-Submission Phase (during review)

### Monitoring
- [ ] Check email for App Store/Play Store feedback
- [ ] Monitor for rejections/issues
- [ ] Check app console for any automated test failures
- [ ] Be ready to address feedback quickly

### If Rejected (iOS)
- [ ] Read rejection reason carefully
- [ ] Identify root cause
- [ ] Fix issue in code (if applicable)
- [ ] Commit fix to `main` branch
- [ ] Create new build with same/incremented version
- [ ] Resubmit with explanation in review notes
- [ ] Include "Resubmission" in release notes

### If Rejected (Android)
- [ ] Read rejection reason carefully
- [ ] Identify root cause
- [ ] Fix issue in code (if applicable)
- [ ] Commit fix to `main` branch
- [ ] Create new build with incremented version code
- [ ] Resubmit with explanation in review notes
- [ ] Include updated release notes

---

## Post-Approval Phase

### iOS App Store
- [ ] Approve/release when build approved
- [ ] Choose "Manually Release" or "Automatically Release After Approval"
- [ ] Confirm release in App Store Connect
- [ ] Wait for app to appear in App Store (typically 1-3 hours)

### Google Play Store
- [ ] Monitor first 24 hours: crash rate, reviews
- [ ] If crash rate < 0.5%, proceed to increase rollout
- [ ] Increase rollout: 25% > 50% > 100%
- [ ] Monitor at each rollout stage
- [ ] If serious issue found, roll back and create hotfix

### Post-Launch Monitoring
- [ ] Monitor crash reports in Firebase Crashlytics
- [ ] Monitor ANR (Application Not Responding) rate
- [ ] Monitor user reviews in both stores
- [ ] Monitor app ratings
- [ ] Address critical issues within 24 hours
- [ ] Plan hotfix if crash rate > 0.5%
- [ ] Respond to user reviews (especially negative)

---

## Release Documentation

### Create GitHub Release
- [ ] Tag commit: `git tag v1.0.0`
- [ ] Push tags: `git push origin --tags`
- [ ] Create GitHub Release
- [ ] Title: "v1.0.0 Release"
- [ ] Body: Include CHANGELOG
- [ ] Attach build metadata (version, build number, etc.)
- [ ] Mark as Release (not pre-release)

### Post-Release Documentation
- [ ] Update project README with latest version
- [ ] Update deployment guide if applicable
- [ ] Document any manual steps taken
- [ ] Document any known issues
- [ ] Update team on release status

---

## Quality Metrics

### Target Metrics
- [ ] Crash rate: < 0.1% (99.9% success)
- [ ] ANR rate: < 0.5% (99.5% responsive)
- [ ] User rating: 4.0+ stars
- [ ] Review sentiment: Mostly positive
- [ ] Startup time: < 2 seconds
- [ ] App size: < 100MB (iOS), < 150MB (Android)

### Monitoring Duration
- [ ] Monitor first 48 hours intensively
- [ ] Monitor first 1 week closely
- [ ] Monitor ongoing for anomalies

---

## Rollback Plan

If critical issue discovered:

### iOS App Store
- [ ] Contact Apple: developer@apple.com
- [ ] Request immediate app removal
- [ ] Prepare hotfix version (v1.0.1)
- [ ] Build hotfix
- [ ] Resubmit with priority note
- [ ] Include explanation in review notes

### Google Play Store
- [ ] Immediately roll back to 0% (pause release)
- [ ] Prepare hotfix version (v1.0.1)
- [ ] Build hotfix
- [ ] Resubmit
- [ ] Resume rollout after approval

### Communication
- [ ] Notify team/stakeholders
- [ ] Prepare user communication
- [ ] Post status update (if user-facing issue)
- [ ] Document incident

---

## Sign-Off

- [ ] iOS build submitted: Date _____ Time _____
- [ ] Android build submitted: Date _____ Time _____
- [ ] iOS build approved: Date _____ Time _____
- [ ] Android build approved: Date _____ Time _____
- [ ] iOS app live in App Store: Date _____ Time _____
- [ ] Android app live in Play Store: Date _____ Time _____

**Release Manager:** ___________

**Product Manager:** ___________

**Engineering Lead:** ___________

---

**Template Version:** 1.0
**Last Updated:** May 28, 2026
