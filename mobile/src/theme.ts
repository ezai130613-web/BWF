/** BWF member-portal palette (emerald + antique gold) — see the website's src/app/globals.css and member UI. */
export const colors = {
  primary: '#065f46', // emerald-800
  primaryDark: '#064e3b', // emerald-900
  primaryDeep: '#022c22', // emerald-950
  primarySoft: '#ecfdf5', // emerald-50
  primaryBorder: '#a7f3d0', // emerald-200
  gold: '#c9a063',
  goldLight: '#e4cd9c',
  ivory: '#f4eee1',
  background: '#f6f5f1',
  surface: '#ffffff',
  border: '#e5e5e5',
  text: '#171717',
  textMuted: '#525252',
  textFaint: '#a3a3a3',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
  warning: '#b45309',
  warningSoft: '#fffbeb',
  info: '#0369a1',
  infoSoft: '#f0f9ff',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
