# 04 — Design System Direction

Visual layer underneath the IA + UX. Direction, not a finished system.

## 1. Visual References

Linear's typography + Stripe's restraint + Apple Settings' mobile rhythm + Vercel's edge palette.

## 2. Typography

- **Sans (primary):** Inter Variable
- **Mono (selective):** JetBrains Mono Variable
- No display font. No serif. No decorative.

Type scale (dp): xs 11, sm 13, base 15, lg 17, xl 22, 2xl 28, 3xl 36. No 4xl+.
Weights: 400 body, 500 emphasized, 600 titles. No 700+ for normal use.
All numbers in tables use tabular numerals.

## 3. Color System

Dark mode default. Light mode optional later.

### Surface tokens
```
--canvas:    hsl(220, 14%, 8%)     Page background
--surface:   hsl(220, 12%, 11%)    Cards, sections
--elevated:  hsl(220, 10%, 15%)    Sheets, menus, focus states
```

### Foreground tokens
```
--fg-primary:   hsl(220, 10%, 90%)   Primary text
--fg-secondary: hsl(220, 8%, 72%)    Important secondary
--fg-muted:     hsl(220, 6%, 52%)    Labels, timestamps
--fg-disabled:  hsl(220, 5%, 35%)    Placeholders, disabled
```

### Border tokens
```
--border-subtle:  hsl(220, 10%, 18%)
--border-strong:  hsl(220, 10%, 25%)
--border-focus:   hsl(212, 60%, 56%)
```

### Accent: hsl(212, 60%, 56%) — cool blue, not purple, not teal
### Severity palette (all desaturated)
```
--severity-critical: hsl(0, 50%, 56%)
--severity-error:    hsl(12, 55%, 52%)
--severity-warn:     hsl(38, 70%, 55%)
--severity-info:     hsl(212, 50%, 55%)
--severity-success:  hsl(145, 45%, 48%)
```

## 4. Spacing

4dp base grid. Spacing units: {4, 8, 12, 16, 24, 32, 48}. Row height: minimum 56dp.

## 5. Borders and Radius

- `rounded-md` (6dp) default
- `rounded-lg` (8dp) for cards/sections
- No `rounded-full` on rectangular containers
- 1px borders everywhere

## 6. Components

Built on shadcn/ui primitives. No component library used wholesale.
Key components: MetricCard, StatusPill, SeverityBadge, Section, BottomSheet, FilterBar, EmptyState.

## 7. Data Attributes

`data-numeric` on all number cells for tabular-nums.

## 8. Dark Mode Implementation

CSS custom properties only. No Tailwind dark: prefix. Theme applied at `:root`.
