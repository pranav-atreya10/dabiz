---
name: Requirements Studio
description: Icy seal-blue light, navy ink, one crimson pink action, and a blue sphere seen through fluted glass.
colors:
  seal-blue: "#DBF2FC"
  navy: "#072D59"
  crimson-pink: "#FD6E88"
  crimson-pink-hover: "#ff8399"
  crimson-ink: "#c22d52"
  pink-blush: "#ffe8ed"
  ice-ground: "#eef8fd"
  surface: "#ffffff"
  surface-mist: "#f4fbfe"
  hover-frost: "#e7f5fc"
  ink-secondary: "#24466f"
  ink-tertiary: "#0d3463"
  muted-slate: "#44658c"
  faint-slate: "#5b7a9c"
  hairline: "#cbe5f2"
  hairline-strong: "#a3cbe2"
  sky-mid: "#a9d6f2"
  sky-deep: "#5f9fdc"
  danger: "#b3243c"
  success: "#0f7a5a"
  warn-bg: "#fff1dc"
  warn-text: "#7a4300"
  night-ground: "#04172f"
  night-raised: "#0d3a6e"
  night-ink: "#eaf7fd"
  night-ink-secondary: "#bcdcef"
  night-hairline: "#12406f"
  night-hairline-strong: "#1f5288"
  night-crimson-ink: "#ff9cae"
typography:
  display:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(48px, 7vw, 96px)"
    fontWeight: 300
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(36px, 4.6vw, 60px)"
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline-app:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(44px, 8vw, 72px)"
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  title-lg:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(17px, 1.5vw, 19px)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Code, Consolas, monospace"
    fontSize: "13px"
    lineHeight: 1.6
rounded:
  pill: "999px"
  xl: "28px"
  lg: "24px"
  md: "16px"
  sm: "14px"
  xs: "6px"
spacing:
  section: "128px"
  section-compact: "88px"
  gutter: "32px"
  gutter-phone: "16px"
  card: "32px"
  card-compact: "24px"
  field-x: "16px"
components:
  button-primary:
    backgroundColor: "{colors.crimson-pink}"
    textColor: "{colors.navy}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.crimson-pink-hover}"
  button-secondary:
    backgroundColor: "{colors.seal-blue}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "48px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "48px"
  button-small:
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "38px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.sm}"
    padding: "13px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  chip:
    backgroundColor: "{colors.seal-blue}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  chip-epic:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.seal-blue}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  segmented-tab-active:
    backgroundColor: "{colors.seal-blue}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
---

# Design System: Requirements Studio

## Overview

**Creative North Star: "Through the Fluted Glass"**

A calm, icy world of cold daylight. The ground is a pale seal blue that deepens toward a saturated sky at the bottom of the hero; ink is a deep navy; one crimson pink marks the single thing to do. The idea goes in on the left as light, large type and a pill-shaped field, and on the right a deep blue sphere with a pink rim sits behind vertical fluted-glass ribs that refract it and shift with the pointer. That glass-and-sphere is the one signature object, and it recurs as the same object at reduced scale behind the top of every app page.

Density is generous on the persuasion surface (128px section rhythm, 60 to 96px light headlines) and moderate in the app (860 to 960px column, cards with 24 to 32px padding). Everything interactive is a pill; everything that contains is a softly rounded rectangle on a white surface with a hairline border and a navy-tinted ambient shadow. Light and dark mode follow the device: in dark, the ground becomes a near-black navy, surfaces become navy, and the pink stays the same pink.

The world refuses the SaaS split hero with a product screenshot and a row of fake customer logos. Proof is limited to the real tools the product sends to, set as plain type.

**Key Characteristics:**
- Seal-blue ground, navy ink, a single crimson pink accent.
- Hanken Grotesk at weight 300 for display, with an italic second line on its own line.
- Pill controls, 14 to 28px rounded containers.
- One glass-and-sphere object per viewport, never scattered blur.
- Soft navy-tinted ambient shadows; a pink glow only under the primary button.
- Device decides light or dark; no toggle.

## Colors

Cold blue daylight with navy ink and one hot note of crimson pink.

### Primary
- **Crimson Pink** (`crimson-pink`): the one primary action per screen (Start, Continue, Get started), the selected answer dot in question cards, the active progress bar on the four-step flow, the caret, focus outlines, input focus border, and text selection (at 28% opacity). Text on it is always navy, never white. Hover lifts to `crimson-pink-hover`.
- **Crimson Ink** (`crimson-ink`, dark mode `night-crimson-ink`): the readable pink for inline links in body copy, where the base pink would fail contrast on light grounds.
- **Pink Blush** (`pink-blush`): the faint pink wash behind inline help notes tied to an action.

### Secondary
- **Seal Blue** (`seal-blue`): the raised tone. Secondary buttons, active segmented tabs and stepper steps, chips, icon tiles, the question-card header. Also the light end of the sky gradient.
- **Navy** (`navy`): primary ink in light mode, surface color in dark mode, the epic chip, and the fixed navy demo band on the home page (navy in both modes).

