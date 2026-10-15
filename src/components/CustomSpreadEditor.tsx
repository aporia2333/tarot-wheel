"use client";

import { useEffect, useRef, useState } from "react";
import { createCustomDraft, CUSTOM_NAME_LIMIT, MAX_CUSTOM_CARDS, POSITION_MEANING_LIMIT, spreadFromDraft } from "@/lib/customSpreads";
import { deleteCustomTemplate, loadCustomDraft, loadCustomTemplates, saveCustomDraft, saveCustomTemplate } from "@/lib/customSpreadStorage";
import type { TarotSpread } from "@/types";

export function CustomSpreadEditor({ initialSpread, onUse, onCancel }: {
  initialSpread: TarotSpread | null; onUse: (spread: TarotSpread) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => loadCustomDraft() || createCustomDraft(initialSpread?.id === "custom" ? initialSpread : null));
  const [templates, setTemplates] = useState(loadCustomTemplates);
  const [templateId, setTemplateId] = useState<string | undefined>(() => loadCustomDraft()?.templateId);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { saveCustomDraft({ ...draft, templateId }); }, [draft, templateId]);
  useEffect(() => { nameRef.current?.focus(); }, []);
  useEffect(() => {
    const update = () => setTemplates(loadCustomTemplates());
    window.addEventListener("storage", update); return () => window.removeEventListener("storage", update);
  }, []);

  function updateSlot(index: number, field: "name" | "meaning", value: string) {
    setDraft((current) => ({ ...current, slots: current.slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [field]: value } : slot) }));
    setError(""); setNotice("");
  }
  function moveSlot(index: number, offset: number) {
    const next = index + offset;
    if (next < 0 || next >= draft.count) return;
    setDraft((current) => { const slots = [...current.slots]; [slots[index], slots[next]] = [slots[next], slots[index]]; return { ...current, slots }; });
    setError(""); setNotice("");
  }
  function applySpread() {
    try { onUse(spreadFromDraft(draft)); } catch (error) { setError(error instanceof Error ? error.message : "请检查牌阵名称和牌位。"); }
  }
  function saveTemplate() {
    setError(""); setNotice("");
    try {
      const template = saveCustomTemplate(spreadFromDraft(draft), templateId);
      setTemplateId(template.id); setTemplates(loadCustomTemplates()); setNotice("模板已保存到当前浏览器。可以继续修改，或使用此牌阵抽牌。");
    } catch (error) { setError(error instanceof Error ? error.message : "模板保存失败，请重试。"); }
  }
  function removeTemplate(id: string) {
    try {
      deleteCustomTemplate(id); setTemplates(loadCustomTemplates()); setDeleteId(null);
      if (templateId === id) setTemplateId(undefined);
      setNotice("模板已删除，已有阅读记录不受影响。"); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "模板删除失败，请重试。"); }
  }

  return <section className="custom-spread-editor" aria-labelledby="custom-spread-title">
    <div className="custom-spread-heading"><div><h2 id="custom-spread-title">定义你的牌阵</h2><p className="field-help">每个牌位代表一个观察角度，抽牌与解读会遵循这里的顺序。</p></div>
      <button type="button" className="text-link" onClick={onCancel}>取消编辑</button></div>
    <form noValidate onSubmit={(event) => { event.preventDefault(); applySpread(); }}>
      <div className="custom-spread-fields">
        <div><label htmlFor="custom-spread-name">牌阵名称</label><input ref={nameRef} id="custom-spread-name" className="field" value={draft.name} required maxLength={CUSTOM_NAME_LIMIT}
          onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setError(""); setNotice(""); }} placeholder="例如：我的下一步" /></div>
        <div><label htmlFor="custom-spread-count">抽牌数量</label><select id="custom-spread-count" className="field" value={draft.count}
          onChange={(event) => { setDraft({ ...draft, count: Number(event.target.value) }); setError(""); setNotice(""); }}>
          {Array.from({ length: MAX_CUSTOM_CARDS }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} 张牌</option>)}
        </select></div>
      </div>
      <div className="custom-positions-heading"><h3>牌位与顺序</h3><p className="field-help">名称必填且需不同；含义可选，帮助解读理解你的问法。减少牌数后，在本次编辑中增加回来会保留原填写内容。</p></div>
      <ol className="custom-position-list">{draft.slots.slice(0, draft.count).map((slot, index) => <li key={index}>
        <div className="custom-position-number" aria-hidden="true">{index + 1}</div>
        <div className="custom-position-fields"><label htmlFor={`custom-position-${index}`}>牌位 {index + 1} 名称</label>
          <input className="field" id={`custom-position-${index}`} required maxLength={CUSTOM_NAME_LIMIT} value={slot.name}
            onChange={(event) => updateSlot(index, "name", event.target.value)} placeholder="例如：现实限制" />
          <label htmlFor={`custom-meaning-${index}`}>牌位 {index + 1} 含义 <span>可选</span></label>
          <textarea className="field" id={`custom-meaning-${index}`} rows={2} maxLength={POSITION_MEANING_LIMIT} value={slot.meaning}
            onChange={(event) => updateSlot(index, "meaning", event.target.value)} placeholder="例如：目前有哪些外部条件需要考虑？" />
        </div>
        <div className="custom-position-order"><button type="button" className="btn-secondary" disabled={index === 0} aria-label={`上移牌位 ${index + 1}`} onClick={() => moveSlot(index, -1)}>上移</button>
          <button type="button" className="btn-secondary" disabled={index === draft.count - 1} aria-label={`下移牌位 ${index + 1}`} onClick={() => moveSlot(index, 1)}>下移</button></div>
      </li>)}</ol>
      {error ? <p className="inline-message" role="alert">{error}</p> : null}
      {notice ? <p className="field-help" role="status">{notice}</p> : null}
      <div className="custom-spread-actions"><p className="field-help">使用后会选中此牌阵。变更牌位会重新准备牌组与选牌。</p>
        <div><button type="button" className="btn-secondary" onClick={saveTemplate}>{templateId ? "更新模板" : "保存为模板"}</button>
          <button type="submit" className="btn-primary">使用此牌阵</button></div></div>
    </form>
    <section className="custom-template-section" aria-labelledby="custom-templates-title"><h3 id="custom-templates-title">我的模板</h3>
      <p className="field-help">模板保存在当前浏览器，最多 20 个。阅读结果仍会按原有方式保存到历史。</p>
      {templates.length ? <div className="custom-template-list">{templates.map((template) => <article key={template.id}>
        <div><h4>{template.spread.name}</h4><p>{template.spread.count} 张牌：{template.spread.positions.join("、")}</p></div>
        <div className="custom-template-actions"><button className="btn-secondary" type="button" aria-label={`使用模板 ${template.spread.name}`} onClick={() => onUse(template.spread)}>使用</button>
          <button className="text-link" type="button" aria-label={`编辑模板 ${template.spread.name}`} onClick={() => { setDraft(createCustomDraft(template.spread)); setTemplateId(template.id); setError(""); setNotice(""); setDeleteId(null); nameRef.current?.focus(); }}>编辑</button>
          {deleteId === template.id ? <><button className="text-link" type="button" aria-label={`确认删除模板 ${template.spread.name}`} onClick={() => removeTemplate(template.id)}>确认删除</button>
            <button className="text-link" type="button" onClick={() => setDeleteId(null)}>取消删除</button></> : <button className="text-link" type="button" aria-label={`删除模板 ${template.spread.name}`} onClick={() => setDeleteId(template.id)}>删除</button>}
        </div>
      </article>)}</div> : <p className="custom-template-empty">保存常用的牌位，下次可以直接使用。</p>}
    </section>
  </section>;
}
