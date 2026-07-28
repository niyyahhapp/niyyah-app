# NIYYAH Pre-launch Smoke Test Report

Date: 2026-07-28

This report separates what passed locally/live from what still requires the real iOS build, TestFlight, Apple Developer setup, or personal sign-in interaction.

## Result Summary

Not App Store ready yet. The public web package is cleaner and the backend security checks are passing, but App Store submission still needs a real iOS build, live Google/Apple account flow verification, TestFlight testing, and final App Store review materials.

## Passed

- Required public app package loads on GitHub Pages.
- Home, Continue, Ayah, Understand, Reflect, Journal, and Progress opened in browser smoke testing.
- No visible `undefined`, `NaN`, data-load error, paid/paywall text, or placeholder “coming soon” appeared in the tested visible flows.
- Surah An-Nas 114:1 and Al-Falaq 113:1 showed Arabic with `بِرَبِّ` and no visible `rabba` regression.
- Privacy and Terms pages are live.
- Account Deletion page is included.
- Supabase project has RLS enabled on profiles, circles, circle_members, circle_daily_checkins, circle_session_activity, circle_invite_events, and account_deletion_requests.
- Anonymous table grants were removed.
- `join_circle_by_invite` and `request_account_deletion` are executable by authenticated/admin roles, not anon.
- Anonymous API probes returned 401 for private tables/RPC endpoints.
- No in-app payment provider code is enabled in the public app preview.

## Still Requires Manual/Native Testing

- Complete Google OAuth sign-in with a real Google account.
- Complete Apple Sign In after Apple Developer provider setup.
- Test two real accounts to confirm cross-account data isolation in actual user flows.
- Connect native account deletion to the backend deletion request RPC.
- Build and run the real SwiftUI app in Xcode or the iOS build plugin.
- Submit a TestFlight build and test on a real device.
- Add analytics only after choosing a provider and event names; do not fake analytics.

## High-risk Notes

- Qur'anic Arabic must continue to come from verified immutable data fields. Do not manually regenerate Arabic strings.
- Translation, tafsir/source notes, beginner explanations, and user reflections must remain clearly separated.
- If NIYYAH adds AI later, AI must not generate tafsir, fatwas, religious rulings, or Qur'anic Arabic.
