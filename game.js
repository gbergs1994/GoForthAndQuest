// Item definitions
const ITEMS = [
  { name: "Sword", desc: "+1 to Attack vs non-trap monsters." },
  { name: "Shield", desc: "Reduce Challenge by 1." },
  { name: "Armor", desc: "Reduce damage taken by 1." },
  { name: "Cloak", desc: "+2 to Avoid vs Traps." },
  { name: "Grail", desc: "+2 to HP (lost if item is dropped)" },
  { name: "Lance", desc: "Advantage on Attack against Dragons, +1 to the result of Attack against non-trap monsters." }
];

function getRandomItem() {
  // Only give items the player doesn't already have
  const available = ITEMS.filter(i => !player.items.includes(i.name));
  const pool = available.length > 0 ? available : ITEMS;
  return pool[Math.floor(Math.random() * pool.length)].name;
}

let pendingItem = null;
let pendingDrop = false;
let displayedItem = null;

function showItemImage(itemName) {
  const itemImageContainer = document.getElementById("itemImageContainer");
  const itemImage = document.getElementById("itemImage");
  const monsterImageContainer = document.getElementById("monsterImageContainer");
  if (!itemImage || !itemImageContainer || !monsterImageContainer) return;

  const file = itemName.toLowerCase() + ".png";
  displayedItem = itemName;
  itemImage.src = "pictures/" + file;
  itemImage.alt = itemName;
  itemImageContainer.style.display = "flex";
  monsterImageContainer.style.display = "none";
  itemImage.style.border = "4px solid limegreen";
  itemImage.style.boxShadow = "0 0 12px limegreen";
  itemImage.style.borderRadius = "16px";
  itemImage.onerror = function () {
    itemImageContainer.style.display = "none";
  };
  itemImage.onload = function () {
    itemImage.onerror = null;
  };
}

function showCurrentEnemyImage() {
  const monsterImageContainer = document.getElementById("monsterImageContainer");
  const monsterImage = document.getElementById("monsterImage");
  const itemImageContainer = document.getElementById("itemImageContainer");
  displayedItem = null;

  if (monsterImageContainer) monsterImageContainer.style.display = "flex";
  if (itemImageContainer) itemImageContainer.style.display = "none";

  if (monsterImage && currentEnemy && currentEnemy.name) {
    let imgName = currentEnemy.name.toLowerCase().replace(/ /g, "");
    const nameMap = {
      "elderlich": "elderlich.png",
      "firedrake": "firedrake.png",
      "archdevil": "archdevil.png",
      "hillgiant": "hillgiant.png",
      "feyqueen": "feyqueen.png",
      "hugearachnid": "hugearachnid.png",
      "hornedhag": "hornedhag.png",
      "minotaur": "minotaur.png",
      "witch": "witch.png"
    };
    let file = nameMap[imgName];
    if (currentEnemy.type === "Trap") {
      file = "trap.png";
    } else if (!file) {
      file = imgName + ".png";
    }
    monsterImage.src = "pictures/" + file;
    monsterImage.style.display = "block";
    monsterImage.alt = currentEnemy.name;
  } else if (monsterImage) {
    monsterImage.src = "";
    monsterImage.style.display = "none";
  }
}

function dropItem(idx) {
  if (idx < 2) {
    const dropped = player.items[idx];
    // Grail: lose +2 HP if dropped
    player.items.splice(idx, 1);
    if (dropped === "Grail" && pendingItem !== "Grail") {
      player.maxHP = Math.max(player.maxHP - 2, 1);
      player.hp = Math.min(player.hp, player.maxHP);
    }
    // If picking up Grail, gain bonus HP
    if (pendingItem === "Grail" && !player.items.includes("Grail")) {
      player.maxHP += 2;
      player.hp += 2;
    }
    player.items.push(pendingItem);
    setEffectText(`You dropped ${dropped} and took ${pendingItem}. You now have: ${player.items.join(", ")}`);
  } else {
    setEffectText(`You ignored ${pendingItem}. You still have: ${player.items.join(", ")}`);
  }
  pendingItem = null;
  pendingDrop = false;
  window._itemFound = true;
  document.getElementById("restartBtn").innerText = "Restart Game";
  updateUI();
  saveGame();
}
// Enables buttons after page load
function enableButtons() {
  document.getElementById("attackBtn").disabled = false;
  document.getElementById("specialBtn").disabled = false;
}
// Disables buttons (used on game over)
function disableButtons() {
  document.getElementById("attackBtn").disabled = true;
  document.getElementById("specialBtn").disabled = true;
}

// Player and Game State
let player = {};
let questIndex = 0;
let currentEnemy = null;
let gameState = "idle";
let waitingForNextRoom = false;
let questsComplete = 0;
let charactersSlain = 0;
let roomsCleared = 0;
// Tracks the chosen zone name for each tier of the current quest (1 = Village)
let zonePath = { 1: "Village" };
// Boss zones already defeated by this character; a defeated boss cannot be fought again
let defeatedBossZones = [];

// Zone map: Village branches to 3 zones, each subsequent zone branches to 2
const ZONE_TIER2_OPTIONS = ["Beach", "River", "Copse"];
const ZONE_CONNECTIONS = {
  Beach: ["Coast", "Jungle"],
  River: ["Jungle", "Hills"],
  Copse: ["Hills", "Woods"],
  Coast: ["Tundra", "Desert"],
  Jungle: ["Desert", "Mountains"],
  Hills: ["Mountains", "Cave"],
  Woods: ["Cave", "Forest"],
  Tundra: ["Tower", "Pyramid"],
  Desert: ["Pyramid", "Summit"],
  Mountains: ["Summit", "Volcano"],
  Cave: ["Volcano", "Maze"],
  Forest: ["Maze", "Grove"]
};

