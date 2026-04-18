"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { clashKingAssets } from "@/lib/theme";

interface LoadingScreenWithMessagesProps {
  messages: Record<string, string>;
  title?: string;
  description?: string;
}

export default function LoadingScreenWithMessages({ // NOSONAR — theme ternaries are UI-only, complexity is display logic not business logic
  messages,
  title,
  description
}: LoadingScreenWithMessagesProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const messageKeys = Object.keys(messages);

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (messageKeys.length <= 1) return;

    let timeoutId: NodeJS.Timeout;

    const cycleMessage = (index: number) => {
      if (index >= messageKeys.length - 1) return; // Stop at last message

      timeoutId = setTimeout(() => {
        setCurrentMessageIndex(index + 1);
        cycleMessage(index + 1);
      }, 2000);
    };

    cycleMessage(0);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messageKeys.length]);

  const currentMessageKey = messageKeys[currentMessageIndex];
  const currentMessage = messages[currentMessageKey];

  // Select logo based on theme
  const mainLogoUrl = mounted && theme === "light" 
    ? clashKingAssets.logos.whiteBgPng 
    : clashKingAssets.logos.darkBgPng;

  const textLogoUrl = mounted && theme === "light"
    ? clashKingAssets.logos.textWhiteBg
    : clashKingAssets.logos.textDarkBg;

  return (
    <div className={`flex min-h-screen items-center justify-center ${
      mounted && theme === "light" 
        ? "bg-gradient-to-br from-gray-100 via-white to-gray-100" 
        : "bg-gradient-to-br from-gray-900 via-black to-gray-900"
    }`}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          {/* Logo (80x80, volledig, transparante achtergrond) */}
          <div className="w-20 h-20 rounded-none flex items-center justify-center">
            {mounted ? (
              <img
                src={mainLogoUrl}
                alt="ClashKing Logo"
                width={80}
                height={80}
                className="object-contain"
                loading="eager"
                style={{ width: 80, height: 80 }}
              />
            ) : (
              <div className={`w-20 h-20 rounded-none animate-pulse ${
                mounted && theme === "light" ? "bg-gray-300" : "bg-gray-700"
              }`} />
            )}
          </div>

          {/* Text Logo (ClashKing tekst) */}
          <div className="mt-4 h-8 flex items-center justify-center">
            {mounted ? (
              <img
                src={textLogoUrl}
                alt="ClashKing Text"
                width={120}
                height={32}
                className="object-contain"
                style={{ width: 120, height: 32 }}
              />
            ) : (
              <div className={`w-30 h-8 rounded animate-pulse ${
                mounted && theme === "light" ? "bg-gray-300" : "bg-gray-700"
              }`} />
            )}
          </div>

          {/* Grote ruimte voor afstand (ongeveer 200px zoals in Flutter) */}
          <div className="h-48"></div>

          {/* Titel en description (optioneel bovenaan) */}
          {(title || description) && (
            <div className="text-center mb-8">
              {title && (
                <h1 className={`text-2xl font-bold mb-2 ${
                  mounted && theme === "light" ? "text-gray-900" : "text-white"
                }`}>{title}</h1>
              )}
              {description && (
                <p className={`${
                  mounted && theme === "light" ? "text-gray-600" : "text-gray-400"
                }`}>{description}</p>
              )}
            </div>
          )}

          {/* Animated Messages onderaan */}
          <div className="h-16 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentMessageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut"
                }}
                className={`text-lg text-center font-bold ${
                  mounted && theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                {currentMessage}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bullets onder de tekst */}
          <div className="flex justify-center space-x-2 mt-6">
            {messageKeys.map((_, index) => (
              <div
                key={index} // NOSONAR — index is the only stable key for these items (skeleton/static list)
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  index === currentMessageIndex
                    ? "bg-[#DC2626]" // Rode bullet voor huidige stap
                    : mounted && theme === "light" // NOSONAR — JSX nested ternary for multi-branch display state
                    ? "bg-gray-300" // Licht grijs voor andere stappen in licht thema
                    : "bg-gray-600" // Donker grijs voor andere stappen in donker thema
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
