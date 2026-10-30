# DashboardTile

A minimal, dashboard of tiles. Tiles split the screen like Hyprland's dwindle layout, sync across devices through Supabase, and everything is saved automatically.

**Live:** https://dashboardtile.vercel.app

## Features

- **Tiling layout:** a new tile splits the focused tile 50/50 (side by side if it is wider than tall, otherwise stacked). Closing a tile gives its space to its sibling.
- **Tiles:** Note, Time (clock with timezone, timer with beep, stopwatch), Weather (Open-Meteo, city search, °C/°F), Calendar (Google, read-only), and a generic API tile.
- **View modes:** Time, Weather and Calendar tiles switch between auto, min and full.
- **Theme and animations:** light/dark mode and a Framer Motion toggle.
- **Persistence:** saved in `localStorage`, and synced to Supabase after Google sign-in.
- **Keyboard and touch:** every action has a shortcut, and the buttons work on a phone.

## Shortcuts

| Key | Action |
|---|---|
| `1`-`9` | Add a tile (order of the tile registry) |
| Arrow keys | Move focus between tiles |
| `x` | Close the focused tile |
| `f` | Fullscreen the focused tile |
| `v` | Cycle view: auto / min / full |
| `Enter` or `i` | Edit the focused tile |
| `Esc` | Leave a text box or close a menu |
| `t` | Toggle theme |
| `m` | Toggle animations |

## Tech stack

Vite, React, Framer Motion, Supabase (auth and database), Vercel (hosting).
