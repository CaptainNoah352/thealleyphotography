# 🎮 Game Vault

Your personal HTML5 games collection with authentication.

## Setup

1. Fork/clone this repository
2. Add your HTML games to the `games/` folder
3. Update `dashboard.html` to include your games
4. Deploy to GitHub Pages or Netlify

## Adding Games

1. Drop your `.html` game files into the `games/` folder
2. Copy a game card in `dashboard.html` and update:
   - The `onclick` path
   - The game title
   - The emoji/icon

## Demo Credentials
- Username: `user`
- Password: `pass`

## Security Note
This uses client-side authentication (not secure). For production, use a backend service like Firebase Auth, Auth0, or Netlify Identity.
