# 🎮 Game Vault

A lightweight game storage hub for your personal HTML5 games with repository auto-sync.

## Features

- Simple login gate (`user` / `pass` by default)
- Auto-sync `.html` games from your GitHub repository's `games/` folder
- Add optional manual game entries from the dashboard
- Save settings and manual entries in browser local storage
- Launch any saved/synced game in a modal player
- Remove manual games from your hub with one click

## Setup

1. Fork/clone this repository
2. (Optional) Add HTML games to the `games/` folder
3. Open `index.html`
4. Sign in with demo credentials and start adding games in `dashboard.html`

## Adding Games

### Recommended: repository auto-sync

1. Copy your game files/folders into this repo under `games/`
2. Open `dashboard.html` and set your GitHub owner, repo name, branch, and games folder
3. Click **Sync Repository Games**
4. Every `.html` file under `games/` will appear automatically in the portal

### Optional: manual link entry

You can still add a manual game URL/path in the dashboard form if needed.

## Demo Credentials

- Username: `user`
- Password: `pass`

## Security Note

This uses client-side authentication and local storage only. For production, use a backend auth system and database.
