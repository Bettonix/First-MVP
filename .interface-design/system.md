# Design System — Balcão Rápido

## Identity

**Theme:** Artesanal Urbano Premium  
**Personality:** High-contrast, warm neutrals, single accent color, no decorative clutter  
**Fonts:** Inter (sans, UI), Playfair Display (serif, display/headings)  
**Color scheme:** Light (parchment base), with intentional dark panels (auth brand, onboarding)

---

## Color Tokens

### Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `--parchment` | `#F9F7F2` | Global page background |
| `--porcelana` | `#FFFFFF` | Cards, panels, inputs on focus |
| `--muted` | `#F3F1EC` | Inputs, sub-surfaces, skeletons |
| `--muted-hover` | `#EDE9E1` | Row hover states |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--ink` | `#2D2D2D` | Primary text |
| `--ink-2` | `#4A4A4A` | Secondary text |
| `--ink-3` | `#6B6B6B` | Subtext, labels |
| `--ink-4` | `#9A9A9A` | Muted, placeholders |

### Brand (Primary Action)
| Token | Value | Usage |
|-------|-------|-------|
| `--brasa` | `#D35400` | Primary CTA, active states, focus rings |
| `--brasa-hover` | `#B84A00` | Hover on primary |
| `--brasa-light` | `#FDF0E8` | Tinted backgrounds for active/selected |
| `--brasa-border` | `rgba(211,84,0,0.25)` | Accent borders |

### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#2D6A4F` | Success text |
| `--success-bg` | `#EDFAF3` | Success backgrounds |
| `--danger` | `#9B1C1C` | Error/destructive text |
| `--danger-bg` | `#FEF2F2` | Error backgrounds |
| `--danger-border` | `rgba(155,28,28,0.2)` | Error borders |
| `--warning` | `#92400E` | Warning text |
| `--warning-bg` | `#FEF3C7` | Warning backgrounds |
| `--mel` | `#B7791F` | Amber/secondary accent |
| `--mel-light` | `#FEF3C7` | Amber tinted background |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(45,45,45,0.08)` | Default subtle border |
| `--border-md` | `rgba(45,45,45,0.14)` | Medium emphasis border |
| `--border-strong` | `rgba(45,45,45,0.22)` | Strong border |

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(45,45,45,0.06)` | Minimal lift |
| `--shadow-sm` | `0 1px 3px ... 0 1px 2px ...` | Cards, inputs |
| `--shadow-md` | `0 4px 6px ...` | Dropdowns, tooltips |
| `--shadow-lg` | `0 10px 20px ...` | Modals, elevated panels |

---

## Spacing Scale

**Base unit:** 4px (Tailwind default)  
**Most used gaps (by frequency):** `gap-2` (101×), `gap-3` (75×), `gap-1` (40×), `gap-1.5` (39×), `gap-4` (35×)

| Scale | Value | Tailwind |
|-------|-------|---------|
| 1 | 4px | `gap-1`, `p-1` |
| 2 | 8px | `gap-2`, `p-2` ← most common |
| 3 | 12px | `gap-3`, `p-3` |
| 4 | 16px | `gap-4`, `p-4` |
| 5 | 20px | `p-5` |
| 6 | 24px | `gap-6`, `p-6` |
| 8 | 32px | `p-8` |

---

## Border Radius Scale

**Most used (by frequency):** `rounded-xl` (155×), `rounded-2xl` (108×), `rounded-full` (53×), `rounded-lg` (50×), `rounded-3xl` (33×)

| Name | Value | Tailwind | Usage |
|------|-------|---------|-------|
| sm | 8px | `rounded-lg` | Small chips, badges, tight elements |
| md | 12px | `rounded-xl` | **Default** — inputs, buttons, cards |
| lg | 16px | `rounded-2xl` | Sheets, modals, feature cards |
| xl | 24px | `rounded-3xl` | Hero cards, KPI cards |
| full | 9999px | `rounded-full` | Pills, avatars, badges |

---

## Typography Scale

**Most used sizes:** `text-sm` (167×), `text-xs` (133×), `text-lg` (26×), `text-base` (25×), `text-2xl` (24×)  
**Most used weights:** `font-bold` (210×), `font-black` (173×), `font-semibold` (68×)

| Role | Size | Weight | Token |
|------|------|--------|-------|
| Page title (H1) | `text-2xl`–`text-3xl` | `font-black` | Gradient `#1c1917→#57534e` |
| Section title (H2) | `text-lg`–`text-xl` | `font-bold` | `var(--ink)` via `dash-title` |
| Body | `text-sm` | `font-medium`/`font-semibold` | `var(--ink-2)` |
| Label/caption | `text-xs` | `font-bold` + `uppercase tracking-widest` | `var(--ink-3)` |
| Placeholder | `text-sm` | `font-normal` | `var(--ink-4)` |
| Display (auth/landing) | `clamp(48px,4.8vw,74px)` | `font-black` | Playfair Display |

