"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2 text-[#DC2626]">ClashKing Privacy Policy</h1>
        <p className="text-gray-400 mb-8 italic">Effective Date: 05 July 2025</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">1. Introduction</h2>
            <p>
              Welcome to ClashKing! This privacy policy explains how our mobile application collects, uses, and protects your information. ClashKing is a free, open-source Clash of Clans companion app that helps you track your game statistics and clan performance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#DC2626]/80">a. Game Data</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Clash of Clans statistics: Player stats, clan information, war history, and performance metrics retrieved via the official Clash of Clans API</li>
                  <li>Player tags and clan tags: Used to identify and retrieve your game data</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#DC2626]/80">b. Authentication Data</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Discord user ID: Retrieved during Discord OAuth login</li>
                  <li>User account data: Email address and authentication metadata (including refresh tokens) stored securely (encrypted)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#DC2626]/80">c. App Usage Data</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>User preferences: Language settings, theme, and selected player tags</li>
                  <li>Device information: Operating system version, app version, and device model</li>
                  <li>Error logs: Crash and error reports sent to Sentry.io for debugging and performance improvement</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">3. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Display your game statistics and clan performance data</li>
              <li>Provide home widget updates with current war status and clan information</li>
              <li>Maintain app functionality and user authentication</li>
              <li>Improve app performance through error tracking and bug fixes</li>
              <li>Ensure compatibility across different devices and operating systems</li>
              <li>Provide customer support when you contact us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">4. Data Storage and Security</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#DC2626]/80">a. Data Storage</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Authentication tokens: Stored locally on your device using secure storage (e.g. SharedPreferences)</li>
                  <li>User preferences: Stored locally using FlutterSecureStorage</li>
                  <li>Widget support data: Player-clan associations (e.g. player_&#123;playerTag&#125;_clan_tag) are cached locally to power the Android home screen widget</li>
                  <li>Android widget data: Current war info stored locally for home screen widget support</li>
                  <li>Cached images: Managed automatically by CachedNetworkImage</li>
                  <li>User account data: Email addresses and authentication tokens stored securely in our encrypted database</li>
                  <li>Game data: Not stored locally — player stats, clan info, and war history are fetched from our servers via the Clash of Clans API</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#DC2626]/80">b. Security Measures</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Data is encrypted in transit (HTTPS) and at rest</li>
                  <li>Tokens and personal data are stored using industry-standard encryption</li>
                  <li>We regularly update our security practices to protect your data</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">5. Data Sharing and Disclosure</h2>
            <p className="mb-4">We do not sell or share your personal data with any third party for advertising, analytics, or marketing purposes. Your data is only used to operate the app and provide its core functionalities.</p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#DC2626]/80">a. Third-Party Services</h3>
                <p className="mb-2">We integrate with the following services:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Discord OAuth: For user authentication (only user ID is retrieved from Discord)</li>
                  <li>Clash of Clans API: Official Supercell API for game data retrieval</li>
                  <li>Sentry.io: Error tracking service for app improvement (anonymized error logs only)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#DC2626]/80">b. Creator Code Revenue</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>When you use our creator code ClashKing, we receive 5% of your in-game purchases from Supercell</li>
                  <li>This revenue sharing is handled entirely by Supercell and does not involve sharing your personal information with us</li>
                  <li>Using our creator code costs you nothing extra</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
