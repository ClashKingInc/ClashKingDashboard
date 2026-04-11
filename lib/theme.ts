/**
 * ClashKing Dashboard Theme Configuration
 *
 * Colors and theme configuration based on ClashKing branding
 * Assets repository: https://github.com/ClashKingInc/ClashKingAssets
 */

// ============================================================================
// CLASHKING BRANDING COLORS
// ============================================================================

/**
 * Main colors extracted from ClashKing logo
 * Source: /assets/logos/crown-red/ClashKing-crown.svg
 */
export const clashKingColors = {
  // Main reds (from logo)
  primary: '#D90709',      // Main bright red
  primaryDark: '#BF0000',  // Dark red
  primaryLight: '#FF1A1C', // Light red for hovers

  // Red variants for gradients
  red: {
    50: '#FFE5E5',
    100: '#FFCCCC',
    200: '#FF9999',
    300: '#FF6666',
    400: '#FF3333',
    500: '#D90709',  // Main color
    600: '#BF0000',  // Dark color
    700: '#990000',
    800: '#660000',
    900: '#330000',
  },
} as const;

// ============================================================================
// LOGOS AND ASSETS
// ============================================================================

/**
 * ClashKing logos and assets URLs
 * CDN: https://assets.clashk.ing
 */
const baseUrl = 'https://assets.clashk.ing';

export const clashKingAssets = {
  // CDN base URL
  baseUrl,

  logos: {
    // OFFICIAL LOGOS (crown + arrow) - Preferred
    // Use these logos for the dashboard
    darkBg: `${baseUrl}/logos/crown-arrow-dark-bg/ClashKing-1.svg`,
    darkBgPng: `${baseUrl}/logos/crown-arrow-dark-bg/ClashKing-1.png`,
    whiteBg: `${baseUrl}/logos/crown-arrow-white-bg/ClashKing-2.svg`,
    whiteBgPng: `${baseUrl}/logos/crown-arrow-white-bg/ClashKing-2.png`,

    // LOGOS WITH "ClashKing" TEXT
    withTextDark: `${baseUrl}/logos/crown-text-dark-bg/ClashKing-with-text-3.svg`,
    withTextDarkPng: `${baseUrl}/logos/crown-text-dark-bg/KTYEp1081709208tL7z4HA7BiA2MucfE08fgsIuKdtnuf37cwqzbdp9qpnj2j.png`,
    withTextWhite: `${baseUrl}/logos/crown-text-white-bg/ClashKing-with-text-2.svg`,
    withTextWhitePng: `${baseUrl}/logos/crown-text-white-bg/BqlEp974170917vB1qK0zunfANJCGi0W031dTksEq7KQ9LoXWMFk0u77unHJa.png`,

    // TEXT LOGOS (for loading screens)
    textDarkBg: `${baseUrl}/logos/crown-arrow-dark-bg/CK-text-dark-bg.png`,
    textWhiteBg: `${baseUrl}/logos/crown-arrow-white-bg/CK-text-white-bg.png`,

    // ICONS (crown only)
    crownRed: `${baseUrl}/logos/crown-red/ClashKing-crown.svg`,
    iconBlack: `${baseUrl}/logos/crown-black-arrow-white-bg/ClashKing-icon-black.svg`,
    iconBlackPng: `${baseUrl}/logos/crown-black-arrow-white-bg/Rl3Ep2541709222E0oUYaLObTdAOBkQ6MiAb16i3iq7ROnNlky4kqZQPS8Ku6.png`,
    iconWhite: `${baseUrl}/logos/crown-white-arrow-dark-bg/ClashKing-icon-white.svg`,
    iconWhitePng: `${baseUrl}/logos/crown-white-arrow-dark-bg/FjTEp708170921wcQnjjhKgCZNfLjaMO7uQy3lFnLiwcsjtNluf1CyZ3e7QtL.png`,
    crownBlack: `${baseUrl}/logos/crown-black/crown-black.svg`,
    crownWhite: `${baseUrl}/logos/crown-white/crown-white.svg`,

    // BOT/APP LOGOS
    botApp: `${baseUrl}/logos/bot-app-logo/bot-app-logo.png`,
    christmas: `${baseUrl}/logos/bot-app-logo/christmas-logo.gif`,
  },

  // Available game icons
  icons: {
    // Clash Royale / Discord (Icon_DC_*)
    dc: {
      cwl: `${baseUrl}/icons/Icon_DC_CWL.png`,
      war: `${baseUrl}/icons/Icon_DC_War.png`,
      hitrate: `${baseUrl}/icons/Icon_DC_Hitrate.png`,
      cross: `${baseUrl}/icons/Icon_DC_Cross.png`,
      tick: `${baseUrl}/icons/Icon_DC_Tick.png`,
      arrowLeft: `${baseUrl}/icons/Icon_DC_ArrowLeft.png`,
      arrowRight: `${baseUrl}/icons/Icon_DC_ArrowRight.png`,
    },
    // Clash of Clans - Home Village (Icon_HV_*)
    hv: {
      attack: `${baseUrl}/icons/Icon_HV_Attack.png`,
      shield: `${baseUrl}/icons/Icon_HV_Shield.png`,
      trophy: `${baseUrl}/icons/Icon_HV_Trophy.png`,
      legendLeague: `${baseUrl}/icons/Icon_HV_League_Legend_3.png`,
      clanWar: `${baseUrl}/icons/Icon_HV_Clan_War.png`,
      goldPass: `${baseUrl}/icons/Icon_HV_Gold_Pass.png`,
      raidAttack: `${baseUrl}/icons/Icon_HV_Raid_Attack.png`,
      capitalGold: `${baseUrl}/icons/Icon_HV_Capital_Gold.png`,
      capitalTrophy: `${baseUrl}/icons/Icon_HV_Capital_Trophy.png`,
    },
    // Builder Base (Icon_BB_*)
    bb: {
      starEmpty: `${baseUrl}/icons/Icon_BB_Star_Empty.png`,
      starFilled: `${baseUrl}/icons/Icon_BB_Star_Filled.png`,
    },
    // Generic icons
    generic: {
      startFlag: `${baseUrl}/icons/Icon_HV_Start_Flag.png`,
      sword: `${baseUrl}/icons/Icon_HV_Sword.png`,
      podium: `${baseUrl}/icons/Icon_HV_Podium.png`,
      shieldArrow: `${baseUrl}/icons/Icon_HV_Shield_Arrow.png`,
      unknownPerson: `${baseUrl}/icons/Unknown_person.jpg`,
    },
  },

  // Paths to asset folders
  paths: {
    logos: `${baseUrl}/logos`,
    icons: `${baseUrl}/icons`,
    flags: `${baseUrl}/country-flags`,
    stickers: `${baseUrl}/stickers`,
    defaultPics: `${baseUrl}/default-pics`,
    fonts: `${baseUrl}/fonts`,
    homeBase: `${baseUrl}/home-base`,
    builderBase: `${baseUrl}/builder-base`,
    capitalBase: `${baseUrl}/capital-base`,
    townHallPics: `${baseUrl}/home-base/town-hall-pics`,
  },
} as const;

