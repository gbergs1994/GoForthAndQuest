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
Gold
Gain gold equal to the challenge of a creature when they are beaten.
Can spend gold when returning to the Village: 
- Church: Pay for healing 
- Market: Buy new Items 
- Tavern: Hire a companion 

New Classes
- Dwarf: 
- Elf: 
- Hoarder: Can hold 3 items, must drop an old item when picking up a 4th. Can use their Special to...
- Angler: Advantage on Attacks against Aquatic. Can use their Special to...
- Gardener: Advantage on Attacks against Plants and Fungus. Can use their Special to...

New Items
- 

New Zones, Encounters, Bosses
- Fields, Graveyard, Ruins, Crypt: Elder Lich

