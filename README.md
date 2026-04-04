# 🎮 Game Vault

A lightweight game storage hub for your personal HTML5 games.

## Features

- Simple login gate (`user` / `pass` by default)
- Add game entries from the dashboard
- Save game list in browser local storage
- Launch any saved game path/URL in a modal player
- Remove games from your hub with one click

## Setup

1. Fork/clone this repository
2. (Optional) Add HTML games to the `games/` folder
3. Open `index.html`
4. Sign in with demo credentials and start adding games in `dashboard.html`

## Adding Games

You can add games directly in the dashboard form:

1. Enter a game name
2. Enter a local path like `games/my-game.html` or a full URL
3. (Optional) add an emoji icon
4. Click **Save Game**

## Demo Credentials

- Username: `user`
- Password: `pass`

## Security Note

This uses client-side authentication and local storage only. For production, use a backend auth system and database.
