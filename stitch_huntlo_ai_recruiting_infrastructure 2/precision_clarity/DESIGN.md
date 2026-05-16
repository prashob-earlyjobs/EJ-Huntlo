---
name: Huntlo AI Infrastructure
colors:
  surface: '#faf9ff'
  surface-dim: '#d3d9f0'
  surface-bright: '#faf9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fe'
  surface-container-highest: '#dce2f9'
  on-surface: '#141b2b'
  on-surface-variant: '#434654'
  inverse-surface: '#293041'
  inverse-on-surface: '#edf0ff'
  outline: '#737685'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#003b9a'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#c1cfff'
  inverse-primary: '#b3c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d4e3ff'
  on-secondary-container: '#56657c'
  tertiary: '#3e4346'
  on-tertiary: '#ffffff'
  tertiary-container: '#555a5d'
  on-tertiary-container: '#cdd1d5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#b8c7e2'
  on-secondary-fixed: '#0c1c30'
  on-secondary-fixed-variant: '#39485e'
  tertiary-fixed: '#dfe3e6'
  tertiary-fixed-dim: '#c3c7ca'
  on-tertiary-fixed: '#171c1f'
  on-tertiary-fixed-variant: '#42474a'
  background: '#faf9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f9'
  glass-bg: rgba(255, 255, 255, 0.7)
typography:
  display-lg:
    fontFamily: Syne
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-hero:
    fontFamily: Syne
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.05'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Syne
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Syne
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-tablet: 32px
  margin-desktop: 64px
---

## Brand & Style
The brand identity is rooted in **Modern Corporate Glassmorphism**, projecting a sense of high-performance, enterprise-grade reliability through a lens of cutting-edge technology. The visual language is designed for high-growth talent teams who value speed and efficiency. 

The aesthetic is characterized by a "hyper-clean" light mode that utilizes soft gradients, sophisticated background blurs, and ambient light-blue shadows to create a layered, multi-dimensional workspace. It is professional without being stuffy, and technical without being cold.

## Colors
The palette is dominated by a core "Electric Professional" blue (`#0050cb`) that signifies intelligence and action. 

- **Primary & Tints:** The primary blue is supported by a vibrant container blue for high-visibility actions and soft background washes (`primary-fixed`) that define specialized UI zones.
- **Surface Strategy:** Surfaces use a range of cool-toned greys and off-whites to create hierarchical separation. The background is a crisp white-blue (`#f9f9ff`).
- **Gradients:** Text highlights and primary accents should utilize a subtle linear gradient from the primary blue to a lighter surface tint to imply movement and energy.

## Typography
Typography is a high-contrast pairing of the expressive, geometric **Syne** for headlines and the utilitarian, highly legible **Inter** for body text and labels.

- **Syne** is reserved for marketing claims and section headers, used with tight tracking and leading to create a "locked-in" architectural feel.
- **Inter** handles all functional UI and long-form reading. 
- **Labels** often use uppercase styling with increased letter spacing for a secondary "eyebrow" hierarchy.

## Layout & Spacing
The system uses a **Fixed Grid** philosophy for desktop layouts (max-width: 1280px) and a fluid model for mobile. 

- **Modular Rhythm:** A 4px baseline unit governs all spacing.
- **Vertical Rhythm:** Large sections are separated by generous 128px (stack-lg * 4) padding to maintain an airy, premium feel.
- **Bento Logic:** Complex feature sections use a grid-based "Bento" layout, where cards span variable column widths (e.g., 8-column primary features paired with 4-column secondary features) to create visual interest.

## Elevation & Depth
Elevation is achieved through a combination of **Glassmorphism** and **Ambient Shadows**:

- **Glass Panels:** Used for navigation and sticky elements, featuring 70% opacity and 20px background blurs to maintain context while scrolling.
- **Ambient Shadows:** Shadows are extra-diffused with a specific tint of primary blue (`rgba(0, 80, 203, 0.08)`). They should feel like they are floating on a cushion of light rather than casting a dark shadow.
- **Interactive Surfaces:** Cards and containers utilize a `1px` subtle border (`#E5E7EB`) to define boundaries without heavy lifting, relying on the shadow for actual elevation.

## Shapes
The shape language is "Generously Rounded." 

- **Containers/Cards:** Use `2xl` (1rem) or `3xl` (1.5rem) radii to create a friendly, modern approachable feel.
- **Interactive Elements:** Buttons and small chips should favor a `full` (pill) radius for maximum distinctness from structural containers.
- **Input Fields:** Use `xl` (0.75rem) to balance between the soft cards and the pill buttons.

## Components
- **Buttons:** Primary buttons are pill-shaped, using the primary blue with a subtle shadow. Secondary buttons are pill-shaped with a subtle border and surface-container-lowest background.
- **Chips:** "Status" or "Live" indicators use small, pill-shaped backgrounds with a 1.5px dot icon and uppercase label-sm typography.
- **Bento Cards:** Feature cards have white backgrounds, `3xl` corners, and a `subtle-border`. They should use interior padding of `stack-lg` (32px).
- **Navigation:** The TopAppBar is a glass-morphic bar with a thin bottom border of `outline-variant/30`. Links use `label-md` with a transition effect to the primary color on hover.
- **Inputs:** Search bars and text inputs should use a soft `surface-container-low` background and an inset appearance or very subtle border.