### Tertiary
- **Sky Mid / Sky Deep** (`sky-mid`, `sky-deep`): the lower stops of the sky gradient (`ice-ground` 0%, `seal-blue` 38%, `sky-mid` 72%, `sky-deep` 100%). Used only inside the sky gradient, never as flat fills. The dark sky runs `night-ground` to #1a5aa6.

### Neutral
- **Ice Ground** (`ice-ground`): page background in light mode. Dark: `night-ground`.
- **Surface** (`surface`) and **Surface Mist** (`surface-mist`): cards and inputs; mist for document previews, file trees and quiet inline panels. Dark: navy and #082448.
- **Hover Frost** (`hover-frost`): row and outline-button hover.
- **Ink Secondary / Tertiary** (`ink-secondary`, `ink-tertiary`): subheads and lead paragraphs; document body text.
- **Muted Slate** (`muted-slate`): meta text, inactive tabs, nav links at rest.
- **Faint Slate** (`faint-slate`): placeholders, chart axes, question numbers.
- **Hairline / Hairline Strong** (`hairline`, `hairline-strong`): card borders and row dividers; input, pill-group and outline-button strokes.
- **Status**: `danger`, `success`, `warn-bg` with `warn-text`, each with a dark-mode counterpart in the stylesheet.

### Named Rules
**The One Pink Rule.** Crimson pink marks the one primary action on a screen plus state (selection, focus, checked, progress). Secondary actions use seal blue or an outline pill. Two pink buttons on one screen is a bug.

**The Navy-On-Pink Rule.** Text and icons on crimson pink are navy (`navy`). White on pink fails contrast and is not part of this world.

**The Device Decides Rule.** Light and dark come from `prefers-color-scheme` only. Every color token has a dark counterpart; the pink is the one value that does not change.

## Typography

