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
export const clashKingAssets = {
  // CDN base URL
  baseUrl: 'https://assets.clashk.ing',

  logos: {
    // OFFICIAL LOGOS (crown + arrow) - Preferred
    // Use these logos for the dashboard
    darkBg: 'https://assets.clashk.ing/logos/crown-arrow-dark-bg/ClashKing-1.svg',
    darkBgPng: 'https://assets.clashk.ing/logos/crown-arrow-dark-bg/ClashKing-1.png',
    whiteBg: 'https://assets.clashk.ing/logos/crown-arrow-white-bg/ClashKing-2.svg',
    whiteBgPng: 'https://assets.clashk.ing/logos/crown-arrow-white-bg/ClashKing-2.png',

    // LOGOS WITH "ClashKing" TEXT
    withTextDark: 'https://assets.clashk.ing/logos/crown-text-dark-bg/ClashKing-with-text-3.svg',
    withTextDarkPng: 'https://assets.clashk.ing/logos/crown-text-dark-bg/KTYEp1081709208tL7z4HA7BiA2MucfE08fgsIuKdtnuf37cwqzbdp9qpnj2j.png',
    withTextWhite: 'https://assets.clashk.ing/logos/crown-text-white-bg/ClashKing-with-text-2.svg',
    withTextWhitePng: 'https://assets.clashk.ing/logos/crown-text-white-bg/BqlEp974170917vB1qK0zunfANJCGi0W031dTksEq7KQ9LoXWMFk0u77unHJa.png',

    // ICONS (crown only)
    crownRed: 'https://assets.clashk.ing/logos/crown-red/ClashKing-crown.svg',
    iconBlack: 'https://assets.clashk.ing/logos/crown-black-arrow-white-bg/ClashKing-icon-black.svg',
    iconBlackPng: 'https://assets.clashk.ing/logos/crown-black-arrow-white-bg/Rl3Ep2541709222E0oUYaLObTdAOBkQ6MiAb16i3iq7ROnNlky4kqZQPS8Ku6.png',
    iconWhite: 'https://assets.clashk.ing/logos/crown-white-arrow-dark-bg/ClashKing-icon-white.svg',
    iconWhitePng: 'https://assets.clashk.ing/logos/crown-white-arrow-dark-bg/FjTEp708170921wcQnjjhKgCZNfLjaMO7uQy3lFnLiwcsjtNluf1CyZ3e7QtL.png',
    crownBlack: 'https://assets.clashk.ing/logos/crown-black/crown-black.svg',
    crownWhite: 'https://assets.clashk.ing/logos/crown-white/crown-white.svg',

    // BOT/APP LOGOS
    botApp: 'https://assets.clashk.ing/logos/bot-app-logo/bot-app-logo.png',
    christmas: 'https://assets.clashk.ing/logos/bot-app-logo/christmas-logo.gif',
  },

  // Available game icons
  icons: {
    // Clash Royale / Discord (Icon_DC_*)
    dc: {
      cwl: 'https://assets.clashk.ing/icons/Icon_DC_CWL.png',
      war: 'https://assets.clashk.ing/icons/Icon_DC_War.png',
      hitrate: 'https://assets.clashk.ing/icons/Icon_DC_Hitrate.png',
      cross: 'https://assets.clashk.ing/icons/Icon_DC_Cross.png',
      tick: 'https://assets.clashk.ing/icons/Icon_DC_Tick.png',
      arrowLeft: 'https://assets.clashk.ing/icons/Icon_DC_ArrowLeft.png',
      arrowRight: 'https://assets.clashk.ing/icons/Icon_DC_ArrowRight.png',
    },
    // Clash of Clans - Home Village (Icon_HV_*)
    hv: {
      attack: 'https://assets.clashk.ing/icons/Icon_HV_Attack.png',
      shield: 'https://assets.clashk.ing/icons/Icon_HV_Shield.png',
      trophy: 'https://assets.clashk.ing/icons/Icon_HV_Trophy.png',
      legendLeague: 'https://assets.clashk.ing/icons/Icon_HV_League_Legend_3.png',
      clanWar: 'https://assets.clashk.ing/icons/Icon_HV_Clan_War.png',
      goldPass: 'https://assets.clashk.ing/icons/Icon_HV_Gold_Pass.png',
      raidAttack: 'https://assets.clashk.ing/icons/Icon_HV_Raid_Attack.png',
      capitalGold: 'https://assets.clashk.ing/icons/Icon_HV_Capital_Gold.png',
      capitalTrophy: 'https://assets.clashk.ing/icons/Icon_HV_Capital_Trophy.png',
    },
    // Builder Base (Icon_BB_*)
    bb: {
      starEmpty: 'https://assets.clashk.ing/icons/Icon_BB_Star_Empty.png',
      starFilled: 'https://assets.clashk.ing/icons/Icon_BB_Star_Filled.png',
    },
    // Generic icons
    generic: {
      startFlag: 'https://assets.clashk.ing/icons/Icon_HV_Start_Flag.png',
      sword: 'https://assets.clashk.ing/icons/Icon_HV_Sword.png',
      podium: 'https://assets.clashk.ing/icons/Icon_HV_Podium.png',
      shieldArrow: 'https://assets.clashk.ing/icons/Icon_HV_Shield_Arrow.png',
      unknownPerson: 'https://assets.clashk.ing/icons/Unknown_person.jpg',
    },
  },

  // Paths to asset folders
  paths: {
    logos: 'https://assets.clashk.ing/logos',
    icons: 'https://assets.clashk.ing/icons',
    flags: 'https://assets.clashk.ing/country-flags',
    stickers: 'https://assets.clashk.ing/stickers',
    defaultPics: 'https://assets.clashk.ing/default-pics',
    fonts: 'https://assets.clashk.ing/fonts',
    homeBase: 'https://assets.clashk.ing/home-base',
    builderBase: 'https://assets.clashk.ing/builder-base',
    capitalBase: 'https://assets.clashk.ing/capital-base',
  },
} as const;

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

/**
 * Generate inline styles object with CSS variables
 */
export function getInlineStyles() {
  return Object.entries(cssVariables).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Create CSS class with all variables
 */
export function generateThemeCSS(): string {
  const variables = Object.entries(cssVariables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${variables}\n}`;
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
  getInlineStyles,
  generateCSS: generateThemeCSS,
} as const;

export default theme;
