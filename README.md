# WC26 Sweepstake

A polished GitHub Pages dashboard for three shared sweepstake prizes:

1. World Cup winner
2. Most goals conceded
3. Most red cards

## What to upload

Upload **everything in this folder** to the root of your GitHub repository, replacing the old files.

Important files:

- `index.html` - the page
- `assets/styles.css` - visual design
- `assets/app.js` - leaderboard logic
- `data/participants.json` - names and teams
- `data/results.json` - fixtures and scores
- `data/cards.json` - red-card totals
- `.github/workflows/update-world-cup-data.yml` - automatic updates
- `scripts/update-data.mjs` - data updater

## Turning on automatic updates

1. In GitHub, open your repository.
2. Go to **Settings > Actions > General**.
3. Under **Workflow permissions**, select **Read and write permissions**.
4. Save.
5. Go to the **Actions** tab.
6. Open **Update World Cup data**.
7. Click **Run workflow** once.

After that it will run every 10 minutes.

## Red cards

The site reads red cards from `data/cards.json`. The workflow preserves these values by default because public feeds do not always expose reliable team red-card totals. If the red card feed is incomplete, edit `data/cards.json` manually.

Example:

```json
"Ecuador": { "redCards": 1 }
```

## Updating participants

Edit `data/participants.json`. Keep the fields `team`, `participant`, `code`, `group` and `flag`.

## Shared prizes

Tables use competition ranking. If two or more teams are tied first, they are all shown as rank 1 and highlighted.
