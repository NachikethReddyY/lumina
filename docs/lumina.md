## Overview

Lumina's marketing canvas uses a **fusion of technical precision, editorial warmth, and photographic simplicity**. The base atmosphere is a **warm dark canvas** (`{colors.canvas}` — #141413), deliberately not the cold #010102 that most AI tools use. Headlines run **Display font** (with serif elegance option) at weight 400 with negative letter-spacing, paired with **Body font** (sans-serif) for body text. The combination feels like a technical publication with clean product-first presentation.

Brand voltage comes from the **blue + dark warm pairing** — Lumina Blue (`{colors.primary}` — #3b82f6) is the signature accent, used on every primary CTA, on the brand wordmark, and on full-bleed callout cards. A secondary Action Blue (`{colors.secondary-blue}` — #0066cc) serves as the link emphasis color. The system includes semantic colors: Success Green (#34c759), Warning Orange (#ff9500), Error Red (#ff3b30).

The system has three surface modes that alternate section-by-section:
1. **Warm dark canvas** (`{colors.canvas}`) — default body floor
2. **Elevated dark cards** (`{colors.surface-card}`) — feature card backgrounds
3. **Code-dark product surfaces** (`{colors.surface-dark}`) — code editor mockups, terminal panels, model comparison cards

The dark surfaces are where Lumina shows its product chrome — code blocks, terminal output, API documentation, agentic-flow diagrams. Product imagery uses **single product shadow**: `rgba(0,0,0,0.22) 0 3px 30px` — the only true shadow in the system.

**Key Characteristics:**
- Warm dark canvas (`{colors.canvas}` — #141413) with blue accent text (`{colors.ink}` — #f7f8f8). The brand's defining color choice.
- Dual blue system: Lumina Blue (#3b82f6) for CTAs + Action Blue (#0066cc) for links.
- Display font (serif option) for headlines; Body font (sans-serif) for body.
- Semantic colors: Success Green (#34c759), Warning Orange (#ff9500), Error Red (#ff3b30).
- Code-dark product mockup cards (`{colors.surface-dark}` — #1e1e1e) carrying code blocks, terminal panels, API docs.
- Elevated dark cards (`{colors.surface-card}` — #1a1a1a) — slightly lighter than canvas.
- Lumina radial spark mark — a small blue asterisk-like glyph — appears as the brand wordmark prefix.
- Single product shadow: `rgba(0,0,0,0.22) 0 3px 30px` — used ONLY on product imagery.
- Border radius is hierarchical: `{rounded.md}` (8px) for buttons + inputs, `{rounded.lg}` (12px) for content + product cards, `{rounded.xl}` (16px) for hero containers, `{rounded.pill}` for badges.
- Section rhythm `{spacing.section}` (96px) — modern-SaaS standard with editorial pacing. Sans-Serifnal card padding stays generous at `{spacing.xl}` (32px).
- **Dark mode ONLY** — no light mode, no pure black (#000000), variations of dark throughout.

## Colors

> Source pages: lumina.app (home), /intake, /pricing, /contact/sales, /build.

### Brand & Accent
- **Lumina Blue** ({colors.primary}): The signature Lumina accent — primary CTA, brand mark, link emphasis. #3b82f6
- **Secondary Blue** ({colors.secondary-blue}): System's quiet interactive color — text links, inline callouts. #0066cc
- **Blue Hover** ({colors.primary-hover}): Lighter blue (#60a5fa) — hovered state of the primary CTA.
- **Blue Focus** ({colors.primary-focus}): Focus-ring tint (#2563eb) — focused inputs, focused buttons.
- **Blue Active** ({colors.primary-active}): Pressed state (#1d4ed8) — darker variant for active states.

### System Semantic Colors
- **Success Green** ({colors.success}): Status pills, success indicators — #34c759 (mobile green).
- **Warning Orange** ({colors.warning}): Warning callouts — #ff9500 (mobile orange).
- **Error Red** ({colors.error}): Validation errors — #ff3b30 (mobile red).
- **Sky Link Blue** ({colors.primary-on-dark}): Brighter blue for dark surfaces — #2997ff.

### Surface (Dark Mode Only — No Light Mode)
- **Canvas** ({colors.canvas}): Default page background — #141413, warm dark (from Lumina's ink color).
- **Surface Card** ({colors.surface-card}): Feature cards, content cards — #1a1a1a, one step lighter than canvas.
- **Surface Dark** ({colors.surface-dark}): Code editor mockups, API docs, footer — #1e1e1e, the dominant dark surface.
- **Surface Dark Elevated** ({colors.surface-dark-elevated}): Elevated cards inside dark bands — #252525.
- **Near-Black Tile 1** ({colors.surface-tile-1}): Primary dark-tile surface — #272729.
- **Near-Black Tile 2** ({colors.surface-tile-2}): Micro-step lighter — #2a2a2c.
- **Hairline** ({colors.hairline}): 1px borders on dark surfaces — #2a2a2a.
- **Hairline Soft** ({colors.hairline-soft}): Barely-visible divider — #333333.

### Text
- **Ink** ({colors.ink}): All headlines and primary text — light gray #f7f8f8.
- **Body Strong** ({colors.body-strong}): Emphasized paragraphs, lead text — #e0e0e0.
- **Body** ({colors.body}): Default running-text color — #d0d6e0.
- **Muted** ({colors.muted}): Sub-headings, meta info, secondary text — #8a8f98.
- **Muted Soft** ({colors.muted-soft}): Captions, fine-print, footer text — #6c6c6c.
- **On Primary** ({colors.on-primary}): Text on blue buttons — #ffffff.
- **On Dark** ({colors.on-dark}): Light text on dark surfaces — #f7f8f8.

### Semantic
- **Success** ({colors.success}): Status pills, success indicators — #5db872.
- **Warning** ({colors.warning}): Warning callouts — #d4a017.
- **Error** ({colors.error}): Validation errors — #c64545.
- **Overlay** ({colors.overlay}): Pure black overlay scrim for modals — rgba(0,0,0,0.8).

## Typography

### Font Family

- **Display**: `Display Font, Serif Option, system-ui, sans-serif` — Display face (with serif elegance option). Use for headlines at sizes ≥ 19px.
- **Body / UI**: `Body Font, system-ui, sans-serif` — Body-optimized variant for body copy, captions, buttons. Open-source substitute available.
- **Mono**: `Mono Font, ui-monospace, monospace` — For code blocks and terminal text.

**Font strategy:**
- On macOS/iOS: Resolves automatically via `system-ui`
- On Windows/Linux: Falls back to open-source sans-serif
- For serif elegance: **Serif Option** at weight 400 with `-0.02em` letter-spacing

The display/body split is editorial + clean:
- Display font (weight 400, negative tracking) → h1, h2, h3, hero display
- Body font (weight 400-500) → body, navigation, buttons, captions
- Mono font → all code blocks and terminal text

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.hero-display}` | 56px | 400 | 1.07 | -0.28px | Hero headline |
| `{typography.display-xl}` | 64px | 400 | 1.05 | -1.5px | Homepage h1 — Serif Option |
| `{typography.display-lg}` | 48px | 400 | 1.1 | -1px | Section heads |
| `{typography.display-md}` | 36px | 400 | 1.15 | -0.5px | Sub-section heads |
| `{typography.display-sm}` | 28px | 400 | 1.2 | -0.3px | Pricing tier names |
| `{typography.tagline}` | 21px | 600 | 1.19 | 0.231px | Sub-tile tagline |
| `{typography.title-lg}` | 22px | 500 | 1.3 | 0 | Pricing plan labels, feature titles |
| `{typography.title-md}` | 18px | 500 | 1.4 | 0 | Feature card titles |
| `{typography.title-sm}` | 16px | 500 | 1.4 | 0 | List labels, card titles |
| `{typography.lead}` | 28px | 400 | 1.14 | 0.196px | Product tile subcopy |
| `{typography.body-md}` | **20px** | 400 | 1.47 | -0.374px | **Default running-text — STANDARDIZED** |
| `{typography.body-sm}` | 14px | 400 | 1.55 | 0 | Footer body, fine-print |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Badge labels, captions |
| `{typography.caption-uppercase}` | 12px | 500 | 1.4 | 1.5px | Category tags, "NEW" badges |
| `{typography.code}` | 14px | 400 | 1.6 | 0 | Code blocks — Mono Font |
| `{typography.button}` | 14px | 500 | 1.0 | 0 | Standard button labels |
| `{typography.button-large}` | 18px | 300 | 1.0 | 0 | Store hero CTAs |
| `{typography.nav-link}` | 12px | 400 | 1.0 | -0.12px | Top-nav menu items |
| `{typography.dense-link}` | 20px | 400 | 2.41 | 0 | Footer/store utility link lists |

### Principles

- **Display Font** with negative letter-spacing at display sizes produces the iconic "System tight" headline cadence. Never used at 12px or below.
- **Body copy at 17px, not 16px.** System breaks the SaaS convention and runs paragraph text at 17px. The extra pixel gives the page an unmistakable "reading, not scanning" pace.
- **Serif elegance from Serif Option** at weight 400 with negative tracking (-0.02em) gives the editorial voice. Pairs with Sans-Serif body for humanist warmth.
- **Weight 300 is real and rare.** Used deliberately on large-size reads (18px/300 for button-large, 24px/300 for lead-airy). It's a light-atmosphere cue reserved for moments where content should feel airy.
- **Weight 600, not 700, for headlines.** System's headlines sit at weight 600. Weight 700 is used sparingly.
- **Line-height is context-specific.** Display sizes use 1.07–1.19 (tight). Body uses 1.47. Utility link stacks use unusually relaxed 2.41.

### Note on Font Substitutes

- **Serif**: **Serif Option / Serif Option** at weight 400 with `-0.02em` letter-spacing is the open-source choice for editorial elegance.
- **Mono**: **Mono Font** is the standard substitute for Mono Font.

## Layout

### Spacing System

- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** `{spacing.section}` (96px) — modern-SaaS rhythm with editorial pacing.
- **Card internal padding:** `{spacing.xl}` (32px) for feature cards, pricing tier cards, code-window cards; `{spacing.lg}` (24px) for code-editor cards and connector tiles.
- **Callout / CTA bands:** `{spacing.xxl}` (48px) inside blue callout cards; 64px inside the larger dark CTA band.
- **Card interior padding:** `{spacing.lg}` 24px on feature/pricing cards; `{spacing.xl}` 32px on testimonial cards; `{spacing.xxl}` 48px on CTA banners.
- Pill button padding: 8px vertical · 14px horizontal — Lumina's compact button spec.
- Form input padding: 8px vertical · 12px horizontal.

### Grid & Container

- **Max content width:** ~1200px centered.
- **Editorial body:** Single 12-column grid; hero often uses 6/6 split (h1 left, illustration right).
- **Feature card grids:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Connector tile grids:** 4-up or 6-up at desktop, 2-up at tablet, 1-up at mobile.
- **Pricing grid:** 3-up at desktop (Free / Pro / Team / Enterprise often), 1-up at mobile.
- Card grids are 3-up at desktop, 2-up at tablet, 1-up at mobile.
- Product screenshot panels span full content width — they're the protagonist.

### Whitespace Philosophy

The warm dark canvas + serif display + generous internal padding create an editorial pacing — Lumina reads like a long-form technical magazine rather than a marketing template. Whitespace between bands stays uniform at 96px; whitespace inside cards is generous (32px), letting type breathe. The dark canvas IS the whitespace. Sections separate by lift onto surface-card panels, not by gaps in white. Within a panel, generous `{spacing.lg}` 24px gaps between content blocks; `{spacing.section}` 96px between sections.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body sections, top nav, hero bands |
| Soft hairline | 1px `{colors.hairline}` border | Inputs, sub-nav, occasionally on cards |
| Dark card | `{colors.surface-dark}` background — no shadow | Code editor mockups, model showcase cards |
| System product shadow | `rgba(0,0,0,0.22) 3px 5px 30px 0` | Product renders resting on surface (the ONLY true shadow in the system) |
| Subtle drop shadow | Faint shadow at low alpha | Hover-elevated states (rarely used) |

**Shadow philosophy (System-inspired):**
- **Exactly one drop-shadow** in the entire system, applied to photographic product imagery — never to cards, never to buttons, never to text.
- Elevation in the UI comes from (a) surface-color change (dark tile ↔ darker tile) and (b) backdrop-blur on sticky bars.
- The single shadow is about giving the product weight, not about UI hierarchy.
- System's shadow: `box-shadow: 0 3px 30px rgba(0,0,0,0.22)` — used ONLY on product renders.

The elevation philosophy is **color-block first, shadow rare**. Most depth comes from the warm-dark-vs-code-dark surface contrast. Shadows are minimal. The dark surface mockups have their own internal product chrome (code editor scrollbars, line numbers, syntax highlighting) which adds detail without needing external shadows.

## SVG / Icon Styling (Lumina-Inspired)

### Lumina Spark Mark

The **Lumina spark mark** is a 4-spoke radial asterisk glyph — the brand's signature icon. Render as inline SVG:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <g stroke="{colors.primary}" stroke-width="2.5" stroke-linecap="round">
    <line x1="12" y1="2" x2="12" y2="8"/>
    <line x1="12" y1="16" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="8" y2="12"/>
    <line x1="16" y1="12" x2="22" y2="12"/>
  </g>
</svg>
```

- **Color**: Always `{colors.primary}` (#3b82f6) — never invert on dark.
- **Size**: 24×24px for wordmark prefix, 16×16px for inline content markers.
- **Stroke width**: 2.5px for visibility on dark surfaces.
- **Usage**: Brand wordmark prefix ("✱ Lumina"), content section markers, bullet replacements in feature lists.

### Icon Design Principles (Lumina-Style)

- **Line-art only**: No filled shapes, no gradients, no shadows on icons.
- **Minimal stroke**: 1.5–2.5px stroke width, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- **Monochrome**: Single color per icon — `{colors.primary}` for interactive, `{colors.ink}` for decorative.
- **4-spoke radial** as the base motif: Lumina's spike-mark glyph inspires Lumina's entire icon system.
- **Geometric + humanist**: Mix perfect circles/rectangles with slightly imperfect hand-drawn feel (like Lumina's line-art illustrations).
- **No emoji icons**: Never use emoji as icons — violates anti-AI-slop principle.

### Status & Connection Icons

- **Success**: Checkmark in `{colors.success}` (#34c759) — 2px stroke, rounded ends.
- **Warning**: Triangle exclamation in `{colors.warning}` (#ff9500) — 2px stroke.
- **Error**: X mark in `{colors.error}` (#ff3b30) — 2px stroke.
- **Connection**: Dotted line with 4-spoke nodes — represents API/data connections.

### Code & Terminal Icons

- **Copy to clipboard**: Two overlapping squares, 1.5px stroke.
- **Run/Play**: Right-pointing triangle, 2px stroke.
- **Terminal**: `>_` prompt symbol in monospace, `{colors.primary}` color.
- **Code block**: Curly braces `{ }` icon, 2px stroke.

### Navigation & UI Icons

- **Hamburger menu**: Three horizontal lines, 2px stroke, 6px gaps.
- **Close**: X mark, 2.5px stroke.
- **Chevron**: Simple `<` or `>` arrow, 2px stroke, 45° rotation.
- **External link**: Arrow pointing up-right, 2px stroke.
- **Search**: Magnifying glass (circle + line), 2px stroke.

### Icon Implementation

```jsx
// Lumina Icon Component (inline SVG)
function LuminaIcon({ name, size = 24, color = 'var(--colors-primary)' }) {
  const icons = {
    spark: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/></svg>`,
    check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><polyline points="4 12 10 18 20 6"/></svg>`,
    // ... more icons
  };
  return <div dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}
```

Use inline SVGs (not icon fonts, not emoji) for crisp rendering at all sizes on dark surfaces.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Small chips, status badges, badge accents |
| `{rounded.sm}` | 6px | Inline tags, small inline buttons |
| `{rounded.md}` | 8px | All buttons, form inputs, category tabs |
| `{rounded.lg}` | 12px | Pricing cards, feature cards, content cards, code-window cards |
| `{rounded.xl}` | 16px | Hero illustration container, product screenshot panels |
| `{rounded.xxl}` | 24px | Oversized CTA banners (rare) |
| `{rounded.pill}` | 9999px | Pricing tab toggles, status pills, badge pills, "NEW" tags |
| `{rounded.full}` | 9999px / 50% | Avatar circles, icon buttons |

### Photography & Illustrations

Lumina's hero rarely uses photography. Instead it uses:
- Code editor mockups (the dominant "hero" treatment on developer-focused pages)
- Terminal output mockups with monospace text on dark
- Simple line-art illustrations with blue + dark-navy strokes on warm dark — minimal, technical-feeling, never photorealistic.
- API documentation cards with abstract geometric thumbnails

When photography is used (rare — mostly testimonials), avatars crop to perfect circles at 40px diameter.
Product UI screenshots dominate; they sit in `{rounded.xl}` 16px tiles with `{spacing.lg}` 24px outer padding.
Customer logo tiles render at small sizes (~24px logo height) on `{colors.canvas}` with no border.
Avatar circles in testimonial cards use `{rounded.full}` at 32–40px sizes.

## Components

### Top Navigation

**`top-nav`** — Warm dark nav bar pinned to the top of every page. 64px tall, `{colors.canvas}` background. Carries the Lumina spark-mark + "Lumina" wordmark at left, primary horizontal menu center-left, right-side cluster with "Sign in" text-link, "Try Lumina" `{component.button-primary}` (blue). Menu items in `{typography.nav-link}` (Sans-Serif 14px / 500).

### Buttons

**`button-primary`** — The signature blue CTA. Background `{colors.primary}` (#3b82f6), text `{colors.on-primary}` (white), type `{typography.button}` (Sans-Serif 14px / 500), padding 12px × 20px, height 40px, rounded `{rounded.md}` (8px). Active state `button-primary-active` darkens to `{colors.primary-active}` (#1d4ed8).

**`button-secondary`** — Dark button with hairline outline. Background `{colors.canvas}`, text `{colors.ink}`, 1px hairline border, same padding + height + radius as primary.

**`button-secondary-on-dark`** — Used over `{colors.surface-dark}` cards. Background `{colors.surface-dark-elevated}` (#252525), text `{colors.on-dark}`. Stays dark — the system never inverts to a light secondary on dark surfaces.

**`button-text-link`** — Inline text button, no background. Used for "Sign in" in the top nav and inline CTA links.

**`button-icon-circular`** — 36px circular icon button. Background `{colors.canvas}`, hairline border, ink-color icon. Used for carousel arrows, share, "view more".

**`text-link`** — Inline body links in `{colors.primary}` (the blue). Underlined on press; the blue inline link is one of the system's most distinctive small details.

### Cards & Containers

**`hero-band`** — Warm dark canvas hero with a 6-6 grid: h1 + sub-headline + button row on the left, hero illustration card or product mockup card on the right. Vertical padding `{spacing.section}` (96px).

**`hero-illustration-card`** — A larger card holding the hero's right-side artifact — sometimes a blue-stroke line illustration on dark background, sometimes a code editor mockup. Background `{colors.canvas}` or `{colors.surface-dark}` depending on context, rounded `{rounded.xl}` (16px).

**`feature-card`** — Used in 3-up feature grids. Background `{colors.surface-card}` (#1a1a1a — slightly lighter than canvas), rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px). Carries a small icon at top, an `{typography.title-md}` headline in Serif Option, and a body description in `{typography.body-md}`.

**`product-mockup-card-dark`** — Dark navy card showing actual Lumina product chrome (chat interface, code editor, API docs). Background `{colors.surface-dark}`, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries text labels in `{colors.on-dark}` and product UI fragments below.

**`code-window-card`** — A specialized dark card showing a code editor with line numbers, syntax-highlighted code in `{typography.code}` (Mono Font), and sometimes a "Run" button or terminal output panel below. Background `{colors.surface-dark}` with `{colors.surface-dark-soft}` for the inner code block, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). The signature visual element of Lumina Code product pages.

**`model-comparison-card`** — Used on the homepage's "Which problem are you up against?" section comparing different models/features. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries the feature name in `{typography.display-sm}` (Serif Option serif!), a short capability blurb, and a `{component.text-link}` to learn more.

**`pricing-tier-card`** — Standard tier card. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding `{spacing.xl}` (32px). Carries the plan name in `{typography.title-lg}` (Sans-Serif), price in `{typography.display-sm}` (Serif Option serif!), feature checklist in `{typography.body-md}`, and a `{component.button-primary}` at the bottom.

**`pricing-tier-card-featured`** — The featured tier (typically "Pro" or "Team"). Background flips to `{colors.surface-dark}`, text inverts to `{colors.on-dark}`. The dark surface IS the featured-tier signal.

**`callout-card-blue`** — A full-bleed blue card carrying a major call-to-action. Background `{colors.primary}` (#3b82f6), text `{colors.on-primary}` (white), rounded `{rounded.lg}`, padding `{spacing.xxl}` (48px). The blue surface IS the voltage; the CTA inside uses an inverted button style (dark/canvas button on blue).

**`connector-tile`** — Used on the connectors page's integration grid. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding 20px. Each tile carries a logo at top, a `{typography.title-sm}` connector name in Sans-Serif, and a short description.

### Inputs & Forms

**`text-input`** — Standard text input. Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}` (8px), padding 10px × 14px, height 40px. 1px hairline border in `{colors.hairline}`.

**`text-input-focused`** — Focus state. Border thickens or shifts to `{colors.primary}` (blue) for emphasis. Carries a 3px blue-at-15%-alpha outer ring.

**`cookie-consent-card`** — Bottom-right floating dark cookie banner. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). One of the few places dark surface appears at small scale on canvas pages.

### Tags / Badges

**`badge-pill`** — Small pill label used for category tags. Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-blue`** — Blue-fill badge for "NEW", "BETA", featured highlights. Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.caption-uppercase}` (12px / 500 / 1.5px tracking), rounded `{rounded.pill}`, padding 4px × 12px.

### Tab / Filter

**`category-tab`** + **`category-tab-active`** — Used in sub-nav rows on solutions / connectors pages. Inactive: transparent background, `{colors.muted}` text. Active: `{colors.surface-card}` background, `{colors.ink}` text. Padding 8px × 14px, rounded `{rounded.md}`.

### CTA / Footer

**`cta-band-blue`** — A pre-footer "Try Lumina" CTA card. Full-width blue fill, white type, rounded `{rounded.lg}`, padding 64px. Carries an h2 in `{typography.display-sm}` (still serif Serif Option!), a sub-line, and a dark-button CTA.

**`cta-band-dark`** — Alternative pre-footer band on developer-focused pages. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding 64px. Often pairs with a code-window card.

**`footer`** — Dark surface footer that closes every page. Background `{colors.surface-dark}` (#1e1e1e), text `{colors.on-dark-soft}`. 4-column link list at desktop covering Product / Company / Resources / Legal. Vertical padding 64px. The Lumina spark-mark + "Lumina" wordmark sits at the top in `{colors.on-dark}`. The footer never inverts.

## Do's and Don'ts

### Do

- **Dark mode ONLY** — No light mode, no pure black (#000000). Use variations of dark (#141413, #1a1a1a, #1e1e1e).
- **Reserve `{colors.canvas}` (#141413) as the system's anchor surface** — the warm dark is intentional (from Lumina).
- **Use dual blue system**: Lumina Blue (#3b82f6) for CTAs + System Action Blue (#0066cc) for links.
- **Use Display Font (with Serif Option for serif elegance) for headlines** — System's clean typography with Lumina's editorial voice.
- **Use the four-step surface ladder for hierarchy** (canvas → surface-card → surface-dark). Avoid skipping levels.
- **Apply negative letter-spacing** on Display Font / Serif Option headlines (-0.28px to -1.5px).
- **Use System's semantic colors**: Success Green (#34c759), Warning Orange (#ff9500), Error Red (#ff3b30).
- **Use System's single product shadow** `rgba(0,0,0,0.22) 0 3px 30px` ONLY on product imagery — never on cards/buttons/text.
- **Use product UI screenshots as the protagonist** of every section (Technical's approach).
- **Use Lumina's SVG spark-mark** (4-spoke radial) as the brand icon — line-art only, 2.5px stroke.
- **Lead every section with a product UI screenshot** (Lumina's principle).
- **Compose CTAs as `{rounded.md}` 8px corners** (Technical/System hybrid).
- **Use body text at 17px** (System's convention, not 16px) — gives "reading, not scanning" pace.

### Don't

- **Don't ship a light-mode marketing page** — dark mode ONLY.
- **Don't use pure black (#000000) as canvas** — use warm dark (#141413) or variations.
- **Don't use blue as a section background or card fill** — reserve for CTAs, links, focus rings.
- **Don't introduce multiple chromatic accents** (purple, pink, green for marketing) — use the dual blue system + semantic colors only.
- **Don't add atmospheric gradients or spotlight cards** — violates System's "photography-first" principle.
- **Don't pill-round CTAs** — use `{rounded.md}` 8px (System uses pill only for specific contexts).
- **Don't bold serif display weight** — Serif Option at 400 reads as off-brand; never use 700+.
- **Don't use Sans-Serif for display headlines** — the serif character is the brand voice (Lumina's principle).
- **Don't repeat the same surface mode in two consecutive bands** — the pacing alternates: canvas → surface-card → surface-dark (Lumina's rhythm).
- **Don't add hover state styling beyond what the system already encodes** — primary darkens on press; nothing else changes.
- **Don't use emoji as icons** — violates anti-AI-slop principle; use line-art SVG icons only.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Desktop-XL | 1440px | Default desktop layout |
| Desktop | 1280px | Card grid 3-up maintained |
| Tablet | 1024px | Card grid 3-up → 2-up |
| Mobile-Lg | 768px | Pricing comparison becomes accordion; nav hamburger |
| Mobile | 480px | Single-column; display-xl scales 80px → ~36px |

### Touch Targets

- CTAs hold ≥40px tap height across viewports.
- Pricing tab pills hold ≥36px tap height; touch viewports grow to ≥44px.
- Form inputs hold ≥44px tap target on touch.

### Collapsing Strategy

- **Top nav**: links collapse to hamburger below 768px.
- **Card grids**: 3-up → 2-up at 1024px → 1-up below 768px.
- **Pricing comparison**: per-tier accordion below 768px.
- **Display type**: `{typography.display-xl}` 80px scales toward `{typography.display-md}` 40px on mobile.

### Image Behavior

- Product UI screenshots maintain aspect ratio and never crop.
- Customer logos in the marquee may collapse from 6-up to 3-up below 768px.

## Using Lumina with Huashu-Design Skill

### Integration Method

When using the **huashu-design skill** to create HTML prototypes/slides/animations for Lumina:

1. **Reference lumina.md as your design spec**:
   - Copy relevant color values from `docs/lumina.md` into your HTML's `<style>` or CSS variables
   - Use the typography tokens (Display Font + Serif Option for headlines, Body Font / Sans-Serif for body)
   - Apply the elevation system (dark canvas → surface-card → surface-dark)

2. **Apply Lumina's visual rules in HTML**:
   ```jsx
   // Define Lumina's dark-mode palette
   const luminaColors = {
     canvas: '#141413',
     surfaceCard: '#1a1a1a',
     surfaceDark: '#1e1e1e',
     primary: '#3b82f6', // Lumina Blue
     secondaryBlue: '#0066cc', // System Action Blue
     success: '#34c759', // System semantic green
     warning: '#ff9500', // System semantic orange
     error: '#ff3b30', // System semantic red
     ink: '#f7f8f8',
     body: '#d0d6e0'
   };
   
   // Use in components
   <div style={{ background: luminaColors.canvas, color: luminaColors.ink }}>
   ```

3. **Follow Huashu-Design workflow**:
   - Step 1: Understand requirements (ask clarifying questions)
   - Step 2: Explore resources → **Reference lumina.md as your design context**
   - Step 3: Answer Position Four Questions (Narrative role / Audience / Visual temperature / Capacity)
   - Step 4: Build folder structure
   - Step 5: Junior Pass → **Use Lumina's serif headlines (Serif Option) + blue accents**
   - Step 6: Full Pass → **Apply System's single product shadow, Lumina's SVG spark-mark**
   - Step 7: Verify with Playwright
   - Step 8: Summary
   - Step 9: Export video (if animation)
   - Step 10: (Optional) Expert review

4. **Key Lumina + Huashu integration points**:
   - **Dark mode ONLY**: Set `{colors.canvas}` = `#141413` in your HTML, never light mode
   - **Serif headlines**: Use Serif Option / Serif Option for h1-h3 (weight 400, negative tracking)
   - **Dual blue system**: Lumina Blue (#3b82f6) for CTAs, System Blue (#0066cc) for links
   - **System shadows**: Apply `box-shadow: 0 3px 30px rgba(0,0,0,0.22)` ONLY on product images
   - **Lumina's SVG spark-mark**: Use the 4-spoke radial glyph as brand icon (inline SVG, 2.5px stroke)
   - **Anti-AI-slop**: No purple gradients, no emoji icons, no CSS silhouettes — use real product screenshots

### Example: Lumina-Themed HTML with Huashu

```jsx
// In your huashu-design HTML file:
const luminaTheme = {
  fonts: {
    display: "'Serif Option', 'Serif Option', serif",
    body: "'Body Font', Sans-Serif, system-ui, sans-serif",
    mono: "'Mono Font', 'Mono Font', monospace"
  },
  colors: {
    canvas: '#141413',
    surfaceCard: '#1a1a1a',
    surfaceDark: '#1e1e1e',
    primary: '#3b82f6',
    secondaryBlue: '#0066cc',
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',
    ink: '#f7f8f8'
  }
};

// Hero section with Lumina styling
<IosFrame time="9:41" battery={85}>
  <div style={{ 
    background: luminaTheme.colors.canvas, 
    color: luminaTheme.colors.ink,
    fontFamily: luminaTheme.fonts.display,
    fontWeight: 400,
    letterSpacing: '-1.5px',
    padding: '96px 32px'
  }}>
    <h1 style={{ fontSize: '64px', marginBottom: '16px' }}>Meet Lumina</h1>
    <p style={{ fontFamily: luminaTheme.fonts.body, fontSize: '17px', lineHeight: 1.47 }}>
      Your thinking partner, designed with precision.
    </p>
    <button style={{
      background: luminaTheme.colors.primary,
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 22px',
      fontSize: '14px',
      fontWeight: 500
    }}>Try Lumina</button>
  </div>
</IosFrame>
```

### Verification Checklist

Before delivering HTML prototypes with Huashu + Lumina:
- ✅ Dark mode only (no light mode, no pure black #000000)
- ✅ Warm dark canvas (#141413) as base
- ✅ Serif headlines (Serif Option) at weight 400 with negative tracking
- ✅ Dual blue system (Lumina Blue #3b82f6 + System Blue #0066cc)
- ✅ System semantic colors (green #34c759, orange #ff9500, red #ff3b30)
- ✅ System's single product shadow on imagery only
- ✅ Lumina's SVG spark-mark as brand icon
- ✅ Line-art icons only (no emoji, no filled shapes)
- ✅ Product screenshots as protagonists (not illustrations)
- ✅ Anti-AI-slop: no purple gradients, no CSS silhouettes

## Summary of Lumina Design System

**Foundation**: Technical's technical precision + Lumina's editorial warmth + System's photographic simplicity

**Core Elements**:
1. **Dark mode ONLY** — Warm dark canvas (#141413), never pure black, no light mode
2. **Dual blue system** — Lumina Blue (#3b82f6) + System Action Blue (#0066cc)
3. **Typography** — Display Font + Serif Option serif headlines, Body Font / Sans-Serif body
4. **System semantic colors** — Success Green, Warning Orange, Error Red
5. **System shadow** — Single product shadow `rgba(0,0,0,0.22) 0 3px 30px`
6. **Lumina's SVG spark-mark** — 4-spoke radial glyph, line-art only
7. **Technical's surface ladder** — canvas → surface-card → surface-dark
8. **Anti-AI-slop** — No gradients, no emoji icons, product screenshots first

**File location**: `/Users/nr/Developer/dbs-restart/docs/lumina.md`

**Usage**: Reference this file when using huashu-design skill to create HTML prototypes, slides, or animations for the Lumina app.