function getZoneOptionsForTier(tier) {
  const raw = tier === 2 ? ZONE_TIER2_OPTIONS : ZONE_CONNECTIONS[zonePath[tier - 1]] || [];
  return raw.filter(zoneHasUndefeatedBoss);
}

function isBossZone(zoneName) {
  return Object.prototype.hasOwnProperty.call(BOSSES_BY_ZONE, zoneName);
}

function getChildZones(zoneName) {
  return zoneName === "Village" ? ZONE_TIER2_OPTIONS : (ZONE_CONNECTIONS[zoneName] || []);
}

// A zone is only worth visiting if it can still lead to a boss that hasn't been defeated yet
function zoneHasUndefeatedBoss(zoneName) {
  if (isBossZone(zoneName)) {
    return !defeatedBossZones.includes(zoneName);
  }
  return getChildZones(zoneName).some(zoneHasUndefeatedBoss);
}

// Returns the branch letter (a, b, c...) for a zone tier, based on its position among its parent's options
function getZoneLetter(tier) {
  if (tier <= 1) return "";
  const options = getZoneOptionsForTier(tier);
  const idx = options.indexOf(zonePath[tier]);
  return idx >= 0 ? String.fromCharCode(97 + idx) : "";
}

// Shows the game's custom modal dialog. type is "text" (input + OK/Cancel), "choice" (one button per option), or "alert" (message + OK)
function showModal({ message, type = "alert", options = null, defaultValue = "" }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("modalOverlay");
    const messageEl = document.getElementById("modalMessage");
    const input = document.getElementById("modalInput");
    const choices = document.getElementById("modalChoices");
    const confirmBtn = document.getElementById("modalConfirmBtn");
    const cancelBtn = document.getElementById("modalCancelBtn");

    messageEl.innerText = message;
    choices.innerHTML = "";
    input.value = defaultValue;
    input.classList.add("hidden");
    confirmBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");

    function cleanup(result) {
      overlay.classList.add("hidden");
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      input.onkeydown = null;
      resolve(result);
    }

    if (type === "text") {
      input.classList.remove("hidden");
      confirmBtn.classList.remove("hidden");
      cancelBtn.classList.remove("hidden");
      confirmBtn.innerText = "OK";
      cancelBtn.innerText = "Cancel";
      confirmBtn.onclick = () => cleanup(input.value);
      cancelBtn.onclick = () => cleanup(null);
      input.onkeydown = (e) => {
        if (e.key === "Enter") cleanup(input.value);
      };
      setTimeout(() => input.focus(), 0);
    } else if (type === "choice") {
      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerText = opt;
        btn.onclick = () => cleanup(opt);
        choices.appendChild(btn);
      });
    } else {
      confirmBtn.classList.remove("hidden");
      confirmBtn.innerText = "OK";
      confirmBtn.onclick = () => cleanup(true);
    }

    overlay.classList.remove("hidden");
  });
}

function showTextPrompt(message) {
  return showModal({ message, type: "text" });
}

function showChoicePrompt(message, options) {
  return showModal({ message, type: "choice", options });
}

// Prompts the player to choose their next zone, like choosing a class
async function promptZoneChoice(tier) {
  const options = getZoneOptionsForTier(tier);
  if (options.length === 0) return;
  const chosen = await showChoicePrompt("You found treasure! Where do you want to go next?", options);
  zonePath[tier] = chosen;

  if (tier === MAX_ZONE) {
    const boss = BOSSES_BY_ZONE[chosen];
    quest.push({ name: boss.name, type: boss.type, challenge: ZONE_CHALLENGES[MAX_ZONE - 1], damage: ZONE_DAMAGE[MAX_ZONE - 1], boss: true });
  } else {
    quest.push(...buildZoneRooms(tier, chosen));
  }
}

function setDeathScreen(isDead) {
  document.body.classList.toggle("player-dead", isDead);
}

// Adds and removes red X on monster image when defeated
function setMonsterDefeated(isDefeated) {
  const monsterImageContainer = document.getElementById("monsterImageContainer");
  if (!monsterImageContainer) return;
  monsterImageContainer.classList.toggle("x-overlay", isDefeated);
}

// Classes 
const CLASSES = {
  Warrior: { baseHP: 10, advantage: ["Humanoid"], specialUses: 1 },
  Hunter: { baseHP: 9, advantage: ["Beast"], specialUses: 2 },
  Thief: { baseHP: 8, advantage: ["Giant", "Trap"], specialUses: 1 },
  Cleric: { baseHP: 7, advantage: ["Undead"], specialUses: 1 },
  Mage: { baseHP: 6, advantage: ["Fey", "Fiend"], specialUses: 1 }
};

