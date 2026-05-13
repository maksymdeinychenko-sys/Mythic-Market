/**
 * Hand-crafted SVG glyphs for every item in the catalog.
 *
 * Style: heraldic / woodcut. Single-color silhouette + 1–2 accent strokes.
 * viewBox is always 0 0 64 64. Each glyph is a pure function — no CSS deps —
 * so they render the same in tiles, tooltips, shop offers, and combat panes.
 */
import React, { useState } from "react";
import { hasItemSprite } from "@/data/spritesManifest";

interface Props {
  defId: string;
}

/**
 * Renders the item icon. If the sprite manifest knows about a generated
 * PNG for this item, render an <img>; otherwise fall back to the inline
 * SVG glyph. The manifest is updated by `npm run art`.
 */
export function ItemArt({ defId }: Props) {
  const [pngFailed, setPngFailed] = useState(false);
  if (hasItemSprite(defId) && !pngFailed) {
    return (
      <img
        src={`/sprites/items/${defId}.png`}
        alt=""
        aria-hidden="true"
        onError={() => setPngFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    );
  }
  const G = GLYPHS[defId] ?? FALLBACK;
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {G}
    </svg>
  );
}

// Color tokens used across glyphs. Kept here so theme tweaks happen in one place.
const C = {
  // Plant
  plantDark: "#3d6e47",
  plantMid: "#6cb47a",
  plantLite: "#9fd9a8",
  // Beast
  beastDark: "#7a4e2a",
  beastMid: "#c97a3e",
  beastLite: "#e0a370",
  // Fish
  fishDark: "#2d5878",
  fishMid: "#5b9ec0",
  fishLite: "#9fd1e8",
  // Universal / metals
  uniDark: "#5a4a32",
  uniMid: "#b8a878",
  uniLite: "#e6d8a8",
  // Generic
  black: "#1a1208",
  bone: "#ede5d3",
  blood: "#a83838",
  fire: "#ff7e3f",
  pearl: "#e8dcc4",
  poison: "#7fc97f",
  shadow: "#0e1a14",
  gold: "#e6c068",
};

