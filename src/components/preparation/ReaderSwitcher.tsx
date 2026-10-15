"use client";

import { useRef, useState } from "react";
import { dealerCharacters, type DealerManifest } from "@/data/dealerCharacters";

export function DealerPortrait({ character }: { character: DealerManifest }) {
  const [column, row, x, y, width, height] = character.parts.normal;
  return <svg viewBox={`${column + x} ${row + y} ${width} ${height}`} aria-hidden="true" className="reader-portrait">
    <image href={character.atlas} width={character.grid[0]} height={character.grid[1]} preserveAspectRatio="none" />
  </svg>;
}
export function ReaderSwitcher({ character, disabled, onSelect }: { character: DealerManifest; disabled: boolean; onSelect: (character: DealerManifest) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return <div className="reader-switcher">
    <button className="reader-switch-button" type="button" title={`当前：${character.name}`} disabled={disabled} onClick={() => { setOpen(true); dialog.current?.showModal(); }} aria-haspopup="dialog">
      占卜师选择<span className="header-chevron" aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="reader-select-dialog" aria-labelledby="reader-select-title" onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="reader-dialog-heading"><h2 id="reader-select-title">让谁陪你准备牌组？</h2><button type="button" aria-label="关闭塔罗师选择" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="reader-select-grid">{open ? dealerCharacters.map((item) => <button type="button" className="reader-option" key={item.id} aria-label={item.name} aria-pressed={character.id === item.id}
        onClick={() => { if (!disabled) { onSelect(item); dialog.current?.close(); } }}>
        <DealerPortrait character={item} /><span className="reader-option-copy"><strong>{item.name}</strong><span>{item.description}</span></span>
      </button>) : null}</div>
    </dialog>
  </div>;
}
