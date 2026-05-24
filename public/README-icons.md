# PWA Icons

Place these two files here before the PWA install prompt will appear in Chrome:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192×192px | Standard Android home screen icon |
| `icon-512.png` | 512×512px | Splash screen + maskable |

## Design spec
- Background: `#0e1014` (matches `--canvas` design token)
- Logo: Pranix wordmark or `P` monogram, centered
- Format: PNG with transparency OR solid dark background
- The 512px version doubles as the maskable icon — keep content
  within the central 80% safe zone (leave 10% padding on all sides)

## Quick generation
Use any of these to generate from the logo.png in repo root:
- https://www.pwabuilder.com/imageGenerator (upload logo.png)
- https://favicon.io/favicon-converter/
- Figma → export at 192×192 and 512×512

Once added, Chrome on Android will show the "Add to Home Screen" prompt
automatically after 2+ visits. The manifest is already live at
/manifest.webmanifest — icons are the only remaining requirement.
