import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { CtaSection } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { getServerCountLabel } from "@/lib/server-stats";

export default async function HomePage() {
  const serverCount = await getServerCountLabel();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero serverCount={serverCount} />
      <Features />
      <CtaSection serverCount={serverCount} />
      <Footer />
    </div>
  );
}