// Items
function renderItemList() {
  const itemListDiv = document.getElementById("itemList");
  if (!itemListDiv) return;
  itemListDiv.innerHTML = "";
  for (const item of ITEMS) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.name}</strong>: ${item.desc}`;
    itemListDiv.appendChild(li);
  }
}

// Game Initialization
async function initializeGame() {
  renderItemList();
  await loadGame(true);
}

document.addEventListener("DOMContentLoaded", initializeGame);

// Monsters available in each zone (traps and non-visitable rows omitted)
const ROOMS_BY_ZONE = {
  Village: [
    { name: "Giant Rat", type: "Beast" },
    { name: "Spider", type: "Beast" },
    { name: "Pixie", type: "Fey" },
    { name: "Imp", type: "Fiend" },
    { name: "Shrub", type: "Plant" },
    { name: "Angry Farmer", type: "Humanoid" }
  ],
  Beach: [
    { name: "Crab", type: "Aquatic" },
    { name: "Octopus", type: "Aquatic" },
    { name: "Zombie", type: "Undead" },
    { name: "Cockatrice", type: "Monster" },
    { name: "Fishman", type: "Humanoid" },
    { name: "Snailor", type: "Monster" }
  ],
  River: [
    { name: "Baboon", type: "Beast" },
    { name: "Gnome", type: "Fey" },
    { name: "Boar", type: "Beast" },
    { name: "Dryad", type: "Fey" },
    { name: "Carnivore Fish", type: "Aquatic" },
    { name: "Goblin", type: "Humanoid" }
  ],
  Copse: [
    { name: "Funguy", type: "Fungus" },
    { name: "Sapling", type: "Plant" },
    { name: "Stumpling", type: "Plant" },
    { name: "Satyr", type: "Fey" },
    { name: "Cutpurse", type: "Humanoid" },
    { name: "Badger", type: "Beast" }
  ],
  Coast: [
    { name: "Harpy", type: "Monster" },
    { name: "Kelpie", type: "Fey" },
    { name: "Bloater", type: "Undead" },
    { name: "Mud Golem", type: "Giant" },
    { name: "Deep One Pirate", type: "Aquatic" },
    { name: "Deep One Cultist", type: "Aquatic" }
  ],
  Hills: [
    { name: "Rust Bug", type: "Monster" },
    { name: "Minotaur", type: "Giant" },
    { name: "Kobold", type: "Dragon" },
    { name: "Deeplurker", type: "Aquatic" },
    { name: "Hyena", type: "Beast" },
    { name: "Giant Centipede", type: "Beast" }
  ],
  Jungle: [
    { name: "Vine Golem", type: "Plant" },
    { name: "Carnivore Plant", type: "Plant" },
    { name: "Poison Spider", type: "Beast" },
    { name: "Willowisp", type: "Undead" },
    { name: "Froggart", type: "Humanoid" },
    { name: "Goblin Shaman", type: "Humanoid" }
  ],
  Woods: [
    { name: "Fungal Infected", type: "Fungus" },
    { name: "Wolf", type: "Beast" },
    { name: "Bandit", type: "Humanoid" },
    { name: "Lycanthrope", type: "Beast" },
    { name: "Bear", type: "Beast" },
    { name: "Goblin Ambusher", type: "Humanoid" }
  ],
  Desert: [
    { name: "Mummy", type: "Undead" },
    { name: "Lamia", type: "Fiend" },
    { name: "Gnoll", type: "Humanoid" },
    { name: "Hellhound", type: "Fiend" },
    { name: "Assassin", type: "Humanoid" },
    { name: "Werejackal", type: "Beast" }
  ],
  Tundra: [
    { name: "Vampire", type: "Undead" },
    { name: "Ghost", type: "Undead" },
    { name: "Demon", type: "Fiend" },
    { name: "Rock Toad", type: "Beast" },
    { name: "Tundra Werewolf", type: "Beast" },
    { name: "Snowy Kobold", type: "Dragon" }
  ],
  Mountains: [
    { name: "Bloodsucker", type: "Beast" },
    { name: "Yeti", type: "Giant" },
    { name: "Horned Hag", type: "Fey" },
    { name: "Manticore", type: "Monster" },
    { name: "Banshee", type: "Undead" },
    { name: "Hill Giant", type: "Giant" }
  ],
  Cave: [
    { name: "Cave Strangler", type: "Monster" },
    { name: "Gemsthrall", type: "Undead" },
    { name: "Lava Froggart", type: "Humanoid" },
    { name: "Bug Titan", type: "Giant" },
    { name: "Slime", type: "Monster" },
    { name: "Beakwyrm", type: "Monster" }
  ],
  Forest: [
    { name: "Fungal Juggernaut", type: "Fungus" },
    { name: "Redcap", type: "Fey" },
    { name: "Witch", type: "Humanoid" },
    { name: "Troll", type: "Giant" },
    { name: "Treant", type: "Plant" },
    { name: "Goblin King", type: "Humanoid" }
  ]
};

// Each final zone has one specific boss
const BOSSES_BY_ZONE = {
  Tower: { name: "Arch Devil", type: "Fiend" },
  Pyramid: { name: "Ancient Pharoah", type: "Undead" },
  Summit: { name: "Frost Giant", type: "Giant" },
  Volcano: { name: "Fire Drake", type: "Dragon" },
  Maze: { name: "Huge Arachnid", type: "Beast" },
  Grove: { name: "Fey Queen", type: "Fey" }
};

// Prompts for a name and class, returning a fresh player object, or null if cancelled
async function promptNewCharacter() {
  const name = await showTextPrompt("What is your Name?");
  if (!name || !name.trim()) return null;

  const validClasses = ["Warrior", "Hunter", "Thief", "Cleric", "Mage"];
  const cls = await showChoicePrompt("What is your Class?", validClasses);
  if (!cls) return null;

  // Creates new "empty" class at level 0
  return {
    name: name.trim(),
    classKey: cls,
    level: 0,
    hp: CLASSES[cls].baseHP,
    maxHP: CLASSES[cls].baseHP,
    items: [],
    specialUses: CLASSES[cls].specialUses
  };
}

// Restart Game: fully resets the game, including trackers and defeated bosses
async function restartGame() {
  setDeathScreen(false);
  gameState = "playing";
  document.getElementById("restartBtn").innerText = "Restart Game";
  document.getElementById("specialBtn").innerText = "Special";

  // Reset questsComplete on restart
  questsComplete = 0;
  charactersSlain = 0;
  roomsCleared = 0;
  defeatedBossZones = [];

  const newPlayer = await promptNewCharacter();
  if (!newPlayer) return;
  player = newPlayer;

  questIndex = 0;
  generateQuest();
  startRoom();

  enableButtons();
}

// Retire Hero: starts a new character, but keeps trackers and defeated bosses intact
async function retireHero() {
  setDeathScreen(false);
  gameState = "playing";
  document.getElementById("restartBtn").innerText = "Restart Game";
  document.getElementById("specialBtn").innerText = "Special";
  roomsCleared = 0;

  const newPlayer = await promptNewCharacter();
  if (!newPlayer) return;
  player = newPlayer;

  questIndex = 0;
  generateQuest();
  startRoom("A new hero takes up the quest where the last one left off.");

  enableButtons();
}

// Quest Generation
let quest = [];

const ROOMS_PER_ZONE = 3;
const MAX_ZONE = 5;
const BOSS_ROOM_INDEX = 12;
const ZONE_CHALLENGES = [10, 12, 14, 16, 20];
const ZONE_DAMAGE = [1, 2, 3, 4, 5];

function getZoneForProgress(completedRooms) {
  const safeCompletedRooms = Math.max(0, Number.isFinite(completedRooms) ? completedRooms : 0);
  if (safeCompletedRooms >= BOSS_ROOM_INDEX) {
    return MAX_ZONE;
  }
  return Math.min(Math.floor(safeCompletedRooms / ROOMS_PER_ZONE) + 1, MAX_ZONE);
}

function getRoomPoolForProgress(completedRooms) {
  const tier = getZoneForProgress(completedRooms);
  return ROOMS_BY_ZONE[zonePath[tier]] || [];
}

function getUniqueRoomForProgress(completedRooms, excludedName = null) {
  const roomPool = getRoomPoolForProgress(completedRooms);
  const candidates = excludedName
    ? roomPool.filter(room => room.name !== excludedName)
    : roomPool;

  const pool = candidates.length > 0 ? candidates : roomPool;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const tier = getZoneForProgress(completedRooms);
  return { name: chosen.name, type: chosen.type, challenge: ZONE_CHALLENGES[tier - 1], damage: ZONE_DAMAGE[tier - 1] };
}

// Picks a random boss, optionally avoiding a repeat, for the final zone tier
function pickRandomBoss(excludeName = null) {
  const allBosses = Object.values(BOSSES_BY_ZONE);
  const candidates = excludeName ? allBosses.filter(b => b.name !== excludeName) : allBosses;
  const pool = candidates.length > 0 ? candidates : allBosses;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return { name: chosen.name, type: chosen.type, challenge: ZONE_CHALLENGES[MAX_ZONE - 1], damage: ZONE_DAMAGE[MAX_ZONE - 1], boss: true };
}

function getZoneRoomForIndex(completedRooms) {
  if (completedRooms >= BOSS_ROOM_INDEX) {
    return { zone: MAX_ZONE, room: 1 };
  }

  const zone = Math.floor(completedRooms / ROOMS_PER_ZONE) + 1;
  const room = (completedRooms % ROOMS_PER_ZONE) + 1;

  return {
    zone: Math.min(zone, MAX_ZONE),
    room: Math.min(room, ROOMS_PER_ZONE)
  };
}

// Zones with a trap; each encounter has a 30% + 10% per zone number chance to trigger it, once per zone
const TRAPS_BY_ZONE = {
  River: "Loose Gravel",
  Jungle: "Pitfall",
  Woods: "Bear Trap",
  Mountains: "Rolling Boulder",
  Cave: "Pitfall",
  Forest: "Swinging Log"
};

// Builds the 3 monster rooms for a zone tier; a trap may be added as a bonus extra encounter
function buildZoneRooms(tier, zoneName) {
  const pool = ROOMS_BY_ZONE[zoneName] || [];
  const challenge = ZONE_CHALLENGES[tier - 1];
  const damage = ZONE_DAMAGE[tier - 1];
  const rooms = [];
  let previousName = null;
  for (let i = 0; i < ROOMS_PER_ZONE; i++) {
    const candidates = previousName ? pool.filter(r => r.name !== previousName) : pool;
    const list = candidates.length > 0 ? candidates : pool;
    const chosen = list[Math.floor(Math.random() * list.length)];
    rooms.push({ name: chosen.name, type: chosen.type, challenge, damage });
    previousName = chosen.name;
  }

  const trapName = TRAPS_BY_ZONE[zoneName];
  if (trapName) {
    const trapChance = 30 + tier * 10;
    if (Math.random() * 100 < trapChance) {
      const insertAt = Math.floor(Math.random() * (rooms.length + 1));
      rooms.splice(insertAt, 0, { name: trapName, type: "Trap", challenge, damage });
    }
  }

  return rooms;
}

function generateQuest() {
  zonePath = { 1: "Village" };
  quest = buildZoneRooms(1, "Village");
}

function increaseQuestDifficulty(amount = 1) {
  quest.forEach((room) => {
    room.challenge += amount;
    room.damage += amount;
  });
}

// Room Logic
function startRoom(introText) {
  setDeathScreen(false);
  setMonsterDefeated(false);
  waitingForNextRoom = false;
  currentEnemy = quest[questIndex];
  // Undead creatures gain +1 Challenge and Damage for each Character Slain
  if (currentEnemy && currentEnemy.type === "Undead" && typeof charactersSlain === 'number' && charactersSlain > 0) {
    currentEnemy.challenge += charactersSlain;
    currentEnemy.damage += charactersSlain;
  }

  if (player.classKey === "Mage") {
    player.specialUses = CLASSES.Mage.specialUses;
  }

  updateAdvantage();

  setEffectText("");
  // Only reset Attack button if not in item-found state
  if (window._itemFound) {
    window._itemFound = false;
  } else {
    document.getElementById("attackBtn").innerText = currentEnemy && currentEnemy.type === "Trap" ? "Avoid" : "Attack";
  }

  if (introText) {
    setEncounterText(
      introText + "\nYou encounter an evil " + currentEnemy.name + "."
    );
  } else {
    setEncounterText("You encounter an evil " + currentEnemy.name + ".");
  }

  showCurrentEnemyImage();

  updateUI();
  saveGame();
}

// Level up! Increases HP and Max HP by 1, and gives bonus to Attack/Avoid, to a max of 20
function levelUp(amount = 1) {
  const prevLevel = player.level;
  player.level = Math.min(player.level + amount, 20);
  // Only increase maxHP/hp by the actual level increase
  const actualIncrease = player.level - prevLevel;
  player.maxHP += actualIncrease;
  player.hp += actualIncrease;
  // Clamp HP to maxHP
  player.hp = Math.min(player.hp, player.maxHP);
}

// Encounter text like monster descriptions and item finds
function setEncounterText(text) {
  document.getElementById("storyText").innerText = text;
}

// Effect text like roll results and item pickups
function setEffectText(text) {
  document.getElementById("effectText").innerText = text;
}

// Roll a d20
function roll() {
  return Math.floor(Math.random() * 20) + 1;
}

// Attack Logic
async function attack() {
  if (gameState === "complete") return;
  if (pendingDrop) {
    // Use Attack, Restart, Special as drop selectors
    dropItem(0);
    return;
  }
  // If just found an item, consume the click to clear the state and advance to the next room only after the treasure step is resolved
  if (window._itemFound) {
    // Restore monster/trap image on next room
    window._itemFound = false;
    const nextTier = getZoneForProgress(Math.min(roomsCleared, BOSS_ROOM_INDEX));
    if (nextTier > 1 && !zonePath[nextTier]) {
      await promptZoneChoice(nextTier);
    }
    questIndex++;
    if (questIndex >= quest.length) {
      winGame();
      return;
    }
    startRoom();
    return;
  }
  if (waitingForNextRoom) {
    // Hide monster/trap image when clicking Next
    const monsterImage = document.getElementById("monsterImage");
    if (monsterImage) {
      monsterImage.src = "";
      monsterImage.style.display = "none";
    }
    waitingForNextRoom = false;
    nextRoom();
    return;
  }

  let roll1 = roll();
  let roll2 = null;
  let usedRoll = roll1;
  let advantageText = "";
  let isTrap = currentEnemy.type === "Trap";
  let isAttack = !isTrap;
  // Item effects
  let sword = player.items.includes("Sword");
  let shield = player.items.includes("Shield");
  let armor = player.items.includes("Armor");
  let cloak = player.items.includes("Cloak");
  let lance = player.items.includes("Lance");

  // Lance: Advantage on Attack against Dragons
  if (lance && isAttack && currentEnemy.type === "Dragon") {
    roll2 = roll();
    usedRoll = Math.max(roll1, roll2);
    advantageText = ` (Lance: Advantage vs Dragon, rolled ${roll1} and ${roll2}, kept ${usedRoll})`;
  } else if (player.advantage) {
    roll2 = roll();
    usedRoll = Math.max(roll1, roll2);
    advantageText = ` (Advantage: rolled ${roll1} and ${roll2}, kept ${usedRoll})`;
  }
  let bonus = 0;
  if (isAttack && sword) bonus += 1;
  if (isAttack && lance) bonus += 1;
  if (isTrap && cloak) bonus += 2;
  let challengeMod = shield ? -1 : 0;
  // The level bonus to the roll caps at 10, even though a player can reach level 20
  let levelBonus = Math.min(player.level, 10);
  let result = usedRoll + levelBonus + bonus;

  if (gameState === "won") {
    gameState = "playing";
    roomsCleared = 0;
    questIndex = 0;
    player.specialUses = CLASSES[player.classKey].specialUses;
    player.hp = player.maxHP;
    generateQuest();
    document.getElementById("restartBtn").innerText = "Restart Game";
    startRoom(
      "You rest at the Village, recovering fully, and set out once more."
    );
    return;
  }

  if (result >= currentEnemy.challenge + challengeMod) {
    setMonsterDefeated(true);
    let gainedLevel = false;
    if (isTrap) {
      // Traps give no reward, except a Thief gains a level for successfully avoiding one
      if (player.classKey === "Thief") {
        levelUp();
        gainedLevel = true;
      }
    } else if (player.classKey === "Hunter" && currentEnemy.type === "Beast") {
      levelUp(currentEnemy.damage);
      gainedLevel = true;
    } else {
      levelUp();
      gainedLevel = true;
    }
    const successVerb = isTrap ? "avoid" : "overcome";
    const rewardText = gainedLevel ? " and gain a level" : "";
    setEffectText(
      `You rolled ${usedRoll} + ${levelBonus}${bonus ? ` +${bonus}` : ""} = ${result} vs ${currentEnemy.challenge}${challengeMod ? (challengeMod > 0 ? `+${challengeMod}` : challengeMod) : ""}.${advantageText}\n\nHuzzah! You ${successVerb} the ${currentEnemy.name}${rewardText}.`
    );
  } else {
    const damageReduction =
      (player.classKey === "Warrior" && currentEnemy.type !== "Trap" ? 1 : 0) + (armor ? 1 : 0);
    const isThiefTrap = player.classKey === "Thief" && currentEnemy.type === "Trap";
    const damageTaken = isThiefTrap
      ? 0
      : Math.max(currentEnemy.damage - damageReduction, 0);

    player.hp -= damageTaken;

    setEffectText(
      `You rolled ${usedRoll} + ${levelBonus}${bonus ? ` +${bonus}` : ""} = ${result} vs ${currentEnemy.challenge}${challengeMod ? (challengeMod > 0 ? `+${challengeMod}` : challengeMod) : ""}.${advantageText}\n\nOuch! You take ${damageTaken} damage trying to overcome the ${currentEnemy.name}.`
    );

    // Game Over if HP 0 or lower
    if (player.hp <= 0) {
      gameOver();
      return;
    }
  }

  if (currentEnemy.boss) {
    if (result >= currentEnemy.challenge) {
      nextRoom();
    }
    // else stay in room
  } else {
    waitingForNextRoom = true;
  }
  updateUI();
}

// Special Button Logic for each Class 
async function special() {
  if (gameState === "idle") {
    await loadGame();
    return;
  }

  if (gameState === "complete") return;

  if (gameState === "won") return;

  if (player.specialUses <= 0) return;
  player.specialUses--;

  if (player.classKey === "Warrior") {
    levelUp();
    setEffectText("Warrior Special: You gain a level.");
  } else if (player.classKey === "Mage") {
    const spell = Math.floor(Math.random() * 6) + 1;
    let message = "Random Spell activated.";

    // Mage Spell Effects
    switch (spell) {
      case 1:
        player.hp = Math.max(player.hp - 1, 0);
        message = "Random Spell: You lose 1 HP.";
        if (player.hp <= 0) {
          document.getElementById("storyText").innerText = message + "\n" + player.name + " blew them self up with magic!";
          gameOver();
          updateUI();
          return;
        }
        break;
      case 2:
        currentEnemy.challenge += 1;
        currentEnemy.damage += 1;
        message = "Random Spell: The enemy's challenge and damage increase by 1.";
        break;
      case 3:
        player.hp = Math.min(
          Math.floor(Math.random() * 10) + 1 + player.level,
          player.maxHP
        );
        message = "Random Spell: Your health becomes a random number plus your level.";
        break;
      case 4:
        currentEnemy.challenge = Math.max(currentEnemy.challenge - 2, 1);
        currentEnemy.damage = Math.max(currentEnemy.damage - 2, 0);
        message = "Random Spell: The enemy's challenge and damage decrease by 2.";
        break;
      case 5:
        if (currentEnemy && currentEnemy.boss) {
          quest[questIndex] = pickRandomBoss(currentEnemy.name);
        } else {
          quest[questIndex] = getUniqueRoomForProgress(roomsCleared, currentEnemy?.name || null);
        }
        currentEnemy = quest[questIndex];
        updateAdvantage();
        message = "Random Spell: A new enemy appears.";
        setEncounterText("You encounter an evil " + currentEnemy.name + ".");
        showCurrentEnemyImage();
        break;
      case 6:
        if (currentEnemy && currentEnemy.boss) {
          message = "Random Spell: Teleport has no effect against the boss.";
        } else {
          message = "Random Spell: You teleport to the next room.";
          waitingForNextRoom = true;
        }
        break;
    }

    setEffectText(message);
    // Mage cannot use Special in same room twice, so disable button until next room
    if (player.classKey === "Mage") {
      document.getElementById("specialBtn").disabled = true;
    }
    if (waitingForNextRoom) {
      updateUI();
      return;
    }
  } else if (player.classKey === "Hunter") { // Hunter rerolls the room, works on Bosses too
    if (currentEnemy && currentEnemy.boss) {
      quest[questIndex] = pickRandomBoss(currentEnemy.name);
    } else {
      quest[questIndex] = getUniqueRoomForProgress(roomsCleared, currentEnemy?.name || null);
    }

    startRoom();
    return;
  } else if (player.classKey === "Thief") { // Thief can sneak past a room
    if (currentEnemy.boss) {
      setEffectText(
        "You sneak past the boss, defeating it without damage or level gain."
      );
      nextRoom();
      return;
    } else {
      setEffectText(
        "You sneak past the encounter without taking damage."
      );
      waitingForNextRoom = true;
      updateUI();
      return;
    }
  } else if (player.classKey === "Cleric") { // Cleric heals and destroys Undead
    // If Cleric has Grail, do not reduce HP, just heal to full
    if (player.items && player.items.includes("Grail")) {
      player.hp = player.maxHP;
      setEffectText("Cleric Special: You heal to full health, including the Grail bonus.");
    } else {
      player.hp = player.maxHP;
      setEffectText("Cleric Special: You heal to full health.");
    }

    if (currentEnemy && currentEnemy.type === "Undead") {
      if (currentEnemy.boss) {
        setEffectText(
          "Holy light heals you and destroys the Elder Lich."
        );
        nextRoom();
        return;
      } else {
        setMonsterDefeated(true);
        setEffectText(
          "Holy light heals you and destroys the Undead."
        );
        waitingForNextRoom = true;
        updateUI();
        return;
      }
    }
  }

  updateUI();
}

// Next Room Logic
function nextRoom() {
  // Traps are bonus encounters: they don't count toward zone progress or treasure
  const clearedNonBossRoom = Boolean(currentEnemy && !currentEnemy.boss && currentEnemy.type !== "Trap");
  if (clearedNonBossRoom) {
    roomsCleared++;
  }

  // Give item every 3 non-boss, non-trap rooms cleared.
  if (clearedNonBossRoom && roomsCleared % 3 === 0) {
    const item = getRandomItem();
    setEncounterText(`You search the room and find something... it's a ${item}!`);
    setEffectText(ITEMS.find(i => i.name === item).desc);
    window._itemFound = true;
    document.getElementById("attackBtn").innerText = "Next";
    showItemImage(item);
    if (player.items.length < 2) {
      player.items.push(item);
      updateUI();
      saveGame();
    } else {
      pendingItem = item;
      pendingDrop = true;
      updateUI();
    }
    return;
  }

  if (player.classKey === "Cleric") { // Cleric heals 1 HP per room completed
    player.hp = Math.min(player.hp + 1, 7 + player.level);
  }

  questIndex++;

  if (questIndex >= quest.length) {
    winGame();
    return;
  }

  startRoom();
}

