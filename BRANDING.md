# OpenWorldEye — brand usage

## Names

| Use | Form | Example |
| --- | --- | --- |
| **Default wordmark** | One word, camelCase | `OpenWorldEye` |
| **Package / repo / code** | Same, no spaces | `openworldeye`, `@openworldeye/…` if you namespace |
| **Hero / masthead / chrome** | Three words, uppercase, tracked | `OPEN WORLD EYE` |
| **Sentence case UI** | Three words | `Open World Eye` |

Do not use `WorldView` for *this* product—that name refers to external references (Bilawal Sidhu’s project, NASA Worldview, community repos) in research docs only.

## Tagline

Primary: **OSINT globe** · secondary: *global situational awareness* (optional subline).

Browser title pattern: `OpenWorldEye · OSINT globe` (compact; middle dot separates name from descriptor).

## CSS (see `index.css`)

- `.brand-wordmark-compact` — display font, tight tracking (nav, footers, small caps areas).
- `.brand-wordmark-spaced` — uppercase `OPEN WORLD EYE`–style tracking for hero titles.

Example hero markup:

```html
<h1 class="font-display brand-wordmark-spaced" translate="no">OPEN WORLD EYE</h1>
<p class="font-mono text-xs opacity-70">OpenWorldEye · OSINT globe</p>
```

Use `translate="no"` on the spaced lockup if machine translation should leave the brand alone.

## Voice

Technical, calm, command-deck tone (per `ideas.md`). Brand is **open** (public data, inspectable stack) + **world** + **eye** (oversight / awareness)—not “surveillance product” hype.
