"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Pagination } from "@/components/Pagination";

const TURN_MS = 680;
type LeafRenderer = (page: number, side: 0 | 1, facsimile?: boolean) => ReactNode;

export function BookChapter() {
  return <div className="book-chapter"><svg className="book-chapter-orbit" viewBox="0 0 200 32" aria-hidden="true">
    <path d="M4 24Q100-20 196 24M16 24h44m80 0h44" /><circle cx="100" cy="15" r="7" />
    <path d="M103 8a7 7 0 0 0 0 14 8 8 0 0 1 0-14Zm-31 9 2 3-2 3-2-3Zm56 0 2 3-2 3-2-3Z" />
  </svg><h2>牌阵之书</h2></div>;
}

function PrintedFolio({ page, side, label, renderLeaf }: { page: number; side: 0 | 1; label: string; renderLeaf: LeafRenderer }) {
  return <>
    <div className="book-print-header">{side ? <span className="book-print-inscribe">自定义牌阵</span> : <BookChapter />}</div>
    <div className="book-leaf" data-book-side={side ? "right" : "left"}>{renderLeaf(page, side, true)}</div>
    <div className={`book-print-footer ${side ? "on-right" : "on-left"}`}>
      <div className="book-print-action">{side ? <span className="book-print-start">✧ 开始抽牌</span> : <p>{label}</p>}</div>
      <div className="book-print-pagination"><span>‹</span><span className={page === 0 ? "is-active" : ""}>1</span><span className={page === 1 ? "is-active" : ""}>2</span><span>›</span></div>
    </div>
  </>;
}

// Connected paper segments bend around the spine. Reverse strip positions
// make the back's text readable after the sheet turns, without mirrored text.
function TurningPaper({ from, to, forward, renderLeaf, label }: { from: number; to: number; forward: boolean; renderLeaf: LeafRenderer; label: string }) {
  function segment(index: number): ReactNode {
    const front = forward ? index : 3 - index, back = 3 - front;
    return <div className={`book-paper-hinge ${index ? "is-bending" : ""}`} key={index}>
      <div className="book-turn-side book-turn-face">
        <div className="book-turn-content book-printed-folio" style={{ transform: `translateX(${-front * 25}%)` }}><PrintedFolio page={from} side={forward ? 1 : 0} label={label} renderLeaf={renderLeaf} /></div>
        <span className="book-turn-shade" /><span className="book-turn-glint" />
      </div>
      <div className="book-turn-side book-turn-back">
        <div className="book-turn-content book-printed-folio" style={{ transform: `translateX(${-back * 25}%)` }}><PrintedFolio page={to} side={forward ? 0 : 1} label={label} renderLeaf={renderLeaf} /></div>
        <span className="book-turn-shade" /><span className="book-turn-glint" />
      </div>
      {index < 3 ? segment(index + 1) : null}
    </div>;
  }
  return <div className={`book-turning-leaf ${forward ? "turn-forward" : "turn-back"}`} aria-hidden="true">{segment(0)}</div>;
}

