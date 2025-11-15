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
 * URLs des logos ClashKing disponibles
 * Base URL: https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main
 */
export const clashKingAssets = {
  logos: {
    // LOGOS OFFICIELS (couronne + flèche)
    // Utilisez ces logos pour le dashboard
    darkBg: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-arrow-dark-bg/ClashKing-1.svg',
    darkBgPng: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-arrow-dark-bg/ClashKing-1.png',
    whiteBg: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-arrow-white-bg/ClashKing-2.svg',
    whiteBgPng: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-arrow-white-bg/ClashKing-2.png',

    // LOGOS AVEC TEXTE "ClashKing"
    withTextDark: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-text-dark-bg/ClashKing-with-text-3.svg',
    withTextWhite: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-text-white-bg/ClashKing-with-text-2.svg',

    // ICÔNES (couronne seule)
    // Couronne rouge
    crownRed: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-red/ClashKing-crown.svg',
    // Couronne noire (sur fond blanc)
    iconBlack: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-black-arrow-white-bg/ClashKing-icon-black.svg',
    // Couronne blanche (sur fond sombre)
    iconWhite: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-white-arrow-dark-bg/ClashKing-icon-white.svg',
    // Couronne simple (noire/blanche)
    crownBlack: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-black/crown-black.svg',
    crownWhite: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/crown-white/crown-white.svg',

    // BOT/APP LOGOS
    botApp: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/bot-app-logo/bot-app-logo.png',
    christmas: 'https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/main/assets/logos/bot-app-logo/christmas-logo.gif',
  },

  // Dossiers d'assets disponibles
  paths: {
    icons: '/assets/icons',
    flags: '/assets/country-flags',
    stickers: '/assets/stickers',
    defaultPics: '/assets/default-pics',
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