// Advantage Logic
function updateAdvantage() {
  const cls = CLASSES[player.classKey];

  player.advantage =
    cls.advantage.includes(currentEnemy.type);
}

// Win/Lose Logic
function winGame() {
  gameState = "won";
  questsComplete = (typeof questsComplete === 'number' ? questsComplete : 0) + 1;

  const defeatedBoss = zonePath[MAX_ZONE];
  if (defeatedBoss && !defeatedBossZones.includes(defeatedBoss)) {
    defeatedBossZones.push(defeatedBoss);
  }

  const allBossZones = Object.keys(BOSSES_BY_ZONE);
  if (allBossZones.every(zone => defeatedBossZones.includes(zone))) {
    gameState = "complete";
    setEncounterText(
      "Congratulations! You have defeated every boss and fully conquered Go Forth and Quest!"
    );
    disableButtons();
    updateUI();
    saveGame();
    return;
  }

  setEncounterText(
    `You Have Conquered the Quest! \nPress Rest at Village to recover and continue your quest.`
  );
  document.getElementById("attackBtn").innerText = "Rest at Village"; // Attack button becomes Rest at Village
  document.getElementById("specialBtn").innerText = "Retire Hero";
  document.getElementById("attackBtn").disabled = false;
  document.getElementById("specialBtn").disabled = false;
  updateUI();
  saveGame();
}

