# App Store listing — copy into App Store Connect

Everything below is ready to paste. Character limits are Apple's.

## App information

| Field | Value |
|---|---|
| Name (30) | `BWF – Builders World Forum` |
| Subtitle (30) | `Member app for BWF chapters` |
| Bundle ID | `com.buildersworldforum.members` |
| SKU | `bwf-members-ios` |
| Primary language | English (U.K.) or English (U.S.) |
| Category | Business (secondary: Productivity) |
| Price | Free |
| Availability | India (add more countries any time) |
| Copyright | `2026 Builders World Forum` |
| Support URL | `https://www.buildersworldforum.com` |
| Marketing URL | `https://www.buildersworldforum.com` |
| Privacy Policy URL | `https://www.buildersworldforum.com/privacy` |

## Promotional text (170)

> Record referrals, thank-you slips and one-to-ones in seconds, see your BWF Score, and find fellow members near you.

## Description (4000)

> The official app for members of Builders World Forum (BWF) — the business network for the construction and building industry.
>
> Everything you do in your chapter, in your pocket:
>
> • Give referrals and record Thank You Slips for business received
> • Log One-to-Ones, Power Dates and Conclaves with fellow members
> • Record the Chief Guests and consumers you bring to meetings
> • See your BWF Score and exactly how it adds up
> • Weekly, 6-month, 12-month and overall activity reports, plus detailed reports
> • Upcoming chapter meetings with venue and Chief Guest
> • Scan the meeting QR code to check in
> • Find BWF members near you — nearest first — and call, WhatsApp or get directions
> • Pay your meeting fee or annual membership and upload the payment proof
> • Request changes to your public member profile
>
> The app is for BWF members. Your login is issued by BWF — on first sign-in you choose your own username and password.

## Keywords (100)

`BWF,builders,construction,networking,referral,business,chapter,members,contractor,architect,Chennai`

## Screenshots

iPhone 6.9" display — upload all six from `mobile/store/screenshots-ios-6.9/` (1320 × 2868), in order.
They show fictional sample members. Real-device screenshots from TestFlight can replace them later.
No iPad screenshots are needed (the app is iPhone-only).

## App Review information

- **Sign-in required:** yes
- **User name:** `APPREVIEW`
- **Password:** (printed once by `scripts/create-app-review-demo.ts` — paste it here, nowhere else)
- **Contact:** your name, phone and email
- **Notes:**

> BWF is a private business network; logins are issued by BWF to its members (there is no in-app sign-up). The demo account above belongs to a separate demo chapter with three demo colleagues, so you can safely record referrals, Thank You Slips, One-to-Ones, Power Dates and Conclaves — pick "BWF App Review (Demo)" → a category → a member.
>
> Find Members Nearby uses your location only when you tap "Members near me". The demo members are in Chennai, India, so from elsewhere tap "Search by name or area instead" and search "Demo".
>
> Meeting check-in requires scanning the QR code shown at a physical chapter meeting, so it can't be completed outside a meeting; the scanner opens from Meetings → "Scan meeting QR to check in".
>
> Account deletion: More → "Delete my account".

## App Privacy (the "nutrition label")

**Does the app track users?** No. (No ads, no third-party analytics or SDKs that track.)

**Data collected** — for each, choose *Linked to the user's identity*: **Yes**, *Used for tracking*: **No**, *Purpose*: **App Functionality**:

| Apple category | Data type | What it is in BWF |
|---|---|---|
| Contact Info | Name | Member name |
| Contact Info | Email Address | Login email (first sign-in) and profile email |
| Contact Info | Phone Number | Profile phone / WhatsApp |
| Location | Precise Location | Coordinates sent when "Members near me" is tapped (not stored by BWF, but they pass through server logs, so declared) |
| User Content | Photos or Videos | Payment proof screenshots |
| User Content | Other User Content | Activity notes, profile text, account deletion reason |
| Financial Info | Other Financial Info | Payment amounts and dates submitted for approval |
| Identifiers | User ID | BWF member/login ID |

Not collected: health, browsing/search history, contacts, purchases, diagnostics, device ID, advertising data.

## Age rating

Answer **None / No** to every question → rated **4+**.

## Export compliance

Already answered in the build (`ITSAppUsesNonExemptEncryption = false`): the app only uses standard HTTPS.
