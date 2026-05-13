/**
 * Mythic Market — Core Types
 * Single source of truth for the entire simulation.
 */

// ============================================================================
// Rarity & scaling
// ============================================================================

export type Rarity = "Wooden" | "Bronze" | "Silver" | "Gold" | "Diamond";

export const RARITY_ORDER: Rarity[] = ["Wooden", "Bronze", "Silver", "Gold", "Diamond"];

export const RARITY_INDEX: Record<Rarity, number> = {
  Wooden: 0,
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Diamond: 4,
};

// ============================================================================
// Nature & heroes
// ============================================================================

export type NatureType = "Beast" | "Fish" | "Plant" | "Universal";

export interface Hero {
  id: string;
  name: string;
  natureType: Exclude<NatureType, "Universal">;
  passiveName: string;
  passiveDescription: string;
  /** Path to a portrait/emoji shorthand for prototype UI. */
  portrait: string;
}

// ============================================================================
// Items
// ============================================================================

export type Keyword =
  | "Damage"
  | "Shield"
  | "Healing"
  | "Overhealing"
  | "Vampirism"
  | "Slowing"
  | "Fasting"
  | "Recharge"
  // ─── New status effects ────────────────────────────────────────────────
  /** Periodic damage. Hits shield first, then HP. Stacks add intensity. */
  | "Burn"
  /** Periodic damage that bypasses shield entirely. Slower tick than burn. */
  | "Poison"
  /** Passive HP regen while equipped. */
  | "Regen";

export type LinkDirection = "Left" | "Right" | "Both" | "Global" | "None";

export type ItemSize = 1 | 2 | 3;

/**
 * Per-item flavor knobs. NOTE: as of the balance pass, primary effect
 * magnitudes (Damage / Shield / Healing / Overhealing) are read directly from
 * the EFFECT_TABLE at the item's rarity — base values here are now ignored
 * for those keywords. They survive only as flags meaning "this item carries
 * this keyword." Status-effect magnitudes still live here.
 */
export interface ItemBaseEffects {
  damage?: number;
  shield?: number;
  healing?: number;
  overhealing?: number;
  vampirismPct?: number;
  slowingSec?: number;
  rechargeSec?: number;
  fastingSec?: number;
  /** Burn stacks applied to enemy on trigger. */
  burnStacks?: number;
  /** Poison stacks applied to enemy on trigger. */
  poisonStacks?: number;
  /** Passive HP regen per second while this item is equipped. */
  regenPerSec?: number;
}

/** Active level-up perk IDs the player has chosen. */
export type PerkId =
  | "more_combat_hp"
  | "recharge_beast"
  | "recharge_fish"
  | "recharge_plant"
  | "damage_boost"
  | "shield_boost"
  | "heal_boost"
  | "vampirism_boost"
  | "extra_slot"
  | "gold_per_day"
  | "passive_regen"
  | "burn_on_damage";

/** Static link bonus this item *gives* to its neighbours (not what it receives). */
export interface LinkBonus {
  direction: LinkDirection;
  /** Bonus damage to adjacent. */
  damage?: number;
  /** Bonus shield to adjacent. */
  shield?: number;
  /** % healing buff to adjacent. */
  healingPct?: number;
  /** % vampirism to adjacent. */
  vampirismPct?: number;
  /** % cooldown reduction to adjacent (multiplicative). */
  cooldownReductionPct?: number;
  /** For Global links: nature type that receives the buff. */
  globalTarget?: NatureType;
}

/**
 * An item definition (the catalog entry). An ItemInstance is created at runtime
 * with current rarity/slot/links populated.
 */
export interface ItemDef {
  id: string;
  name: string;
  natureType: NatureType;
  size: ItemSize;
  /** Lowest rarity this item appears at. */
  minRarity: Rarity;
  /** Maximum rarity (Diamond unless otherwise capped). */
  maxRarity: Rarity;
  /** Base cooldown in seconds at any rarity (CD usually doesn't change on merge). */
  baseCooldown: number;
  /** Keywords this item carries. Drives combat resolution. */
  keywords: Keyword[];
  /** Base effect magnitudes (Wooden tier). Scaled at runtime. */
  baseEffects: ItemBaseEffects;
  /** Link bonus this item provides. */
  link?: LinkBonus;
  /** Description for UI tooltips. */
  description: string;
  /** Marker for "Heavy" tag (counts against hero's heavy capacity). */
  heavy?: boolean;
}

