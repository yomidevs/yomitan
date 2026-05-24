# Theming

## Overview

Yomitan supports multiple visual themes ("modes") that change the appearance of popups and the search page. Themes are additive CSS overrides — the base "Classic" theme is always present, and other themes layer on top by overriding CSS variables and adding rules.

The active theme is controlled by the `data-theme-mode` attribute on the `<html>` element (set by JavaScript based on user preference). Theme CSS files use attribute selectors like `:root[data-theme-mode='minimal']` to apply only when active.

## How it works

### Additive architecture

- Classic is the base theme ([`display.css`](../ext/css/display.css), [`material.css`](../ext/css/material.css), etc.)
- All other themes are CSS _overrides_ loaded on top
- Only the active theme's selectors match, so unused themes have zero visual effect
- CSS files are loaded statically via `<link>` tags in HTML (no dynamic injection)

### Activation mechanism

- [`theme-controller.js`](../ext/js/app/theme-controller.js) sets `data-theme-mode` on the root element
- CSS selectors like `:root[data-theme-mode='eink']` activate automatically
- No JavaScript logic needed per-theme

## Creating a theme

### Step 1: Create the CSS file

Create `ext/css/theme-<your-theme-id>.css`. Use this template:

```css
/*
 * Copyright (C) 2023-2026  Yomitan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/* ===== YOUR THEME NAME ===== */

/* Light mode overrides */
:root[data-theme-mode="your-theme-id"][data-theme="light"] {
  --text-color: #000000;
  --background-color: #ffffff;
  /* override other variables as needed */
}

/* Dark mode overrides */
:root[data-theme-mode="your-theme-id"][data-theme="dark"] {
  --text-color: #ffffff;
  --background-color: #000000;
  /* override other variables as needed */
}

/* Component overrides (works for both light and dark) */
:root[data-theme-mode="your-theme-id"] .tag {
  border-radius: 0;
}
```

### Step 2: Register the theme

Add your theme to [`ext/js/data/theme-registry.js`](../ext/js/data/theme-registry.js):

```js
export const themes = [
  {
    id: "classic",
    label: "Classic",
    css: null /* base CSS is classic; no override file needed */,
  },
  // ... existing themes ...
  {
    id: "your-theme-id",
    label: "Your Theme Name",
    css: "/css/theme-your-theme-id.css",
  },
];
```

### Step 3: Add CSS links to HTML

Add a `<link>` tag to each HTML file that displays popup content:

**[`ext/popup.html`](../ext/popup.html)** — inside `<head>`, with other theme links:

```html
<link rel="stylesheet" type="text/css" href="/css/theme-your-theme-id.css" />
```

**[`ext/search.html`](../ext/search.html)** — same location.

**[`ext/popup-preview.html`](../ext/popup-preview.html)** — same location.

### Step 4: Add to settings schema

Add your theme ID to the `popupThemeMode` enum in [`ext/data/schemas/options-schema.json`](../ext/data/schemas/options-schema.json):

```json
"popupThemeMode": {
    "type": "string",
    "enum": ["classic", "minimal", "eink", "your-theme-id"],
    "default": "classic"
}
```

### Step 5: Add TypeScript type

Add your theme ID to the union type in [`types/ext/settings.d.ts`](../types/ext/settings.d.ts):

```typescript
export type PopupThemeMode = "classic" | "minimal" | "eink" | "your-theme-id";
```

## CSS patterns

### Variable overrides

The easiest way to theme is overriding CSS custom properties. Key variables:

| Variable                                 | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| `--text-color`                           | Primary text                       |
| `--text-color-light1` through `--light4` | Muted text (progressively lighter) |
| `--background-color`                     | Main background                    |
| `--background-color-light`               | Lighter background variant         |
| `--background-color-dark1`               | Darker background variant          |
| `--accent-color`                         | Primary accent                     |
| `--link-color`                           | Link text                          |
| `--tag-*-background-color`               | Tag type backgrounds               |
| `--sidebar-background-color`             | Sidebar background                 |
| `--light-border-color`                   | Subtle borders                     |
| `--medium-border-color`                  | Standard borders                   |
| `--dark-border-color`                    | Strong borders                     |

### Component targeting

Target specific components with attribute-qualified selectors:

```css
/* All tags in your theme */
:root[data-theme-mode="your-theme-id"] .tag {
  border-radius: 4px;
}

/* Only in light mode */
:root[data-theme-mode="your-theme-id"][data-theme="light"] .entry {
  border-bottom: 1px solid #eeeeee;
}
```

### Outer chrome styling

Theme CSS files are loaded in **both** contexts:

1. **Inner** — via static `<link>` in `popup.html` / `search.html` / `popup-preview.html`
2. **Outer** — via dynamic injection by `popup.js` into the parent page's shadow DOM

This means a single theme file contains both inner selectors (`:root[data-theme-mode='...']`) and outer selectors (`iframe.yomitan-popup[data-theme-mode='...']`). Selectors that don't match their current context are harmless no-ops.

For popup iframe styling (borders, shadows, radius), add outer selectors at the **end** of your theme file:

```css
iframe.yomitan-popup[data-theme-mode="your-theme-id"] {
  --popup-border-radius: 8px;
  --popup-border-width: 1px;
  --popup-border-color: #cccccc;
  --popup-box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  --popup-background-color: #ffffff;
}
```

## Best practices

### Do

- Use CSS variables for colors — easy to override per mode
- Use `currentColor` for borders to inherit text color
- Target specific selectors (`.tag`, `.entry`) rather than universal `*`
- Test both light and dark modes
- Run `npm run test:css` to validate syntax

### Don't

- Use `!important` (stylelint will reject it)
- Use universal `*` selectors (performance issue)
- Modify HTML structure — themes are CSS-only
- Load fonts or external resources (extension CSP restrictions)

## Testing

After creating your theme:

1. **Lint**: `npm run test:css`
2. **Fast tests**: `npm run test:fast`
3. **Visual**: Reload the extension and switch modes in Settings → Appearance
4. **Search page**: Open the search page and verify styling there too

## Example: Minimal theme

The Minimal theme ([`ext/css/theme-minimal.css`](../ext/css/theme-minimal.css)) demonstrates:

- Light/dark palette overrides
- Tag restyling (rounded pills → subtle backgrounds)
- Dictionary label conversion (colored badges → text labels)
- Inflection chain simplification (icons hidden, compact layout)
- Frequency tag accent colors

## Files reference

| File                                                                              | Purpose                    |
| --------------------------------------------------------------------------------- | -------------------------- |
| [`ext/css/theme-*.css`](../ext/css/)                                              | Theme stylesheets          |
| [`ext/js/data/theme-registry.js`](../ext/js/data/theme-registry.js)               | Theme registry             |
| [`ext/data/schemas/options-schema.json`](../ext/data/schemas/options-schema.json) | Settings schema            |
| [`types/ext/settings.d.ts`](../types/ext/settings.d.ts)                           | TypeScript types           |
| [`ext/popup.html`](../ext/popup.html)                                             | Popup page HTML            |
| [`ext/search.html`](../ext/search.html)                                           | Search page HTML           |
| [`ext/popup-preview.html`](../ext/popup-preview.html)                             | Settings preview HTML      |
| [`ext/js/app/theme-controller.js`](../ext/js/app/theme-controller.js)             | Theme attribute controller |
| [`ext/js/app/popup.js`](../ext/js/app/popup.js)                                   | Outer theme injection      |
