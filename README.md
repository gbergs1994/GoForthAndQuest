# GoForthAndQuest
Go Forth and Quest!

An adventure game by Gunnar Bergstrom.

## Run the game

From the project root, start a local PHP server:

```bash
cd /workspaces/GoForthAndQuest
php -S 0.0.0.0:8000
```

Then open:

```text
http://localhost:8000
```

This serves both the frontend and backend endpoints.

## Save/load (no setup required)

Save/load works automatically now.

The backend uses a local SQLite file at `backend/data/quest_game.sqlite`.
The file and table are created automatically the first time you save or load.

Notes:

- The game uses a single save slot.
- The frontend saves automatically during play.
- The backend creates the `save_slots` table automatically on first save/load.


# addlist
Things to add later: 

New Classes
    Dwarf: 
    Elf: 

New Hazards
    beartrap
    medusa
    lamia
    bugtitan
