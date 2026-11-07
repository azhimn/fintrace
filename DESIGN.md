---
name: fintrace
description: Personal envelope budgeting whose one flourish is today's date, set like an Indonesian wall calendar.
colors:
  primary: "oklch(0.38 0.09 152)"
  primary-foreground: "oklch(0.99 0.003 150)"
  destructive: "oklch(0.52 0.2 27)"
  friday: "#15803d"
  background: "oklch(0.992 0.003 150)"
  foreground: "oklch(0.2 0.02 160)"
  muted: "oklch(0.96 0.01 150)"
  muted-foreground: "oklch(0.43 0.02 160)"
  border: "oklch(0.86 0.015 150)"
  input: "oklch(0.6 0.02 155)"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "6rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  display-page:
    fontFamily: "Archivo, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  numeral-grid:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  figure:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  wordmark:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
  label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1
  caption:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
rounded:
  sm: "2.4px"
  lg: "4px"
spacing:
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "oklch(0.38 0.09 152 / 0.8)"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.muted}"
  button-band:
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "44px"
  button-band-hover:
    backgroundColor: "oklch(0.99 0.003 150 / 0.15)"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "44px"
  app-band:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    height: "56px"
  month-cell-today:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.numeral-grid}"
    padding: "12px"
  month-cell-blank:
    backgroundColor: "{colors.muted}"
---

# Design System: fintrace

## Overview

**Creative North Star: "The Kalender Dinding"**

fintrace looks like the printed wall calendar that hangs in an Indonesian kitchen: near-white paper, ink, a deep green band across the top, and a date figure heavy enough to read from across the room. Today's date is the single flourish the system allows itself. Every other surface is a plain, ruled record of what is true now, kept quiet so that the figures carry the screen.

Density is that of a ledger page. Hairline rules organize the data, one family sets all the type, and the only saturated fields of color are the band, the primary action and today's cell. The system is light only, because the work happens on a phone in daylight, often outdoors.

The confirmed visual rejection is the fintech default of a dark gradient card with a hero balance. Money appears as a figure in a ruled row, and the largest number on any screen is the date.

**Key Characteristics:**
- Near-white, faintly green paper with ink text and hairline rules
- A deep green band along the top edge of the sign-in and app screens
- Archivo throughout, with its condensed extra-bold cut reserved for figures and the wordmark
- Calendar weekday tones: red Sundays, green Fridays, ink otherwise
- Flat, square-celled surfaces with 4px corners on controls only

## Colors

A tinted-paper neutral set carries two greens and one red, each with a narrow assigned job.