/** A live, placed item with its rarity, position, and link orientation. */
export interface ItemInstance {
  uid: string;            // unique runtime ID (different from def.id)
  defId: string;
  rarity: Rarity;
  /** Player can flip directional links for some items in some builds. */
  linkOverride?: LinkDirection;
  /** -1 means "in stash" / not placed. */
  slotIndex: number;
}

// ============================================================================
// Combatants
// ============================================================================

export interface Combatant {
  id: string;
  displayName: string;
  natureType: Exclude<NatureType, "Universal">;
  level: number;
  maxHp: number;
  currentHp: number;
  /** Items in 8-slot battle grid. Stash items are NOT here. */
  inventory: ItemInstance[];
}

// ============================================================================
// Encounters & NPCs
// ============================================================================

export type Difficulty = "Easy" | "Hard" | "SuperHard";

export type ArchetypeId = "IronBark" | "Viper" | "Predator" | "Druid";

export interface NPCArchetype {
  id: ArchetypeId;
  name: string;
  description: string;
  /** Core item def IDs this archetype prefers (in priority order). */
  commonItems: string[];
  /** Nature type slant for visual. */
  natureType: Exclude<NatureType, "Universal">;
}

export interface Encounter {
  id: string;
  day: number;
  difficulty: Difficulty;
  archetypeId: ArchetypeId;
  combatant: Combatant;
  reward: {
    gold: number;
    xp: number;
    itemRarityRange: [Rarity, Rarity];
  };
}

// ============================================================================
// Ghosts
// ============================================================================

export interface GhostSnapshot {
  ghost_id: string;
  player_id: string;
  day: number;
  hero_id: string;
  hero_level: number;
  max_hp: number;
  current_hp: number;
  inventory: Array<{
    slot: number;
    def_id: string;
    rarity: Rarity;
    links: LinkDirection;
  }>;
  /** Win streak / loss streak signals at time of capture. Used by matchmaking. */
  meta?: {
    win_count?: number;
    loss_count?: number;
    captured_at: string; // ISO date
  };
}

// ============================================================================
// Run state
// ============================================================================

export type Phase = 1 | 2 | 3 | 4 | 5 | 6;

export type ScreenId =
  | "MainMenu"
  | "HeroSelect"
  | "DayHub"
  | "Workshop"
  | "Combat"
  | "EndOfRun";

/** Choice nodes appear at phases 2, 4, 5. Track which branch the player took. */
export type PhaseBranch = "Find" | "Trader" | "PvE";
export type PhaseChoiceMap = Partial<Record<2 | 4 | 5, PhaseBranch>>;

export interface RunState {
  heroId: string;
  level: number;
  xp: number;
  gold: number;
  /**
   * Persistent run-level "trophies." Starts at 10. Decrements only when the
   * player loses a fight. Hitting 0 ends the run.
   *
   * In-combat HP is a separate concept handled by `Combatant.maxHp`/`currentHp`
   * — that pool drains during a single fight and resets between fights.
   */
  lives: number;
  maxLives: number;
  day: number;
  phase: Phase;
  /** Items currently placed in the 8-slot battle grid. */
  battleInventory: ItemInstance[];
  /** Items in the stash (inactive). */
  stash: ItemInstance[];
  /** Win/loss streak for ghost matchmaking. */
  pvpWinStreak: number;
  pvpLossStreak: number;
  /** Frozen items in shop carrying over to next reroll/day. */
  shopLockedUids: string[];
  /** Phases already resolved on this day. */
  resolvedPhases: Phase[];
  /** Branch choices for the current day's choice phases. Cleared on day rollover. */
  phaseChoices: PhaseChoiceMap;
  /** Perks chosen at level-ups. Stack and apply during combat. */
  perks: PerkId[];
  /** Number of unresolved level-up choices waiting on the player. */
  pendingPerkChoices: number;
}

// ============================================================================
// Events (Phase A / Phase B)
// ============================================================================

export type EventType = "Find" | "Trader" | "Blessing" | "Curse";

export interface PhaseEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  /** Resolution callback shape — UI passes the runState in, gets a delta back. */
  // The actual resolution function lives in core/events.ts; this is just metadata.
}
