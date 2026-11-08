---
name: fintrace
description: Personal envelope budgeting by pay cycle, drawn as a kraft pay envelope (amplop gaji) over soft pastel work areas.
colors:
  primary: "#4a5bc4"
  primary-foreground: "#ffffff"
  secondary: "#bcc8f6"
  kraft: "#ead3b5"
  kraft-ink: "#5f503f"
  window: "#fffdfb"
  background: "#f6f7fb"
  foreground: "#3d3832"
  panel: "#edeef4"
  accent: "#e3e6f3"
  divider: "#e0e2ea"
  track: "#dcdee7"
  field: "#ffffff"
  muted-foreground: "#66615b"
  quiet-control: "#85807a"
  amount-placeholder: "#8a7b6a"
  destructive: "#b3261e"
  destructive-soft: "#f2b8b5"
  hue-mint: "#9ed4b6"
  hue-apricot: "#f2c08e"
  hue-lilac: "#cdb8ee"
  hue-sky: "#a9d3f0"
  hue-rose: "#f2b8c6"
  hue-butter: "#ecd88a"
  wants: "#8e9be0"
  unclassified: "#c8c2bb"
  chart-line: "#6c7bd2"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  headline-page:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.25
  title-page:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.25
  title-action:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  figure:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  kbd: "6px"
  field: "10px"
  button: "14px"
  panel: "16px"
  sheet: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  gutter: "20px"
  section: "22px"
  gutter-desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.window}"
    typography: "{typography.figure}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, #3d3832, #5f503f 40%)"
    textColor: "{colors.window}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "48px"
  button-destructive:
    backgroundColor: "{colors.destructive-soft}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.button}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.button}"
    padding: "0 12px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
  record-bar:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.window}"
    typography: "{typography.title-action}"
    rounded: "{rounded.button}"
    height: "60px"
    width: "100%"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "44px"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
  address-window:
    backgroundColor: "{colors.window}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "14px 16px 16px"
  kraft-band:
    backgroundColor: "{colors.kraft}"
    textColor: "{colors.foreground}"
    padding: "20px"
  nav-tab:
    backgroundColor: "transparent"
    textColor: "{colors.kraft-ink}"
    rounded: "{rounded.button}"
    height: "44px"
  nav-tab-hover:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
  nav-tab-current:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
  status-badge-open:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  status-badge-closed:
    backgroundColor: "{colors.track}"
    textColor: "{colors.muted-foreground}"
  row-menu-trigger:
    backgroundColor: "transparent"
    textColor: "{colors.quiet-control}"
    rounded: "{rounded.button}"
    size: "44px"
  menu:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "4px"
  menu-item-highlighted:
    backgroundColor: "{colors.field}"
    rounded: "{rounded.field}"
    height: "44px"
  sheet:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.sheet}"
  toast:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.panel}"
    height: "56px"
---

# Design System: fintrace

## Overview

**Creative North Star: "Amplop Gaji"**

Each pay cycle is a pay envelope and each Budget an envelope you spend from. The top of every surface is a kraft band, the envelope itself, that ends in a soft wavy flap. Inside the band sits a die-cut white address window that frames the one figure that matters: usable funds on Overview, the typed amount in Quick Record. Below the flap is a faintly cool white work area where content sits in grouped, tinted panels. Nothing is outlined and nothing casts a shadow at rest.

The palette is soft pastels with firm ink. Pastels are fills only. Text and figures stay in a warm dark ink that is never black, and every text pairing keeps WCAG AA. Action is Warm Ink: the same ink as the text, as a fill with warm-white text, like a stamp on the envelope. Kraft marks secondary actions, pastel periwinkle marks selection, and Ink Periwinkle is kept for focus, the caret and links. One sans with tabular figures carries every level. Hierarchy comes from size and spacing, with little weight contrast. Density is calm and one-handed: 44px minimum targets, a full-width Record bar in thumb reach, and lists you scan rather than tables you read. Desktop gets real tables for Transactions, Plan and Budgets, but they sit inside the same tinted panels with the same divider rows.

The world replaced a rejected wall-calendar direction. It also turns away from the fintech default of white cards, a hero balance and a floating pill button, and from both "spreadsheet grey" and "too decorative". UI terms are fixed: **Fund** (an account), **Budget** (an envelope), and the primary action is labelled **Record**.