// Reset if Game Over
function gameOver() {
  charactersSlain = (typeof charactersSlain === 'number' ? charactersSlain : 0) + 1;
  setEncounterText(
    "You have perished in the quest to a " + currentEnemy.name + ". Press Restart Game to start over, or New Hero to continue with a new character."
  );
  setEffectText("");
  setDeathScreen(true);
  updateUI();
  saveGame();
}

// UI Update
function updateUI() {
  // Ensure Grail HP bonus is always applied if present, and removed if not
  let baseMaxHP = CLASSES[player.classKey]?.baseHP + player.level;
  let hasGrail = player.items && player.items.includes("Grail");
  let expectedMaxHP = baseMaxHP + (hasGrail ? 2 : 0);
  if (player.maxHP !== expectedMaxHP) {
    // Adjust maxHP and clamp HP if needed
    player.maxHP = expectedMaxHP;
    player.hp = Math.min(player.hp, player.maxHP);
  }
  document.getElementById("playerInfo").innerText =
    `${player.name} the ${player.classKey}\nLevel: ${player.level} HP: ${player.hp} / ${player.maxHP}`;

  // Render player inventory as a list and summary
  const inventoryList = document.getElementById("inventory");
  if (inventoryList) {
    inventoryList.innerHTML = "";
    // Add summary line
    let summary = document.getElementById("inventorySummary");
    if (!summary) {
      summary = document.createElement("div");
      summary.id = "inventorySummary";
      inventoryList.parentNode.insertBefore(summary, inventoryList);
    }
    if (!player.items || player.items.length === 0) { // No items, one item, or two items
      summary.textContent = "Items: None";
    } else if (player.items.length === 2) {
      summary.textContent = `Items: ${player.items[0]} and ${player.items[1]}`;
    } else {
      summary.textContent = `Items: ${player.items[0]}`;
    }
  }
  let questCounter = document.getElementById("questCounter");
  if (!questCounter) {
    questCounter = document.createElement("div");
    questCounter.id = "questCounter";
    // Insert after roomTracker
    const roomTracker = document.getElementById("roomTracker");
    if (roomTracker && roomTracker.parentNode) {
      roomTracker.parentNode.insertBefore(questCounter, roomTracker.nextSibling);
    } else {
      document.body.appendChild(questCounter);
    }
  }
  questCounter.innerHTML = `Quests Completed: ${questsComplete}<br>Characters Slain: ${charactersSlain}`;

  // Show ADVANTAGE if class advantage or Lance vs Dragon
  let lance = player.items && player.items.includes("Lance");
  let isDragon = currentEnemy && currentEnemy.type === "Dragon";
  let showAdvantage = player.advantage || (lance && isDragon);
  document.getElementById("advantageText").innerText = showAdvantage ? "ADVANTAGE" : "";

  document.getElementById("roomInfo").innerText = currentEnemy
    ? `Challenge: ${currentEnemy.challenge} Damage: ${currentEnemy.damage}`
    : "Challenge: 0 Damage: 0";

  const tracker = document.getElementById("roomTracker");
  let displayRoomsCleared = Math.min(roomsCleared, BOSS_ROOM_INDEX);
  // Keep showing the just-finished zone until its treasure is resolved and the next zone is chosen
  const pendingTier = getZoneForProgress(displayRoomsCleared);
  if (pendingTier > 1 && !zonePath[pendingTier]) {
    displayRoomsCleared -= 1;
  }
  const roomPosition = getZoneRoomForIndex(displayRoomsCleared);
  const zoneName = zonePath[roomPosition.zone] || roomPosition.zone;
  const zoneLetter = getZoneLetter(roomPosition.zone).toUpperCase();
  const zoneLabel = `Zone ${roomPosition.zone}${zoneLetter}: The ${zoneName}`;
  tracker.innerHTML = `${zoneLabel}<br>Encounter: ${roomPosition.room}`;

  // Button text and logic based on game state
  if (pendingDrop) {
    // Show the item find message above the item UI
    let itemText = pendingItem ? `You search the room and find something... it's a ${pendingItem}!` : "You found an item!";
    document.getElementById("storyText").innerText = itemText;
    document.getElementById("attackBtn").innerText = player.items[1] ? `Drop ${player.items[1]}` : "Drop";
    document.getElementById("restartBtn").innerText = player.items[0] ? `Drop ${player.items[0]}` : "Drop";
    document.getElementById("specialBtn").innerText = `Ignore ${pendingItem}`;
    document.getElementById("attackBtn").disabled = false;
    document.getElementById("restartBtn").disabled = false;
    document.getElementById("specialBtn").disabled = false;
  } else if (gameState === "complete") {
    document.getElementById("attackBtn").disabled = true;
    document.getElementById("specialBtn").disabled = true;
  } else if (gameState === "won") {
    document.getElementById("attackBtn").innerText = "Rest at Village";
    document.getElementById("specialBtn").innerText = "Retire Hero";
    document.getElementById("attackBtn").disabled = false;
    document.getElementById("specialBtn").disabled = false;
  } else if (player.hp <= 0) {
    document.getElementById("attackBtn").innerText =
      currentEnemy && currentEnemy.type === "Trap" ? "Avoid" : "Attack";
    document.getElementById("attackBtn").disabled = true;
    document.getElementById("specialBtn").innerText = "New Hero";
    document.getElementById("specialBtn").disabled = false;
  } else if (window._itemFound) {
    document.getElementById("attackBtn").innerText = "Next";
    document.getElementById("attackBtn").disabled = false;
    document.getElementById("specialBtn").disabled = true;
    document.getElementById("specialBtn").innerText = "Special";
  } else if (waitingForNextRoom && !currentEnemy.boss) {
    document.getElementById("attackBtn").innerText = "Next";
    document.getElementById("attackBtn").disabled = player.hp <= 0;
    document.getElementById("specialBtn").disabled = true;
    document.getElementById("specialBtn").innerText = "Special";
  } else {
    document.getElementById("attackBtn").innerText =
      currentEnemy && currentEnemy.type === "Trap" ? "Avoid" : "Attack";
    document.getElementById("attackBtn").disabled = player.hp <= 0;
    document.getElementById("specialBtn").disabled =
      player.hp <= 0 || player.specialUses <= 0;

    if (gameState === "idle") {
      document.getElementById("specialBtn").innerText = "Load";
    } else {
      document.getElementById("specialBtn").innerText = "Special";
    }
  }
}

