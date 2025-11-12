
import React, { useState } from "react";
import api from "../services/api";
import "./SidebarForm.css";

export default function SidebarForm({ onStart }) {
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState({
    VOCAB_SIZE: 30522,
    EMBED_SIZE: 128,
    NUM_HEADS: 8,
    NUM_STEPS: 100,
    text_sentence_train: "Hello world",
    text_sentence_b: "Goodbye world"
  });
  const [errors, setErrors] = useState({});
  const validate = () => {
    const e = {};
    if (!form.VOCAB_SIZE) e.VOCAB_SIZE = "Required";
    if (!form.EMBED_SIZE) e.EMBED_SIZE = "Required";
    if (!form.NUM_HEADS) e.NUM_HEADS = "Required";
    if (!form.NUM_STEPS) e.NUM_STEPS = "Required";
    if (!form.text_sentence_train) e.text_sentence_train = "Required";
    if (!form.text_sentence_b) e.text_sentence_b = "Required";
    setErrors(e);
    return Object.keys(e).length===0;
  };
  const handleChange = (k,v) => setForm({...form,[k]:v});
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const res = await api.post("/train", form);
      if (res && res.job_id) {
        if (onStart) onStart(res.job_id);
        setOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar treinamento");
    }
  };

  return (
    <div className={`sidebar ${open ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <button onClick={()=>setOpen(!open)}>{open ? '←' : '→'}</button>
        <h3>Training Parameters</h3>
      </div>
      <form className="sidebar-form" onSubmit={handleSubmit}>
        <label>VOCAB_SIZE <input type="number" value={form.VOCAB_SIZE} onChange={e=>handleChange('VOCAB_SIZE', parseInt(e.target.value)||0)} /></label>
        {errors.VOCAB_SIZE && <div className="error">{errors.VOCAB_SIZE}</div>}
        <label>EMBED_SIZE <input type="number" value={form.EMBED_SIZE} onChange={e=>handleChange('EMBED_SIZE', parseInt(e.target.value)||0)} /></label>
        {errors.EMBED_SIZE && <div className="error">{errors.EMBED_SIZE}</div>}
        <label>NUM_HEADS <input type="number" value={form.NUM_HEADS} onChange={e=>handleChange('NUM_HEADS', parseInt(e.target.value)||0)} /></label>
        {errors.NUM_HEADS && <div className="error">{errors.NUM_HEADS}</div>}
        <label>NUM_STEPS <input type="number" value={form.NUM_STEPS} onChange={e=>handleChange('NUM_STEPS', parseInt(e.target.value)||0)} /></label>
        {errors.NUM_STEPS && <div className="error">{errors.NUM_STEPS}</div>}
        <label>text_sentence_train <input type="text" value={form.text_sentence_train} onChange={e=>handleChange('text_sentence_train', e.target.value)} /></label>
        {errors.text_sentence_train && <div className="error">{errors.text_sentence_train}</div>}
        <label>text_sentence_b <input type="text" value={form.text_sentence_b} onChange={e=>handleChange('text_sentence_b', e.target.value)} /></label>
        {errors.text_sentence_b && <div className="error">{errors.text_sentence_b}</div>}
        <div style={{marginTop:10}}><button type="submit">Start Training</button></div>
      </form>
    </div>
  );
}
