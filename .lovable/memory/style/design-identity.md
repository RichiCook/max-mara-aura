---
name: Design Identity
description: Casadei/Louboutin luxury brand aesthetic with Cormorant Garamond + Inter fonts, Warm Naturals palette
type: design
---
The application follows a mobile-first, luxury brand aesthetic.

**Typography:**
- Headings (h1-h3): Cormorant Garamond, serif at weight 500-600
- Body / UI text: Inter, -apple-system, system-ui, sans-serif at weight 400 (body), 500 (labels), 600 (buttons)
- Monospace (blockchain IDs, SKUs): JetBrains Mono, SF Mono, monospace at weight 400
- Previous fonts (Playfair Display, DM Sans) have been fully removed

**Color Palette:**
- Warm Naturals with earthy brown #8b7355 and soft cream #f0ece7
- Admin theme settings page at /settings/theme with 4 presets: Louboutin Classic, Aura Blockchain, Noir Minimal, Crème & Gold
- Theme stored in app_settings table as 'theme_palette'