**Gradient headline pattern** (landing + page H1s):
```css
background: linear-gradient(135deg, #1c1917 0%, #57534e 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## Depth Strategy

**Primary:** Borders (dominant — 34+ border uses per component)  
**Secondary:** Subtle shadows via CSS tokens (`--shadow-sm`, `--shadow-md`)  
**Premium accents:** `shadow-lg` + gradient borders on elevated surfaces (modals, auth card)  
**Glassmorphism:** Allowed only on floating/overlay elements (nav, auth form card, mobile bottom nav)

| Layer | Technique |
|-------|-----------|
| Page background | `--parchment` flat |
| Cards | `--porcelana` + `1px var(--border)` + `--shadow-sm` |
| Inputs | `--muted` bg + `1px var(--border-md)` |
| Modals/sheets | `--porcelana` + `--shadow-lg` |
| Sticky nav | `rgba(249,247,242,0.92)` + `backdrop-blur(16px)` |
| Auth form card | `rgba(253,252,249,0.82)` + `backdrop-blur(20px)` + brasa border |
| Overlays (modal bg) | `bg-black/40`–`bg-black/80` + `backdrop-blur-sm` |

---

## Component Patterns

### Button — Primary
```
bg: linear-gradient(135deg, #D35400, #B84A00)
text: white, font-black
padding: px-5 py-2.5 (default) | px-8 py-4 (large)
radius: rounded-xl (default) | rounded-2xl (large)
shadow: 0 2px 8px rgba(211,84,0,0.25)
hover: shadow-lg + -translate-y-px
```

### Button — Secondary
```
bg: --muted | bg-white
border: 1px var(--border-md)
text: var(--ink-2), font-semibold
padding: px-4 py-2 | px-5 py-2.5
radius: rounded-xl
hover: --muted-hover
```

### Button — Ghost/Icon
```
bg: transparent
size: w-9 h-9 | w-10 h-10 | w-12 h-12
radius: rounded-xl
hover: dash-muted bg
```

### Badge/Pill
```
padding: px-2 py-0.5 (tight) | px-3 py-1.5 (normal)
radius: rounded-full | rounded-md
font: text-xs font-bold uppercase tracking-widest
active: --brasa-light bg + --brasa text + --brasa-border border
inactive: --muted bg + --ink-4 text
```

### Card
```
class: dash-card
bg: --porcelana
border: 1px var(--border)
shadow: --shadow-sm
radius: rounded-2xl | rounded-3xl (KPI)
padding: p-4 (compact) | p-5 | p-6 (default)
accent-top: border-top 2px var(--brasa) (highlight cards)
```

### Input
```
class: dash-input
bg: --muted
border: 1px var(--border-md)
radius: rounded-xl
padding: py-2.5 px-4 (default) — always explicit, never from token
focus: border --brasa + ring 3px rgba(211,84,0,0.1)
with-icon: pl-9 (icon at left-3.5)
```

### Modal/Sheet overlay
```
backdrop: bg-black/40–bg-black/60 backdrop-blur-sm
panel: --porcelana bg + --shadow-lg + rounded-2xl | rounded-3xl
```

---

## CSS Utility Classes

### Dash tokens (internal app)
- `dash-page` — page wrapper with `--parchment` bg
- `dash-card` — standard card surface
- `dash-card-muted` — muted card (skeletons, empty states)
- `dash-title` — section heading color
- `dash-subtitle` — muted subtitle
- `dash-label` — small label color (`--ink-3`)
- `dash-value` — data value color (`--ink`)
- `dash-muted` — muted background
- `dash-border` — border color
- `dash-input` — input surface (no padding — set explicitly)
- `dash-pill-active` / `dash-pill-inactive` — filter pill states
- `dash-highlight` / `dash-highlight-text` — brasa accent surface/text
- `dash-badge` — neutral badge
- `dash-empty` — dashed empty state container
- `dash-btn-secondary` — secondary button surface

### Auth tokens (login page)
- `auth-root` — full-height flex layout
- `auth-brand` — dark brand panel (desktop)
- `auth-panel` — form panel with glow + grid bg
- `auth-form-wrap` — glassmorphism card
- `auth-form-title` — gradient headline
- `auth-input` / `auth-submit-btn` / `auth-google-btn` — form elements

---

## Violations to Flag

- `backdrop-blur-*` on non-floating elements (cards, page sections)
- `bg-white/60` or lower opacity on text-bearing surfaces
- `bg-clip-text text-transparent` with light gradient colors (must use dark base: `#1c1917`+)
- `max-w-md` or `max-w-lg` on root page containers (use only on inner content)
- `shadow-*` on elements that should use border-only depth (inline cards, list items)
- Hard-coded dark hex colors (`#0B0D11`, `#13161A`) outside `[data-theme="dark"]` contexts
- `text-neutral-*` or `text-emerald-*` — use semantic tokens instead
- `bg-emerald-*` — use `--brasa` family instead
