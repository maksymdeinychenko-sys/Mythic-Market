/**
 * SVG portraits for the three heroes. viewBox 0 0 100 100.
 * Designed to read clearly at sizes from 28px (TopBar inline) to 140px
 * (HeroSelect cards). Style: heraldic medallion — circular framed bust
 * with nature-type background tint.
 */
import React, { useState } from "react";
import { hasHeroSprite } from "@/data/spritesManifest";

interface Props {
  heroId: string;
  /** Optional className for sizing wrappers. */
  className?: string;
}

/**
 * Renders a hero portrait. Uses a generated PNG if listed in the sprite
 * manifest; otherwise falls back to the inline SVG portrait.
 */
export function HeroArt({ heroId, className }: Props) {
  const [pngFailed, setPngFailed] = useState(false);
  if (hasHeroSprite(heroId) && !pngFailed) {
    return (
      <img
        src={`/sprites/heroes/${heroId}.png`}
        alt=""
        aria-hidden="true"
        className={className}
        onError={() => setPngFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
      />
    );
  }
  const Portrait = PORTRAITS[heroId] ?? PORTRAITS.fallback;
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Subtle vignette gradient used by every portrait */}
        <radialGradient id="hero-glow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="rgba(255,240,200,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <Portrait />
    </svg>
  );
}

// ─── Shared frame helper ───────────────────────────────────────────────────
function Frame({ tint }: { tint: string }) {
  return (
    <>
      <circle cx="50" cy="50" r="48" fill={tint} />
      <circle cx="50" cy="50" r="48" fill="url(#hero-glow)" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#0e1a14" strokeWidth="2" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#d4a857" strokeWidth="0.6" opacity="0.5" />
    </>
  );
}

// ─── Monkey (Beast) ────────────────────────────────────────────────────────
function MonkeyPortrait() {
  return (
    <g>
      <Frame tint="#3a2a1e" />
      {/* outer head fur */}
      <ellipse cx="50" cy="52" rx="32" ry="34" fill="#7a4e2a" />
      {/* face mask (lighter inset) */}
      <ellipse cx="50" cy="58" rx="22" ry="22" fill="#e0a370" />
      {/* ears */}
      <circle cx="20" cy="48" r="9" fill="#7a4e2a" stroke="#1a0e08" strokeWidth="1" />
      <circle cx="20" cy="48" r="4" fill="#c97a3e" />
      <circle cx="80" cy="48" r="9" fill="#7a4e2a" stroke="#1a0e08" strokeWidth="1" />
      <circle cx="80" cy="48" r="4" fill="#c97a3e" />
      {/* brow tuft */}
      <path d="M 32 36 Q 50 26 68 36 Q 50 30 32 36 Z" fill="#5a3a1e" />
      {/* eyes */}
      <ellipse cx="42" cy="54" rx="4" ry="5" fill="#fff7e0" />
      <ellipse cx="58" cy="54" rx="4" ry="5" fill="#fff7e0" />
      <circle cx="42" cy="55" r="2.2" fill="#1a0e08" />
      <circle cx="58" cy="55" r="2.2" fill="#1a0e08" />
      <circle cx="42.7" cy="54" r="0.9" fill="#fff" />
      <circle cx="58.7" cy="54" r="0.9" fill="#fff" />
      {/* nose */}
      <ellipse cx="50" cy="64" rx="3.5" ry="2.5" fill="#7a4e2a" />
      <circle cx="48" cy="63.5" r="0.8" fill="#1a0e08" />
      <circle cx="52" cy="63.5" r="0.8" fill="#1a0e08" />
      {/* mouth */}
      <path d="M 42 72 Q 50 76 58 72" stroke="#1a0e08" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* gold ear ring */}
      <circle cx="20" cy="56" r="2" fill="none" stroke="#d4a857" strokeWidth="1.2" />
    </g>
  );
}