export function SpreadBook({ currentPage, totalPages, onChange, header, footer, renderLeaf, children, selectionLabel, editing = false }: {
  currentPage: number; totalPages: number; onChange: (page: number) => void;
  header: ReactNode; footer: ReactNode; renderLeaf: LeafRenderer; children?: ReactNode; selectionLabel: string; editing?: boolean;
}) {
  const reduced = useReducedMotion();
  const [simple, setSimple] = useState(false);
  const [opened, setOpened] = useState(false);
  const [turn, setTurn] = useState<{ from: number; to: number; forward: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const turning = useRef(false);
  const focusAfterTurn = useRef<HTMLButtonElement | null>(null);
  const paper = useRef<HTMLFieldSetElement>(null);
  const [metrics, setMetrics] = useState({ header: 96, footer: 132 });
  const change = useRef(onChange); change.current = onChange;
  useEffect(() => {
    const mobile = matchMedia("(max-width: 600px)");
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const constrained = navigator.hardwareConcurrency <= 4 || (memory !== undefined && memory <= 4);
    const update = () => setSimple(mobile.matches || constrained || !CSS.supports("transform-style", "preserve-3d"));
    update(); mobile.addEventListener("change", update);
    return () => mobile.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const opening = setTimeout(() => setOpened(true), reduced ? 40 : 680);
    return () => clearTimeout(opening);
  }, [reduced]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    const element = paper.current;
    if (!element) return;
    const measure = () => {
      const header = element.querySelector<HTMLElement>(".book-topline")?.offsetHeight ?? 96;
      const footer = (element.querySelector<HTMLElement>(".book-action")?.offsetHeight ?? 72)
        + (element.querySelector<HTMLElement>(".spread-pagination")?.offsetHeight ?? 60);
      setMetrics(previous => previous.header === header && previous.footer === footer ? previous : { header, footer });
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (turn || !focusAfterTurn.current) return;
    const button = focusAfterTurn.current;
    const target = button.disabled ? button.closest("nav")?.querySelector<HTMLButtonElement>("[aria-current='page']") : button;
    target?.focus({ preventScroll: true }); focusAfterTurn.current = null;
  }, [turn]);
  function turnPage(page: number) {
    if (!opened || turning.current || editing || page === currentPage || page < 0 || page >= totalPages) return;
    const active = document.activeElement;
    focusAfterTurn.current = active instanceof HTMLButtonElement && active.closest(".spread-pagination") ? active : null;
    turning.current = true; setTurn({ from: currentPage, to: page, forward: page > currentPage });
    // Navigation commits independently of CSS events. Animation failure cannot
    // change the selected spread or leave the book permanently locked.
    timer.current = setTimeout(() => {
      change.current(page); setTurn(null); turning.current = false;
    }, reduced ? 40 : simple ? 180 : TURN_MS);
  }
  const fullTurn = turn && !simple && !reduced;
  return <div className={`spread-book ${opened ? "is-open" : "is-opening"} ${turn ? "is-turning" : ""} ${editing ? "is-editing" : ""}`}
    data-book-state={!opened ? "opening" : turn ? "turning" : "open"} data-book-page={currentPage + 1}
    data-book-motion={reduced ? "reduced" : simple ? "simple" : "full"}
    aria-busy={!opened || Boolean(turn)} aria-label="牌阵之书">
    <div className="book-binding" aria-hidden="true" />
    <div className="book-page-edges" aria-hidden="true" />
    <fieldset ref={paper} className="book-paper" disabled={!opened || Boolean(turn)}>
      {header}{children}
      {!editing ? <div className="book-page-spread">
        <section className="book-spread-list" aria-label={`牌阵列表，第 ${currentPage + 1} 页`}>
          {([0, 1] as const).map(side => <div className="book-leaf" key={side} data-book-side={side ? "right" : "left"}>
            {renderLeaf(fullTurn ? (side === 0 ? turn.forward ? turn.from : turn.to : turn.forward ? turn.to : turn.from) : currentPage, side)}
          </div>)}
        </section>
      </div> : null}
      {footer}
      <Pagination currentPage={currentPage} totalPages={totalPages} disabled={editing || !opened || Boolean(turn)} onChange={turnPage} />
      {fullTurn ? <div className="book-turn-layer" style={{ "--book-header-height": `${metrics.header}px`, "--book-footer-height": `${metrics.footer}px` } as React.CSSProperties}>
        <div className={`book-cast-shadow ${turn.forward ? "to-left" : "to-right"}`} aria-hidden="true" />
        <TurningPaper from={turn.from} to={turn.to} forward={turn.forward} renderLeaf={renderLeaf} label={selectionLabel} />
      </div> : null}
    </fieldset>
    {!opened ? <div className="book-cover" aria-hidden="true"><div className="book-cover-frame">
      <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="63" /><circle cx="80" cy="80" r="52" />
        <path d="M94 32a48 48 0 1 0 0 96 43 43 0 0 1 0-96Z" />
        <path d="m107 47 4 13 13 4-13 4-4 13-4-13-13-4 13-4Z" /></svg><span>牌阵之书</span></div></div> : null}
  </div>;
}
