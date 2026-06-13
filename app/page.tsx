import { Suspense } from "react";

import { FeatureGrid } from "@/components/landing/feature-grid";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LocalDevStatusSection } from "@/components/landing/local-dev-status-section";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-10 md:py-14">
      <HeroSection />
      <HowItWorks />
      <FeatureGrid />
      <Suspense fallback={null}>
        <LocalDevStatusSection />
      </Suspense>
    </div>
  );
}
