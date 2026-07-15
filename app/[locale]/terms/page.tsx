import type { Metadata } from "next";
import { ClanSignalLegalShell } from "@/components/landing/explorations/clan-signal/legal-shell";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | ClashKing",
  description: "The terms that apply when you use ClashKing websites, apps, services, and community tools.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "ClashKing Terms of Service",
    description: "The terms that apply when you use ClashKing websites, apps, services, and community tools.",
    type: "website",
    url: "/terms",
    images: ["/og/clashking-landing.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClashKing Terms of Service",
    description: "The terms that apply when you use ClashKing websites, apps, services, and community tools.",
    images: ["/og/clashking-landing.png"],
  },
};

export default function TermsOfServicePage() {
  return (
    <ClanSignalLegalShell title="Terms of Service" eyebrow="ClashKing legal">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Acceptance of Use</h2>
            <p className="mb-4">
              Access and use of the ClashKing website is subject to these terms and conditions. By using the website, you are fully accepting these terms and conditions. If you do not accept these terms and conditions, you must cease use of this website.
            </p>
            <p>
              These terms and conditions may be updated from time to time and the latest version is published on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Prohibited Use</h2>
            <p className="mb-4">You may not use the website for any of the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>In any way which causes, or may cause, damage to the website or interferes with any other person&apos;s use of the website.</li>
              <li>In any way that is illegal, abusive, unlawful, threatening, harmful or otherwise objectionable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Copyright</h2>
            <p className="mb-4">
              All content on the website is property of ClashKing, our affiliates or other relevant third parties. Content may not be reproduced without written permission from ClashKing.
            </p>
            <div className="cs-legal-notice">
              <p>
                This material is unofficial and is not endorsed by Supercell. For more information see Supercell&apos;s Fan Content Policy:{" "}
                <Link href="https://www.supercell.com/fan-content-policy" target="_blank">
                  www.supercell.com/fan-content-policy
                </Link>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Liability</h2>
            <p>
              This website is provided on an &apos;as is&apos; basis without warranty of any kind. ClashKing provides no guarantee to the availability, accuracy of the information and materials found or offered on the website. ClashKing will not be liable for any indirect or consequential loss or damage arising out of use of ths website. Use of this website is entirely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Third Party Links</h2>
            <p>
              This website may include links to third party websites or materials. These links are for your convenience and do not signify an endorsement of the third party website(s). ClashKing has no responsibility for the content of third party websites.
            </p>
          </section>
    </ClanSignalLegalShell>
  );
}
