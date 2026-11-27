# Gobble's Great Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/slur-hunter/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/slur-hunter/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Thanksgiving is coming, and Gobble the turkey is on the menu. Run 1400 metres
from the farmyard, through the barn and the kitchen, to the forest gate — chased
the whole way by the farmer with his pitchfork, dodging falling carving knives,
jumping fences and the kitchen oven, ducking behind haystacks when the farmer
closes in, and grabbing corn on the way.

## Play it

Serve `game/` with any static server and open `index.html` in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

No network request: every file the game loads is under `game/`, and the sounds
are synthesised in code.

## Controls

- **← → or A D** — steer the turkey (push right at the front of the lane to sprint, pull left at the back to slow down)
- **Space, W or ↑** — jump
- **↓ or S** — duck (duck inside a haystack and the farmer loses your trail)
- **P or Esc** — pause
- **Mouse** — hold and steer toward the pointer, click to jump, click to start or restart

## The run

- **Farmyard (0–350m):** fences, haystacks, corn, the odd falling knife.
- **Barn (350–750m):** more knives, pumpkins that give a life back, more hay to hide in.
- **Kitchen (750–1150m):** the oven — jump it while its fire jets are down.
- **Forest Gate (1150–1400m):** the final sprint. Reach the gate and Gobble is free.

Three lives. A stumble costs one and lets the farmer gain. If his gap closes to
nothing, or the lives run out, Gobble is caught for dinner.

## Files

- `game/index.html` — the page
- `game/src/config.js` — tuning and the palette of every zone
- `game/src/world.js` — the rules: the turkey, the hazards, the distance and score
- `game/src/farmer.js` — the farmer's moods: patrol, chase, search, lunge
- `game/src/render.js` — all the drawing
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised sounds (gobble, pickup, hit, escape)
- `game/src/shots.js` — the screenshot scenes and their autopilot
- `game/src/main.js` — boot and the game loop
- `main.ts` — hands the game in to make.fun (`MAKEFUN_OUTPUT_DIR` stands in for `/output`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
