import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Generic cursor-anchored tooltip. Renders into document.body via portal so
 * it can escape clipping containers (battle grid, scrollable stash, etc.).
 *
 * - Shows after `delay` ms of continuous hover (default 200).
 * - Follows the mouse while the cursor moves over the trigger.
 * - Flips to the opposite side of the cursor if it would overflow the
 *   viewport's right or bottom edge.
 *
 * The wrapper is `display: contents` so it doesn't affect layout — events
 * bubble up from the children.
 */
interface Props {
  content: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  /** Optional class on the floating tooltip element. */
  panelClassName?: string;
}

export function HoverTooltip({ content, children, delay = 180, panelClassName = "" }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Always clear timers on unmount.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function onEnter(e: React.MouseEvent) {
    setPos({ x: e.clientX + 14, y: e.clientY + 14 });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setShow(true), delay);
  }
  function onMove(e: React.MouseEvent) {
    setPos({ x: e.clientX + 14, y: e.clientY + 14 });
  }
  function onLeave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShow(false);
  }

  // Edge-flip: after the tooltip mounts, measure it and shift if it overflows.
  useLayoutEffect(() => {
    if (!show || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const r = el.getBoundingClientRect();
    let x = pos.x;
    let y = pos.y;
    const padding = 8;
    if (x + r.width > window.innerWidth - padding) {
      x = pos.x - r.width - 28;
    }
    if (y + r.height > window.innerHeight - padding) {
      y = window.innerHeight - r.height - padding;
    }
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [show, pos]);

  return (
    <>
      {/* display:contents so the wrapper has no layout footprint */}
      <span
        style={{ display: "contents" }}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {children}
      </span>
      {show &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`mm-tooltip-panel ${panelClassName}`}
            style={{ left: pos.x, top: pos.y }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
