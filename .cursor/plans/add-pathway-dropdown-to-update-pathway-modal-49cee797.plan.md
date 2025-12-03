<!-- 49cee797-660c-49af-8e22-25e7e7cf03db 9d9b5774-75c6-473d-8626-d266bf5d1cdf -->
# Fix Dark Theme Issues in Flowchart Canvas

## Overview

The flowchart canvas has two dark theme bugs:

1. Canvas background is hardcoded to dark (`bg-gray-50` on ReactFlow component) and doesn't change with theme
2. Edge labels (text like "next") use hardcoded light colors (`bg-white`, `border-gray-300`) and aren't visible in dark mode

## Issues Identified

### Issue 1: Canvas Background

- **File**: `components/flowchart-builder/flowchart-canvas.tsx`
- **Line 425**: `className="bg-gray-50"` - hardcoded light gray
- **Line 429**: `<Background variant="dots" gap={12} size={1} />` - needs theme-aware colors
- **Line 394**: Loading overlay has hardcoded `bg-white`

### Issue 2: Edge Labels

- **File**: `components/flowchart-builder/edges/custom-edge.tsx`
- **Line 54**: Hardcoded classes `bg-white border border-gray-300` with no dark mode support
- Text color not specified (inherits, but background makes it invisible)

## Implementation Plan

### Step 1: Add Theme Detection to Flowchart Canvas

- Import `useTheme` hook from `next-themes`
- Use theme state to conditionally style components
- Update ReactFlow className to use theme-aware background

### Step 2: Make Canvas Background Theme-Aware

- Replace hardcoded `bg-gray-50` with theme-aware classes using Tailwind dark mode
- Use `bg-background` or conditional classes based on theme
- Update Background component colors to be theme-aware (ReactFlow Background supports `color` prop)

### Step 3: Fix Edge Label Styling

- Replace hardcoded `bg-white border border-gray-300` with theme-aware Tailwind classes
- Use `bg-card border-border` or similar theme-aware classes
- Add proper text color classes that work in both themes
- Use dark mode variants like `dark:bg-card dark:border-border dark:text-foreground`

### Step 4: Fix Loading Overlay

- Replace hardcoded `bg-white` with theme-aware background
- Update text colors to be theme-aware

## Files to Modify

1. **`components/flowchart-builder/flowchart-canvas.tsx`**

- Add `useTheme` hook
- Update ReactFlow className
- Update Background component props
- Fix loading overlay styling

2. **`components/flowchart-builder/edges/custom-edge.tsx`**

- Replace hardcoded classes with theme-aware Tailwind classes
- Add proper text color classes

## Implementation Details

### Theme-Aware Classes

- Background: `bg-background` (uses CSS variable)
- Card backgrounds: `bg-card`
- Borders: `border-border`
- Text: `text-foreground`
- Dark mode variants: Use Tailwind's `dark:` prefix

### Background Component

- ReactFlow's Background component accepts a `color` prop for dots/lines
- Need to provide different colors for light/dark themes
- Light mode: lighter gray for dots
- Dark mode: darker gray for dots

### To-dos

- [ ] Add pathway fetching logic with useEffect hook and state management in Update Pathway Modal
- [ ] Import Select UI components and define Pathway interface matching API response
- [ ] Replace manual pathway_id input field with dropdown Select component
- [ ] Implement pathway selection handler to auto-set pathway_id and optionally name/description
- [ ] Add loading state and error handling for pathway fetching