### Primary
- **Calendar Deep Green** (`primary`, #104f29 rendered): The band across the top of the sign-in and app screens, primary actions, today's cell in the month grid, focus rings, text selection, the text caret and the browser theme color.
- **Band Paper** (`primary-foreground`, #fafcfb rendered): Everything set on deep green, at 9.4:1.

### Secondary
- **Sunday Red** (`destructive`, #c2181d rendered): Sundays in the calendar, negative money and errors, at 6:1 on paper and 5.5:1 on the tinted pane. Error messages, invalid field borders and their rings all use it.

### Tertiary
- **Friday Green** (`friday`, #15803d): The Friday tone on the day numeral, the Friday column head and Friday cells in the month grid, at 4.9:1 on paper.

### Neutral
- **Calendar Paper** (`background`, #fbfdfb rendered): The page, and the fill of inputs and outline buttons wherever they sit on a tint.
- **Ink** (`foreground`, #0e1913 rendered): Text, ordinary weekdays and the 1px rule that opens a block of data.
- **Tinted Pane** (`muted`, #edf4ee rendered): The sign-in pane on large screens, blank cells in the month grid, loading placeholders and hover on outline buttons.
- **Soft Ink** (`muted-foreground`, #47534c rendered): Secondary text such as column heads, the month and year, and empty-state messages, at 7.9:1 on paper.
- **Hairline** (`border`, #cad4cc rendered): Decorative rules and grid lines between rows and cells, at 1.5:1.
- **Field Edge** (`input`, #77847b rendered): The outline of text inputs and the scrollbar thumb, at 3.8:1 on paper and 3.5:1 on the tinted pane.

### Named Rules
**The Calendar Red Rule.** Red belongs to Sundays, negative money and errors, and to no other meaning. M1 renders no negative amount because no balances exist yet; when one ships it takes this red.

**The Friday Green Rule.** The brighter green (#15803d) is the Friday tone and has no other job. The band, primary actions, today's cell, focus and selection use deep green.

**The Minus Sign Rule.** State stays readable without color. Negative money keeps its minus sign, weekday tones sit in labelled columns, and errors are stated in words.

**The Unmarked Holiday Rule.** National holidays are left unmarked because no holiday data exists. They take no red until real data backs them.

## Typography

**Display Font:** Archivo variable with the width axis (with sans-serif)
**Body Font:** Archivo (with sans-serif)

**Character:** One grotesque family does all the work, and the width axis supplies the contrast. Extra-bold at 75% width gives the blunt figure of a wall calendar, while the normal width stays plain and legible for reading.

### Hierarchy
- **Display** (800, 75% width, 96px, line height 1, -0.02em): Today's date on the sign-in screen.
- **Display Page** (800, 75% width, 72px, line height 1, -0.02em): Today's date at the right of a page head.
- **Numeral Grid** (800, 75% width, 30px, line height 1.2, -0.02em): Day numbers in the month grid.
- **Figure** (800, 75% width, 16px, line height 1.5, -0.02em): Money in table rows, right aligned and never wrapped.
- **Wordmark** (800, 75% width, 18px, 0.01em): The lowercase fintrace name in the band.
- **Headline** (600, 24px, line height 1.333): The page title.
- **Title** (600, 18px, line height 1.556): Section headings, and the weekday beside the large numeral.
- **Body** (400, 16px, line height 1.5): Messages and empty states, capped at the prose measure of 65ch.
- **Body Small** (400, 14px, line height 1.429): Table and list content, the band's account email, and error messages. Row labels and the current nav item step up to 600.
- **Label** (500, 14px, line height 1): Form field labels.
- **Caption** (400, 12px, line height 1.333): Notes under list items, in Soft Ink. The month grid's weekday letters use this size at 600.

### Named Rules
**The Condensed Figure Rule.** The condensed extra-bold cut sets figures and the wordmark. Headings, labels and running text stay at normal width.

**The Tabular Rule.** Tabular figures are on for the whole page, so amounts align by digit in any column.

## Layout

The shell is a 56px band over a single content column, 1024px at most and centered, with 24px side padding and 32px vertical padding. Sections stack 40px apart, a heading sits 12px above its content, and form fields sit 16px apart with 8px between label and input. Spacing moves through the steps in the frontmatter, and the rhythm stays compact.

Lines arrange the data. A block of data opens with a 1px ink rule, and hairlines separate the rows beneath it. The envelope list flows through two columns, then three from 640px and four from 1024px. Tables drop their least important column below 640px, and the band drops the account email at the same width.

The sign-in screen is the one split layout. From 1024px it sets a flexible calendar column against a fixed 30rem tinted pane divided by a hairline, with 48px padding on both. Below that it becomes one column on paper, with the numeral above the form and the month grid omitted. The sign-in band aligns to the screen edge with 24px padding, widening to 48px, so that the wordmark lines up with the calendar below it.

### Named Rules
**The Ruled Ledger Rule.** Ink opens a block of data and hairlines divide it, at 1px each. Rows and cells get their structure from these lines, with no boxes or shadows around them.

## Elevation & Depth

The system is flat and has no shadow vocabulary. Depth comes only from tonal layering: paper for the page, Tinted Pane for a recessed area or an empty grid cell, and deep green for the band and today's cell. Controls keep to one plane, and the sole physical response is a 1px downward press on buttons.

### Named Rules
**The Flat Paper Rule.** Every surface lies flat on the sheet, at rest and in every state. Focus and hover change color or draw a ring, and nothing lifts.

## Shapes

Corners are nearly square, in keeping with a printed sheet. Buttons and inputs take a small 4px radius, and focus outlines on band links follow a tighter 2.4px. Structural surfaces such as the band, panes, grid cells, table rows and loading placeholders have no radius at all. Lines are always 1px and solid.

### Named Rules
**The Square Cell Rule.** Anything that belongs to the sheet stays square-cornered, and the 4px corner marks a control a person can operate.

## Components

### Buttons
Plain, firm and sized for a thumb.
- **Shape:** Slightly softened rectangle (4px), 44px tall in every shipped use, with a 1px transparent or colored border.
- **Primary:** Deep green with Band Paper text at weight 500. In a form it spans the full width at 16px with 10px side padding. Standing alone on the error page, it takes its content width at 14px with 16px side padding.
- **Hover / Focus:** Primary lightens to 80% opacity on hover, which keeps 5.6:1 text contrast. Focus sets a deep green border with a 3px ring at 50%. Buttons press down by 1px when active and drop to 50% opacity when disabled. Color and transform transitions run at the framework's default 150ms.
- **Outline:** Calendar Paper with a hairline border and ink text at 14px and weight 500, filling with Tinted Pane on hover. It serves the secondary action beside a field.
- **Band:** Transparent with Band Paper text and 12px side padding, used for Sign out in the band. Hover adds a 15% Band Paper wash, and focus uses a 70% Band Paper ring.

### Inputs / Fields
- **Style:** 1px Field Edge outline, 4px radius, 44px tall, filled with Calendar Paper so it stands out on the tinted pane. Text is 16px on small screens, which prevents phone zoom on focus, and 14px from 768px up.
- **Focus:** The border turns deep green with a 3px deep green ring at 50%.
- **Error / Disabled:** Invalid fields take a red border with a 3px red ring at 20%, and a red 14px message below them that the field references. Disabled fields drop to 50% opacity on a faint Field Edge tint.

### Navigation
- **Style:** The band holds the wordmark, the nav links and, at its right edge, the account email and Sign out. Links are 14px at 600 on deep green, with 44px tall targets.
- **States:** The current page carries an underline offset by 8px. Focus draws a 2px Band Paper outline offset by 2px, because the deep green ring would vanish on the band.
- **Mobile:** The band keeps its 56px height and its links, and hides the email below 640px.

### Day Numeral
The signature of the system: today's date as one heavy condensed figure, in its weekday tone, with the weekday in 600 and the month and year in Soft Ink stacked and bottom-aligned at its right. It runs at 96px with an 18px caption on the sign-in screen, and at 72px with a 14px caption at the right of a page head.

### Month Grid
A hairline wall calendar sheet with Sunday-first columns, single-letter weekday heads and heavy condensed day numbers top-left in each cell. Rows stretch to fill the available height. Sundays and Fridays carry their tones through heads and days, today's cell fills with deep green and Band Paper, and blank cells outside the month take Tinted Pane. Screen readers receive the grid as one image with a label that names the month and today.

### Ledger Table
Full width at 14px, with Soft Ink column heads at weight 500 over a 1px ink rule and hairlines between rows. Row names are 600, secondary columns are Soft Ink, amounts use the Figure style right aligned, and rows have 12px vertical padding.

### Ruled List
A multi-column list with a 1px ink rule on top and hairlines under each item, using 14px text and 12px vertical padding. An item may add a caption line beneath its name.

### Status and Empty States
Empty states are one Soft Ink sentence that says what happens next or what to do, placed where the content will appear. Loading uses square Tinted Pane blocks with a soft pulse.

## Do's and Don'ts

### Do:
- **Do** keep red for Sundays, negative money and errors, and keep the minus sign on every negative amount.
- **Do** use deep green for the band, primary actions, today's cell, focus and selection.
- **Do** set money and dates in the condensed extra-bold figure style, with tabular figures on.
- **Do** make every control at least 44px tall, including links in the band.
- **Do** open a block of data with a 1px ink rule and divide its rows with hairlines.
- **Do** keep field outlines in Field Edge, at 3:1 or better, and leave Hairline to decorative rules.
- **Do** give every empty state a sentence in Soft Ink saying what comes next.

### Don't:
- **Don't** use the Friday green (#15803d) for anything other than the Friday tone.
- **Don't** mark national holidays in red until real holiday data exists.
- **Don't** put a hero balance on a dark gradient card.
- **Don't** add shadows or gradients to any surface.
- **Don't** set headings, labels or running text in the condensed cut.
- **Don't** round grid cells, panes, rows or the band.
- **Don't** let color carry a state by itself.
