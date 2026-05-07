# Huashu Design Skill User Guide

## What is Huashu Design?

Huashu-Design is a skill for creating hi-fi designs using HTML, suitable for:
- Interactive prototypes, product mockups
- Design variant exploration
- Presentation slides (HTML decks)
- Animation demos
- Infographics/visualizations

**Core Philosophy**: HTML is the tool, not the medium. Embody different experts based on tasks (UX designer/animator/slide designer/prototyper).

## Trigger Words

Use these keywords to trigger the skill:
- Prototype, design demo, interactive prototype
- HTML presentation, animation demo, design variants
- Hi-fi design, UI mockup, prototype
- Design style, design direction, color scheme
- Export MP4, export GIF, 60fps video
- Review, review this design

## Core Capabilities

### 1. Junior Designer Workflow
- Show hypotheses + reasoning + placeholders first
- Implement after user confirmation
- Iterative development, early feedback for early fixes

### 2. Design Direction Consultant (When Requirements Are Vague)
Recommend 3 differentiated directions from 5 schools × 20 design philosophies:
- Information Architecture (Pentagram, etc.)
- Motion Poetry (Field.io, etc.)
- Minimalism (Kenya Hara, etc.)
- Experimental Avant-Garde (Sagmeister, etc.)
- Oriental Philosophy

### 3. Core Asset Protocol (When Brands Are Involved)
**Must** execute five-step process:
1. Ask user for assets (logo/product images/UI screenshots/color values/fonts)
2. Search official channels
3. Download assets (logo mandatory, product images/UI mandatory)
4. Verify + extract color values
5. Solidify into `brand-spec.md`

**Iron Rule**: Rather use real assets, don't replace with CSS silhouettes/SVG hand-drawings

### 4. Anti-AI Slop
Avoid these common pitfalls:
- ❌ Purple gradients, emoji as icons
- ❌ Rounded cards + left border accent
- ❌ SVG drawing faces/scenes/objects
- ❌ CSS silhouettes replacing real product images
- ✅ Use real assets, brand colors, distinctive fonts

### 5. App/iOS Prototype Exclusives
- Default single-file inline React (double-click to open)
- Use `assets/ios_frame.jsx` for iPhone mockups (no hand-drawn Dynamic Island)
- Run Playwright click testing before delivery
- Default to Wikimedia/Met/Unsplash for real images

### 6. Video Export (Default for Animations)
Animation HTML defaults to MP4 export with audio:
- 25fps base recording
- 60fps interpolation + palette-optimized GIF
- 6 scene-based BGM tracks
- SFX sound effects (37 pre-built resources)

## Standard Workflow

1. **Understand Requirements** - Ask clarifying questions, use WebSearch to verify when involving specific products
2. **Explore Resources** - Follow Core Asset Protocol (mandatory for brands)
3. **Position Four Questions** - Narrative role/audience distance/visual temperature/capacity estimation
4. **Build Structure** - Create project folder
5. **Junior Pass** - Write assumptions + placeholders
6. **Full Pass** - Fill content, create variants
7. **Verify** - Playwright screenshots, check errors
8. **Summary** - Explain caveats and next steps
9. **Export Video** - With BGM + SFX (default for animations)
10. **(Optional) Expert Review** - 5-dimension scoring

## Checkpoints

When encountering 🛑 markers, **must stop** and wait for user confirmation:
- Checkpoint 1: Send question list all at once, wait for batch replies
- Checkpoint 2: Core assets in place before starting work
- Checkpoint 3: Show placeholders early, wait for feedback
- Checkpoint 4: Visually scan through browser before delivery

## Starter Components

Ready-to-use components (in `assets/` directory):
- `deck_index.html` - Slide aggregator (default base output)
- `deck_stage.js` - Single-file slides (≤10 pages)
- `design_canvas.jsx` - Side-by-side variant display
- `animations.jsx` - Animation engine
- `ios_frame.jsx` - iPhone mockup (mandatory, no hand-drawing)
- `android_frame.jsx` - Android mockup
- `macos_window.jsx` - Desktop app window
- `browser_window.jsx` - Browser window

## Technical Red Lines

1. **Never** write `const styles = {...}` - Must give unique names
2. **Scopes don't share** - Use `Object.assign(window, {...})` between multiple script tags
3. **Never** use `scrollIntoView` - Breaks container scrolling

## Reference Documentation

Full details in `.agents/skills/huashu-design/` reference docs:
- `references/workflow.md` - Detailed workflow
- `references/design-styles.md` - 20 design philosophies library
- `references/react-setup.md` - React+Babel best practices
- `references/slide-decks.md` - Slide creation guide
- `references/verification.md` - Playwright verification
- `references/video-export.md` - Video export process
- `references/audio-design-rules.md` - Sound design rules
- `references/critique-guide.md` - Expert review guide
