# Hourglass

Prince of Persia–style **kinematic** platformer gym. Movement is a state machine on a tile grid (run, jump, hang, climb, fall-by-stories), not a rigid-body physics engine.

Stack: Next.js, TypeScript, Three.js (`@react-three/fiber` + drei), Zustand, TanStack Query, Howler, Leva, Tiled JSON.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app boots to the **main menu**. Unmute in the Leva panel (Practice Gym) once music files exist (browser autoplay is muted by default).

## Main menu

Full-screen pixel-art underworld (`public/art/menu-bg.png`) with four actions:

| Action | What it does |
|---|---|
| **Start new game** | Plays the gym as a run (no debug HUD, no Leva) |
| **Practice Gym** | Current movement gym, including debug HUD and Leva tunables |
| **Scoreboard** | Lists recorded runs (empty until a palace run is saved) |
| **Exit** | Stills the hourglass; browsers usually block `window.close()` on a normal tab |

Arrows / WASD select · Enter confirm. **Esc** from play, gym, or scoreboard returns to the menu.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Menu select | Arrows / WASD | — |
| Menu confirm | Enter / Space | — |
| Back to menu | Esc | — |
| Move | Arrows / WASD | D-pad / left stick |
| Run | Shift | B / X |
| Jump | Space / J / Z | A |
| Crouch / drop from hang | Down | Down |
| Climb from hang | Up or Jump | Up / A |
| Reset | R / Enter | Start |
| Pause | P | — |

Walk vs run: without Shift you walk (short jump). Hold Shift to run and clear 3-tile gaps.

Fall rules (tunable in Leva, Practice Gym): **1 story** is safe, **2 stories** stun + lose HP, **3 stories** (or spikes) kill. Jump / R to respawn.

## Gym layout (left → right)

- Spawn runway on the top floor
- 2-tile gap (stand jump or running jump)
- 3-tile gap (running jump)
- Drop to the floor below (1 story)
- Crawl tunnel (hold down)
- Ledge tiles to grab while falling; Up to climb, Down to drop
- 2-story landing pad
- Spike shaft on the far right (3-story death)
- Ledge “ladder” beside the shaft to climb back

## Menu art

The title screen uses `public/art/menu-bg.png` (Orpheus descending into Hades for Eurydice, pixel art). It is drawn `cover` / full viewport; keep a dark left side so the gold menu type stays readable.

The earlier palace painting is kept at `public/art/menu-bg-palace.png`.

## Art pipeline (Aseprite)

Drop a sprite sheet at `public/sprites/prince.png` and keep `public/sprites/prince.json` in sync.

- Filter: nearest-neighbor (the canvas already uses `image-rendering: pixelated` and `dpr={1}`)
- Suggested frame size: **32×48** (or any size listed in the manifest)
- Export a PNG sheet + JSON using these **frame tags**:

`idle` · `turn` · `run` · `skid` · `stand_jump` · `run_jump` · `fall` · `land` · `hang` · `climb` · `crouch` · `dead`

The gym currently draws a placeholder box colored by FSM state. Wire the sheet in `src/game/render/PlayerView.tsx` / `LivePlayer` when the PNG lands (load with `NearestFilter` / `NearestMipmapNearestFilter`).

## Music pipeline (8-bit)

Edit `public/audio/playlist.json`. Howler will no-op missing files.

```
public/audio/music/gym.ogg     # looping gym theme
public/audio/sfx/jump.wav
public/audio/sfx/land.wav
public/audio/sfx/hang.wav
public/audio/sfx/climb.wav
```

Prefer `.ogg` for loops and short `.wav` for SFX. Toggle mute in Leva (Practice Gym); `src/game/audio/bus.ts` is the only Howler entry point.

## Levels (Tiled)

1. Create a map with 16×16 tiles, orthogonal.
2. Collision tileset GIDs: **1 solid**, **2 ledge** (one-way + grab), **3 spike**.
3. One tile layer named `collision`, one object layer `entities` with a `spawn` object.
4. Export as JSON to `public/levels/<id>.json`.
5. Tiled is **y-down**; the loader flips to **y-up** world space.

Regenerate the built-in gym:

```bash
node scripts/generate-gym.cjs
```

## Hybrid 3D later

Gameplay lives in 2D tile space (`x`, `y`). `LayerBackdrop` is already three Z layers:

- `z ≈ -6` palace wall (replace the plane with a room mesh)
- `z ≈ 0` playfield tiles + player
- `z ≈ 2.4` foreground columns (no collision)

Keep `src/game/player/fsm.ts` as the source of truth; only replace meshes in `src/game/render/`.

## Code map

- `src/game/GameShell.tsx` — screen router (menu / play / gym / scoreboard / exit)
- `src/game/menu/` — main menu, scoreboard, full-screen backdrop
- `src/game/loop.ts` — 60 Hz fixed step
- `src/game/input.ts` — keyboard + Gamepad API, edge-triggered jump
- `src/game/player/fsm.ts` — PoP kinematic controller
- `src/game/store.ts` — Zustand (screen, pause, mute, Leva tunables, debug HUD, scores)
- `src/game/queries.ts` — TanStack Query fetchers for level / sprites / audio
- `src/game/render/GameCanvas.tsx` — R3F ortho camera, integer zoom
