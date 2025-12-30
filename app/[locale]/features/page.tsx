"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CheckCircle2, Bot, Smartphone, Code2 } from "lucide-react";

export default function FeaturesPage() {
  const features = [
    {
      id: "bot",
      title: "ClashKing Bot",
      icon: <Bot className="text-[#DC2626]" size={32} />,
      description: "ClashKing Bot is the only Discord bot you need to manage your Clash of Clans clan and community. It’s packed with unique features to keep your clan organized, engaged, and growing.",
      items: [
        "Real-Time Logs: Track wars, CWL, clan games, raids, donations, and member events.",
        "Ticketing System: Recruitment ticket system in addition to standard support tickets.",
        "Auto Roles: Automatically assign roles based on clan status or family management.",
        "Reminders: Send pings for war attacks, clan games, or anything else.",
        "Detailed Stats: Insights into player and clan performance with activity tracking.",
        "Roster Management: Organize and optimize your war rosters with ease.",
      ],
      cta: {
        text: "Invite Bot",
        link: "https://invite.clashk.ing/",
        secondaryText: "Join Community",
        secondaryLink: "https://discord.clashk.ing/"
      }
    },
    {
      id: "app",
      title: "ClashKing App (Open Beta)",
      icon: <Smartphone className="text-[#DC2626]" size={32} />,
      description: "ClashKing App is the perfect extension to the ClashKing Bot, bringing essential tools and insights directly to your mobile device. It helps you stay connected anytime, anywhere, even without Discord.",
      items: [
        "Real-Time Stats: Detailed stats for players and clans synced with the bot.",
        "Clan Progress Tracking: Monitor your clan’s progress over time seamlessly.",
        "Multi account Management: Switch easily between your accounts and track performance.",
        "Built-In History: Access historical data to analyze trends and improve strategies.",
        "Discord Server Management: (Coming Soon) Manage roles and tickets from the app.",
        "Advanced Notifications: (Coming Soon) Customize alerts for important events.",
      ],
      cta: {
        text: "Android Beta",
        link: "https://play.google.com/apps/testing/com.clashking.clashkingapp",
        secondaryText: "iOS TestFlight",
        secondaryLink: "https://testflight.apple.com/join/6Q8dfnMX"
      }
    },
    {
      id: "api",
      title: "ClashKing API",
      icon: <Code2 className="text-[#DC2626]" size={32} />,
      description: "Build your own tools or projects using the ClashKing API. It’s free to use as long as you credit the ClashKing project.",
      items: [],
      cta: {
        text: "API Documentation",
        link: "https://api.clashk.ing/",
        secondaryText: "API on GitHub",
        secondaryLink: "https://github.com/ClashKingInc/ClashKingAPI"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Features</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover the powerful tools ClashKing offers to help you manage and grow your clan across Discord, Mobile, and Web.
          </p>
        </div>

        <div className="space-y-20">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`flex flex-col lg:flex-row gap-12 items-start ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 bg-[#2A2A2A] rounded-3xl p-8 md:p-12 border border-[#DC2626]/20 w-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#DC2626]/10 p-4 rounded-2xl">
                    {feature.icon}
                  </div>
                  <h2 className="text-3xl font-bold text-white">{feature.title}</h2>
                </div>
                
                <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                  {feature.description}
                </p>

                {feature.items.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    {feature.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="text-[#DC2626] mt-1 flex-shrink-0" size={18} />
                        <span className="text-gray-400 text-sm md:text-base">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <a
                    href={feature.cta.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#DC2626] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#EF4444] transition-colors"
                  >
                    {feature.cta.text}
                  </a>
                  {feature.cta.secondaryLink && (
                    <a
                      href={feature.cta.secondaryLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors"
                    >
                      {feature.cta.secondaryText}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
