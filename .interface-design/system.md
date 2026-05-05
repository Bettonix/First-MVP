# Interface Design System — Balcão Rápido
## Direction: Artesanal Urbano Premium

**Feel:** Calor artesanal de cozinha profissional + precisão de SaaS. Creme de farinha como base, laranja queimado como ação, antracite como texto.

**Signature:** `border-top: 2px solid var(--brasa)` em cards KPI ativos, itens selecionados, e highlights. Evoca caderno de pedidos marcado com caneta.

## Tokens (globals.css :root)
```
--parchment:   #F9F7F2   /* fundo global */
--porcelana:   #FFFFFF   /* cards */
--muted:       #F3F1EC   /* inputs, sub-superfícies */
--muted-hover: #EDE9E1   /* hover de linhas */
--ink:         #2D2D2D   /* texto primário */
--ink-2:       #4A4A4A   /* texto secundário */
--ink-3:       #6B6B6B   /* subtexto */
--ink-4:       #9A9A9A   /* muted / placeholder */
--brasa:       #D35400   /* ação primária */
--brasa-hover: #B84A00
--brasa-light: #FDF0E8
--brasa-border: rgba(211,84,0,0.25)
--mel:         #B7791F   /* âmbar secundário */
--oliva:       #5C6B3A   /* verde ervas */
--border:      rgba(45,45,45,0.08)
--border-md:   rgba(45,45,45,0.14)
--shadow-sm:   0 1px 3px rgba(45,45,45,0.08), 0 1px 2px rgba(45,45,45,0.05)
```

## Typography
- **Títulos de seção (h1, h2, .dash-title, .auth-form-title):** Playfair Display (serif) — `var(--font-playfair)`
- **Dados, UI, labels:** Inter — `var(--font-inter)`

## Depth Strategy: Borders + Subtle Shadows
- Cards: `border: 1px solid var(--border)` + `box-shadow: var(--shadow-sm)`
- Modals: `border: 1px solid var(--border-md)` + `box-shadow: var(--shadow-lg)`
- Inputs: `border: 1px solid var(--border-md)`, focus ring `rgba(211,84,0,0.1)`

## Spacing Base: 4px (Tailwind default)

## Chart Colors
- PIX: `#D35400` (brasa)
- DINHEIRO: `#5C6B3A` (oliva)
- MISTO: `#B7791F` (mel)
- Area chart fill: brasa com opacidade 0.15→0

## Semantic Tokens
- `.dash-*` — dashboard/settings components
- `.login-*` — login page
- `.auth-*` — auth split-screen page
- All defined directly in globals.css (no dark/light toggle — light only)

## Notes
- Dark mode removido. Tema único light artesanal.
- Auth brand panel mantém fundo escuro `#1A1208` como contraste intencional.
- `accessibility.ts` server action existe mas não é mais chamada.
