# Friendbase

Friendbase is a modular Discord bot built around a premium Starry/Jarvis-inspired experience. It includes server configuration, automod controls, music playback, and mobile-friendly hosting support.

## Features
- Server settings and automation controls
- Per-guild automod toggles for caps, links, invites, phishing, spam, and mass mentions
- Music playback with Spotify-first search and filter presets
- Premium-themed embeds and UI flows
- Termux-ready startup script for Android host environments

## Local setup
1. Install dependencies:
   npm install
2. Create a `.env` file with your Discord token and config values.
3. Start the bot:
   npm start

## Termux / Android hosting
Use the included script to launch the bot in the background with PM2:

```bash
chmod +x termux-start.sh
./termux-start.sh
```

This is best for testing and lightweight personal hosting. For always-on production use, a VPS or dedicated host is still more reliable.
