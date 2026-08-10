"use client";

import { useId, type ComponentProps } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

type FolderIconProps = Omit<ComponentProps<typeof motion.svg>, "color" | "height" | "width"> & {
  size?: number;
};

const FLAP_PATH =
  "M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z";

/** Compact, theme-aware adaptation of Rare UI's folder artwork. */
export function FolderIcon({ className, size = 20, style, ...props }: FolderIconProps) {
  const { resolvedTheme, theme } = useTheme();
  const isDark = resolvedTheme === "dark" || (!resolvedTheme && theme === "dark");
  const reduceMotion = useReducedMotion();
  const gradientId = `${useId().replace(/:/g, "")}-folder-gradient`;
  const palette = isDark
    ? {
        back: "#050505",
        frontStart: "#343434",
        frontEnd: "#181818",
        stroke: "#858585",
        paper: "#f1f1f1",
        paperLine: "#d4d4d4",
      }
    : {
        back: "#ffffff",
        frontStart: "#ffffff",
        frontEnd: "#e7e7e7",
        stroke: "#d4d4d4",
        paper: "#262626",
        paperLine: "#737373",
      };
  const paperTransition = { type: "spring" as const, stiffness: 170, damping: 13 };

  return (
    <motion.svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 321 270"
      preserveAspectRatio="xMidYMid meet"
      data-slot="folder"
      data-folder-color={isDark ? "black" : "white"}
      data-folder-animated={reduceMotion ? "false" : "true"}
      className={cn("shrink-0 overflow-visible", className)}
      style={{ width: size, height: size, transformOrigin: "center", ...style }}
      variants={{
        rest: { scale: 1 },
        hover: { scale: 1.06 },
        open: { scale: 1.1 },
      }}
      transition={paperTransition}
      initial="rest"
      animate="rest"
      whileHover={reduceMotion ? undefined : "hover"}
      whileTap={reduceMotion ? undefined : "open"}
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="160.5" y1="29" x2="160.5" y2="270" gradientUnits="userSpaceOnUse">
          <stop stopColor={palette.frontStart} />
          <stop offset="1" stopColor={palette.frontEnd} />
        </linearGradient>
      </defs>

      <rect width="321" height="270" rx="25" fill={palette.back} />

      <motion.g
        data-folder-paper="left"
        variants={{
          rest: { x: 0, y: 0, rotate: 0 },
          hover: { x: -20, y: -66, rotate: -8 },
          open: { x: -34, y: -122, rotate: -14 },
        }}
        transition={paperTransition}
      >
        <g transform="rotate(-9 137 132)">
          <rect x="57" y="28" width="164" height="214" rx="20" fill={palette.paper} />
          <rect x="75" y="60" width="128" height="12" rx="6" fill={palette.paperLine} />
        </g>
      </motion.g>
      <motion.g
        data-folder-paper="right"
        variants={{
          rest: { x: 0, y: 0, rotate: 0 },
          hover: { x: 20, y: -70, rotate: 8 },
          open: { x: 34, y: -126, rotate: 14 },
        }}
        transition={paperTransition}
      >
        <g transform="rotate(8 185 130)">
          <rect x="103" y="24" width="164" height="214" rx="20" fill={palette.paper} />
          <rect x="121" y="56" width="128" height="12" rx="6" fill={palette.paperLine} />
        </g>
      </motion.g>
      <motion.g
        data-folder-paper="center"
        variants={{
          rest: { y: 0, rotate: 0 },
          hover: { y: -86, rotate: -2 },
          open: { y: -148, rotate: -4 },
        }}
        transition={paperTransition}
      >
        <rect x="79" y="18" width="164" height="214" rx="20" fill={palette.paper} />
        <rect x="97" y="50" width="128" height="12" rx="6" fill={palette.paperLine} />
        <rect x="97" y="78" width="56" height="7" rx="3.5" fill={palette.paperLine} />
        <rect x="169" y="78" width="56" height="7" rx="3.5" fill={palette.paperLine} />
      </motion.g>

      <motion.g
        data-folder-flap="true"
        variants={{
          rest: { y: 0, scaleY: 1, skewX: 0 },
          hover: { y: 32, scaleY: 0.72, skewX: -2 },
          open: { y: 52, scaleY: 0.52, skewX: -3 },
        }}
        transition={paperTransition}
        style={{ transformOrigin: "160.5px 270px" }}
      >
        <path
          d={FLAP_PATH}
          transform="translate(0 29)"
          fill={`url(#${gradientId})`}
          stroke={palette.stroke}
          strokeWidth="2"
        />
      </motion.g>
    </motion.svg>
  );
}
