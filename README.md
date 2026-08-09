# App-Icon

One-screen app icon maker: pick any free Iconify pack, style a 512×512 tile, download SVG + PNG — or describe what you want and let the AI assistant do it.

## Setup

```bash
npm install
cp .env.example .env.local
```

Add your [OpenRouter](https://openrouter.ai) API key to `.env.local`:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

## Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js App Router + Tailwind CSS
- Iconify search / SVG API for 200+ icon packs
- OpenRouter tool-calling for the AI Assistant (`searchIcons`, `setIcon`, `setBackground`, `setIconStyle`, `applyPreset`)
