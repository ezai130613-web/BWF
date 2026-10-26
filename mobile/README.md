# BWF member app (iOS + Android)

Expo (SDK 58) / React Native app for BWF members — the native counterpart of the
website's member portal. It talks only to the website's `/api/mobile/v1/**` JSON API
(see `src/lib/mobile/` in the repo root); there is no separate backend.

Architecture and decisions: `../docs/ARCHITECTURE.md` → "Native mobile app".
What shipped and how it was verified: `../docs/PHASES.md` → Phases 31–34.
Read `AGENTS.md` before changing Expo/React Native code — Expo changes every SDK.

## Run it on your phone (development)

1. `npm install` (in this `mobile/` folder).
2. Point the app at a server:
   - the live site (default): nothing to do;
   - your local website: create `mobile/.env.local` with
     `EXPO_PUBLIC_API_URL=http://<your-computer's-LAN-IP>:3000` and run `npm run dev` in the repo root.
3. `npx expo start`, then scan the QR code with the **Expo Go** app (iOS/Android) on the same Wi-Fi.

## Checks

```bash
npx tsc --noEmit     # typecheck (also checks the shared API contract)
npx expo lint
npx expo-doctor
```

## Build & submit (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # installable APK for testers
npx eas-cli@latest build --profile production --platform all    # store builds
npx eas-cli@latest submit --platform ios                          # → App Store Connect / TestFlight
npx eas-cli@latest submit --platform android                      # → Play Console
```

`eas.json` sets `EXPO_PUBLIC_API_URL` per profile. App name, bundle ID / package
(`com.buildersworldforum.members` — permanent once the store listing exists; `com.buildersworldforum.app`
was already taken by another Apple team), icons and permission texts live in `app.json`.

## Layout

- `src/app/` — screens (Expo Router; every file is a route). `_layout.tsx` decides what a
  signed-out / activating / signed-in member can reach.
- `src/lib/` — API client, session (token in the OS keychain), formatting, activity definitions.
- `src/components/` — shared UI.
