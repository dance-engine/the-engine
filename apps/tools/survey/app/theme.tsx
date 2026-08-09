export function ThemeVariables() {
  return <style>{`
    :root {

    /* -- Dance Engine Colors -- */

      --de-pink: oklch(60% 58% 354deg);
      --de-keppel:  oklch(69% 30% 177deg);
      --de-pear: oklch(86% 41% 113deg);

    /* -- Light mode variables -- */

      --sbk-page-light: #f7f4ee;
      --sbk-text-light: #17201e;
      --sbk-surface-light: #ffffff;
      --sbk-input-light: #ffffff;
      --sbk-text-muted-light: #57534e;
      --sbk-text-subtle-light: #78716c;
      --sbk-text-faint-light: #a8a29e;
      --sbk-border-light: #d6d3d1;
      --sbk-border-soft-light: #e7e5e4;
      --sbk-hover-light: #f5f5f4;
      --sbk-primary-light: var(--de-pink);
      --sbk-primary-hover-light: oklch(60% 88% 354deg);
      --sbk-primary-soft-light: #fff7ed;
      --sbk-primary-soft-text-light: #44403c;
      --sbk-aside-light: var(--de-keppel);
      --sbk-on-aside-light: #ffffff;
      --sbk-aside-accent-light: var(--de-pear);
      --sbk-aside-muted-light: rgba(254, 254, 254, 0.85);
      --sbk-aside-faint-light: rgba(236, 253, 245, 0.70);
      --sbk-success-light: #10b981;
      --sbk-neutral-light: #d6d3d1;
      --sbk-danger-bg-light: #fef2f2;
      --sbk-danger-text-light: #b91c1c;
      --sbk-shadow-light: rgba(60, 45, 30, 0.12);
      --sbk-ring-light: rgba(23, 32, 27, 0.10);

    
    /* -- Dark mode variables -- */

      --sbk-page-dark: #181520;
      --sbk-text-dark: #FFFFFF;
      --sbk-surface-dark: oklch(24% 7% 295deg);
      --sbk-input-dark: oklch(28% 9% 294deg);

      --sbk-text-muted-dark: rgba(254, 254, 254, 0.85);
      --sbk-text-subtle-dark: rgba(254, 254, 254, 0.85);
      --sbk-text-faint-dark: rgba(254, 254, 254, 0.85);

      --sbk-border-dark: var(--sbk-border-light);
      --sbk-border-soft-dark: oklch(37% 13% 294deg);
      --sbk-hover-dark: oklch(40% 20% 294deg);
      
      --sbk-primary-dark: var(--sbk-primary-light);
      --sbk-primary-hover-dark: var(--sbk-primary-hover-light);
      --sbk-primary-soft-dark: rgba(255, 254, 254, 0.1);
      --sbk-primary-soft-text-dark: var(--sbk-text-muted-dark);
      
      --sbk-aside-dark: oklch(57% 24% 178deg);
      --sbk-on-aside-dark: var(--sbk-on-aside-light);
      --sbk-aside-accent-dark: var(--sbk-aside-accent-light);
      --sbk-aside-muted-dark: var(--sbk-aside-muted-light);
      --sbk-aside-faint-dark: var(--sbk-aside-faint-light);

      --sbk-success-dark: var(--sbk-success-light);
      --sbk-neutral-dark: var(--sbk-neutral-light);
      --sbk-danger-bg-dark: var(--sbk-danger-bg-light);
      --sbk-danger-text-dark: var(--sbk-danger-text-light);
      --sbk-shadow-dark: var(--sbk-shadow-light);
      --sbk-ring-dark: var(--sbk-ring-light);

    /* -- Default to light mode variables -- */

      --sbk-page: var(--sbk-page-light);
      --sbk-text: var(--sbk-text-light);
      --sbk-surface: var(--sbk-surface-light);
      --sbk-input: var(--sbk-input-light);
      --sbk-text-muted: var(--sbk-text-muted-light);
      --sbk-text-subtle: var(--sbk-text-subtle-light);
      --sbk-text-faint: var(--sbk-text-faint-light);
      --sbk-border: var(--sbk-border-light);
      --sbk-border-soft: var(--sbk-border-soft-light);
      --sbk-hover: var(--sbk-hover-light);
      --sbk-primary: var(--sbk-primary-light);
      --sbk-primary-hover: var(--sbk-primary-hover-light);
      --sbk-primary-soft: var(--sbk-primary-soft-light);
      --sbk-primary-soft-text: var(--sbk-primary-soft-text-light);
      --sbk-aside: var(--sbk-aside-light);
      --sbk-on-aside: var(--sbk-on-aside-light);
      --sbk-aside-accent: var(--sbk-aside-accent-light);
      --sbk-aside-muted: var(--sbk-aside-muted-light);
      --sbk-aside-faint: var(--sbk-aside-faint-light);
      --sbk-success: var(--sbk-success-light);
      --sbk-neutral: var(--sbk-neutral-light);
      --sbk-danger-bg: var(--sbk-danger-bg-light);
      --sbk-danger-text: var(--sbk-danger-text-light);
      --sbk-shadow: var(--sbk-shadow-light);
      --sbk-ring: var(--sbk-ring-light);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --sbk-page: var(--sbk-page-dark);
        --sbk-text: var(--sbk-text-dark);
        --sbk-surface: var(--sbk-surface-dark);
        --sbk-input: var(--sbk-input-dark);
        --sbk-text-muted: var(--sbk-text-muted-dark);
        --sbk-text-subtle: var(--sbk-text-subtle-dark);
        --sbk-text-faint: var(--sbk-text-faint-dark);
        --sbk-border: var(--sbk-border-dark);
        --sbk-border-soft: var(--sbk-border-soft-dark);
        --sbk-hover: var(--sbk-hover-dark);
        --sbk-primary: var(--sbk-primary-dark);
        --sbk-primary-hover: var(--sbk-primary-hover-dark);
        --sbk-primary-soft: var(--sbk-primary-soft-dark);
        --sbk-primary-soft-text: var(--sbk-primary-soft-text-dark);
        --sbk-aside: var(--sbk-aside-dark);
        --sbk-on-aside: var(--sbk-on-aside-dark);
        --sbk-aside-accent: var(--sbk-aside-accent-dark);
        --sbk-aside-muted: var(--sbk-aside-muted-dark);
        --sbk-aside-faint: var(--sbk-aside-faint-dark);
        --sbk-success: var(--sbk-success-dark);
        --sbk-neutral: var(--sbk-neutral-dark);
        --sbk-danger-bg: var(--sbk-danger-bg-dark);
        --sbk-danger-text: var(--sbk-danger-text-dark);
        --sbk-shadow: var(--sbk-shadow-dark);
        --sbk-ring: var(--sbk-ring-dark);
      }
    }
  `}</style>;
}
