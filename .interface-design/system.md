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

---

## Interaction Patterns

### Framer Motion — Sliding Tab Indicator

Used in inner sidebars and pill nav bars. A single `layoutId` element animates between active items — never toggle classes for background color.

```tsx
// Vertical sidebar (desktop)
<button onClick={() => setActiveTab(id)} className="relative ...">
  {isActive && (
    <motion.span
      layoutId="sidebar-bg"
      className="absolute inset-0 rounded-xl"
      style={{ backgroundColor: "var(--brasa-light)" }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    />
  )}
  <span className="relative z-10">...</span>
</button>

// Horizontal pill bar (mobile)
<button className="relative ...">
  {isActive && (
    <motion.span
      layoutId="mobile-pill"
      className="absolute inset-0 rounded-xl"
      style={{ backgroundColor: "var(--brasa)" }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    />
  )}
  <span className="relative z-10 text-white">...</span>
</button>
```

**Rules:**
- `layoutId` must be unique per nav group — use `"sidebar-bg"` for vertical, `"mobile-pill"` for horizontal
- Active icon gets `strokeWidth={2.5}`, inactive gets `strokeWidth={2}`
- Active text uses `dash-highlight-text`, inactive uses `dash-value`
- Content area transitions with `AnimatePresence mode="wait"` + `opacity 0→1, y 6→0, duration 0.15s`

### Framer Motion — Tab Content Transition

Wrap the rendered tab in `AnimatePresence mode="wait"` so the outgoing tab fades before the incoming one appears.

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.15 }}
  >
    {/* tab content */}
  </motion.div>
</AnimatePresence>
```

### Auto-Save on Blur

Never use a "Salvar Tudo" button for settings forms. Save on `onBlur` (text inputs, textareas) or immediately on change (toggles, selects). Show a `SavedDot` indicator instead of a toast for quiet confirmations.

```tsx
// SavedDot component
function SavedDot({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--success)" }}
        >
          <CheckCircle2 size={11} /> Salvo
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// Usage pattern
const [saved, setSaved] = useState(false);
const flash = (setter) => { setter(true); setTimeout(() => setter(false), 2500); };

const save = () => {
  start(async () => {
    const res = await serverAction(value);
    if ("ok" in res) flash(setSaved);
  });
};

<input onBlur={save} ... />
<SavedDot visible={saved} />
```

**Rules:**
- `SavedDot` goes inline next to the section card header `action` prop, not below the input
- Use `useToast()` (animated toast) only for errors or destructive confirmations
- Toggles (payment methods, stock control) save immediately on click — no blur needed

### useToast Hook

Shared hook for animated toasts. Import once per tab component.

```tsx
function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }, []);
  const el = (
    <AnimatePresence>
      {toast && <Toast key={toast.msg} msg={toast.msg} ok={toast.ok} />}
    </AnimatePresence>
  );
  return { show, el };
}
```

Toast renders bottom-right, `z-50`, with `initial={{ opacity:0, y:12, scale:0.96 }}` entrance.

---

## Layout Patterns

### Settings / Control Hub Layout

For any settings-style page with multiple sections:

```
max-w-5xl mx-auto px-4 md:px-8 pb-16
└── flex flex-col lg:flex-row gap-6
    ├── aside lg:w-52 lg:shrink-0   ← inner sidebar
    └── main flex-1 min-w-0         ← content area
