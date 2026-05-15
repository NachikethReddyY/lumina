---
name: YNR Pro
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e5'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fe'
  surface-container: '#ecedf9'
  surface-container-high: '#e6e8f3'
  surface-container-highest: '#e0e2ed'
  on-surface: '#181c23'
  on-surface-variant: '#414755'
  inverse-surface: '#2d3039'
  inverse-on-surface: '#eef0fc'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#405e96'
  on-secondary: '#ffffff'
  secondary-container: '#a1befd'
  on-secondary-container: '#2d4c83'
  tertiary: '#9e3d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c64f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a41'
  on-secondary-fixed-variant: '#26467d'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#f9f9ff'
  on-background: '#181c23'
  surface-variant: '#e0e2ed'
typography:
  h1:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-page: 48px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The brand personality for this design system is "Intellectual Professionalism." It is designed for high-stakes AI research and executive synthesis, targeting an audience that values clarity, academic rigor, and premium utility. 

The aesthetic is a hybrid of **Minimalism** and **Museum Gallery** design. It prioritizes extreme whitespace, literary-grade typography, and a "warm-tech" atmosphere. The goal is to evoke the feeling of a physical gallery or a high-end architectural studio—clean, quiet, and intentional. Every element must feel curated, avoiding the cluttered "dashboard" look of traditional SaaS in favor of a thoughtful, document-centric workspace.

## Colors
The color palette is strictly light-mode, grounded in a warm, archival base. 

- **Primary Custom Color (#007AFF):** Used exclusively for primary actions and critical status indicators. This "Electric Blue" provides a high-contrast functional signal against the neutral background.
- **Warm Parchment (#FBFBFA):** The global background color. It reduces eye strain compared to pure white and reinforces the "AI Lab" or "Gallery" aesthetic.
- **Pure White (#FFFFFF):** Reserved for elevated surfaces (cards, modals) to create a subtle layered effect against the parchment.
- **Neutrals:** Text utilizes a deep charcoal (#1A1A19) rather than pure black to maintain the warmth of the system.

## Typography
This design system utilizes a sophisticated typographic pairing to balance editorial authority with functional clarity.

- **Headlines (Newsreader):** Use for titles, section headers, and pull quotes. The serif nature conveys a "pro" archival feel. Weights should remain medium to light to preserve elegance.
- **UI & Body (Inter):** Use for all functional interfaces, body copy, and data. Inter provides the utilitarian precision required for complex AI workflows.
- **Vertical Rhythm:** Maintain generous line heights (1.6x for body) to ensure readability during long research sessions.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy centered within the viewport. Content is housed in a disciplined 12-column structure with wide gutters to encourage "breathable" information density.

Margins are intentionally oversized (48px+) to mimic the matting of a framed artwork in a gallery. Use vertical stacking units of 24px and 48px to separate major content blocks, ensuring that no screen feels "crowded."

## Elevation & Depth
Depth is achieved through **Museum Gallery elevation**. This avoids heavy shadows in favor of subtle tonal layering and razor-thin hairlines.

1.  **Base Layer:** The Warm Parchment (#FBFBFA) background.
2.  **Surface Layer:** Pure White (#FFFFFF) cards. These do not use shadows; instead, they are defined by a 1px solid border in a slightly darker parchment tone (#E5E5E0).
3.  **Active Layer:** Modals and dropdowns use a "Museum Shadow"—an extremely diffused, low-opacity (4-6%) neutral shadow with a large 32px blur, making the element appear as if it is floating slightly above the gallery floor.

## Shapes
The shape language is defined by a **Pill-shaped (Level 3)** approach for interactive components, contrasted against sharp or slightly softened containers.

Primary buttons, tags, and status badges must always be fully rounded (capsule/pill shape). This softens the "industrial" feel of the AI tools and makes the primary #007AFF color feel more approachable and modern. Larger containers (cards) should maintain a more architectural `rounded-lg` (2rem) or `rounded-xl` (3rem) corner radius.

## Components
- **Buttons:** Primary CTAs are pill-shaped, filled with #007AFF, using white Inter Semibold text. Secondary buttons use a transparent fill with a 1px #E5E5E0 border.
- **Cards:** Pure white backgrounds with a subtle border. Content inside cards should have generous internal padding (32px) to maintain the gallery feel.
- **Status Indicators:** Small 8px pill dots or subtle filled badges using #007AFF to denote "Live," "Active," or "Processing."
- **Input Fields:** Minimalist design. No background fill; only a bottom border that thickens and changes to #007AFF upon focus. 
- **Chips/Tags:** Pill-shaped with the Parchment background and Inter Medium text, used for categorizing AI-generated insights.
- **Lists:** Clean, borderless rows separated by whitespace and light 1px dividers.