// Build the payload for saving the game state
function buildSavePayload() {
  const monsterImageContainer = document.getElementById("monsterImageContainer");
  return {
    player: {
      name: player.name,
      classKey: player.classKey,
      level: player.level,
      hp: player.hp,
      maxHP: player.maxHP,
      items: player.items,
      specialUses: player.specialUses
    },
    quest,
    questIndex,
    roomsCleared,
    zonePath,
    defeatedBossZones,
    questsComplete,
    charactersSlain,
    gameState,
    waitingForNextRoom,
    pendingItem,
    pendingDrop,
    displayedItem,
    itemFound: Boolean(window._itemFound),
    monsterDefeated: Boolean(monsterImageContainer && monsterImageContainer.classList.contains("x-overlay")),
    playerDead: player.hp <= 0,
    storyText: document.getElementById("storyText")?.innerText || "",
    effectText: document.getElementById("effectText")?.innerText || ""
  };
}

// Save/Load using MySQL backend
async function saveGame() {
  if (!player || !player.name) return;

  try {
    const response = await fetch("backend/save.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildSavePayload())
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Save request failed");
    }
  } catch (error) {
    console.error("Save failed", error);
    setEffectText("Could not save to the database.");
  }
}

async function loadGame(silent = false) {
  let response;

  try {
    response = await fetch("backend/load.php", {
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Load request failed");
    }
  } catch (error) {
    if (!silent) {
      document.getElementById("storyText").innerText = "Could not reach the save database.";
    }
    console.error("Load failed", error);
    return;
  }

  const data = await response.json();

  if (!data || !data.player) {
    if (!silent) {
      document.getElementById("storyText").innerText =
        "No saved character found.";
    }
    return;
  }

  gameState = data.gameState || "playing";
  setDeathScreen(Boolean(data.playerDead));
  document.getElementById("restartBtn").innerText = "Restart Game";
  document.getElementById("specialBtn").innerText = "Special";

  player = {
    name: data.player.name,
    classKey: data.player.classKey,
    level: parseInt(data.player.level),
    hp: parseInt(data.player.hp),
    maxHP: parseInt(data.player.maxHP),
    items: data.player.items || [],
    specialUses: parseInt(data.player.specialUses)
  };

  quest = data.quest || [];
  questIndex = parseInt(data.questIndex);
  roomsCleared = typeof data.roomsCleared === 'number' ? data.roomsCleared : 0;
  zonePath = data.zonePath && typeof data.zonePath === 'object' ? data.zonePath : { 1: "Village" };
  defeatedBossZones = Array.isArray(data.defeatedBossZones) ? data.defeatedBossZones : [];
  questsComplete = typeof data.questsComplete === 'number' ? data.questsComplete : 0;
  charactersSlain = typeof data.charactersSlain === 'number' ? data.charactersSlain : 0;
  waitingForNextRoom = Boolean(data.waitingForNextRoom);
  pendingItem = data.pendingItem || null;
  pendingDrop = Boolean(data.pendingDrop);
  displayedItem = data.displayedItem || null;
  window._itemFound = Boolean(data.itemFound);
  currentEnemy = quest[questIndex] || null;

  if (data.storyText) {
    setEncounterText(data.storyText);
  }
  if (typeof data.effectText === "string") {
    setEffectText(data.effectText);
  }

  if ((pendingDrop || window._itemFound) && displayedItem) {
    showItemImage(displayedItem);
  } else {
    showCurrentEnemyImage();
  }

  setMonsterDefeated(Boolean(data.monsterDefeated));
  updateAdvantage();
  enableButtons();
  updateUI();
}

// Button Event Listeners
document.getElementById("restartBtn").onclick = async function () {
  if (pendingDrop) {
    dropItem(0);
  } else {
    await restartGame();
  }
  await saveGame();
};
document.getElementById("attackBtn").onclick = async function () {
  if (pendingDrop) {
    dropItem(1);
  } else {
    await attack();
  }
  await saveGame();
};
document.getElementById("specialBtn").onclick = async function () {
  if (pendingDrop) {
    document.getElementById("specialBtn").disabled = false;
    dropItem(2);
  } else if (gameState === "won") {
    await retireHero();
  } else if (player.hp <= 0) {
    await retireHero();
  } else {
    await special();
  }
  await saveGame();
};