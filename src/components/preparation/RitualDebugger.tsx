"use client";
import { useState } from "react";
import type { PreparationAction, PreparationOperation } from "@/lib/preparation";
import { CUT_ACTIONS, SHUFFLE_ACTIONS, ACTION_NAMES } from "@/lib/preparation";
import { sampleRitualMotion } from "@/lib/ritualMotion";

export function RitualDebugger({ operation, progress, onLoad, onSeek, onPlay }: { operation: PreparationOperation | null; progress: number | null;
  onLoad: (seed: number, action: PreparationAction) => void; onSeek: (progress: number) => void; onPlay: () => void }) {
  const [seed, setSeed] = useState("20261012"), [action, setAction] = useState<PreparationAction>("riffle");
  if (process.env.NODE_ENV !== "development") return null;
  const frame = operation ? sampleRitualMotion(operation, progress ?? 0) : null;
  return <details className="ritual-debugger" open><summary>开发回放</summary>
    <label>种子<input aria-label="回放种子" type="number" value={seed} onChange={event => setSeed(event.target.value)} /></label>
    <label>动作<select aria-label="回放动作" value={action} onChange={event => setAction(event.target.value as PreparationAction)}>
      {[...SHUFFLE_ACTIONS, ...CUT_ACTIONS].map(value => <option key={value} value={value}>{ACTION_NAMES[value]}</option>)}
    </select></label>
    <button type="button" onClick={() => { const value = Number(seed); if (Number.isSafeInteger(value)) onLoad(value, action); }}>载入固定种子</button>
    <label>进度<input aria-label="回放进度" type="number" min={0} max={1} step={.005} value={progress ?? 0} disabled={!operation} onChange={event => onSeek(Math.max(0, Math.min(1, Number(event.target.value))))} /></label>
    <input aria-label="拖动回放进度" type="range" min={0} max={1} step={.005} value={progress ?? 0} disabled={!operation} onChange={event => onSeek(Number(event.target.value))} />
    <button type="button" disabled={!operation || progress === null} onClick={onPlay}>连续播放</button>
    <output aria-label="动作调试状态">{frame ? `${frame.phase} · ${frame.beat} · ${frame.cards.length} 张 · 水晶 ${frame.energy.toFixed(2)}` : "等待回放"}</output>
  </details>;
}
