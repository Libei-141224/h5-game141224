# Coin Catch Challenge

A colorful coin-catching game built with Vue + Vite + TypeScript.

## Run (Local)

```bash
npm install
npm run dev
```

## Test
`https://libei-141224.github.io/h5-game141224/`


## Docker Quick Deploy

Build and run with Docker:

```bash
docker build -t h5-game141224 .
docker run -d --name h5-game141224 -p 11019:80 h5-game141224
```

Or use Docker Compose:

```bash
docker compose up -d --build
```

Then open:

`http://localhost:11019`

## Controls

- Arrow keys: Move
- Enter / Space: Start / Replay (idle/end screen)
- R: Toggle rules panel (when not playing)
