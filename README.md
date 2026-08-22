# Hourglass

Prince of Persia–style **kinematic** platformer gym. Movement is a state machine on a tile grid (run, jump, hang, climb, fall-by-stories), not a rigid-body physics engine.

Stack: Next.js, TypeScript, Three.js (`@react-three/fiber` + drei), Zustand, TanStack Query, `react-midi-player`, Leva, Tiled JSON.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app boots to the **main menu**. Click or press a key to start the menu music (browser autoplay is blocked until then). **M** toggles mute.

## Main menu

Full-screen pixel-art underworld (`public/art/menu-bg.png`) with these actions:

| Action | What it does |
|---|---|
| **Start new game** | Plays the gym as a run (no debug HUD, no Leva) |
| **Practice Gym** | Current movement gym, including debug HUD and Leva tunables |
| **Map Builder** | Paint collision tiles and spawn, playtest in the gym, download Tiled JSON |
| **Scoreboard** | Lists recorded runs (empty until a palace run is saved) |
| **Config** | Mute and music volume |
| **Credits** | Vertically scrolling text template (plot / credits crawl) |
| **Exit** | Stills the hourglass; browsers usually block `window.close()` on a normal tab |

Arrows / WASD select · Enter confirm. **Esc** from play, gym, builder, scoreboard, or credits returns to the menu. **Esc** during a builder playtest returns to the editor.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Menu select | Arrows / WASD | — |
| Menu confirm | Enter / Space | — |
| Back to menu | Esc | — |
| Move | Arrows / WASD | D-pad / left stick |
| Run | Shift | B / X |
| Jump | Space / Z | A |
| Fire (selected weapon) | X / F (Up / Up+Left/Right aim) | RT |
| Inventory | 1–5 / J K | — |
| Crouch / drop from hang | Down | Down |
| Climb from hang | Up or Jump | Up / A |
| Reset | R / Enter | Start |
| Pause | P | — |

Walk vs run: without Shift you walk (short jump). Hold Shift to run and clear 3-tile gaps. Reverse while running and you **skid** about a tile before turning; walking reverse is an in-place pivot. Hold **Down in the air** to tuck (crouch hitbox); land still holding Down to stay crouched. Press **Down while jumping** for **+20%** horizontal distance.

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

## Music pipeline

Edit `public/audio/playlist.json`. Menu `.mid` files play through `react-midi-player`. Other loops and SFX use the HTML `Audio` element. Missing files no-op. Optional `"volume"` on an SFX entry is `0`–`1` (default `1`).

```
public/audio/music/Moonspell - Vampiria.mid   # looping main-menu theme
public/audio/music/gym.ogg                    # looping gym theme
public/audio/sfx/jump-1.ogg
public/audio/sfx/breathing.ogg   # plays once when Shift-run starts
```

Click or press a key once to unlock audio (browser autoplay). **M** toggles mute. **Config** has a music volume slider.

## Levels (Tiled)

1. Create a map with 16×16 tiles, orthogonal.
2. Collision tileset GIDs: **1 solid**, **2 ledge** (one-way + grab), **3 spike**.
3. One tile layer named `collision`, one object layer `entities` with a `spawn` object.
4. Export as JSON to `public/levels/<id>.json`.
5. Tiled is **y-down**; the loader flips to **y-up** world space.

Or skip Tiled and use the in-game **Map Builder** (below).

Regenerate the built-in gym:

```bash
node scripts/generate-gym.cjs
```

## Map Builder

Main menu → **Map Builder**. The grid is runtime space (y-up, 1 tile = 1 unit) so it matches Practice Gym.

| Tool | Key |
|---|---|
| Empty / solid / ledge / spike / spawn | 1–5 |
| Paint | Click-drag |
| Pan | Space-drag or middle-drag |
| Zoom | Mouse wheel |
| Undo / redo | ⌘Z / Shift+⌘Z |

**Playtest** drops the draft into Practice Gym immediately (Esc returns to the editor). **Download** writes Tiled JSON you can drop into `public/levels/<id>.json`. **Load gym** / **Import** round-trip the same format. New maps are 64×24 with edge walls.

The session stays in memory if you leave for the menu and come back. Practice Gym from the main menu still loads `gym.json`, not the draft.

## Hybrid 3D later

Gameplay lives in 2D tile space (`x`, `y`). `LayerBackdrop` is already three Z layers:

- `z ≈ -6` palace wall (replace the plane with a room mesh)
- `z ≈ 0` playfield tiles + player
- `z ≈ 2.4` foreground columns (no collision)

Keep `src/game/player/fsm.ts` as the source of truth; only replace meshes in `src/game/render/`.

## Code map

- `src/game/GameShell.tsx` — screen router (menu / play / gym / builder / scoreboard / credits / exit)
- `src/game/builder/` — in-game map editor (paint, spawn, Tiled import/export)
- `src/game/audio/` — `react-midi-player` menu theme, HTMLAudio gym loop / SFX
- `src/game/menu/` — main menu, scoreboard, credits crawl, full-screen backdrop
- `src/game/loop.ts` — 60 Hz fixed step
- `src/game/input.ts` — keyboard + Gamepad API, edge-triggered jump
- `src/game/player/fsm.ts` — PoP kinematic controller
- `src/game/store.ts` — Zustand (screen, pause, mute, Leva tunables, debug HUD, scores)
- `src/game/queries.ts` — TanStack Query fetchers for level / sprites / audio
- `src/game/render/GameCanvas.tsx` — R3F ortho camera, integer zoom
