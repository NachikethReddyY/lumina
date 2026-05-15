---
name: Lumina Precision
colors:
  surface: '#121416'
  surface-dim: '#121416'
  surface-bright: '#38393c'
  surface-container-lowest: '#0c0e10'
  surface-container-low: '#1a1c1e'
  surface-container: '#1e2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#333537'
  on-surface: '#e2e2e5'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3133'
  outline: '#8b90a0'
  outline-variant: '#414755'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e69'
  primary-container: '#4b8eff'
  on-primary-container: '#00285c'
  inverse-primary: '#005bc1'
  secondary: '#a5da2e'
  on-secondary: '#253600'
  secondary-container: '#8bbe01'
  on-secondary-container: '#334800'
  tertiary: '#ffb4aa'
  on-tertiary: '#690003'
  tertiary-container: '#ff5545'
  on-tertiary-container: '#5c0002'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#bdf548'
  secondary-fixed-dim: '#a2d72b'
  on-secondary-fixed: '#141f00'
  on-secondary-fixed-variant: '#374e00'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#930005'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
typography:
  display-serif:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1-serif:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  h2-serif:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
  mono-data:
    fontFamily: monospace
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-xxs: 2px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 24px
  layout-margin: 16px
  layout-gutter: 12px
---

## Brand & Style

The design system is rooted in the "Precision Engineering" aesthetic. It is a high-density, minimalist framework designed for power users who require speed and mental clarity. It evokes an atmosphere of professional reliability and technological sophistication.

The style is a blend of **Minimalism** and **Corporate Modernity**. It relies on architectural discipline—using strict grids, tonal layering, and hairline borders rather than shadows to define structure. This creates a "glass-cockpit" feel where information is prioritized and visual noise is ruthlessly eliminated. The emotional response is one of calm, high-stakes focus.

## Colors

The palette is strictly functional. The base layer is a deep, "techy" black that minimizes eye strain and provides a canvas for high-contrast data. 

- **Primary Blue:** Reserved for actions, focus states, and the primary path. It represents performance.
- **Lumina Brain Lime:** Used exclusively for intelligence signals, success metrics, and "smart" features.
- **Alert Red:** A sharp, surgical red used for critical failures and warnings.
- **Tonal Grays:** Surfaces are built using elevated shades of gray to create a hierarchy of depth without the use of light sources or shadows.

## Typography

This design system uses a dual-type strategy to balance high-stakes authority with utility. 

**Newsreader** is used for major editorial headings, landing pages, and "moment of entry" headers. It adds a traditional, literary authority that suggests the importance of the data beneath it.

**Inter** handles all operational tasks. It is the workhorse for navigation, data tables, labels, and body text. Small font sizes (13px/14px) are utilized to maintain high information density, while increased font weight and color contrast (white vs. muted gray) are used to establish a hierarchy.

## Layout & Spacing

The layout philosophy is built on **High Information Density**. We favor utility over whitespace. 

A fluid grid system is used for internal application panels, allowing the interface to stretch across professional ultra-wide monitors. Spacing is tight—standard increments of 4px ensure that elements are packed efficiently. 

Internal panels use a "sidebar-main-inspector" layout model. Margins are kept to a minimum (16px) to maximize the "real estate" for data. Padding within components like lists and buttons is reduced to the functional minimum required for legibility.

## Elevation & Depth

Elevation in this design system is achieved through **Tonal Layers** and **Low-Contrast Outlines**.

Shadows are avoided entirely to maintain a flat, precise aesthetic. Instead, depth is communicated by shifting the background color from #0A0A0A (Base) to #121416 (Surface). 

Every elevated module or panel must be contained by a subtle 1px border (`rgba(255, 255, 255, 0.08)`). This "hairline" separation creates sharp definition between stacked elements. When an element is active or hovered, the border opacity may increase, or the border color may shift to the Primary Blue.

## Shapes

The shape language is "Geometric Minimalist." 

A standard 4px radius is used across all components (buttons, input fields, panels). This slight rounding prevents the UI from feeling aggressive while maintaining a sharp, professional edge. For larger containers, the 4px radius is maintained to ensure consistency in the grid. "Pill" shapes are prohibited except for specific status indicators or badges.

## Components

### Buttons
Buttons are compact and utilitarian. 
- **Primary:** Solid #007AFF with white text. 
- **Secondary:** Transparent background with the 1px white-alpha border.
- **Padding:** 6px vertical, 12px horizontal for a precise, "short" appearance.

### Inputs & Fields
Inputs use the #121416 surface color with a 1px border. Focus states are indicated by the border changing to Primary Blue and a subtle 2px outer glow (not a shadow, but a sharp ring).

### Lists & Tables
The core of the system. Lists use 1px bottom borders for separation. Hover states trigger a subtle background lightening. Font sizes are kept at 13px for maximum data visibility.

### Lumina Brain Signals
Indicators for "System Intelligence" use the #B8EF43 (Lime) color. These often appear as small 6px circular pips or subtle glows behind icons to signify an AI-driven insight or a successful automated task.

### Internal Profile Section
Inside the application, branding is minimized. A simple 24px circular avatar or a small text-based workspace switcher in the top right serves as the account anchor.