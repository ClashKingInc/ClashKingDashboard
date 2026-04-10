"use client";

import { useEffect, useState } from "react";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Features } from "./features";
import { CtaSection } from "./cta";
import { Footer } from "./footer";

export function LandingWrapper() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Just show the landing page, no redirect
    setIsLoading(false);
  }, []);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  // Show landing page if not logged in
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <CtaSection />
      <Footer />
    </div>
  );
}