// ─── Reusable little helpers ───────────────────────────────────────────────
const stroke = (w = 1.5) => ({ stroke: C.black, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

// ─── Glyphs ────────────────────────────────────────────────────────────────

const FALLBACK = (
  <g>
    <circle cx="32" cy="32" r="22" fill="#3d5a45" stroke={C.black} strokeWidth="1.5" />
    <text x="32" y="38" textAnchor="middle" fontSize="22" fill={C.bone}>?</text>
  </g>
);

const GLYPHS: Record<string, React.ReactNode> = {

  // ───────── PLANT ─────────
  banana: (
    <g {...stroke(1.5)}>
      <path d="M 14 22 Q 16 50 44 50 L 50 44 Q 50 26 30 18 Z" fill="#f0c845" />
      <path d="M 30 18 Q 28 14 32 12 L 36 14 L 34 18" fill={C.plantDark} />
      <path d="M 18 26 Q 22 44 42 46" fill="none" stroke="#b89030" strokeWidth="1.5" />
    </g>
  ),
  berry_bush: (
    <g {...stroke(1.2)}>
      <path d="M 12 50 Q 14 30 32 26 Q 50 30 52 50 Z" fill={C.plantDark} />
      <circle cx="22" cy="38" r="5" fill="#7c3a8a" />
      <circle cx="32" cy="34" r="5" fill="#7c3a8a" />
      <circle cx="42" cy="40" r="5" fill="#7c3a8a" />
      <circle cx="28" cy="46" r="4" fill="#9858a8" />
      <circle cx="38" cy="46" r="4" fill="#9858a8" />
      <circle cx="22" cy="36" r="1.2" fill={C.bone} opacity="0.7" />
      <circle cx="32" cy="32" r="1.2" fill={C.bone} opacity="0.7" />
      <circle cx="42" cy="38" r="1.2" fill={C.bone} opacity="0.7" />
    </g>
  ),
  thorny_vine: (
    <g {...stroke(1.5)}>
      <path d="M 12 50 Q 24 38 30 28 Q 38 14 50 14" fill="none" stroke={C.plantDark} strokeWidth="3" />
      <path d="M 18 44 L 14 38 M 24 36 L 30 32 M 36 22 L 30 18 M 44 16 L 48 22"
            stroke={C.plantDark} strokeWidth="2" fill="none" />
      <circle cx="22" cy="42" r="2" fill={C.blood} />
      <circle cx="34" cy="26" r="2" fill={C.blood} />
      <circle cx="46" cy="14" r="2" fill={C.blood} />
    </g>
  ),
  ancient_root: (
    <g {...stroke(1.5)}>
      <path d="M 32 8 L 32 28 L 14 50 L 22 50 L 32 36 L 42 50 L 50 50 L 32 28" fill={C.beastDark} />
      <path d="M 28 14 Q 24 18 22 14 M 36 14 Q 40 18 42 14" stroke={C.plantDark} strokeWidth="2" fill="none" />
      <circle cx="32" cy="32" r="3" fill={C.gold} />
    </g>
  ),
  world_seed: (
    <g {...stroke(1.5)}>
      <ellipse cx="32" cy="36" rx="14" ry="18" fill={C.plantMid} />
      <ellipse cx="32" cy="36" rx="14" ry="18" fill="none" stroke={C.plantDark} strokeWidth="1.5" />
      <path d="M 32 18 Q 28 10 22 12 Q 26 16 30 18 Z" fill={C.plantDark} />
      <circle cx="32" cy="36" r="6" fill={C.gold} opacity="0.6" />
      <circle cx="32" cy="36" r="3" fill="#fff7d0" />
      <path d="M 24 32 Q 32 28 40 32 M 24 40 Q 32 44 40 40" stroke={C.plantDark} strokeWidth="1" fill="none" opacity="0.5" />
    </g>
  ),
  bramble_trap: (
    <g {...stroke(1.2)}>
      <path d="M 12 32 Q 32 8 52 32 Q 32 56 12 32 Z" fill={C.plantDark} />
      <path d="M 16 32 Q 32 16 48 32 Q 32 48 16 32 Z" fill={C.plantMid} />
      <circle cx="32" cy="32" r="6" fill={C.blood} />
      <circle cx="32" cy="32" r="3" fill="#1a0808" />
      <path d="M 12 32 L 6 32 M 52 32 L 58 32 M 32 12 L 32 6 M 32 52 L 32 58" stroke={C.plantDark} strokeWidth="2" />
    </g>
  ),
  mossy_branch: (
    <g {...stroke(1.5)}>
      <path d="M 8 40 L 56 24" stroke={C.beastDark} strokeWidth="4" />
      <ellipse cx="20" cy="36" rx="8" ry="3" fill={C.plantMid} />
      <ellipse cx="34" cy="30" rx="9" ry="3" fill={C.plantMid} />
      <ellipse cx="48" cy="26" rx="6" ry="3" fill={C.plantMid} />
      <circle cx="22" cy="34" r="1.5" fill={C.plantLite} />
      <circle cx="34" cy="28" r="1.5" fill={C.plantLite} />
      <circle cx="46" cy="24" r="1.5" fill={C.plantLite} />
    </g>
  ),
  sunflower: (
    <g {...stroke(1.2)}>
      <g fill="#f0c845">
        <ellipse cx="32" cy="22" rx="6" ry="11" />
        <ellipse cx="32" cy="22" rx="6" ry="11" transform="rotate(45 32 22)" />
        <ellipse cx="32" cy="22" rx="6" ry="11" transform="rotate(90 32 22)" />
        <ellipse cx="32" cy="22" rx="6" ry="11" transform="rotate(135 32 22)" />
      </g>
      <circle cx="32" cy="22" r="6" fill="#5a3818" />
      <circle cx="32" cy="22" r="6" fill="none" stroke={C.black} strokeWidth="1" />
      <path d="M 32 32 L 32 56" stroke={C.plantDark} strokeWidth="3" />
      <path d="M 32 44 L 24 40 M 32 48 L 40 44" stroke={C.plantDark} strokeWidth="2" fill="none" />
    </g>
  ),

  // ───────── BEAST ─────────
  monkey_paw: (
    <g {...stroke(1.5)}>
      <ellipse cx="32" cy="40" rx="14" ry="12" fill={C.beastDark} />
      <ellipse cx="32" cy="40" rx="9" ry="7" fill={C.beastLite} />
      <circle cx="22" cy="22" r="5" fill={C.beastDark} />
      <circle cx="32" cy="18" r="5" fill={C.beastDark} />
      <circle cx="42" cy="22" r="5" fill={C.beastDark} />
      <circle cx="48" cy="32" r="4" fill={C.beastDark} />
      <circle cx="22" cy="22" r="2" fill={C.beastLite} />
      <circle cx="32" cy="18" r="2" fill={C.beastLite} />
      <circle cx="42" cy="22" r="2" fill={C.beastLite} />
    </g>
  ),
  tiger_claw: (
    <g {...stroke(1.5)}>
      <path d="M 12 12 Q 18 32 30 50 L 22 50 Q 14 32 8 14 Z" fill={C.beastDark} />
      <path d="M 22 12 Q 28 32 40 50 L 32 50 Q 24 32 18 14 Z" fill={C.beastMid} />
      <path d="M 32 12 Q 38 32 50 50 L 42 50 Q 34 32 28 14 Z" fill={C.beastDark} />
      <path d="M 42 12 Q 48 32 60 50 L 52 50 Q 44 32 38 14 Z" fill={C.beastMid} />
    </g>
  ),
  wolf_spirit: (
    <g {...stroke(1.5)}>
      <path d="M 14 30 L 22 18 L 28 26 L 32 14 L 36 26 L 42 18 L 50 30 L 48 50 L 16 50 Z" fill="#5a5252" />
      <path d="M 14 30 L 22 18 L 28 26" fill="#3a3636" />
      <path d="M 36 26 L 42 18 L 50 30" fill="#3a3636" />
      <ellipse cx="24" cy="38" rx="2.5" ry="3" fill="#ffd870" />
      <ellipse cx="40" cy="38" rx="2.5" ry="3" fill="#ffd870" />
      <path d="M 28 44 L 32 48 L 36 44 Z" fill="#1a0808" />
    </g>
  ),
  bear_pelt: (
    <g {...stroke(1.5)}>
      <path d="M 14 14 Q 18 6 26 10 Q 32 6 38 10 Q 46 6 50 14 Q 54 28 50 44 Q 32 56 14 44 Q 10 28 14 14 Z" fill={C.beastDark} />
      <ellipse cx="22" cy="14" rx="4" ry="5" fill={C.beastDark} />
      <ellipse cx="42" cy="14" rx="4" ry="5" fill={C.beastDark} />
      <circle cx="26" cy="26" r="2" fill={C.gold} />
      <circle cx="38" cy="26" r="2" fill={C.gold} />
      <path d="M 28 36 Q 32 40 36 36" stroke={C.beastLite} strokeWidth="1.5" fill="none" />
    </g>
  ),
  dragon_heart: (
    <g {...stroke(1.5)}>
      <path d="M 32 50 Q 8 36 12 22 Q 14 12 22 12 Q 28 12 32 18 Q 36 12 42 12 Q 50 12 52 22 Q 56 36 32 50 Z" fill={C.blood} />
      <path d="M 22 18 Q 18 10 22 6 Q 28 12 26 16 Z" fill={C.fire} />
      <path d="M 32 14 Q 30 6 34 4 Q 38 10 36 14 Z" fill={C.fire} />
      <path d="M 42 18 Q 46 8 42 4 Q 36 12 38 16 Z" fill={C.fire} />
      <circle cx="32" cy="30" r="4" fill="#f0c0a0" opacity="0.6" />
    </g>
  ),
  lion_mane: (
    <g {...stroke(1.5)}>
      <g fill="#c8943c">
        <circle cx="32" cy="32" r="22" />
        <path d="M 32 6 L 28 14 L 36 14 Z" />
        <path d="M 16 12 L 14 22 L 22 18 Z" />
        <path d="M 48 12 L 50 22 L 42 18 Z" />
        <path d="M 8 22 L 4 32 L 12 30 Z" />
        <path d="M 56 22 L 60 32 L 52 30 Z" />
        <path d="M 8 42 L 4 50 L 14 46 Z" />
        <path d="M 56 42 L 60 50 L 50 46 Z" />
      </g>
      <circle cx="32" cy="32" r="14" fill={C.beastLite} />
      <circle cx="26" cy="30" r="2" fill={C.black} />
      <circle cx="38" cy="30" r="2" fill={C.black} />
      <path d="M 28 36 L 32 40 L 36 36" stroke={C.beastDark} strokeWidth="1.5" fill="none" />
    </g>
  ),
  spider_fang: (
    <g {...stroke(1.5)}>
      <path d="M 18 12 L 24 38 Q 22 46 18 48 Q 14 46 14 38 Z" fill="#3a2a4a" />
      <path d="M 46 12 L 40 38 Q 42 46 46 48 Q 50 46 50 38 Z" fill="#3a2a4a" />
      <ellipse cx="32" cy="22" rx="10" ry="6" fill="#1a1218" />
      <circle cx="28" cy="20" r="1.5" fill={C.poison} />
      <circle cx="36" cy="20" r="1.5" fill={C.poison} />
      <path d="M 18 48 L 18 52 M 46 48 L 46 52" stroke={C.poison} strokeWidth="2" />
    </g>
  ),
  ram_horn: (
    <g {...stroke(1.5)}>
      <path d="M 14 42 Q 6 30 14 18 Q 24 14 26 26 Q 24 36 18 38 Q 14 36 16 30 Q 18 26 22 28"
            fill={C.uniMid} stroke={C.black} strokeWidth="1.5" />
      <path d="M 50 42 Q 58 30 50 18 Q 40 14 38 26 Q 40 36 46 38 Q 50 36 48 30 Q 46 26 42 28"
            fill={C.uniMid} stroke={C.black} strokeWidth="1.5" />
      <path d="M 28 22 Q 32 14 36 22 L 36 28 Q 32 32 28 28 Z" fill="#5a4a32" />
    </g>
  ),

  // ───────── FISH ─────────
  coral_shield: (
    <g {...stroke(1.5)}>
      <path d="M 32 8 L 50 16 Q 50 36 32 56 Q 14 36 14 16 Z" fill={C.fishMid} />
      <path d="M 32 14 L 44 18 Q 44 34 32 48 Q 20 34 20 18 Z" fill={C.fishLite} />
      <path d="M 28 24 Q 30 28 28 32 M 36 24 Q 34 28 36 32 M 32 18 L 32 38" stroke={C.fishDark} strokeWidth="1.5" fill="none" />
      <circle cx="32" cy="28" r="2" fill={C.pearl} />
    </g>
  ),
  electric_eel: (
    <g {...stroke(1.5)}>
      <path d="M 12 50 L 28 30 L 22 26 L 38 14 L 32 30 L 38 32 L 22 50 L 28 38 L 18 36 Z"
            fill="#fff080" stroke={C.fishDark} strokeWidth="1.5" />
      <circle cx="32" cy="22" r="1.8" fill={C.black} />
      <path d="M 14 50 L 8 56 M 22 50 L 18 58" stroke="#fff080" strokeWidth="1.5" fill="none" />
    </g>
  ),
  vampire_squid: (
    <g {...stroke(1.5)}>
      <ellipse cx="32" cy="22" rx="14" ry="12" fill="#5a2a4a" />
      <path d="M 18 28 Q 14 44 12 56 M 24 30 Q 22 46 22 56 M 30 30 L 30 56 M 38 30 L 38 56 M 44 30 Q 46 46 50 56 M 50 28 Q 54 44 58 56"
            stroke="#5a2a4a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="26" cy="22" r="2" fill={C.blood} />
      <circle cx="38" cy="22" r="2" fill={C.blood} />
      <path d="M 28 28 L 30 32 L 34 32 L 36 28" stroke={C.blood} strokeWidth="1" fill="none" />
    </g>
  ),
  abyssal_pearl: (
    <g {...stroke(1.5)}>
      <path d="M 8 32 Q 32 12 56 32 Q 32 52 8 32 Z" fill={C.fishDark} />
      <path d="M 14 32 Q 32 18 50 32 Q 32 46 14 32 Z" fill={C.fishMid} />
      <circle cx="32" cy="32" r="8" fill={C.pearl} />
      <circle cx="30" cy="30" r="3" fill="#fff7f0" opacity="0.8" />
      <path d="M 8 32 L 4 40 M 56 32 L 60 40" stroke={C.fishDark} strokeWidth="2" />
    </g>
  ),
  leviathan_fin: (
    <g {...stroke(1.5)}>
      <path d="M 8 56 Q 12 24 32 8 Q 38 28 36 56 Z" fill={C.fishDark} />
      <path d="M 14 50 Q 18 30 32 16 Q 32 32 30 50 Z" fill={C.fishMid} />
      <path d="M 18 50 L 18 38 M 22 50 L 22 32 M 26 50 L 26 26" stroke={C.fishDark} strokeWidth="1" fill="none" />
      <path d="M 36 56 L 56 50 L 52 44 L 44 46 Z" fill={C.fishDark} />
    </g>
  ),
  jellyfish_tendril: (
    <g {...stroke(1.5)}>
      <path d="M 14 22 Q 14 8 32 8 Q 50 8 50 22 L 50 28 L 14 28 Z" fill="#c898d8" opacity="0.85" />
      <path d="M 14 28 L 14 22 Q 14 8 32 8 Q 50 8 50 22 L 50 28" fill="none" stroke="#7c5a8a" strokeWidth="1.5" />
      <path d="M 18 28 Q 16 44 20 56 M 26 28 Q 28 46 24 56 M 34 28 Q 36 46 32 56 M 42 28 Q 40 46 44 56 M 48 28 Q 50 44 46 56"
            stroke="#7c5a8a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="20" r="1.8" fill={C.poison} />
      <circle cx="40" cy="20" r="1.8" fill={C.poison} />
    </g>
  ),
  lava_crab: (
    <g {...stroke(1.5)}>
      <ellipse cx="32" cy="36" rx="16" ry="11" fill="#a83838" />
      <ellipse cx="32" cy="34" rx="12" ry="6" fill={C.fire} />
      <circle cx="26" cy="32" r="2" fill={C.gold} />
      <circle cx="38" cy="32" r="2" fill={C.gold} />
      <path d="M 14 32 Q 6 26 10 18 Q 16 22 18 28 M 50 32 Q 58 26 54 18 Q 48 22 46 28"
            fill="#a83838" stroke={C.black} strokeWidth="1.5" />
      <path d="M 18 46 L 14 54 M 26 48 L 24 56 M 38 48 L 40 56 M 46 46 L 50 54" stroke="#a83838" strokeWidth="2" fill="none" />
    </g>
  ),
  pufferfish: (
    <g {...stroke(1.5)}>
      <circle cx="32" cy="32" r="18" fill="#e0a850" />
      <g stroke={C.black} strokeWidth="1.5" fill={C.uniDark}>
        <path d="M 14 22 L 8 18 M 14 32 L 6 30 M 14 42 L 8 46
                 M 50 22 L 56 18 M 50 32 L 58 30 M 50 42 L 56 46
                 M 32 14 L 30 6 M 32 50 L 30 58
                 M 22 14 L 18 8 M 42 14 L 46 8
                 M 22 50 L 18 56 M 42 50 L 46 56" />
      </g>
      <circle cx="26" cy="28" r="2.5" fill={C.bone} />
      <circle cx="38" cy="28" r="2.5" fill={C.bone} />
      <circle cx="26" cy="28" r="1.2" fill={C.black} />
      <circle cx="38" cy="28" r="1.2" fill={C.black} />
      <path d="M 26 38 Q 32 42 38 38" stroke={C.black} strokeWidth="1.5" fill="none" />
    </g>
  ),

  // ───────── UNIVERSAL / UTILITY ─────────
  golden_coin: (
    <g {...stroke(1.5)}>
      <circle cx="32" cy="32" r="22" fill={C.gold} />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#a8843c" strokeWidth="2" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="#a8843c" strokeWidth="1" />
      <text x="32" y="40" textAnchor="middle" fontSize="20" fontWeight="900" fill="#5a3818" fontFamily="serif">M</text>
    </g>
  ),
  whetstone: (
    <g {...stroke(1.5)}>
      <path d="M 10 38 L 16 22 L 50 18 L 54 34 L 22 44 Z" fill="#7a7268" />
      <path d="M 16 22 L 50 18 L 54 34 L 22 44 Z" fill="#9a928a" />
      <path d="M 22 28 L 46 24 M 24 34 L 48 30" stroke="#5a5248" strokeWidth="1" fill="none" />
    </g>
  ),
  hourglass: (
    <g {...stroke(1.5)}>
      <path d="M 16 8 L 48 8 L 48 14 L 32 32 L 48 50 L 48 56 L 16 56 L 16 50 L 32 32 L 16 14 Z" fill="#a87444" />
      <path d="M 22 14 L 42 14 L 32 28 Z" fill={C.gold} />
      <path d="M 22 50 L 42 50 L 32 38 Z" fill={C.gold} />
      <path d="M 32 28 L 32 38" stroke={C.gold} strokeWidth="2" />
      <circle cx="32" cy="33" r="0.8" fill={C.gold} />
    </g>
  ),
  cursed_idol: (
    <g {...stroke(1.5)}>
      <path d="M 16 8 L 48 8 L 50 56 L 14 56 Z" fill="#3a4a40" />
      <path d="M 18 14 L 46 14 L 48 50 L 16 50 Z" fill="#5a6a60" />
      <ellipse cx="26" cy="24" rx="3" ry="4" fill="#a83838" />
      <ellipse cx="38" cy="24" rx="3" ry="4" fill="#a83838" />
      <path d="M 22 36 L 28 38 L 32 36 L 36 38 L 42 36 L 38 42 L 32 42 L 26 42 Z" fill={C.black} />
    </g>
  ),
  burning_brand: (
    <g {...stroke(1.5)}>
      <path d="M 30 56 L 30 28 L 34 28 L 34 56 Z" fill={C.beastDark} />
      <path d="M 32 28 Q 22 22 24 14 Q 28 18 30 14 Q 30 8 36 8 Q 38 14 42 14 Q 44 22 32 28 Z" fill={C.fire} />
      <path d="M 32 22 Q 28 18 30 12 Q 32 16 32 14 Q 36 16 36 20 Q 36 24 32 22 Z" fill="#fff070" />
    </g>
  ),
  venom_vial: (
    <g {...stroke(1.5)}>
      <path d="M 24 8 L 40 8 L 40 18 L 44 26 L 44 50 Q 44 56 38 56 L 26 56 Q 20 56 20 50 L 20 26 L 24 18 Z" fill="#3a4a3a" stroke={C.black} strokeWidth="1.5" />
      <path d="M 22 30 L 42 30 L 42 50 Q 42 54 38 54 L 26 54 Q 22 54 22 50 Z" fill={C.poison} />
      <path d="M 26 36 L 30 40 M 34 38 L 38 42 M 28 46 L 34 46" stroke="#3a4a3a" strokeWidth="1.5" fill="none" />
      <circle cx="30" cy="34" r="1" fill="#3a4a3a" />
      <circle cx="38" cy="48" r="1" fill="#3a4a3a" />
    </g>
  ),
  ironwood_talisman: (
    <g {...stroke(1.5)}>
      <circle cx="32" cy="32" r="20" fill={C.uniDark} />
      <circle cx="32" cy="32" r="20" fill="none" stroke={C.gold} strokeWidth="2" />
      <circle cx="32" cy="32" r="14" fill={C.uniMid} />
      <path d="M 24 24 Q 32 18 40 24 M 24 40 Q 32 46 40 40" stroke={C.plantDark} strokeWidth="2" fill="none" />
      <circle cx="32" cy="32" r="4" fill={C.plantMid} />
      <path d="M 32 4 L 32 12 M 32 52 L 32 60 M 4 32 L 12 32 M 52 32 L 60 32" stroke={C.gold} strokeWidth="1.5" />
    </g>
  ),
};
