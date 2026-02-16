# UI Overhaul Plan: Vibrant & Cute Theme

## Summary
Transform the dark, corporate-feeling Data Vista app into a vibrant, colorful, and cute interface that wows users. Remove unnecessary landing page sections, fix all header/footer links, and ensure a clean, polished experience across every page.

## Color Theme Change
**From:** Dark slate/lavender corporate palette
**To:** Vibrant gradient palette with warm pinks, soft purples, electric blues, and playful accents

### New Color Palette
- **Primary BG:** Deep indigo-violet (`#1a1035`) with subtle warm gradients
- **Cards:** Glassmorphic with pink/purple tinted borders
- **Accent primary:** Hot pink-magenta (`#f472b6` → `#ec4899`)
- **Accent secondary:** Electric violet (`#a78bfa` → `#8b5cf6`)
- **Accent tertiary:** Soft sky blue (`#7dd3fc` → `#38bdf8`)
- **Success:** Mint green (`#34d399`)
- **Gradients:** Pink-to-purple and blue-to-violet flowing gradients throughout
- **Text:** Warm whites and soft pink-tinted grays

## Files to Change (in order)

### 1. `tailwind.config.ts` — New color system
- Replace lavender-grey/lilac/lavender/almond-silk palettes with new vibrant palette
- Update accent, primary, and semantic colors

### 2. `app/globals.css` — Background, animations, utility classes
- New body background with vibrant gradient mesh (pink/purple/blue orbs)
- Update `gradient-text`, `glass-card`, `icon-glow`, `divider-gradient` utilities
- Update scrollbar colors
- Add a subtle animated background shimmer

### 3. `app/layout.tsx` — Header & Footer cleanup
- **Header:** New vibrant gradient logo, update nav link colors to match new palette, ensure all links work (Ask → `/#ask`, History → `/history`, Glossary → `/settings/glossary`, Settings → `/settings/datasources`)
- **Footer:** Fix dead `#` links — remove Resources/Legal columns with dead links (Documentation, API Reference, Changelog, Privacy Policy, Terms of Service, Security are all `#` — remove them). Keep only Brand + Product columns with working links. Update colors.

### 4. `src/components/landing/MosaicHero.tsx` — Simplify & vibrantify
- Remove the `hero.jpg` background image dependency (use pure CSS gradients instead)
- Remove the fake "Trust logos ticker" section (Acme Corp, Horizon AI, etc. are fake)
- Remove the fake stats row (10s, 99.9%, SOC 2 — these are made up)
- Keep the headline, subtitle, CTA buttons, and feature pills — restyle with vibrant colors
- Make the hero more compact and cute

### 5. `src/components/landing/FeatureGrid.tsx` — Restyle
- Update card gradient colors to vibrant pink/purple/blue/mint
- Update icon colors

### 6. `src/components/landing/HowItWorks.tsx` — Restyle
- Update step number badges and connector lines to new palette

### 7. `app/page.tsx` — Clean up homepage sections
- Keep: Hero (simplified), FeatureGrid, HowItWorks, Ask section
- The page structure stays the same, just restyled

### 8. Core UI Components — New vibrant styling
- **`src/components/Button.tsx`** — Vibrant gradient buttons (pink→purple for primary)
- **`src/components/Card.tsx`** — Glassmorphic cards with pink/purple tinted borders
- **`src/components/Input.tsx`** — Updated focus rings and border colors
- **`src/components/ui/Textarea.tsx`** — Same treatment as Input
- **`src/components/ui/Modal.tsx`** — Vibrant glassmorphic modal
- **`src/components/ui/Toast.tsx`** — Updated toast colors
- **`src/components/ui/Badge.tsx`** — New gradient
- **`src/components/ui/Tooltip.tsx`** — New gradient
- **`src/components/EmptyState.tsx`** — Updated icon and text colors

### 9. `components/nav-link.tsx` — Active state styling
- Update active indicator to new accent color

### 10. `components/auth-nav.tsx` — Profile menu styling
- Update avatar circle, dropdown menu colors

### 11. `src/components/RequireAuth.tsx` — Auth gate page
- Remove `hero.jpg` and `heroooppp.jpg` image dependencies
- Use CSS gradients instead
- Restyle with vibrant colors

### 12. Sub-pages restyle
- **`app/history/page.tsx`** — Tab colors, list item styling
- **`app/settings/datasources/page.tsx`** — Form styling, type selector colors
- **`app/settings/glossary/page.tsx`** — Table and category badge colors
- **`app/not-found.tsx`** — Fun 404 with vibrant styling

### 13. `components/ui/skeleton.tsx` — Update shimmer colors

## What Gets Removed
- Fake trust logo ticker (MosaicHero)
- Fake stats row (MosaicHero)
- `hero.jpg` / `heroooppp.jpg` image usage (replaced with CSS gradients)
- Dead footer links (Resources column, Legal column — all point to `#`)

## What Gets Fixed
- All header nav links verified working
- All footer links either real or removed
- Mobile nav menu links all working
- Profile dropdown links verified