```

- **Never** use `max-w-7xl` for settings pages — content becomes unreadable on ultrawide
- Inner sidebar is `sticky top-6` on desktop
- Content cards use `max-w-2xl` internally for text-heavy forms

### SectionCard — Bento Card Pattern

Group related settings into named cards. Never put unrelated fields in the same card.

```tsx
function SectionCard({ icon, iconBg, iconColor, title, subtitle, children, action }) {
  return (
    <div className="dash-card rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b dash-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg ?? "var(--brasa-light)" }}>
          <Icon size={15} style={{ color: iconColor ?? "var(--brasa)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="dash-title font-bold text-sm">{title}</h3>
          <p className="dash-subtitle text-xs">{subtitle}</p>
        </div>
        {action}  {/* SavedDot or status badge goes here */}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
```

**Card grouping rules:**
- One card per logical domain (Identidade, Fiscal, Pagamentos, Recibo, Segurança)
- Card header `action` slot: use for `SavedDot`, status badges, or secondary CTAs
- Icon uses `--brasa-light` bg + `--brasa` color by default; override for semantic states (success-bg/success for security)

### Status Card — Semantic State

For features with an active/inactive state (PIN, integrations, subscriptions):

```tsx
// Active state
backgroundColor: "var(--success-bg)"
border: "1px solid rgba(45,106,79,0.2)"
icon bg: "rgba(45,106,79,0.15)"
icon color: "var(--success)"

// Warning/inactive state  
backgroundColor: "var(--warning-bg)"
border: "1px solid rgba(146,64,14,0.2)"
icon bg: "rgba(146,64,14,0.15)"
icon color: "var(--warning)"

// Danger state
backgroundColor: "var(--danger-bg)"
border: "1px solid var(--danger-border)"
```

---

## Specialized Components

### Virtual Numpad

For PIN entry, payment confirmation, or any numeric-only input where a physical keyboard is undesirable (tablet/touch contexts).

```tsx
function VirtualNumpad({ value, onChange, maxLength = 6 }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="space-y-3">
      {/* PIN dots */}
      <div className="flex items-center justify-center gap-3 py-3">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full transition-all duration-150"
            style={{
              backgroundColor: i < value.length ? "var(--brasa)" : "var(--border-md)",
              transform: i < value.length ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>
      {/* 3×4 grid */}
      <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
        {keys.map((k, i) => (
          <button key={i} type="button" onClick={() => press(k)} disabled={k === ""}
            className={`h-12 rounded-xl font-black text-lg transition-all active:scale-95 ${
              k === "⌫" ? "dash-action-btn text-base"
              : k === "" ? "invisible"
              : "dash-card border dash-border hover:dash-highlight hover:dash-highlight-text"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Rules:**
- Always wrap in an `AnimatePresence` panel that slides in — never show inline by default
- Show a step progress indicator (dot pills) when there are multiple steps (current PIN → new PIN → confirm)
- Step dots: `width: isActive ? 24 : 8`, `backgroundColor: isActive ? "var(--brasa)" : "var(--border-md)"`
- Max PIN length: 6 digits. Minimum to enable "Continue": 4 digits.

### Live Receipt Preview

For any setting that affects printed output (receipt message, logo, store name):

```tsx
function ReciboPreview({ nomeLoja, mensagem, instagram }) {
  return (
    <div style={{
      backgroundColor: "#FAFAF8",
      border: "1px solid var(--border-md)",
      fontFamily: "monospace",
      fontSize: 11,
      maxWidth: 260,
      borderRadius: 12,
      padding: 16,
    }}>
      {/* Thermal paper mockup — dashed dividers, centered header, left-aligned items */}
    </div>
  );
}
```

**Rules:**
- Place side-by-side with the textarea on `lg:` breakpoint (`flex-col lg:flex-row gap-5`)
- Updates in real time via controlled state — no debounce needed for preview
- Use `font-mono`, `#FAFAF8` background, `1px dashed #ccc` dividers to simulate thermal paper
- Label it "Prévia do Recibo" with `dash-label` styling above

### Payment Method Toggle

For multi-select toggles where each option has a brand color:

```tsx
<button
  role="switch"
  aria-checked={sel}
  style={{
    backgroundColor: sel ? `${color}12` : "var(--muted)",
    border: sel ? `1.5px solid ${color}35` : "1.5px solid transparent",
  }}
>
  <div style={{ backgroundColor: sel ? `${color}20` : "var(--muted-hover)" }}>
    <Icon style={{ color: sel ? color : "var(--ink-3)" }} />
  </div>
  <span style={{ color: sel ? color : "var(--ink-2)" }}>{label}</span>
  {/* Circular radio indicator */}
  <div style={{
    borderColor: sel ? color : "var(--border-md)",
    backgroundColor: sel ? color : "transparent",
  }}>
    {sel && <Check size={9} color="#fff" strokeWidth={3} />}
  </div>
</button>
```

**Rules:**
- Always `role="switch"` + `aria-checked` for accessibility
- Use `12` hex opacity for bg, `35` for border when active (e.g. `#2D6A4F12`, `#2D6A4F35`)
- Circular indicator (not checkmark icon) — `w-4 h-4 rounded-full border-2`
- Save immediately on toggle change, not on a separate button (unless batch save is needed)
