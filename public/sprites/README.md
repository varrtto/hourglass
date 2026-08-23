# Prince sprite sheet

How player animation is wired, and how to edit it yourself.

## Files

| File | Role |
|---|---|
| `public/sprites/prince.png` | Packed atlas (8 columns × 5 rows = **40 frames**) |
| `public/sprites/prince.json` | Frame size + which frames belong to each action |
| `public/sprites/prince-with-props.png` | Backup of hang/climb frames **with** the baked-in ledge/wall |
| `public/sprites/prince-source.png` | Original loose (non-grid) art, if present |

Current cell size is in the JSON (`frameWidth` / `frameHeight`). Indexing is:

```
frameIndex = row * columns + col
```

Left → right, top → bottom. Frame `0` is top-left.

## How the game picks a frame

1. The player FSM is in a state (`idle`, `run`, `hang`, …) — see `src/game/player/fsm.ts`.
2. `PlayerView` maps that state to a **tag name** in the JSON:

   | FSM state | JSON tag |
   |---|---|
   | `idle` | `idle` |
   | `turn` | `turn` |
   | `run` | `run` |
   | `skid` | `skid` |
   | `standJump` | `stand_jump` |
   | `runJump` | `run_jump` |
   | `fall` | `fall` |
   | `land` | `land` |
   | `hang` | `hang` |
   | `climb` | `climb` |
   | `crouch` | `crouch` (static while still; loops only while crawling) |
   | `dead` | `dead` |

3. Each tag lists frames either as a range or an explicit list:

```json
"skid": { "from": 17, "to": 18, "fps": 10 }
"run":  { "frames": [4, 5, 6, 7, 8, 9, 10, 11, 15, 16], "fps": 12 }
```

4. Frame choice:

```
local = floor(player.timer * fps)
```

- **Looping** tags (`idle`, `run`, `fall`, `hang`, `crouch`): `local % frameCount`
- **One-shot** tags (jumps, land, climb, dead, …): clamp to the last frame

5. Canvas draws that cell with `drawImage` (nearest-neighbor).

So if hang shows a run pose, the hang tag’s frame numbers are wrong — fix **`prince.json`**, not the FSM.

## Editing tags yourself

1. Open `prince.png` and number cells 0…39 (8 per row).
2. Decide which cells belong to an action.
3. Edit the matching tag in `prince.json`.
4. Reload the gym — no code change needed unless you rename tags.

Tips:

- Prefer contiguous `from`/`to` when possible.
- Use `"frames": [...]` when good poses are scattered (our `run` skips jump-reach cells 12–14).
- Raise `fps` to play faster; lower to slow down.

## Hang / climb props

Hang (22–23) and climb (24–26) originally included a stone ledge/pillar in the pixels. Those props were cleared so the same poses can sit on any level geometry.

Backup with props: `prince-with-props.png`.

If you re-export art from Aseprite, draw hang/climb **without** environment — only the character.

## Checklist when something looks wrong

1. Is the FSM state the one you think? (debug HUD shows `state`)
2. Does that state’s tag in `prince.json` point at the right cells?
3. Did `frameWidth` / `frameHeight` / `columns` stay in sync after re-exporting the PNG?