export function townHallImageUrl(level: number): string {
  return `${baseUrl}/home-base/town-hall-pics/town-hall-${level}.png`;
}

// ============================================================================
// DARK MODE THEME
// ============================================================================

/**
 * Dark theme configuration for the dashboard
 * Modern dark interface with ClashKing branding
 */
export const darkTheme = {
  // Backgrounds
  background: {
    primary: '#0F0F0F',      // Ultra dark main background
    secondary: '#1A1A1A',    // Cards and elevated elements
    tertiary: '#242424',     // Hovers and interactive elements
    elevated: '#2D2D2D',     // Modals and dropdowns
    hover: '#2F2F2F',        // Hover states
  },

  // Text
  text: {
    primary: '#FFFFFF',      // Primary text
    secondary: '#B3B3B3',    // Secondary text
    tertiary: '#808080',     // Disabled text/placeholder
    muted: '#666666',        // Very subtle text
    link: '#5B9FFF',         // Links
  },

  // Borders
  border: {
    primary: '#2D2D2D',      // Primary borders
    secondary: '#3D3D3D',    // Secondary borders
    accent: '#4D4D4D',       // Accented borders
  },

  // States
  state: {
    success: '#3BA55D',      // Success / Positive
    warning: '#FAA81A',      // Warning
    error: '#ED4245',        // Error
    info: '#5B9FFF',         // Information
  },

  // ClashKing accents
  accent: {
    primary: clashKingColors.primary,
    primaryHover: clashKingColors.primaryLight,
    primaryActive: clashKingColors.primaryDark,
    gradient: `linear-gradient(135deg, ${clashKingColors.primaryDark} 0%, ${clashKingColors.primary} 100%)`,
  },
} as const;

// ============================================================================
// CSS VARIABLES
// ============================================================================

/**
 * CSS variables to inject into the document
 * Usable with var(--ck-primary), var(--bg-primary), etc.
 */
export const cssVariables = {
  // ClashKing colors
  '--ck-primary': clashKingColors.primary,
  '--ck-primary-dark': clashKingColors.primaryDark,
  '--ck-primary-light': clashKingColors.primaryLight,

  // Backgrounds
  '--bg-primary': darkTheme.background.primary,
  '--bg-secondary': darkTheme.background.secondary,
  '--bg-tertiary': darkTheme.background.tertiary,
  '--bg-elevated': darkTheme.background.elevated,
  '--bg-hover': darkTheme.background.hover,

  // Text
  '--text-primary': darkTheme.text.primary,
  '--text-secondary': darkTheme.text.secondary,
  '--text-tertiary': darkTheme.text.tertiary,
  '--text-muted': darkTheme.text.muted,
  '--text-link': darkTheme.text.link,

  // Borders
  '--border-primary': darkTheme.border.primary,
  '--border-secondary': darkTheme.border.secondary,
  '--border-accent': darkTheme.border.accent,

  // States
  '--state-success': darkTheme.state.success,
  '--state-warning': darkTheme.state.warning,
  '--state-error': darkTheme.state.error,
  '--state-info': darkTheme.state.info,

  // Spacing (optional)
  '--spacing-xs': '4px',
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-lg': '24px',
  '--spacing-xl': '32px',

  // Border radius
  '--radius-sm': '4px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--radius-xl': '16px',

  // Shadows
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.6)',

  // Transitions
  '--transition-fast': '150ms ease-in-out',
  '--transition-normal': '250ms ease-in-out',
  '--transition-slow': '350ms ease-in-out',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply CSS variables to the document
 */
export function applyThemeVariables(root: HTMLElement = document.documentElement) {
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export const theme = {
  colors: clashKingColors,
  dark: darkTheme,
  assets: clashKingAssets,
  variables: cssVariables,
  apply: applyThemeVariables,
} as const;

export default theme;