**Key Characteristics:**
- Kraft band with a wavy flap edge on every top-level surface: each app screen (Overview, Transactions, Plan, Budgets, Reconcile, Analytics, Cycles, Borrows, Wishlist, Settings), the Quick Record and Allocate sheets, login.
- A white address window inside the kraft frames the key figure.
- Flat tinted panels with 1px soft dividers between rows. No borders and no resting shadows.
- Warm ink for text and for action, pastel periwinkle for selection, ink periwinkle for focus.
- One fixed pastel hue per Budget, shown as a dot or bar everywhere that Budget appears.
- Hanken Grotesk at 400/500/600 only, with tabular figures throughout.

## Colors

Soft pastel fills on cool white, a kraft envelope, and one saturated periwinkle for action.

### Primary
- **Ink Periwinkle** (#4a5bc4): the focus outline on buttons and chips, the text caret and links. It is no longer a button fill: solid blue buttons read as a template (changed 2026-11-08 at the user's request; primary buttons are Warm Ink).

### Secondary
- **Pastel Periwinkle** (#bcc8f6): selection. Used for the checked type tab and Fund chip, text selection, the field focus ring, the swipe-to-repeat reveal, the open and current cycle badges, and the Needs slice of the donut. At 45% it is the inline confirmation panel for an irreversible step. It always carries ink text (7.03:1) and never coloured text.
- **Wants Periwinkle** (#8e9be0): the Wants slice and legend dot in Needs vs Wants. It is a chart fill only and never text.

### Tertiary
- **Kraft** (#ead3b5): the envelope. It owns the shell band, the Quick Record and Allocate headers and the flap edge, plus the browser theme colour and the icon ground. Unallocated money is also kraft, because it is still in the pay envelope. At 50% it fills the rb/jt amount shortcuts.
- **Kraft Ink** (#5f503f): secondary text on kraft or in the window, such as cycle dates, window labels, the Close control, the section tabs and the cycle stepper (5.35:1 on kraft). On the band it also tints fills: 8% for a hovered tab, 10% for hovered quiet controls, 20% for the current tab.
- **Address Window** (#fffdfb): the warm white die-cut window inside the band. Use it only for the framed key figure.
- **Budget Hues**: mint (#9ed4b6), apricot (#f2c08e), lilac (#cdb8ee), sky (#a9d3f0), rose (#f2b8c6), butter (#ecd88a). Each Budget stores its hue (`envelopes.hue`). A new Budget gets the one fewest Budgets use, and reordering never changes it. They appear as 10px dots and as progress fills, never as text.

### Neutral
- **Cool Paper** (#f6f7fb): the page and sheet background, and the toast text.
- **Warm Ink** (#3d3832): all primary text and figures, and the fill of every primary button (the Record bar, its docked twin and the floating desktop button, Save, Apply, Allocate, Sign in, Start cycle) with Address Window text (11:1). Hover mixes 40% Kraft Ink into it in OKLCH. Inverted, it is the toast surface and the 35% sheet backdrop.
- **Panel Tint** (#edeef4): the grouped-list panel and desktop table, the filters panel, the quick-entry strip, the row menu popover, the chip at rest, the segmented control track and the outline button.
- **Hover Tint** (#e3e6f3): hover fill for quiet and outline controls, the row menu trigger, and editable desktop table rows.
- **Divider** (#e0e2ea): the 1px rule between rows inside a panel. It is the only line in the system.
- **Track** (#dcdee7): empty progress tracks, the donut ring, the dot for unassigned records, and the closed cycle badge.
- **Scrollbar:** the page scrollbar is hidden so it never takes width, and every screen keeps the same width whether it scrolls or not. In its place a floating thumb (`components/shell/scroll-thumb.tsx`) of Track mixed 30% toward Kraft Ink, 6px wide and fully round, sits 2px from the right edge. It fades in while scrolling or when the pointer nears the edge, widens to 8px, can be dragged, and fades out a second after scrolling stops. Inner scrollers keep a thin native scrollbar in the same colour.
- **Field White** (#ffffff): input and select fills, the quick-entry cells, and the highlighted suggestion row or menu item.
- **Muted Ink** (#66615b): row metadata, field labels, unselected chips and empty states (5.29:1 on panel).
- **Quiet Control** (#85807a): icon-only secondary controls that sit inside a row or field: the Recent repeat button, the row menu "⋯" and the search magnifier. At 3.38:1 on panel it meets the 3:1 non-text floor. Use it for icons only, never for text, and turn it to Warm Ink on hover.
- **Amount Placeholder** (#8a7b6a): the "0" placeholder in the address-window amount field. It passes only because that text is large (40px/600, 4.04:1 on the window). Do not use it at body sizes.
- **Unclassified Stone** (#c8c2bb): the Unclassified slice and dot in Needs vs Wants. It is a chart fill only.
- **Chart Periwinkle** (#6c7bd2): the line in the Analytics daily spending chart and its legend swatch. It keeps 3.4:1 on Panel Tint, so the line passes the 3:1 floor for graphics. It is never text and never an action. The previous cycle's line is Quiet Control, dashed.

### Error
- **Deep Red** (#b3261e): negative figures, "over" labels, field errors, alert text and the Delete menu item (5.65:1 on panel).
- **Pastel Red** (#f2b8b5): the destructive button fill, over-budget bar fills, and alert panels at 50% under Deep Red text.

### Named Rules
**The Fills-Only Pastel Rule.** Pastels (secondary, Budget hues, kraft, pastel red, chart fills) are surfaces, dots and bars. Text on or beside them is Warm Ink, Kraft Ink, Muted Ink or Deep Red, always at AA.

**The One Action Colour Rule.** Warm Ink with warm-white text marks the main action you take; Kraft with ink text marks a secondary one. Nothing decorative uses either as a fill.

**The Kraft Means Envelope Rule.** Kraft appears only where the pay envelope is: the top band, its flap, and Unallocated money. Work areas are never kraft.

**The Fixed Hue Rule.** A Budget keeps one hue on every surface it appears on: its bar, its Recent dot, its suggestion dot, its Settings row. Moving it in Settings keeps the hue.

## Typography

**Display Font:** Hanken Grotesk (with ui-sans-serif, system-ui)
**Body Font:** Hanken Grotesk
**Label/Mono Font:** Hanken Grotesk, with tabular figures applied to the whole body

**Character:** A plain, friendly workhorse grotesk with low weight contrast. Figures line up in columns because `tnum` is on everywhere and the `.figure` class adds weight 500 and no-wrap.

### Hierarchy
- **Display** (600, 40px, -0.025em): the typed amount in the Quick Record address window, next to a 32px/500 "Rp" in Kraft Ink. This is the largest type in the product.
- **Headline** (600, 34px, line-height 1.25, -0.01em): usable funds in the Overview address window.
- **Headline Page** (500, 28px): the login "Sign in" heading.
- **Title Page** (500, 22px): the page title on every secondary screen, set in the band above the window. Overview has no visible title.
- **Title Action** (600, 19px): the mobile Record bar label. The docked twin is 17px and the desktop band button is 15px/500.
- **Title** (600, 14px): section headings (Funds, Budgets, Needs vs Wants, Recent). The sheet title is 16px/500.
- **Body** (400, 15px): list rows, table cells, empty states, chips and tabs. Section tabs drop to 14px on phones. Inputs use 16px to stop iOS zoom, and the item field uses 18px.
- **Figure** (500, tabular, no-wrap): every money amount in rows.
- **Label** (500, 13px): field labels, window labels and table header cells (in Muted Ink). Secondary window text, dates and the cycle stepper also sit at 13px.
- **Caption** (400, 12px): row metadata such as "Sat, Nov 7 · Cash", minimum-balance notes, percentages and cycle status badges.

### Named Rules
**The Low Contrast Weight Rule.** Use only 400, 500 and 600. Never 700 or above. Reserve 600 for headline figures, section titles and the Record label.

**The Size Carries Rank Rule.** A key figure outranks its label by size: 34-40px against 13px. Don't separate them with bolding or colour.

## Layout

The layout is a single column on phones and becomes two columns at the `lg` breakpoint (1024px). The container is capped at 1024px. Page gutters are 20px on phones and 32px on desktop, and the login column is capped at 384px.

The spacing rhythm is 4px: 4, 8, 12 and 16px inside panels and between controls, and 20px around sheet content. The one deliberate exception is the 22px gap above every section heading and above the Record bar. It was set so the bar sits exactly one section-gap below the flap. Section headings sit 8px above their panel, or 12px when the heading row carries a button (Allocate). On desktop the two columns are 32px apart: Funds and Budgets on the left, Needs vs Wants and Recent on the right.

Spacing has fixed roles, so the same relationship always gets the same gap:
- **8px:** a label above its field, and controls side by side in a row.
- **12px:** anything stacked vertically: field rows, a form row and its alert, a strip above its table, panels in a column.
- **22px:** above every section or group heading.
- **32px:** between desktop columns.

The band runs full width with its content inside the container. The address window spans the container on every screen: on desktop the label and key figure sit on the left and the supporting line or pairs on the right, aligned to the bottom of the figure. On desktop Record floats bottom-right on every screen, and the page ends with 96px of room to scroll past it. On phones the full-width Record bar follows the flap on every app screen, and once it scrolls away it docks bottom-centre above the safe area. The page scrollbar floats over the content (see Scrollbar), so short and long screens are the same width. While the band animates, its box is painted kraft, so no page colour shows through.

Every app screen opens with the same band, which starts with the section tabs. Secondary screens add their page title, then the cycle stepper where the screen is per cycle, then the address window. Below the flap, tabular content is a table on desktop and a list on phones, and the desktop Transactions table gets a quick-entry row above it.

Allocate opens like Quick Record: a bottom sheet on phones and a centred 448px dialog on desktop. Both dialogs sit at z-50, above the docked Record bar (z-40).

Quick Record opens as a near-full-height bottom sheet on phones (full height minus the top inset). On desktop it is a centred 512px dialog up to 736px tall. Its own kraft header holds the item field and the amount window. The first character typed opens the rest: the amount window grows into the header over 300ms (0fr↔1fr, inert while empty), the form body and the save footer fade in and rise 8px and 16px, and deleting back to empty reverses to the "Record again" list, which fades in the same way. Its "More" section grows open and shut over 300ms (a `grid-template-rows` 0fr↔1fr transition, inert while closed). The save footer is pinned and lifts with the virtual keyboard.

## Elevation & Depth

The system is flat. Depth comes from tonal layering: Cool Paper page, Panel Tint group, Field White input, and the kraft band holding a warm white window. Shadows appear only on elements that float above the page, and are always tinted rather than grey.

### Shadow Vocabulary
- **Docked Record lift** (`box-shadow: 0 8px 20px -6px rgb(61 56 50 / 0.35)`): only on the docked and floating Record buttons, tinted with its own periwinkle.
- **Popover lift** (`box-shadow: 0 8px 24px -8px rgb(61 56 50 / 0.3)`): the item suggestion popup and the row menu, tinted with Warm Ink.
- **Sheet backdrop** (Warm Ink at 35%): sits behind the Quick Record and Allocate sheets. Behind Quick Record it fades with the swipe.

### Named Rules
**The Flat At Rest Rule.** Panels, chips, inputs, buttons and the address window never cast a shadow. Only something floating over scrolled content (the docked bar, a popover) may lift, and only with a tinted shadow.

## Shapes

Corners are soft, and they get rounder as the container gets bigger. Fields are 10px, buttons, chips and segmented controls are 14px, panels, windows and toasts are 16px, and sheets are 24px (top corners only on phones). Dots, progress tracks, fills and status badges are fully round. The kraft band is square at the bottom and ends in the **flap**: a 10px-tall wave tile 24px wide, repeated with `background-repeat: round`, so the edge always holds a whole number of waves and both ends sit at the same depth at any width.

There are no borders. The only line is the 1px Divider between rows inside a panel, and the first row has none.

**The Whole Wave Rule.** The flap edge always uses whole waves (`round`), never a clipped tile, and only ever under kraft.

## Components

### Buttons
- **Shape:** gently rounded (14px), no border.
- **Primary:** Warm Ink with Address Window 15px/500 text. The large size (48px tall, 20px padding) is the one used for Save, Sign in and Start cycle. Hover mixes 40% Kraft Ink into the fill in OKLCH, and press moves it 1px down.
- **Primary buttons lead with an icon** (Phosphor fill, 20px, 24px on the phone Record bar), named by a `Tip` (`components/ui/tip.tsx`): the old text is the accessible name and a Warm Ink tooltip on hover or keyboard focus. Record is a plus-circle, Save and Save changes a check-circle, Apply filters a funnel, Allocate crossing arrows, Add item a list-plus, Add to wishlist a plus-circle, Close it a lock, Start cycle a play, Sign in a sign-in arrow, Try again a circular arrow. A button wide enough for its name shows icon and text with no tooltip: the phone Record bar, the Quick Record footer (Save, Add to plan, Save changes, Start cycle and save), Allocate in its dialog, the Borrows and Wishlist forms, Sign in, and Apply filters on phones. Square ones are icon-only with the tooltip: 44px (48px for Close it and Start cycle), plus the docked and floating Record. Secondary and quiet buttons keep their text.
- **Secondary:** Kraft with Warm Ink text (9:1), 12% Kraft Ink mixed in on hover: the envelope paper beside the ink of the primary. Used for "Save & add another", "Send link", Move, Close cycle, Adjust, Add, Mark settled, Buy, and the toast action. It pairs with Primary as "Save & add another" and "Send link".
- **Quiet:** transparent with Muted Ink or Kraft Ink text, 44px tall. Hover fills it with Hover Tint (or Kraft Ink at 10% on kraft). Used for Sign out and Close in Allocate. Quick Record closes with a 44px quiet icon button: a 20px Kraft Ink X in Phosphor regular weight (close buttons are the one exception to fill, since a filled X draws as a square) with a "Close" tooltip, turning Warm Ink over Kraft Ink at 10% on hover.
- **Destructive:** Pastel Red fill with Deep Red text.
- **Focus:** a 2px Ink Periwinkle outline at 2px offset on every focusable element.

### Navigation
- **Section tabs:** all ten sections (Overview, Transactions, Plan, Budgets, Reconcile, Analytics, Cycles, Borrows, Wishlist, Settings) as 44px text tabs at the top of the band, 10px padding, Kraft Ink text with no fill. There is no wordmark in the band.
- **Hover:** the text turns Warm Ink. No fill.
- **Current:** Warm Ink text at 500 over a 2px fully round Warm Ink rule, inset to the label width and 6px above the tab's bottom, marked with `aria-current="page"`.
- **Phones:** 14px, bleeding to the band edges and scrolling sideways with no scrollbar. The current tab is scrolled into view.
- **Desktop:** 15px, 2px apart, all on one row.
- **Switching screens:** the screen crossfades over 200ms, and the band, its flap, the address window and the content below (`main`) resize and move as boxes over 300ms on `cubic-bezier(0.22, 1, 0.36, 1)`, with their snapshots clipped rather than stretched. The current tab's rule slides to the new tab on the same curve. All of it uses React `<ViewTransition>` (plus a CSS `view-transition-name` on `main`). The same happens when the loading skeleton gives way to the screen. Same-screen refreshes don't animate, and reduced motion turns it all off.
- **Loading:** the skeleton sits inside the real band with the tabs, and its window is built from placeholder lines at the real type sizes, so it is as tall as a loaded one.

### Cycle Stepper
A line in the band under the page title: the cycle name at 500 and " · status" in Kraft Ink, 13px, starting on the gutter, followed by the previous and next 44px caret links (Phosphor fill caret). The carets pull in with negative margins, so the line is only as tall as its text and sits 8px above the window, as on Overview. Overview shows the same line, without carets, above its window. The links are quiet controls on kraft, Kraft Ink turning Warm Ink over a 10% Kraft Ink fill. A missing older cycle keeps its space so the next caret does not shift.

### Record Bar
This is the signature action. On phones it is full width, 60px tall, Warm Ink with a 24px filled plus-circle and a 19px/600 warm-white "Record" label. When it scrolls out of view a 56px square twin docks bottom-centre. The twin slides up 16px and fades in over 300ms on `cubic-bezier(0.22, 1, 0.36, 1)`. Every app screen places the in-flow bar right under the flap on phones. On desktop a 56px square Record button with a "Record" tooltip floats bottom-right (32px in) on every screen except `/record`, with the docked lift shadow.

### Chips and Segmented Control
- **Fund chips:** 44px, Panel Tint, Muted Ink at rest, in a row that scrolls sideways and bleeds to the gutter on phones, and wraps inside the dialog on desktop. When checked they turn Pastel Periwinkle with ink text at 500.
- **Type tabs:** a four-up segmented control. The track is Panel Tint with 4px padding at 14px radius, and the chosen segment is the sliding Kraft pill at 10px radius (see Sliding Selection).
- **Amount shortcuts (rb, jt):** 44px Kraft at 50% with Kraft Ink text, turning full Kraft on hover.

### Panels and Lists
- **Corner Style:** 16px.
- **Background:** Panel Tint, with rows separated by 1px Divider.
- **Shadow Strategy:** none (see Elevation).
- **Internal Padding:** 12px by 16px per row, 16px for single-block panels and empty states.
- **Rows:** a 15px name over 12px Muted Ink metadata, with a tabular figure right-aligned. A Budget or record row leads with a 10px hue dot. Budget rows add a 8px rounded progress bar on Track, filled with the Budget hue, or Pastel Red when over budget.
- **Desktop tables:** Transactions, Plan and Budgets render as a table inside a Panel Tint panel at 16px. The header row is 13px/500 Muted Ink, rows are divided by the 1px Divider, figures are right-aligned in `.figure`, and zero values drop to Muted Ink. An empty Budget collapses to one row reading "Empty". On phones the whole row opens Allocate, so it reads "Empty · Allocate" while the cycle is open. On phones the same data is list rows with the Recent row anatomy.
- **Recent rows:** tap to edit. Swipe left past 72px to reveal a Pastel Periwinkle "Record again" strip, or use the 44px Quiet Control repeat icon.

### Row Menu
A 44px Quiet Control "⋯" (Phosphor DotsThree, fill) at the end of a row, turning Warm Ink on Hover Tint when hovered or open. It opens a popover menu: Panel Tint, 16px radius, 4px padding, popover lift shadow, with 44px items at 10px radius. The highlighted item turns Field White and Delete is set in Deep Red. Rows that can't change keep the empty 44px slot.

### Status Badge
A small fully round pill on the Cycles list, 12px text with 10px side padding. Open and current cycles are Pastel Periwinkle with Warm Ink text. Closed cycles sit on Track with Muted Ink.

### Filters
A Panel Tint panel at 12px padding. The first row holds search (with a Phosphor magnifier in Quiet Control), the cycle and type selects and a primary Apply. Below it a native "More filters" disclosure (`.disclosure`) reveals the rest as labelled fields. It grows open and fades in over 300ms on `cubic-bezier(0.22, 1, 0.36, 1)` while its fill caret turns over, and it opens instantly under reduced motion or where `::details-content` is unsupported. A quiet "Clear all" sits in the disclosure row when any filter is set.

### Quick-Entry Row
Desktop only, above the Transactions table. A Panel Tint strip at 8px padding holding 44px Field White cells in one row: the compact item combobox, type, from Fund, to Fund and a right-aligned amount, then a quiet More and a primary Save.

### Confirmation
An irreversible step (closing a cycle) is never one tap. The secondary button reveals an inline Pastel Periwinkle panel at 45%, 16px radius, that restates the consequence, with a primary confirm and a quiet cancel.

### Address Window
A warm white 16px-radius window inside the kraft band. It holds a 13px/500 Kraft Ink label, the key figure in Headline or Display type, and supporting 13px pairs underneath. Quick Record's window holds the amount input itself. That input is transparent with no focus box, so the window is the field. Settings does the same with the default pay day, sized to its digits and followed by the ordinal ("25th day of the month"). The other M5 screens frame one figure each: the counted-minus-recorded difference on Reconcile, spending this cycle on Analytics, what others owe you on Borrows, and the wishlist total.

### Inputs and Fields
- **Style:** Field White fill, no border, 10px radius, 44px tall (56px for the item field), 16px text.
- **Focus:** a soft 2px Pastel Periwinkle ring drawn with box-shadow just outside the field (`0 0 0 2px`), no outline. It stays quiet because the caret already marks a typing field; buttons and chips keep the Ink Periwinkle outline.
- **Error:** a 2px Deep Red ring with a 14px Deep Red message below.
- **Labels:** 13px/500 Muted Ink, 8px above the field.

### Switch Row
An on/off setting as a 44px row: the label in 15px Warm Ink on the left, a 48×28px switch on the right, and the whole row clickable. Off is a Track groove with a white thumb. On slides the thumb right over 300ms on `cubic-bezier(0.22, 1, 0.36, 1)`, fills the groove Kraft, the secondary colour. The thumb stays white on and off. Used for a Fund's "Count as usable". Archiving goes in the row menu instead.

### Sliding Selection
Every segmented control (the Record type tabs, Needs or Wants, Borrows "Money out" / "Money in") marks the chosen segment with one Kraft pill (`SlidingPill` in `components/shell/action.tsx`) that slides between segments over 300ms on `cubic-bezier(0.22, 1, 0.36, 1)`, while labels fade between Muted Ink and Warm Ink at 500. With nothing chosen (Needs or Wants left to the default) the pill hides. Reduced motion jumps it.
### Difference Badge
On Reconcile, a fully round 12px pill after the latest count: "Matches" on Pastel Periwinkle, or the unsigned amount with "short" or "more" on Pastel Red at 50% in Deep Red. A secondary Adjust button sits beside a non-zero badge.

### Inline Forms
Adding a borrow or a wish is an inline Panel Tint form, not a dialog: labelled 44px fields on a 2-column grid, a full-width primary button, and rarely used fields behind a "More details" disclosure. Settings edits in place: names are transparent fields that fill Field White on hover and focus and save on blur, selects and chips save on change, and caret buttons (Quiet Control) move a row up or down.

### Charts
Recharts on a Panel Tint panel. Bars are Pastel Periwinkle, 20px thick with 8px corners, each labelled with its amount in 13px/500 Warm Ink, so the label carries the value. The daily line is Chart Periwinkle at 2.5px with the previous cycle dashed in Quiet Control behind it, and stops at today. Axis text is 12px Muted Ink, the only grid lines are horizontal Dividers, and a custom HTML legend above the chart names each line by its stroke. The tooltip is a Panel Tint popover with the popover lift.

### Needs vs Wants Donut
A 112px ring with a 16px stroke on Track. Needs is Pastel Periwinkle, Wants is Wants Periwinkle and Unclassified is Unclassified Stone. A legend with amounts and percentages always sits beside it, so colour is never the only key.

### Toast and Sheet
- **Toast:** an inverted Warm Ink panel (16px radius, 56px minimum) with Cool Paper text and a Kraft action button. Toasts stack above the docked Record bar on phones and above the floating Record button on desktop.
- **Sheet:** Cool Paper with 24px corners. It slides on `cubic-bezier(0.32, 0.72, 0, 1)` over 400ms and follows the swipe.
- **Allocate:** a sibling of Quick Record. A kraft header holds the title, a Kraft Ink description and the amount in an address window, the flap follows, and the fields and a primary Allocate sit below. It slides up over 300ms on phones and scales in from 95% on desktop.

## Do's and Don'ts

### Do:
- **Do** start every top-level surface with the kraft band and its whole-wave flap, and put the surface's key figure in a white address window. App screens use the shared band with the section tabs.
- **Do** group content into Panel Tint panels at 16px with 1px Divider rows.
- **Do** give every primary action Warm Ink with warm-white text, every secondary action Kraft with ink text, and every selected state Pastel Periwinkle with ink text.
- **Do** keep each Budget's hue fixed and show it as a dot or bar wherever the Budget appears. Unallocated is kraft.
- **Do** set money in `.figure` (500, tabular, no-wrap) and negatives in Deep Red.
- **Do** keep touch targets at 44px or more and keep Record in thumb reach.
- **Do** say Fund, Budget and Record in the UI.

### Don't:
- **Don't** use weights of 700 or more, or pure black text.
- **Don't** put coloured text on a pastel fill, or use a pastel as text.
- **Don't** add borders or outlines to panels, inputs, chips or buttons, or give a resting surface a shadow.
- **Don't** use kraft for work areas, cards or decoration away from the envelope band.
- **Don't** make the floating Record a pill FAB. It keeps the 14px button corner and only docks after the in-flow bar scrolls away.
- **Don't** bring back white cards on grey with a hero balance, spreadsheet-grey tables, or the wall-calendar world.
- **Don't** use Quiet Control or Amount Placeholder for body-size text.
