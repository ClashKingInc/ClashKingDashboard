"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-[#DC2626]">Terms and Conditions</h1>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Acceptance of Use</h2>
            <p className="mb-4">
              Access and use of the ClashKing website is subject to these terms and conditions. By using the website, you are fully accepting these terms and conditions. If you do not accept these terms and conditions, you must cease use of this website.
            </p>
            <p>
              These terms and conditions may be updated from time to time and the latest version is published on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Prohibited Use</h2>
            <p className="mb-4">You may not use the website for any of the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>In any way which causes, or may cause, damage to the website or interferes with any other person's use of the website.</li>
              <li>In any way that is illegal, abusive, unlawful, threatening, harmful or otherwise objectionable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Copyright</h2>
            <p className="mb-4">
              All content on the website is property of ClashKing, our affiliates or other relevant third parties. Content may not be reproduced without written permission from ClashKing.
            </p>
            <div className="bg-[#2A2A2A] p-4 rounded-lg border border-[#DC2626]/20 text-sm">
              <p>
                This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy:{" "}
                <Link href="https://www.supercell.com/fan-content-policy" target="_blank" className="text-[#DC2626] hover:underline">
                  www.supercell.com/fan-content-policy
                </Link>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Liability</h2>
            <p>
              This website is provided on an 'as is' basis without warranty of any kind. ClashKing provides no guarantee to the availability, accuracy of the information and materials found or offered on the website. ClashKing will not be liable for any indirect or consequential loss or damage arising out of use of ths website. Use of this website is entirely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Third Party Links</h2>
            <p>
              This website may include links to third party websites or materials. These links are for your convenience and do not signify an endorsement of the third party website(s). ClashKing has no responsibility for the content of third party websites.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
