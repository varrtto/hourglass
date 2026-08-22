import type { InventoryItem } from "./types";

/** One-slot handgun: fires a bullet up to 5 tiles. */
export const HAND_GUN: InventoryItem = {
  id: "hand-gun",
  name: "Gun",
  kind: "weapon",
  attack: "ranged",
  range: 5,
  cooldown: 0.28,
  bulletSpeed: 14,
};

/** One-slot sword: melee swing with 1-tile reach. */
export const SWORD: InventoryItem = {
  id: "sword",
  name: "Sword",
  kind: "weapon",
  attack: "melee",
  range: 1,
  cooldown: 0.35,
};

export function isWeapon(
  item: InventoryItem | null | undefined,
): item is InventoryItem & { kind: "weapon" } {
  return item?.kind === "weapon";
}
