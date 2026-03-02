# MapPoster

A web application for generating beautiful, minimalist map posters for any city in the world. Built with Next.js, React, and TypeScript.

## Features

- **City Search** - Enter any city and country to generate a map poster
- **17 Themes** - Choose from a variety of visual styles
- **Live Preview** - See a real-time preview before generating
- **Customizable** - Adjust poster size, fonts, letter spacing, road thickness, and map coverage
- **Multilingual** - Supports non-Latin scripts (Arabic, Japanese, Korean, Chinese, Thai, etc.) with Google Fonts
- **Multiple Export Formats** - Download as PNG, SVG, or PDF
- **Preset Sizes** - A4, A3, 12x16, 18x24, 24x36, and custom dimensions

## Tech Stack

- **Next.js 15** with App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **jsPDF** for PDF export
- **OpenStreetMap** data via Overpass API
- **Nominatim** for geocoding

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## How It Works

1. **Geocoding** - City/country names are converted to coordinates using the Nominatim API
2. **Data Fetching** - Roads, water bodies, and parks are fetched from the Overpass API (OpenStreetMap)
3. **Rendering** - A canvas renders the map layers: background, water, parks, roads, gradient overlays, and typography
4. **Export** - The final poster is exported at 300 DPI in PNG, SVG, or PDF format

## Themes

| Theme | Description |
|-------|-------------|
| `terracotta` | Mediterranean warmth with clay tones |
| `noir` | Pure black with white roads |
| `midnight_blue` | Navy background with gold roads |
| `blueprint` | Architectural blueprint aesthetic |
| `neon_cyberpunk` | Dark with electric pink and cyan |
| `warm_beige` | Vintage sepia tones |
| `pastel_dream` | Soft muted pastels |
| `japanese_ink` | Minimalist ink wash style |
| `emerald` | Lush dark green with mint accents |
| `forest` | Deep greens and sage |
| `ocean` | Blues and teals for coastal cities |
| `sunset` | Warm oranges and pinks |
| `autumn` | Burnt oranges and reds |
| `copper_patina` | Oxidized copper with teal-green |
| `monochrome_blue` | Single blue color family |
| `gradient_roads` | Smooth gradient shading |
| `contrast_zones` | High contrast urban density |

## Customization Options

- **Map Coverage** - 1 to 50 km radius
- **Poster Size** - Presets (A4, A3, etc.) or custom dimensions (4-36 inches)
- **Font** - 10 built-in presets + any Google Font
- **Font Size Scale** - 50% to 200%
- **Letter Spacing** - 0% to 300%
- **Road Thickness** - 30% to 300%
- **Display Overrides** - Custom city/country text for non-Latin scripts
- **Export Format** - PNG, SVG, or PDF

## Project Structure

```
app/
├── page.tsx                # Home page
├── layout.tsx              # Root layout
├── globals.css             # Global styles
└── api/geocode/route.ts    # Geocoding API endpoint

components/
├── poster-app.tsx          # Main app component
├── control-panel.tsx       # Left sidebar controls
├── preview-panel.tsx       # Live preview panel
├── theme-selector.tsx      # Theme picker grid
├── advanced-options.tsx    # Customization options
└── progress-bar.tsx        # Generation progress

lib/
├── types.ts                # TypeScript interfaces
├── themes.ts               # Theme definitions
├── overpass.ts             # Overpass API queries
├── osm-parser.ts           # OSM data parsing
├── poster-renderer.ts      # Canvas rendering engine
├── export-utils.ts         # PNG/SVG/PDF export
└── projection.ts           # Map projection math
```

## License

This project uses data from [OpenStreetMap](https://www.openstreetmap.org/) contributors.
