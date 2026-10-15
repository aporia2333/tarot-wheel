"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export function SpreadTooltip({ id, title, description, anchor, open, onClose, onEnter, onLeave }: {
  id: string; title: string; description: string; anchor: RefObject<HTMLElement>; open: boolean;
  onClose: () => void; onEnter: () => void; onLeave: () => void;
}) {
  const popup = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; origin: string } | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor.current) { setPosition(null); return; }
    const element = anchor.current;
    function place() {
      if (!popup.current) return;
      // Layout dimensions stay exact while the entrance scales the visual layer.
      const rect = element.getBoundingClientRect(), bounds = { width: popup.current.offsetWidth, height: popup.current.offsetHeight };
      const book = element.closest(".spread-book")?.getBoundingClientRect() ?? rect;
      const left = Math.max(12, Math.min(innerWidth - bounds.width - 12, rect.left + (rect.width - bounds.width) / 2));
      const controls = [...document.querySelectorAll("#start-reading,#custom-spread-open,.spread-pagination,.site-header")].map(node => node.getBoundingClientRect());
      const candidates = [
        { left, top: rect.top - bounds.height - 10, origin: "50% 100%" },
        { left: book.right + 12, top: rect.top, origin: "0% 50%" },
        { left: book.left - bounds.width - 12, top: rect.top, origin: "100% 50%" },
        { left, top: rect.bottom + 10, origin: "50% 0%" },
        { left, top: 64, origin: "50% 100%" },
        ...controls.flatMap(control => [
          { left, top: control.top - bounds.height - 10, origin: "50% 100%" },
          { left, top: control.bottom + 10, origin: "50% 0%" },
        ]),
      ];
      const safe = candidates.find(candidate => candidate.left >= 12 && candidate.left + bounds.width <= innerWidth - 12
        && candidate.top >= 64 && candidate.top + bounds.height <= innerHeight - 12
        && controls.every(control => candidate.left >= control.right || candidate.left + bounds.width <= control.left
          || candidate.top >= control.bottom || candidate.top + bounds.height <= control.top));
      if (safe) setPosition(safe);
      else setPosition({ left, top: Math.max(64, Math.min(innerHeight - bounds.height - 12, rect.top - bounds.height - 10)), origin: "50% 100%" });
    }
    place();
    const closeOnOutside = (event: PointerEvent) => { if (!element.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) onClose(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const book = element.closest(".spread-book");
    const observer = new MutationObserver(() => { if (book?.getAttribute("data-book-state") !== "open") onClose(); });
    if (book) observer.observe(book, { attributes: true, attributeFilter: ["data-book-state"] });
    addEventListener("resize", place); addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", closeOnOutside); document.addEventListener("keydown", escape);
    return () => {
      observer.disconnect(); removeEventListener("resize", place); removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", closeOnOutside); document.removeEventListener("keydown", escape);
    };
  }, [open, anchor, onClose]);
  if (!open) return null;
  return createPortal(<div ref={popup} id={id} role="tooltip" className="book-description-popup"
    style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden", transformOrigin: position?.origin }}
    onPointerEnter={onEnter} onPointerLeave={onLeave}>
    <span className="book-popup-rule" aria-hidden="true">✧</span><strong>{title}</strong>
    <p className="spread-description">{description}</p>
  </div>, document.body);
}
