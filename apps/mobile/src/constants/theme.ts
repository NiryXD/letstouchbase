/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * LTB palette — LinkedIn drag, Hinge bones. The app should look like a B2B
 * SaaS tool that is inexplicably a dating app.
 */
export const LTB = {
  primary: '#0A66C2',        // the blue
  primaryPressed: '#084E96',
  navy: '#1B3A5C',           // headers
  paper: '#FFFFFF',          // cards ("resume paper")
  feedGray: '#F3F2EF',       // app background
  divider: '#E0DFDC',
  ink: '#1D2226',            // primary text
  inkSecondary: '#56687A',
  openToWork: {
    committed: '#2E7D32',    // green — Open to Commitment
    casual: '#7B1FA2',       // purple — Looking for Contract Work
    networking: '#757575',   // grey — Happily Employed (Just Networking)
  },
  reject: '#B3261E',
  gold: '#B8860B',           // Headhunt accents
} as const;

export const Colors = {
  light: {
    text: LTB.ink,
    background: LTB.feedGray,
    backgroundElement: LTB.paper,
    backgroundSelected: '#E8F0F9',
    textSecondary: LTB.inkSecondary,
  },
  // v1 ships light-only (the corporate-memo look IS light mode); dark tracks it
  dark: {
    text: LTB.ink,
    background: LTB.feedGray,
    backgroundElement: LTB.paper,
    backgroundSelected: '#E8F0F9',
    textSecondary: LTB.inkSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