// ─── Mermaid (Fish) ────────────────────────────────────────────────────────
function MermaidPortrait() {
  return (
    <g>
      <Frame tint="#1e3548" />
      {/* hair flowing back */}
      <path d="M 18 38 Q 22 18 50 16 Q 78 18 82 38 Q 80 60 76 78 Q 70 70 72 60 Q 68 80 60 84
               L 50 86 L 40 84 Q 32 80 28 60 Q 30 70 24 78 Q 20 60 18 38 Z" fill="#1f6e8a" />
      <path d="M 26 36 Q 50 22 74 36 L 70 50 Q 50 38 30 50 Z" fill="#2d8aa8" />
      {/* face */}
      <ellipse cx="50" cy="52" rx="20" ry="24" fill="#e8d4b8" />
      {/* eyes */}
      <ellipse cx="42" cy="50" rx="3.5" ry="4.5" fill="#fff" />
      <ellipse cx="58" cy="50" rx="3.5" ry="4.5" fill="#fff" />
      <circle cx="42" cy="51" r="2.2" fill="#2d6e7a" />
      <circle cx="58" cy="51" r="2.2" fill="#2d6e7a" />
      <circle cx="42.6" cy="50.4" r="0.8" fill="#fff" />
      <circle cx="58.6" cy="50.4" r="0.8" fill="#fff" />
      {/* eyebrows */}
      <path d="M 38 44 Q 42 42 46 44 M 54 44 Q 58 42 62 44" stroke="#1f6e8a" strokeWidth="1.5" fill="none" />
      {/* nose */}
      <path d="M 50 56 L 48 62 Q 50 64 52 62 Z" fill="#d8c4a8" />
      {/* lips */}
      <path d="M 44 70 Q 50 73 56 70 Q 50 75 44 70 Z" fill="#a8546e" />
      {/* shell crown / scale tiara */}
      <path d="M 36 30 L 38 22 L 42 28 L 46 20 L 50 28 L 54 20 L 58 28 L 62 22 L 64 30"
            fill="#5b9ec0" stroke="#0e1a14" strokeWidth="0.8" />
      <circle cx="50" cy="24" r="2" fill="#e6c068" />
      {/* pearl earring */}
      <circle cx="28" cy="62" r="2.5" fill="#e8dcc4" stroke="#1a0e08" strokeWidth="0.6" />
      <circle cx="72" cy="62" r="2.5" fill="#e8dcc4" stroke="#1a0e08" strokeWidth="0.6" />
    </g>
  );
}

// ─── Mushroom (Plant) ──────────────────────────────────────────────────────
function MushroomPortrait() {
  return (
    <g>
      <Frame tint="#1a3325" />
      {/* mushroom cap */}
      <path d="M 12 52 Q 12 18 50 16 Q 88 18 88 52 Q 88 56 84 56 L 16 56 Q 12 56 12 52 Z"
            fill="#a83838" />
      {/* cap shading */}
      <path d="M 12 52 Q 12 30 30 22 Q 36 32 30 50 Q 18 56 12 52 Z" fill="#8a2828" />
      {/* white spots */}
      <ellipse cx="28" cy="34" rx="5" ry="4" fill="#ede5d3" />
      <ellipse cx="50" cy="26" rx="6" ry="4" fill="#ede5d3" />
      <ellipse cx="68" cy="36" rx="4" ry="3" fill="#ede5d3" />
      <ellipse cx="42" cy="42" rx="3" ry="2" fill="#ede5d3" />
      <ellipse cx="60" cy="46" rx="3" ry="2" fill="#ede5d3" />
      {/* under-cap shadow strip */}
      <path d="M 12 52 L 88 52 L 88 56 L 12 56 Z" fill="#5a1818" />
      {/* face / stem */}
      <path d="M 26 56 L 28 84 Q 50 90 72 84 L 74 56 Z" fill="#f0e2c4" />
      <path d="M 28 56 L 30 80 Q 50 86 70 80 L 72 56 Z" fill="#fff5d8" />
      {/* eyes */}
      <ellipse cx="42" cy="68" rx="3" ry="3.5" fill="#1a0e08" />
      <ellipse cx="58" cy="68" rx="3" ry="3.5" fill="#1a0e08" />
      <circle cx="43" cy="67" r="0.9" fill="#fff" />
      <circle cx="59" cy="67" r="0.9" fill="#fff" />
      {/* cheeks */}
      <ellipse cx="36" cy="76" rx="2.5" ry="1.5" fill="#f0a8a0" opacity="0.7" />
      <ellipse cx="64" cy="76" rx="2.5" ry="1.5" fill="#f0a8a0" opacity="0.7" />
      {/* smile */}
      <path d="M 44 78 Q 50 82 56 78" stroke="#1a0e08" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* tiny moss tufts on cap base */}
      <path d="M 18 56 Q 20 60 22 56 M 78 56 Q 80 60 82 56" stroke="#6cb47a" strokeWidth="1.5" fill="none" />
    </g>
  );
}

function FallbackPortrait() {
  return (
    <g>
      <Frame tint="#3d5a45" />
      <text x="50" y="62" textAnchor="middle" fontSize="36" fill="#ede5d3">?</text>
    </g>
  );
}

const PORTRAITS: Record<string, React.FC> = {
  monkey: MonkeyPortrait,
  mermaid: MermaidPortrait,
  mushroom: MushroomPortrait,
  fallback: FallbackPortrait,
};
