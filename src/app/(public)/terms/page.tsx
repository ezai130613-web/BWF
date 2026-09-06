import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { LegalPageShell, Placeholder } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern use of the Builders World Forum website and membership.",
};

export default async function TermsPage() {
  const content = await getContent(["contact.email", "contact.phone", "contact.address"]);

  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms & Conditions"
      lastUpdated="6 September 2026"
      intro={
        "These terms govern your use of the Builders World Forum (“BWF,” “we,” “us”) website, membership application process, chapter meetings and events, and the Ask BWF chatbot. By using this website or submitting an application or registration, you agree to them."
      }
    >
      <h2>1. About Builders World Forum</h2>
      <p>
        BWF is a private, chapter-based business community for Chennai&apos;s construction
        ecosystem. Its core rule: within each chapter, only one member may represent a given
        business category at a time. Membership is by application and admin approval, not
        automatic sign-up.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old and represent a genuine, operating business to apply for
        membership or register as a visitor. Because of the one-category-per-chapter rule, we may
        place your application on a waiting list, or offer you a different chapter, if your
        category is already taken in the chapter you applied to.
      </p>

      <h2>3. Membership application process</h2>
      <p>
        Submitting a membership application does not guarantee membership. BWF reviews every
        application and may contact you, schedule a meeting, approve you in principle, waitlist you,
        or decline your application, at its discretion. A membership is only created once BWF
        completes this review — approval in principle is not itself membership.
      </p>

      <h2>4. Membership fees</h2>
      <p>
        The annual membership fee is ₹20,000, payable each year. Membership fees are
        non-refundable. Fee collection is currently handled outside this website. If online
        payment is enabled on this website in future, a separate payment terms section will apply
        to those transactions.
      </p>

      <h2>5. Your member directory profile</h2>
      <p>
        You&apos;re responsible for the accuracy of the information on your member profile. BWF and
        chapter administrators may edit, decline, or remove profile content, including any change
        you submit for approval, at their discretion — for example, content that is inaccurate,
        misleading, infringes someone else&apos;s rights, or (per BWF policy) embeds video from
        YouTube or Instagram rather than an approved direct file or link.
      </p>

      <h2>6. Visitors and guests</h2>
      <p>
        Registering to attend a chapter meeting or event as a visitor does not entitle you to
        membership or to any particular business category or chapter. A BWF member or administrator
        may follow up with you about your interest in joining after your visit.
      </p>

      <h2>7. Ask BWF chatbot</h2>
      <p>
        The Ask BWF chatbot gives AI-generated answers based on BWF&apos;s public content. It may be
        incomplete or inaccurate, and its answers are not professional, legal, or financial advice
        and are not binding on BWF. For anything that matters, confirm directly with a BWF
        administrator.
      </p>

      <h2>8. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>submit false or misleading information in an application, registration, or profile;</li>
        <li>attempt to bypass rate limiting, authentication, or other security measures;</li>
        <li>scrape, harvest, or misuse data from the member directory or website; or</li>
        <li>use the website for any unlawful purpose.</li>
      </ul>

      <h2>9. Intellectual property</h2>
      <p>
        The BWF name, branding, and website content belong to BWF (or its licensors). By submitting
        content to your member profile, a blog post, a testimonial, or feedback, you grant BWF a
        license to display it on this website and in related BWF materials for as long as it remains
        published.
      </p>

      <h2>10. Third-party links and services</h2>
      <p>
        This website links to third-party services — including WhatsApp click-to-chat, member
        websites, and members&apos; own social media profiles — that are governed by their own
        terms, not these. BWF is not responsible for the content or conduct of those third parties.
      </p>

      <h2>11. Suspension and termination</h2>
      <p>
        BWF may suspend or terminate a member&apos;s status or an account&apos;s access to the
        website for: violation of these terms or BWF&apos;s code of conduct; non-payment of fees;
        providing false or misleading information; conduct that is discriminatory, abusive, or
        otherwise fails to treat a fellow member, guest, or administrator with dignity, fairness,
        and respect; or any other conduct that undermines the safety, integrity, or reputation of
        the BWF community.
      </p>

      <h2>12. Disclaimers</h2>
      <p>
        The website, member directory, and chatbot are provided &ldquo;as is.&rdquo; BWF does not
        guarantee any particular business outcome from membership, the accuracy of another
        member&apos;s profile, or the accuracy of chatbot answers.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, BWF&apos;s total liability to you for any claim
        arising out of or relating to your use of this website, your membership, or any event or
        meeting shall not exceed the membership or registration fees you paid to BWF in the twelve
        (12) months preceding the claim. BWF is not liable for indirect, incidental, special, or
        consequential damages, including loss of business, profits, or goodwill, arising from your
        use of the website or your participation in BWF activities.
      </p>

      <h2>14. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless BWF, its officers, chapter administrators, and
        members from any claim, loss, liability, or expense (including reasonable legal fees)
        arising out of your breach of these terms, your violation of any law or third-party right,
        or any content you submit to the website.
      </p>

      <h2>15. Governing law and dispute resolution</h2>
      <p>
        These terms are governed by the laws of India, and subject to the exclusive jurisdiction of
        the courts of Chennai, Tamil Nadu.
      </p>

      <h2>16. Changes to these terms</h2>
      <p>
        We&apos;ll update the &ldquo;last updated&rdquo; date above whenever these terms change, and
        give reasonably prominent notice of any material change.
      </p>

      <h2>17. Contact us</h2>
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
