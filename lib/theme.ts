/**
 * ClashKing Dashboard Theme Configuration
 *
 * Couleurs et configuration de thème basées sur le branding ClashKing
 * Assets repository: https://github.com/ClashKingInc/ClashKingAssets
 */

// ============================================================================
// COULEURS BRANDING CLASHKING
// ============================================================================

/**
 * Couleurs principales extraites du logo ClashKing
 * Source: /assets/logos/crown-red/ClashKing-crown.svg
 */
export const clashKingColors = {
  // Rouges principaux (du logo)
  primary: '#D90709',      // Rouge vif principal
  primaryDark: '#BF0000',  // Rouge foncé
  primaryLight: '#FF1A1C', // Rouge clair pour les hovers

  // Variantes de rouge pour les gradients
  red: {
    50: '#FFE5E5',
    100: '#FFCCCC',
    200: '#FF9999',
    300: '#FF6666',
    400: '#FF3333',
    500: '#D90709',  // Couleur principale
    600: '#BF0000',  // Couleur foncée
    700: '#990000',
    800: '#660000',
    900: '#330000',
  },
} as const;

// ============================================================================
// LOGOS ET ASSETS
// ============================================================================

/**
 * URLs des logos et assets ClashKing
 * CDN: https://assets.clashk.ing
 */
export const clashKingAssets = {
  // Base URL du CDN
  baseUrl: 'https://assets.clashk.ing',

  logos: {
    // LOGOS OFFICIELS (couronne + flèche) - À privilégier
    // Utilisez ces logos pour le dashboard
    darkBg: 'https://assets.clashk.ing/logos/crown-arrow-dark-bg/ClashKing-1.svg',
    darkBgPng: 'https://assets.clashk.ing/logos/crown-arrow-dark-bg/ClashKing-1.png',
    whiteBg: 'https://assets.clashk.ing/logos/crown-arrow-white-bg/ClashKing-2.svg',
    whiteBgPng: 'https://assets.clashk.ing/logos/crown-arrow-white-bg/ClashKing-2.png',

    // LOGOS AVEC TEXTE "ClashKing"
    withTextDark: 'https://assets.clashk.ing/logos/crown-text-dark-bg/ClashKing-with-text-3.svg',
    withTextDarkPng: 'https://assets.clashk.ing/logos/crown-text-dark-bg/KTYEp1081709208tL7z4HA7BiA2MucfE08fgsIuKdtnuf37cwqzbdp9qpnj2j.png',
    withTextWhite: 'https://assets.clashk.ing/logos/crown-text-white-bg/ClashKing-with-text-2.svg',
    withTextWhitePng: 'https://assets.clashk.ing/logos/crown-text-white-bg/BqlEp974170917vB1qK0zunfANJCGi0W031dTksEq7KQ9LoXWMFk0u77unHJa.png',

    // ICÔNES (couronne seule)
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

  // Icônes de jeu disponibles
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
    // Icônes génériques
    generic: {
      startFlag: 'https://assets.clashk.ing/icons/Icon_HV_Start_Flag.png',
      sword: 'https://assets.clashk.ing/icons/Icon_HV_Sword.png',
      podium: 'https://assets.clashk.ing/icons/Icon_HV_Podium.png',
      shieldArrow: 'https://assets.clashk.ing/icons/Icon_HV_Shield_Arrow.png',
      unknownPerson: 'https://assets.clashk.ing/icons/Unknown_person.jpg',
    },
  },

  // Chemins vers les dossiers d'assets
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
// THEME DARK MODE (Style MEE6/Discord moderne)
// ============================================================================

/**
 * Configuration du thème dark pour le dashboard
 * Inspiré des dashboards modernes (MEE6, Discord, etc.)
 */
export const darkTheme = {
  // Backgrounds
  background: {
    primary: '#0F0F0F',      // Fond principal ultra sombre
    secondary: '#1A1A1A',    // Cartes et éléments surélevés
    tertiary: '#242424',     // Hovers et éléments interactifs
    elevated: '#2D2D2D',     // Modals et dropdowns
    hover: '#2F2F2F',        // États de hover
  },

  // Texte
  text: {
    primary: '#FFFFFF',      // Texte principal
    secondary: '#B3B3B3',    // Texte secondaire
    tertiary: '#808080',     // Texte désactivé/placeholder
    muted: '#666666',        // Texte très discret
    link: '#5B9FFF',         // Liens
  },

  // Bordures
  border: {
    primary: '#2D2D2D',      // Bordures principales
    secondary: '#3D3D3D',    // Bordures secondaires
    accent: '#4D4D4D',       // Bordures accentuées
  },

  // États
  state: {
    success: '#3BA55D',      // Succès / Positif
    warning: '#FAA81A',      // Avertissement
    error: '#ED4245',        // Erreur
    info: '#5B9FFF',         // Information
  },

  // Accents ClashKing
  accent: {
    primary: clashKingColors.primary,
    primaryHover: clashKingColors.primaryLight,
    primaryActive: clashKingColors.primaryDark,
    gradient: `linear-gradient(135deg, ${clashKingColors.primaryDark} 0%, ${clashKingColors.primary} 100%)`,
  },
} as const;

// ============================================================================
// VARIABLES CSS
// ============================================================================

/**
 * Variables CSS à injecter dans le document
 * Utilisables avec var(--ck-primary), var(--bg-primary), etc.
 */
export const cssVariables = {
  // Couleurs ClashKing
  '--ck-primary': clashKingColors.primary,
  '--ck-primary-dark': clashKingColors.primaryDark,
  '--ck-primary-light': clashKingColors.primaryLight,

  // Backgrounds
  '--bg-primary': darkTheme.background.primary,
  '--bg-secondary': darkTheme.background.secondary,
  '--bg-tertiary': darkTheme.background.tertiary,
  '--bg-elevated': darkTheme.background.elevated,
  '--bg-hover': darkTheme.background.hover,

  // Texte
  '--text-primary': darkTheme.text.primary,
  '--text-secondary': darkTheme.text.secondary,
  '--text-tertiary': darkTheme.text.tertiary,
  '--text-muted': darkTheme.text.muted,
  '--text-link': darkTheme.text.link,

  // Bordures
  '--border-primary': darkTheme.border.primary,
  '--border-secondary': darkTheme.border.secondary,
  '--border-accent': darkTheme.border.accent,

  // États
  '--state-success': darkTheme.state.success,
  '--state-warning': darkTheme.state.warning,
  '--state-error': darkTheme.state.error,
  '--state-info': darkTheme.state.info,

  // Spacing (optionnel)
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
 * Applique les variables CSS au document
 */
export function applyThemeVariables(root: HTMLElement = document.documentElement) {
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Génère un objet de style inline avec les variables CSS
 */
export function getInlineStyles() {
  return Object.entries(cssVariables).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Crée une classe CSS avec toutes les variables
 */
export function generateThemeCSS(): string {
  const variables = Object.entries(cssVariables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${variables}\n}`;
}

// ============================================================================
// EXPORT PAR DÉFAUT
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
