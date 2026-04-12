"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { SupportContent } from "@/components/support/support-content";

export default function SupportUsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SupportContent />
      <Footer />
    </div>
  );
}