**Display Font:** Hanken Grotesk (with -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Hanken Grotesk
**Label/Mono Font:** ui-monospace stack (SF Mono, Cascadia Code, Consolas) for file trees, raw markdown and code

**Character:** One grotesk carrying everything. Light 300 at large sizes reads airy and unhurried; regular 400 body and 500 to 600 labels give the app plain, trustworthy weight.

### Hierarchy
- **Display** (300, clamp 48 to 96px, 0.98, -0.04em): the home hero headline only.
- **Headline** (300, clamp 36 to 60px, 1.02, -0.035em): home section heads and the closing band (closing band up to 76px).
- **Headline App** (300, clamp 44 to 72px, 1.02, -0.04em): the page title on app pages (studio, usage); sign-in uses a fixed 40px at 300.
- **Title Large** (600, 28px, 1.2, -0.02em): step titles inside app cards.
- **Title** (500, 22px, -0.02em): panel heads, stage heads, block heads.
- **Lead** (400, 17 to 22px, 1.5 to 1.55): the sentence under a headline, in `ink-secondary`, max about 480 to 640px.
- **Body** (400, 16px, 1.6): everything else; long answers in FAQ capped at 62ch.
- **Label** (500, 14 to 15px): form labels, tabs, nav links, chips (12px 600 in chips).
- **Mono** (13 to 14px): file trees, raw output, tool file names.

### Named Rules
**The Italic Second Line Rule.** Display and headline text is light 300 with the second phrase in italic 300, set on its own line ("Rough idea in. *Buildable spec out.*"). The italic never goes bold.

**The Sentence Case Rule.** Headings and labels are sentence case. There is no uppercase tracked label style in this system.

## Layout

The home page uses a 1200px container with 32px gutters (16px under 560px). Sections breathe at 128px vertical padding (88px under 980px). Section heads are a two-column grid: headline left, a short paragraph right-aligned at the bottom; they stack under 980px. The hero is full-viewport-ish (up to 860px) on the sky gradient with copy capped at 600px on the left and the glass object occupying the right half, bleeding off the edge; under 980px the glass drops below the copy as a 420px band.

App pages use a single centered column (860px studio, 960px usage, 440px sign-in card) under a 64px sticky top bar, with the sky band (560px tall, fading to transparent from 40%) behind the top of the page. Cards stack with 16 to 20px gaps. Grids collapse to one column on phones; the stepper hides inactive labels under 640px.

Spacing rhythm, observed: 8, 12, 16, 22 to 24, 28, 32, 56, 88, 128px.

## Elevation & Depth

Hybrid: hairline borders do most of the separation, with a soft navy-tinted ambient shadow under cards and one warm pink glow under the primary button. The real depth in the world comes from the glass object (a radial-gradient sphere with an inset pink rim, behind backdrop-blurred ribs) and from translucent chrome over it. In dark mode the card shadow turns to a deeper black ambient.

### Shadow Vocabulary
- **Ambient card** (`box-shadow: 0 1px 2px rgba(7,45,89,.05), 0 12px 32px -8px rgba(7,45,89,.12)`): cards, the hero idea field.
- **Pink glow** (`box-shadow: 0 6px 16px -4px rgba(253,110,136,.55)`): primary button only.
- **Floating card** (`box-shadow: 0 30px 60px -24px rgba(0,0,0,.35)`): the live question card floating over the glass.
- **Focus halo** (`box-shadow: 0 0 0 4px rgba(253,110,136,.28)`): inputs and the idea field on focus.

### Named Rules
**The One Object Rule.** The glass-and-sphere appears once per viewport as one specific object: the hero, the closing band, or the sky band on app pages. It hides below 1180px on app pages and below 980px in the closing band. Never break it into scattered blurred shapes.

**The Earned Blur Rule.** Backdrop blur belongs to the glass ribs, the sticky top bar, and a card floating over the glass. It is not a general card treatment.

## Shapes

Two families. Controls are full pills (999px): buttons, the idea field, segmented controls, the stepper, chips, tool name tags, feedback buttons. Containers are generously rounded rectangles: 28px for home panels, 24px for app cards, 16px for nested blocks (examples, document previews, editors, inline callouts), 14px for inputs, tool tiles and notes, 6px for key hints and the focus outline. Circles carry small marks: icon tiles (48px), radio dots, progress dots, the sphere. The idea field drops to a 24px rounded rectangle when it stacks on phones.

## Components

### Buttons
Confident pills with a small lift.
- **Shape:** full pill (999px), 48px tall, 38px for the small size.
- **Primary:** crimson pink with navy text, weight 600, pink glow shadow. Hover lifts 1px and lightens to `crimson-pink-hover`; the drawn arrow slides 3px right.
- **Secondary:** seal blue fill, navy text, a light blue stroke; hover deepens the fill.
- **Outline:** transparent with a `hairline-strong` stroke; hover fills with `hover-frost` and darkens the stroke to ink.
- **Disabled:** 45% opacity, no shadow.
- **Motion:** 0.2s on color and shadow, transform on `cubic-bezier(.2,.8,.2,1)`.
- **Arrow:** a drawn 16px SVG arrow masked in `currentColor`, not a text glyph.

### Chips
- **Style:** pill, 12px 600, seal blue on navy text; the epic chip inverts to navy with seal-blue text. Tool tags are outline pills with a `hairline-strong` stroke.

### Cards / Containers
- **Corner Style:** 24px (app cards), 28px (home panels).
- **Background:** `surface`; nested blocks on `surface-mist`.
- **Shadow Strategy:** ambient card shadow on app cards; home panels rely on the hairline only.
- **Border:** 1px `hairline`.
- **Internal Padding:** 32px, 28px or 24px; 24px by 20px on phones.

### Inputs / Fields
- **Style:** white surface, 1px `hairline-strong`, 14px radius, 13px by 16px padding, pink caret.
- **Focus:** border turns crimson pink with a 4px pink halo; no outline.
- **Placeholder:** `faint-slate`. Errors sit below in `danger` at 14px.

### Navigation
- **Top bar:** 64px, sticky, translucent ice ground with 14px backdrop blur and a hairline bottom border; transparent and absolute over the home hero. Brand mark plus "Requirements Studio" at 17px 500. Links are 15px 500 in `ink-secondary` or `muted-slate`, darkening to ink on hover; the current page sits in a seal-blue pill.
- **Segmented control and stepper:** pill groups with a `hairline-strong` stroke; the active item is a seal-blue pill. Stepper numbers are 22px circles that fill with ink when active and outline in `success` when done.

### Question Card
The product's core object, one question at a time. 18px radius, `hairline-strong` stroke, seal-blue header with an 18px 500 question and a tabular "2 of 7" pager. Options are rows with 22px radio circles that fill crimson pink with a white center when chosen. Progress dots along the foot: ink for current, faint for answered, dashed for skipped.

### Glass and Sphere (signature)
A deep blue sphere (radial gradient from #8cc4f2 through #3d84d6 and #164f9c to navy) with an inset crimson rim and soft pink spill, behind vertical fluted ribs: a repeating 34px white, navy and pink gradient with 14px backdrop blur, masked to fade in from the left. The sphere drifts slowly (16s alternate) and the ribs shift with the pointer; motion stops under reduced motion. The brand mark repeats the same idea at 28px: a navy disc, a pink rim stroke, and two ribs.

## Do's and Don'ts

### Do:
- **Do** give each screen exactly one crimson pink action and set its label in navy.
- **Do** set display and headline text in Hanken Grotesk 300 with the italic phrase on its own line.
- **Do** make every control a pill (999px) and every container a 14 to 28px rounded rectangle on `surface` with a 1px hairline.
- **Do** show the glass-and-sphere as one object per viewport, and hide it rather than squeeze it at narrow widths.
- **Do** derive every color from the token pair so dark mode follows the device.
- **Do** draw icons as stroked SVG (1.7 to 1.8px stroke, round caps) in `currentColor`.

### Don't:
- **Don't** build a split hero with a product screenshot or a row of customer logos; name only the real tools the product sends to, as plain type.
- **Don't** put white text on crimson pink or use pink as a large background fill.
- **Don't** scatter blurred shapes or apply backdrop blur to ordinary cards.
- **Don't** add uppercase tracked labels above headings.
- **Don't** use `faint-slate` for running text or notes people need to read; it is for placeholders and axis labels.
- **Don't** use emoji or text characters as icons.
