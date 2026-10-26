import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { LegalPageShell, Placeholder } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Builders World Forum collects, uses, and protects personal data.",
};

export default async function PrivacyPage() {
  const content = await getContent(["contact.email", "contact.phone", "contact.address"]);

  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated="26 October 2026"
      intro={
        "This Privacy Policy explains how Builders World Forum (“BWF,” “we,” “us”) collects, uses, shares, and protects personal data when you visit this website, apply for membership, register as a visitor to a chapter meeting, or use the BWF member app for iPhone and Android."
      }
    >
      <h2>1. Who this policy covers</h2>
      <p>This policy applies to:</p>
      <ul>
        <li>visitors browsing the public website;</li>
        <li>prospective members who submit a membership application;</li>
        <li>guests who register for a chapter meeting;</li>
        <li>
          active members with a directory profile and, if granted, a member portal login or the BWF
          member app; and
        </li>
        <li>BWF chapter and central administrators who use the internal admin system.</li>
      </ul>

      <h2>2. Information we collect</h2>
      <h3>2.1 Information you give us directly</h3>
      <ul>
        <li>
          <strong>Membership applications:</strong> full name, phone number, email, company name,
          designation, years in business, how you heard about BWF, and any other company
          information you choose to share.
        </li>
        <li>
          <strong>Visitor / meeting registrations:</strong> name, phone number, email, company,
          business category, chapter, and (if applicable) which member referred you.
        </li>
        <li>
          <strong>Member directory profile:</strong> your business description, services,
          specialisations, unique selling points, years in business, areas served, certifications,
          major projects, clientele, and any contact details, social links, photo, brochure, or
          video you or a chapter admin choose to publish to your public profile.
        </li>
        <li>Testimonials and feedback you submit through the website.</li>
        <li>
          <strong>Member activity:</strong> the referrals, Thank You Slips (including the business
          value you record), one-to-ones, Power Dates, Conclaves, consumers and Chief Guests you
          record in the member portal or app, and your meeting attendance and check-ins. These are
          used to show your activity reports and BWF Score, and are visible to the members involved
          and to BWF administrators.
        </li>
        <li>
          <strong>Attendance:</strong> whether you checked in at each chapter meeting. If you
          don&apos;t check in, you&apos;re recorded as absent once the meeting is over. Two absences
          in a row send you an automatic reminder; three are referred to BWF administrators, who
          may extend courtesy (for example on medical grounds — any note they record stays
          internal) or end the membership.
        </li>
        <li>
          <strong>Birthday:</strong> if you or a BWF administrator add it, your birthday (day and
          month, and optionally the year). Other members see only the day and month, on the
          members-only Socials page; the year is visible only to you and BWF administrators. You can
          change or remove it any time from My Profile.
        </li>
        <li>
          <strong>Payment submissions:</strong> when you tell us you&apos;ve paid a meeting or
          membership fee, the amount, payment date, months or year it covers, and the screenshot or
          PDF receipt you upload as proof. BWF&apos;s accounts team reviews these.
        </li>
        <li>
          <strong>Account deletion requests:</strong> the request and any reason you give.
        </li>
        <li>
          <strong>Login credentials:</strong> if you&apos;re a member with portal access or a BWF
          administrator, your email and password (stored hashed, never in plain text), and
          one-time passcodes we email you to verify sign-in.
        </li>
      </ul>

      <h3>2.2 Information collected automatically</h3>
      <ul>
        <li>
          Standard web analytics via Google Analytics — page views, referring pages, approximate
          location, device and browser type, and similar usage data. See &ldquo;Cookies&rdquo;
          below.
        </li>
        <li>
          Security and abuse-prevention data: IP address and request metadata used to rate-limit
          form submissions, plus an internal audit log of actions BWF administrators take in the
          system (not visitor-facing).
        </li>
      </ul>

      <h3>2.3 What we don&apos;t collect</h3>
      <p>
        We don&apos;t process card or bank payments — you pay BWF directly (for example by UPI or
        bank transfer), and we never see or store your card, bank login or UPI credentials; only the
        payment details and proof you choose to submit (see above). Clicking our WhatsApp
        button opens a chat directly on your own device; we record only
        that the click happened (for analytics), never the content of anything you say to us on
        WhatsApp — that&apos;s covered by WhatsApp/Meta&apos;s own privacy policy, not this one.
      </p>

      <h3>2.4 The BWF member app</h3>
      <ul>
        <li>
          <strong>Sign-in:</strong> when you sign in, the app stores a sign-in token in your
          phone&apos;s secure storage (iOS Keychain / Android Keystore). Signing out, or
          &ldquo;Sign out of all devices&rdquo;, ends it.
        </li>
        <li>
          <strong>Location:</strong> only when you tap &ldquo;Members near me&rdquo;, the app sends
          your current location to our servers to find BWF members within the distance you chose.
          We don&apos;t save it to your account or use it for anything else, and the app never uses
          location in the background.
        </li>
        <li>
          <strong>Camera:</strong> used only to scan the check-in QR code at a chapter meeting. Only
          the code is used; no photo is taken or sent.
        </li>
        <li>
          <strong>Photos and files:</strong> the app only reads the screenshot or PDF you pick as
          payment proof, and uploads just that file.
        </li>
        <li>
          <strong>Birthday:</strong> you can add, change or remove your birthday in the app; see
          &ldquo;Birthday&rdquo; above for who can see it.
        </li>
        <li>
          The app contains no advertising, no third-party analytics and no tracking, and we
          don&apos;t share app data with data brokers.
        </li>
      </ul>

      <h2>3. How we use your information</h2>
      <ul>
        <li>
          To operate the member directory and chapter system, including enforcing BWF&apos;s
          one-member-per-business-category-per-chapter rule.
        </li>
        <li>To review and process membership applications, and to contact you about their status.</li>
        <li>
          To manage meeting registrations, and to follow up with visitors about their interest in
          joining.
        </li>
        <li>To operate member login accounts, including the profile-edit approval workflow.</li>
        <li>
          To record member activity, attendance and meeting check-ins, and to calculate activity
          reports and BWF Scores.
        </li>
        <li>To review payment submissions and keep accounts records.</li>
        <li>To show members&apos; birthdays to fellow members, so they can wish each other.</li>
        <li>To show members other BWF members near them, when they ask the app to.</li>
        <li>To respond to feedback and testimonials.</li>
        <li>
          To send transactional emails — application status updates, sign-in confirmations,
          password resets, meeting confirmations and reminders, attendance reminders — and, for
          internal recipients, scheduled admin reports.
        </li>
        <li>
          Where enabled, to send the same meeting and attendance reminders to members on WhatsApp,
          using the WhatsApp number (or phone number) on their member profile.
        </li>
        <li>To understand site usage and improve the website, using aggregated analytics.</li>
        <li>To detect and prevent abuse of forms and other platform features.</li>
        <li>To comply with legal obligations and enforce our Terms &amp; Conditions.</li>
      </ul>

      <h2>4. Legal basis for processing</h2>
      <p>
        Where India&apos;s Digital Personal Data Protection Act, 2023 applies, we rely on: your
        consent (analytics cookies); performance of a request you made to us (processing a
        membership application or visitor registration); and our legitimate interests
        (site security, abuse prevention, and running the member directory you asked to be listed
        in).
      </p>

      <h2>5. Cookies and similar technologies</h2>
      <p>
        Google Analytics sets cookies to measure site usage. We don&apos;t currently use
        advertising or cross-site tracking cookies, so a separate cookie-consent banner isn&apos;t
        required at this time. We&apos;ll revisit this if that changes.
      </p>

      <h2>6. Who we share information with</h2>
      <p>We don&apos;t sell personal data. We share it only with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> who process data on our behalf and only for the
          purpose we specify: Neon (database hosting), Vercel (application hosting), Resend
          (transactional email delivery), Google (Analytics), Cloudflare R2 (photo/brochure/
          video storage), and — where enabled — Meta&apos;s WhatsApp Business Platform (delivering
          meeting and attendance reminders to members&apos; WhatsApp numbers).
        </li>
        <li>
          <strong>Other site visitors,</strong> if you&apos;re listed in the public member
          directory — see &ldquo;Member directory is public&rdquo; below.
        </li>
        <li>Authorities, where disclosure is required by law.</li>
      </ul>

      <h2>7. Member directory is public</h2>
      <p>
        If you&apos;re an active member, the fields on your profile that BWF or you publish —
        business description, services, specialisations, and any contact details, social links, or
        media you choose to include — are visible to anyone visiting the website, not only signed-in
        members. Don&apos;t include anything you don&apos;t want public. Any edit you submit yourself
        goes through chapter-admin approval before it&apos;s published.
      </p>

      <h2>8. Data retention</h2>
      <p>
        We keep membership and visitor records for as long as needed for the purpose they were
        collected for, and for a further 6 months to 1 year after that purpose ends (for example,
        after a membership lapses or a visitor&apos;s enquiry goes cold), for record-keeping and
        legal purposes.
      </p>

      <h2>9. Data security</h2>
      <p>
        Passwords are stored hashed, and access to the admin system is role-based — each admin role
        can only reach the data and chapters it needs. Form submissions are rate-limited, and
        administrator actions are logged for audit purposes.
      </p>

      <h2>10. Your rights</h2>
      <p>
        Under India&apos;s Digital Personal Data Protection Act, 2023, you may request access to,
        correction of, or erasure of your personal data, and may withdraw consent where our
        processing relies on it. Contact our Grievance Officer using the details below. Members can
        also ask for their account and personal data to be deleted from the app (More &rarr;
        &ldquo;Delete my account&rdquo;); BWF confirms with you and completes it within 30 days,
        keeping only records we&apos;re legally required to retain (such as payment records) for as
        long as required.
      </p>
      <p>
        Grievance Officer: Nagappan · buildersworldforum7@gmail.com · +91 99401 39493
      </p>

      <h2>11. Children&apos;s privacy</h2>
      <p>
        This website is a business platform and isn&apos;t directed at, and doesn&apos;t knowingly
        collect data from, anyone under 18.
      </p>

      <h2>12. International data transfers</h2>
      <p>
        Some of our service providers (including our hosting providers) may process or store data
        outside India. By using this website, you consent to this transfer as described in this
        policy.
      </p>

      <h2>13. Changes to this policy</h2>
      <p>
        We&apos;ll update the &ldquo;last updated&rdquo; date above whenever this policy changes, and
        give reasonably prominent notice of any material change.
      </p>

      <h2>14. Contact us</h2>
      <p>
        {content["contact.email"] ?? <Placeholder>contact email</Placeholder>}
        {" · "}
        {content["contact.phone"] ?? <Placeholder>contact phone</Placeholder>}
        <br />
        {content["contact.address"] ?? "Chennai, India"}
        <br />
        Registered as: Builders World Forum, Ground Floor, Plot No. 204, Makizhmathi 22nd Street,
        Omsakthi Kanopus, Narayanapuram, Avadi, Chennai, Tiruvallur District, Tamil Nadu 600077
      </p>
    </LegalPageShell>
  );
}
