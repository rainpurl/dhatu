import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   Dhatu (ધાતુ) - a research-based Gujarati course for English
   speakers. Single-file React app.
   ============================================================ */

/* ---------- speech (browser TTS, degrades gracefully) ---------- */
let _voiceCache = [];
function _loadVoices() {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    const vs = window.speechSynthesis.getVoices() || [];
    if (vs.length) _voiceCache = vs;
    return vs;
  } catch (e) {
    return [];
  }
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  _loadVoices();
  try {
    window.speechSynthesis.onvoiceschanged = _loadVoices;
  } catch (e) {}
}
const _GOOD_VOICE_HINTS = ["google", "natural", "neural", "aria", "jenny", "samantha", "wavenet", "premium"];
function _pickVoice(lang) {
  const vs = _voiceCache.length ? _voiceCache : _loadVoices();
  if (!vs.length) return null;
  const pre = lang.slice(0, 2).toLowerCase();
  const exact = vs.filter((v) => v.lang && v.lang.toLowerCase() === lang.toLowerCase());
  const partial = vs.filter((v) => v.lang && v.lang.toLowerCase().startsWith(pre));
  const pool = exact.length ? exact : partial;
  if (!pool.length) return null;
  for (const hint of _GOOD_VOICE_HINTS) {
    const hit = pool.find((v) => v.name && v.name.toLowerCase().includes(hint));
    if (hit) return hit;
  }
  const network = pool.find((v) => v.localService === false);
  return network || pool[0];
}
function speak(text, lang = "gu-IN") {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = _pickVoice(lang);
    if (v) u.voice = v;
    const pre = lang.slice(0, 2).toLowerCase();
    u.rate = pre === "gu" ? 0.86 : 0.97;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function speakEn(text) {
  speak(text, "en-US");
}
function speakGu(text) {
  speak(text, "gu-IN");
}
function stopSpeak() {
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (e) {}
}
/* ---------- persistence (real browser, not the Claude artifact sandbox) ---------- */
function useLocalState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch (e) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {}
  }, [key, state]);
  return [state, setState];
}
const shuffle = (a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const eq = (a, b) =>
  String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/* ---------- icons (stroke, currentColor) ---------- */
const S = (p) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...p,
});
const Ic = {
  learn: (p) => (
    <svg {...S(p)}>
      <path d="M6 21V4" />
      <path d="M6 4h11l-2 3 2 3H6" />
    </svg>
  ),
  script: (p) => (
    <svg {...S(p)}>
      <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" />
      <path d="M14 7l3 3" />
    </svg>
  ),
  review: (p) => (
    <svg {...S(p)}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4 15" />
      <path d="M4 20v-5h5" />
    </svg>
  ),
  vocab: (p) => (
    <svg {...S(p)}>
      <rect x="3" y="7.5" width="14" height="12" rx="2" />
      <path d="M7 7.5V5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
    </svg>
  ),
  temple: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="2.8" r="1" />
      <path d="M12 3.8C8 8 6.6 14 7 21h10c.4-7-1-13-5-17.2Z" />
      <path d="M9.6 21v-3.4a2.4 2.4 0 0 1 4.8 0V21" />
      <path d="M4.6 21h14.8" />
    </svg>
  ),
  profile: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  book: (p) => (
    <svg {...S(p)}>
      <path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2Z" />
      <path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  talk: (p) => (
    <svg {...S(p)}>
      <path d="M4 5h16v10H9l-4 4Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  ),
  play: (p) => (
    <svg {...S(p)}>
      <path d="M4 9v6h4l5 4V5L8 9Z" />
      <path d="M16 9a3.2 3.2 0 0 1 0 6" />
      <path d="M18.4 7a6 6 0 0 1 0 10" />
    </svg>
  ),
  check: (p) => (
    <svg {...S(p)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (p) => (
    <svg {...S(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  star: (p) => (
    <svg {...S(p)}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z" />
    </svg>
  ),
  back: (p) => (
    <svg {...S(p)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  plus: (p) => (
    <svg {...S(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  gear: (p) => (
    <svg {...S(p)}>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="9" cy="16" r="2" />
    </svg>
  ),
  spark: (p) => (
    <svg {...S(p)}>
      <path d="M12 3l1.7 4.8L18.5 9l-4.8 1.2L12 15l-1.7-4.8L5.5 9l4.8-1.2Z" />
      <path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
    </svg>
  ),
  bulb: (p) => (
    <svg {...S(p)}>
      <path d="M9.5 18h5M10.5 21h3" />
      <path d="M12 3a6 6 0 0 1 3.8 10.6c-.8.7-1.3 1.5-1.3 2.4h-5c0-.9-.5-1.7-1.3-2.4A6 6 0 0 1 12 3Z" />
    </svg>
  ),
  target: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  ear: (p) => (
    <svg {...S(p)}>
      <path d="M8 10a4 4 0 0 1 8 0c0 3-3 3-3 6a2.5 2.5 0 0 1-5 0" />
      <path d="M8.5 8.5a3.5 3.5 0 0 1 3.5-2.5" />
    </svg>
  ),
  diya: (p) => (
    <svg {...S(p)}>
      <path d="M4 15c2 4 14 4 16 0Z" />
      <path d="M12 15v-3" />
      <path d="M12 12c-1.6-1.8 0-4.4 0-6 1.9 2 1.2 4.5 0 6Z" />
    </svg>
  ),
  kaudi: (p) => (
    <svg {...S(p)}>
      <ellipse cx="12" cy="12" rx="5.4" ry="8" />
      <path d="M12 5.2c-1.2 3.4-1.2 10 0 13.6" />
      <path d="M10.4 9h3.2M10 12h4M10.4 15h3.2" />
    </svg>
  ),
  write: (p) => (
    <svg {...S(p)}>
      <path d="M14 4l6 6" />
      <path d="M4 20l1.5-5L16 4.5 19.5 8 9 18.5 4 20Z" />
    </svg>
  ),
  lock: (p) => (
    <svg {...S(p)}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
};

/* ---------- styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
:root{
  --brand:#8A1C3B; --brand-dark:#6B1330; --brand-soft:#F8E7EC;
  --gold:#E0A63C; --gold-dark:#B98219; --diya:#F2892E;
  --ok:#3E8E5A; --ok-dark:#2F6E44; --ok-soft:#E4F3E9;
  --no:#E23744; --no-dark:#C22233; --no-soft:#FCE7E9;
  --ink:#33222A; --muted:#8C7C82; --line:#ECE2E5;
  --bg:#FBF6F2; --card:#FFFFFF;
  --fen:'Inter',system-ui,sans-serif;
  --fgu:'Anek Gujarati','Inter',sans-serif;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.dhatu, .dhatu *{font-family:var(--fen)}
.dhatu .gu{font-family:var(--fgu)}
.dhatu{
  max-width:460px;margin:0 auto;min-height:100vh;background:var(--bg);
  color:var(--ink);position:relative;overflow-x:hidden;
  display:flex;flex-direction:column;
}
.scr{flex:1;overflow-y:auto;padding:18px 16px 108px}
.scr.plain{padding-bottom:24px}

/* top bar */
.top{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.top .brandmark{
  width:38px;height:38px;border-radius:12px;background:var(--brand);
  color:#fff;display:grid;place-items:center;font-family:var(--fgu);
  font-weight:800;font-size:20px;flex:none;
  box-shadow:0 4px 0 var(--brand-dark)
}
.top h1{font-size:19px;font-weight:800;margin:0;letter-spacing:-.3px}
.top .sub{font-size:12px;color:var(--muted);font-weight:500;margin-top:1px}
.top .spacer{flex:1}
.chip{
  display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:13px;
  padding:6px 10px;border-radius:999px;background:var(--card);
  border:1px solid var(--line)
}
.chip.gold{color:var(--gold-dark)} .chip.gold svg{color:var(--gold)}
.chip.fire{color:var(--diya)} .chip.fire svg{color:var(--diya)}

/* buttons */
.btn{
  border:none;cursor:pointer;font-family:var(--fen);font-weight:700;
  border-radius:16px;padding:15px 18px;font-size:16px;width:100%;
  transition:transform .05s ease, box-shadow .05s ease;
}
.btn:active{transform:translateY(3px)}
.btn.primary{background:var(--brand);color:#fff;box-shadow:0 4px 0 var(--brand-dark)}
.btn.primary:active{box-shadow:0 1px 0 var(--brand-dark)}
.btn.gold{background:var(--gold);color:#3b2a06;box-shadow:0 4px 0 var(--gold-dark)}
.btn.gold:active{box-shadow:0 1px 0 var(--gold-dark)}
.btn.ok{background:var(--ok);color:#fff;box-shadow:0 4px 0 var(--ok-dark)}
.btn.ok:active{box-shadow:0 1px 0 var(--ok-dark)}
.btn.ghost{background:var(--card);color:var(--ink);border:1.5px solid var(--line);box-shadow:0 3px 0 var(--line)}
.btn.ghost:active{box-shadow:0 1px 0 var(--line)}
.btn:disabled{opacity:.5;cursor:default;box-shadow:none;transform:none}
.btn.sm{width:auto;padding:9px 14px;font-size:14px;border-radius:12px}

/* cards */
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:16px}
.section-h{font-size:12px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin:22px 4px 10px}
.section-h:first-child{margin-top:4px}

/* guide row */
.guides{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6px}
.guide{
  border:none;text-align:left;cursor:pointer;border-radius:18px;padding:14px;
  color:#fff;display:flex;flex-direction:column;gap:10px;min-height:104px;
  box-shadow:0 4px 0 rgba(0,0,0,.14)
}
.guide:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.14)}
.guide .gi{width:30px;height:30px}
.guide b{font-size:15px;font-weight:800}
.guide span{font-size:11.5px;opacity:.92;font-weight:500;margin-top:-4px}

/* unit header */
.unit-h{border-radius:20px;padding:16px 18px;color:#fff;margin:8px 0 4px;box-shadow:0 5px 0 rgba(0,0,0,.13)}
.unit-h h2{margin:0 0 2px;font-size:19px;font-weight:800;letter-spacing:-.3px}
.unit-h p{margin:0;font-size:13px;opacity:.92;font-weight:500}

/* winding path */
.path{position:relative;padding:10px 0 4px}
.node-row{display:flex;justify-content:center;position:relative;height:92px;align-items:center}
.node-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;z-index:2}
.node{
  width:70px;height:66px;border-radius:50%;border:none;cursor:pointer;position:relative;
  display:grid;place-items:center;color:#fff;font-weight:800;
}
.node .disc{width:66px;height:62px;border-radius:50%;display:grid;place-items:center}
.node svg{width:28px;height:28px}
.node.done .disc{background:var(--ok);box-shadow:0 5px 0 var(--ok-dark)}
.node.cur .disc{background:var(--gold);color:#3b2a06;box-shadow:0 5px 0 var(--gold-dark)}
.node.todo .disc{background:#fff;color:var(--brand);border:2px solid var(--line);box-shadow:0 5px 0 var(--line)}
.node.check .disc{background:var(--brand);box-shadow:0 5px 0 var(--brand-dark)}
.node:active .disc{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.2)}
.node-label{font-size:12px;font-weight:700;color:var(--ink);text-align:center;max-width:120px;line-height:1.15}
.node-label .kk{display:block;font-size:10.5px;color:var(--muted);font-weight:600}
.startpill{position:absolute;top:-26px;left:50%;transform:translateX(-50%);
  background:var(--ink);color:#fff;font-size:10px;font-weight:800;letter-spacing:1px;
  padding:4px 9px;border-radius:999px;white-space:nowrap;z-index:3}
.startpill:after{content:"";position:absolute;left:50%;bottom:-4px;transform:translateX(-50%) rotate(45deg);width:8px;height:8px;background:var(--ink)}
.connector{position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;z-index:1}

/* lesson engine */
.lhead{display:flex;align-items:center;gap:12px;padding:6px 2px 14px}
.iconbtn{width:38px;height:38px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);
  display:grid;place-items:center;cursor:pointer;color:var(--muted);flex:none}
.iconbtn:active{transform:translateY(2px)}
.bar{flex:1;height:14px;border-radius:999px;background:var(--line);overflow:hidden}
.bar > i{display:block;height:100%;background:var(--ok);border-radius:999px;transition:width .3s ease}
.q-title{font-size:22px;font-weight:800;letter-spacing:-.4px;margin:4px 2px 18px;line-height:1.25}
.q-sub{font-size:13px;color:var(--muted);font-weight:600;margin:-12px 2px 16px}

/* big prompt / word */
.bigword{font-family:var(--fgu);font-size:46px;font-weight:700;text-align:center;line-height:1.1}
.romanline{text-align:center;color:var(--muted);font-weight:600;font-size:16px;margin-top:6px}
.playrow{display:flex;justify-content:center;margin:14px 0}
.playbtn{width:66px;height:66px;border-radius:50%;border:none;cursor:pointer;background:var(--brand-soft);
  color:var(--brand);display:grid;place-items:center;box-shadow:0 4px 0 rgba(138,28,59,.18)}
.playbtn.big{width:84px;height:84px}
.playbtn svg{width:30px;height:30px}
.playbtn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(138,28,59,.18)}
.playbtn.playing{animation:pp .7s ease infinite}
@keyframes pp{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}

/* option lists */
.opts{display:flex;flex-direction:column;gap:11px;margin-top:8px}
.opt{border:1.5px solid var(--line);background:var(--card);border-radius:16px;padding:15px 16px;
  cursor:pointer;text-align:left;font-size:17px;font-weight:600;display:flex;align-items:center;gap:12px;
  box-shadow:0 3px 0 var(--line);transition:transform .05s}
.opt:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
.opt.sel{border-color:var(--brand);background:var(--brand-soft);box-shadow:0 3px 0 rgba(138,28,59,.25)}
.opt.good{border-color:var(--ok);background:var(--ok-soft);box-shadow:0 3px 0 var(--ok-dark)}
.opt.bad{border-color:var(--no);background:var(--no-soft);box-shadow:0 3px 0 var(--no-dark)}
.opt .gu{font-size:20px}
.opt .mini{font-size:12px;color:var(--muted);font-weight:600;margin-left:auto}
.optnum{width:24px;height:24px;border-radius:8px;border:1.5px solid var(--line);display:grid;place-items:center;
  font-size:12px;color:var(--muted);flex:none}

/* two-col options (audio/letters) */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:8px}
.gopt{border:1.5px solid var(--line);background:var(--card);border-radius:16px;padding:18px 10px;cursor:pointer;
  text-align:center;box-shadow:0 3px 0 var(--line)}
.gopt:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
.gopt.sel{border-color:var(--brand);background:var(--brand-soft)}
.gopt.good{border-color:var(--ok);background:var(--ok-soft)}
.gopt.bad{border-color:var(--no);background:var(--no-soft)}
.gopt .gu{font-family:var(--fgu);font-size:34px;font-weight:700}
.gopt small{display:block;color:var(--muted);font-weight:600;font-size:12px;margin-top:3px}

/* match */
.matchwrap{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:6px}
.mcol{display:flex;flex-direction:column;gap:11px}
.mtile{border:1.5px solid var(--line);background:var(--card);border-radius:14px;padding:14px 10px;cursor:pointer;
  text-align:center;font-weight:700;box-shadow:0 3px 0 var(--line);font-size:16px}
.mtile:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
.mtile.gu{font-family:var(--fgu);font-size:22px}
.mtile.sel{border-color:var(--brand);background:var(--brand-soft)}
.mtile.done{border-color:var(--ok);background:var(--ok-soft);color:var(--ok-dark);opacity:.7}
.mtile.err{border-color:var(--no);background:var(--no-soft)}

/* build (word bank) */
.answerbox{min-height:64px;border-bottom:2px dashed var(--line);display:flex;flex-wrap:wrap;gap:8px;
  padding:8px 2px 12px;margin-bottom:10px;align-content:flex-start}
.bank{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.tok{border:1.5px solid var(--line);background:var(--card);border-radius:12px;padding:10px 13px;cursor:pointer;
  font-weight:700;box-shadow:0 3px 0 var(--line);font-size:16px}
.tok.gu{font-family:var(--fgu);font-size:19px}
.tok:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
.tok.used{opacity:.32;pointer-events:none}
.tok.inans{background:var(--brand-soft);border-color:var(--brand)}

/* note / intro cards */
.note{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px}
.note h3{margin:0 0 8px;font-size:18px;font-weight:800}
.note p{margin:0 0 10px;font-size:15px;line-height:1.5;color:#4b3942}
.exrow{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.exline{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:11px 13px}
.exline .gu{font-family:var(--fgu);font-size:19px;font-weight:600}
.exline .rm{color:var(--muted);font-size:12.5px;font-weight:600;margin-top:1px}
.exline .en{font-size:13.5px;margin-top:2px}

/* feedback sheet */
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:40;max-width:460px;margin:0 auto;
  border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));
  animation:up .22s ease}
@keyframes up{from{transform:translateY(100%)}to{transform:translateY(0)}}
.sheet.good{background:var(--ok-soft);border-top:2px solid var(--ok)}
.sheet.bad{background:var(--no-soft);border-top:2px solid var(--no)}
.sheet .sh{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;margin-bottom:6px}
.sheet.good .sh{color:var(--ok-dark)} .sheet.bad .sh{color:var(--no-dark)}
.sheet .badge{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#fff}
.sheet.good .badge{background:var(--ok)} .sheet.bad .badge{background:var(--no)}
.sheet .ans{font-size:14.5px;color:#43333a;margin:2px 0 4px}
.sheet .ans .gu{font-family:var(--fgu);font-weight:700;font-size:16px}
.sheet .why{font-size:13px;color:#5b4a51;margin-top:4px;line-height:1.45}

/* footer action row (fixed) */
.foot{position:fixed;left:0;right:0;bottom:0;z-index:30;max-width:460px;margin:0 auto;
  padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(180deg,transparent,var(--bg) 26%)}

/* bottom nav */
.nav{position:fixed;left:0;right:0;bottom:0;z-index:20;max-width:460px;margin:0 auto;background:var(--card);
  border-top:1px solid var(--line);display:flex;justify-content:space-around;
  padding:8px 4px calc(8px + env(safe-area-inset-bottom))}
.navb{border:none;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;
  color:var(--muted);font-size:10.5px;font-weight:700;padding:4px 8px;border-radius:12px;flex:1}
.navb svg{width:24px;height:24px}
.navb.on{color:var(--brand)}

/* script grid */
.chargrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.chartile{border:1.5px solid var(--line);background:var(--card);border-radius:16px;padding:12px 6px;cursor:pointer;
  text-align:center;box-shadow:0 3px 0 var(--line)}
.chartile:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
.chartile .gu{font-family:var(--fgu);font-size:30px;font-weight:700;line-height:1}
.chartile small{display:block;color:var(--muted);font-weight:700;font-size:11px;margin-top:5px}
.numgrid{grid-template-columns:repeat(5,1fr)}

/* char detail */
.cd-hero{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 0 6px}
.cd-glyph{font-family:var(--fgu);font-size:96px;font-weight:700;line-height:1;color:var(--brand)}
.cd-roman{font-size:20px;font-weight:800}
.cd-hint{font-size:13.5px;color:var(--muted);font-weight:600;text-align:center;max-width:280px}
.canvaswrap{position:relative;width:100%;aspect-ratio:1/1;max-width:300px;margin:14px auto 0;
  border:2px dashed var(--line);border-radius:20px;background:var(--card);overflow:hidden;touch-action:none}
.canvasghost{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fgu);font-size:200px;
  color:#f0e6ea;pointer-events:none;user-select:none;font-weight:700}
.canvaswrap canvas{position:absolute;inset:0;width:100%;height:100%}

/* history */
.era-card{border:1px solid var(--line);background:var(--card);border-radius:20px;overflow:hidden;cursor:pointer;
  box-shadow:0 3px 0 var(--line);margin-bottom:12px}
.era-card:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
.era-band{height:96px;position:relative;display:flex;align-items:flex-end;padding:12px 14px;color:#fff}
.era-band .emo{position:absolute;top:10px;right:12px;font-size:30px;opacity:.9}
.era-band img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.era-band .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55))}
.era-band .txt{position:relative;z-index:2}
.era-band .yr{font-size:11.5px;font-weight:700;letter-spacing:.3px;opacity:.9;margin-top:2px}
.era-band h3{margin:0;font-size:17px;font-weight:800}
.era-card .blurb{padding:12px 14px;font-size:13.5px;color:#4b3942;line-height:1.45}

/* history detail */
.hd-hero{height:190px;border-radius:20px;overflow:hidden;position:relative;display:flex;align-items:flex-end;
  padding:14px 16px;color:#fff;margin-bottom:6px}
.hd-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hd-hero .emo{position:absolute;top:12px;right:14px;font-size:40px;opacity:.9;z-index:2}
.hd-hero .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.6))}
.hd-hero .txt{position:relative;z-index:2}
.hd-hero .yr{font-size:12px;font-weight:700;letter-spacing:.3px;opacity:.9;margin-top:3px}
.hd-hero h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.3px}
.body p{font-size:15px;line-height:1.6;color:#402f37;margin:0 0 12px}
.listenrow{display:flex;gap:9px;margin:2px 0 12px;flex-wrap:wrap}
.listenbtn{display:inline-flex;align-items:center;gap:7px;font-weight:700;font-size:13px;
  padding:9px 14px;border-radius:999px;border:1.5px solid var(--brand);color:var(--brand);background:var(--brand-soft);
  cursor:pointer;margin:0}
.listenbtn:active{transform:translateY(2px)}
.listenbtn.on{background:var(--brand);color:#fff}
.gu-caption{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 14px;
  font-size:17px;line-height:1.6;color:var(--ink)}
.gword-inline{font-family:var(--fgu);font-weight:700}
.sitebox{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:4px 0 14px}
.sitebox b{font-size:13px} .sitebox p{font-size:13px;margin:4px 0 0;color:#4b3942;line-height:1.45}

/* sources */
.sources{margin-top:18px;border-top:1px solid var(--line);padding-top:14px}
.sources h4{margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}
.sources ul{margin:0;padding-left:18px}
.sources li{font-size:12.5px;color:#5b4a51;line-height:1.5;margin-bottom:4px}
.sources li i{color:var(--muted)}

/* vocab */
.wordcard{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);
  border-radius:16px;padding:12px 14px;margin-bottom:10px}
.wordcard .cue{width:40px;height:40px;border-radius:12px;background:var(--brand-soft);display:grid;place-items:center;
  font-size:22px;flex:none}
.wordcard .gu{font-family:var(--fgu);font-size:20px;font-weight:700}
.wordcard .rm{font-size:12px;color:var(--muted);font-weight:600}
.wordcard .en{font-size:14px;margin-top:1px}
.wordcard .sp{margin-left:auto;width:40px;height:40px;border-radius:50%;border:none;background:var(--brand-soft);
  color:var(--brand);display:grid;place-items:center;cursor:pointer;flex:none}
.wordcard .sp:active{transform:scale(.94)}
.tag{display:inline-block;font-size:11px;font-weight:800;color:var(--brand);background:var(--brand-soft);
  padding:3px 9px;border-radius:999px;margin-left:8px;vertical-align:middle}

/* profile */
.stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0 4px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px}
.stat .n{font-size:26px;font-weight:800;display:flex;align-items:center;gap:7px}
.stat .n svg{width:22px;height:22px}
.stat .l{font-size:12.5px;color:var(--muted);font-weight:600;margin-top:2px}
.week{display:flex;justify-content:space-between;margin-top:6px}
.day{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:var(--muted);font-weight:700}
.day .dot{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--bg);border:1.5px solid var(--line)}
.day.hit .dot{background:#FDECD9;border-color:var(--diya);color:var(--diya)}
.badges{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.badge2{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px}
.badge2 .ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#fff;flex:none}
.badge2 b{font-size:14px} .badge2 small{color:var(--muted);font-size:11.5px;font-weight:600;display:block}
.badge2.off{opacity:.45}
.toggle{display:flex;align-items:center;gap:12px;padding:14px 2px;border-bottom:1px solid var(--line)}
.toggle:last-child{border-bottom:none}
.toggle .tt{flex:1}
.toggle b{font-size:15px;font-weight:700} .toggle small{display:block;color:var(--muted);font-size:12px;font-weight:500;margin-top:1px}
.sw{width:50px;height:30px;border-radius:999px;background:var(--line);position:relative;cursor:pointer;flex:none;transition:background .15s}
.sw i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.sw.on{background:var(--ok)} .sw.on i{left:23px}

/* onboarding */
.onb{min-height:100vh;display:flex;flex-direction:column;padding:26px 22px calc(26px + env(safe-area-inset-bottom));max-width:460px;margin:0 auto}
.onb .center{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:14px}
.onb .big-mark{width:96px;height:96px;border-radius:28px;background:var(--brand);color:#fff;display:grid;place-items:center;
  font-family:var(--fgu);font-weight:800;font-size:52px;box-shadow:0 8px 0 var(--brand-dark)}
.onb h1{font-size:30px;font-weight:800;margin:6px 0 0;letter-spacing:-.5px}
.onb .tagline{font-size:16px;color:#5b4a51;line-height:1.5;max-width:320px}
.onb .oq{font-size:22px;font-weight:800;text-align:center;margin:0 0 4px}
.onb .osub{font-size:14px;color:var(--muted);text-align:center;margin:0 0 20px}
.pick{border:2px solid var(--line);background:var(--card);border-radius:18px;padding:16px;cursor:pointer;text-align:left;
  display:flex;gap:14px;align-items:center;box-shadow:0 4px 0 var(--line);margin-bottom:12px;width:100%}
.pick:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line)}
.pick.sel{border-color:var(--brand);background:var(--brand-soft);box-shadow:0 4px 0 rgba(138,28,59,.25)}
.pick .pic{width:46px;height:46px;border-radius:14px;background:var(--brand-soft);color:var(--brand);display:grid;place-items:center;flex:none}
.pick b{font-size:16px;font-weight:800} .pick p{margin:2px 0 0;font-size:13px;color:#5b4a51;line-height:1.4}
.dots{display:flex;gap:7px;justify-content:center;margin:0 0 18px}
.dots i{width:8px;height:8px;border-radius:50%;background:var(--line)} .dots i.on{background:var(--brand);width:22px;border-radius:999px}

/* complete */
.done-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  padding:26px 22px calc(26px + env(safe-area-inset-bottom));max-width:460px;margin:0 auto;position:relative}
.done-medal{width:120px;height:120px;border-radius:50%;background:var(--gold);color:#fff;display:grid;place-items:center;
  box-shadow:0 8px 0 var(--gold-dark);margin-bottom:8px}
.done-medal svg{width:62px;height:62px}
.done-wrap h1{font-size:28px;font-weight:800;margin:8px 0 2px}
.done-wrap .ds{color:#5b4a51;font-size:15px;margin-bottom:18px}
.done-stats{display:flex;gap:12px;width:100%;margin-bottom:20px}
.done-stat{flex:1;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 6px}
.done-stat .n{font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:5px}
.done-stat .n svg{width:18px;height:18px}
.done-stat .l{font-size:11px;color:var(--muted);font-weight:600;margin-top:2px}
.unlock{width:100%;background:var(--brand-soft);border:1.5px solid var(--brand);border-radius:18px;padding:16px;margin-bottom:14px;text-align:left;display:flex;gap:12px;align-items:center}
.unlock .ic{width:44px;height:44px;border-radius:12px;background:var(--brand);color:#fff;display:grid;place-items:center;flex:none}
.unlock b{font-size:15px} .unlock p{margin:2px 0 0;font-size:12.5px;color:#5b4a51}

/* confetti */
.confetti{position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden;max-width:460px;margin:0 auto}
.confetti i{position:absolute;top:-14px;width:9px;height:14px;border-radius:2px;animation:fall linear forwards}
@keyframes fall{to{transform:translateY(105vh) rotate(720deg)}}

/* speaking practice */
.turn-divider{font-size:12px;font-weight:700;color:var(--muted);text-align:center;margin:16px 0 4px;
  position:relative}
.speakcheck{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:8px}
.micbtn{width:64px;height:64px;border-radius:50%;border:none;cursor:pointer;background:var(--brand);color:#fff;
  display:grid;place-items:center;box-shadow:0 4px 0 var(--brand-dark)}
.micbtn svg{width:26px;height:26px}
.micbtn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--brand-dark)}
.micbtn.on{background:var(--no);box-shadow:0 4px 0 var(--no-dark);animation:micpulse 1s ease infinite}
@keyframes micpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.speakcheck-label{font-size:12.5px;color:var(--muted);font-weight:700}
.speakcheck-msg{font-size:13.5px;font-weight:700;text-align:center;padding:9px 14px;border-radius:12px;max-width:320px}
.speakcheck-msg.good{background:var(--ok-soft);color:var(--ok-dark)}
.speakcheck-msg.close{background:#FBEFD6;color:var(--gold-dark)}
.speakcheck-msg.bad{background:var(--no-soft);color:var(--no-dark)}
.speakcheck-msg .heard{display:block;margin-top:5px;font-weight:600}
.speakcheck-msg .heard .gu{font-family:var(--fgu)}
.speakcheck-unsupported{font-size:12.5px;color:var(--muted);text-align:center;max-width:280px}

.spacer-lg{height:8px}
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
}
`;

/* ============================ CURRICULUM ============================ */
const LESSONS = {
  u1l1: { title: "First words", ex: [
    { t:"intro", gu:"નમસ્તે", roman:"namaste", en:"hello / greetings", sub:"A respectful greeting used across India." },
    { t:"hvpt", say:"ક", options:[{gu:"ક",roman:"ka"},{gu:"ખ",roman:"kha"}], answer:"ka", why:"ક (ka) has no puff of air. ખ (kha) is aspirated - a small puff, like the k in 'kite'." },
    { t:"intro", gu:"પાણી", roman:"paṇi", en:"water" },
    { t:"letter", glyph:"પ", options:["pa","ba","pha","va"], answer:"pa" },
    { t:"listen", say:"પાણી", roman:"paṇi", options:["water","food","hello"], answer:"water" },
    { t:"hvpt", say:"ડ", options:[{gu:"દ",roman:"da (soft)"},{gu:"ડ",roman:"ḍa (hard)"}], answer:"ḍa (hard)", why:"દ is dental: tongue touches the teeth. ડ is retroflex: tongue curls back on the roof." },
    { t:"build", en:"I drink water.", answer:["હું","પાણી","પીઉં","છું"], extra:["તમે","દૂધ"], roman:"huṁ paṇi piuṁ chuṁ" },
    { t:"speak", gu:"આભાર", roman:"aabhaar", en:"thank you" },
  ]},
  u1l2: { title: "Numbers 1 to 5", ex: [
    { t:"intro", gu:"એક", roman:"ek", en:"one" },
    { t:"intro", gu:"બે", roman:"be", en:"two" },
    { t:"listen", say:"ત્રણ", roman:"traṇ", options:["three","two","five"], answer:"three" },
    { t:"match", pairs:[{gu:"એક",en:"one"},{gu:"બે",en:"two"},{gu:"ત્રણ",en:"three"},{gu:"ચાર",en:"four"}] },
    { t:"intro", gu:"પાંચ", roman:"paanch", en:"five" },
    { t:"letter", glyph:"ચ", options:["cha","ja","ta","sa"], answer:"cha" },
    { t:"speak", gu:"એક, બે, ત્રણ", roman:"ek, be, traṇ", en:"one, two, three" },
  ]},
  u1l3: { title: "Yes, no, sorry", ex: [
    { t:"intro", gu:"હા", roman:"haa", en:"yes" },
    { t:"intro", gu:"ના", roman:"naa", en:"no" },
    { t:"listen", say:"હા", roman:"haa", options:["yes","no","maybe"], answer:"yes" },
    { t:"intro", gu:"માફ કરો", roman:"maaf karo", en:"sorry / excuse me" },
    { t:"match", pairs:[{gu:"હા",en:"yes"},{gu:"ના",en:"no"},{gu:"માફ કરો",en:"sorry"},{gu:"આભાર",en:"thanks"}] },
    { t:"speak", gu:"ના, આભાર", roman:"naa, aabhaar", en:"no, thank you" },
  ]},
  u1c: { title: "Checkpoint", check:true, ex: [
    { t:"listen", say:"ત્રણ", roman:"traṇ", options:["three","one","water"], answer:"three" },
    { t:"match", pairs:[{gu:"એક",en:"one"},{gu:"પાણી",en:"water"},{gu:"હા",en:"yes"},{gu:"ના",en:"no"}] },
    { t:"hvpt", say:"ખ", options:[{gu:"ક",roman:"ka"},{gu:"ખ",roman:"kha"}], answer:"kha", why:"ખ (kha) is aspirated - listen for the puff of air." },
    { t:"build", en:"I drink water.", answer:["હું","પાણી","પીઉં","છું"], extra:["ખાઉં","દૂધ"], roman:"huṁ paṇi piuṁ chuṁ" },
    { t:"speak", gu:"નમસ્તે, આભાર", roman:"namaste, aabhaar", en:"hello, thank you" },
  ]},

  u2l1: { title: "Family", ex: [
    { t:"intro", gu:"માતા", roman:"maataa", en:"mother", sub:"મમ્મી (mummy) is common in casual speech." },
    { t:"intro", gu:"પિતા", roman:"pitaa", en:"father" },
    { t:"intro", gu:"ભાઈ", roman:"bhaai", en:"brother" },
    { t:"intro", gu:"બહેન", roman:"bahen", en:"sister" },
    { t:"match", pairs:[{gu:"માતા",en:"mother"},{gu:"પિતા",en:"father"},{gu:"ભાઈ",en:"brother"},{gu:"બહેન",en:"sister"}] },
    { t:"build", en:"This is my brother.", answer:["આ","મારો","ભાઈ","છે"], extra:["બહેન","મારી"], roman:"aa maaro bhaai chhe" },
    { t:"listen", say:"બહેન", roman:"bahen", options:["sister","brother","mother"], answer:"sister" },
    { t:"speak", gu:"આ મારી બહેન છે", roman:"aa maari bahen chhe", en:"This is my sister." },
  ]},
  u2l2: { title: "Food and drink", ex: [
    { t:"intro", gu:"ભાત", roman:"bhaat", en:"rice" },
    { t:"intro", gu:"રોટલી", roman:"roṭli", en:"flatbread (roti)" },
    { t:"intro", gu:"દૂધ", roman:"doodh", en:"milk" },
    { t:"match", pairs:[{gu:"ભાત",en:"rice"},{gu:"રોટલી",en:"roti"},{gu:"દૂધ",en:"milk"},{gu:"ચા",en:"tea"}] },
    { t:"letter", glyph:"ધ", options:["dha","da","tha","bha"], answer:"dha" },
    { t:"build", en:"I eat rice.", answer:["હું","ભાત","ખાઉં","છું"], extra:["પીઉં","દૂધ"], roman:"huṁ bhaat khaauṁ chuṁ" },
    { t:"listen", say:"ચા", roman:"chaa", options:["tea","milk","water"], answer:"tea" },
    { t:"speak", gu:"મને ચા ભાવે છે", roman:"mane chaa bhaave chhe", en:"I like tea." },
  ]},
  u2l3: { title: "Around the house", ex: [
    { t:"intro", gu:"ઘર", roman:"ghar", en:"house / home" },
    { t:"intro", gu:"મેજ", roman:"mej", en:"table" },
    { t:"intro", gu:"પુસ્તક", roman:"pustak", en:"book" },
    { t:"intro", gu:"પર", roman:"par", en:"on / on top of", sub:"It comes AFTER the noun." },
    { t:"fill", pre:"પુસ્તક મેજ", post:"છે", options:["પર","માટે","સાથે"], answer:"પર", gu:"પુસ્તક મેજ પર છે", en:"The book is on the table.", why:"પર means 'on' and follows the noun: મેજ પર = on the table." },
    { t:"match", pairs:[{gu:"ઘર",en:"house"},{gu:"મેજ",en:"table"},{gu:"પુસ્તક",en:"book"},{gu:"પર",en:"on"}] },
    { t:"build", en:"The book is on the table.", answer:["પુસ્તક","મેજ","પર","છે"], extra:["ઘર","માટે"], roman:"pustak mej par chhe" },
    { t:"speak", gu:"ઘર મોટું છે", roman:"ghar moṭuṁ chhe", en:"The house is big." },
  ]},

  u3l1: { title: "Word order", ex: [
    { t:"note", title:"Gujarati puts the verb last", body:[
      "English is Subject - Verb - Object: 'I drink water.'",
      "Gujarati is Subject - Object - Verb: literally 'I water drink.' The verb comes at the very end.",
      "So: હું (I) + પાણી (water) + પીઉં છું (drink)."], ex:[
      {gu:"હું પાણી પીઉં છું",roman:"huṁ paṇi piuṁ chuṁ",en:"I drink water. (lit. I water drink)"},
      {gu:"તે ભાત ખાય છે",roman:"te bhaat khaay chhe",en:"He eats rice. (lit. he rice eats)"}] },
    { t:"build", en:"He eats rice.", answer:["તે","ભાત","ખાય","છે"], extra:["પીઉં","હું"], roman:"te bhaat khaay chhe" },
    { t:"build", en:"I drink milk.", answer:["હું","દૂધ","પીઉં","છું"], extra:["ભાત","ખાય"], roman:"huṁ doodh piuṁ chuṁ" },
    { t:"fill", pre:"તે રોટલી", post:"", options:["ખાય છે","છે ખાય","ખાય"], answer:"ખાય છે", gu:"તે રોટલી ખાય છે", en:"She eats roti.", why:"The full verb ખાય છે goes at the end of the sentence." },
    { t:"speak", gu:"હું ઘરે જાઉં છું", roman:"huṁ ghare jaauṁ chuṁ", en:"I go home." },
  ]},
  u3l2: { title: "Postpositions", ex: [
    { t:"note", title:"Little words come after the noun", body:[
      "English puts these words before a noun: 'for you'. Gujarati puts them after: 'you for' (તારા માટે).",
      "Three to know: પર (on), માટે (for), સાથે (with)."], ex:[
      {gu:"મેજ પર",roman:"mej par",en:"on the table"},
      {gu:"તારા માટે",roman:"taaraa maaṭe",en:"for you"},
      {gu:"મારી સાથે",roman:"maari saathe",en:"with me"}] },
    { t:"intro", gu:"ભેટ", roman:"bheṭ", en:"gift" },
    { t:"fill", pre:"આ ભેટ તારા", post:"છે", options:["માટે","પર","સાથે"], answer:"માટે", gu:"આ ભેટ તારા માટે છે", en:"This gift is for you.", why:"માટે means 'for', placed after તારા (you)." },
    { t:"fill", pre:"તું મારી", post:"આવ", options:["સાથે","પર","માટે"], answer:"સાથે", gu:"તું મારી સાથે આવ", en:"Come with me.", why:"સાથે means 'with'." },
    { t:"fill", pre:"પુસ્તક મેજ", post:"છે", options:["પર","માટે","સાથે"], answer:"પર", gu:"પુસ્તક મેજ પર છે", en:"The book is on the table.", why:"પર means 'on'." },
    { t:"speak", gu:"આ તારા માટે છે", roman:"aa taaraa maaṭe chhe", en:"This is for you." },
  ]},
  u3l3: { title: "My, your, gender", ex: [
    { t:"note", title:"My / your changes with gender", body:[
      "Gujarati nouns are masculine, feminine, or neuter, and 'my/your' must match the noun.",
      "મારો (m.), મારી (f.), મારું (neuter). 'Your' follows the same pattern: તારો / તારી / તારું."], ex:[
      {gu:"મારો ભાઈ",roman:"maaro bhaai",en:"my brother (m.)"},
      {gu:"મારી બહેન",roman:"maari bahen",en:"my sister (f.)"},
      {gu:"મારું ઘર",roman:"maaruṁ ghar",en:"my house (neuter)"}] },
    { t:"fill", pre:"આ", post:"બહેન છે", options:["મારી","મારો","મારું"], answer:"મારી", gu:"આ મારી બહેન છે", en:"This is my sister.", why:"બહેન is feminine, so મારી." },
    { t:"fill", pre:"આ", post:"ઘર છે", options:["મારું","મારો","મારી"], answer:"મારું", gu:"આ મારું ઘર છે", en:"This is my house.", why:"ઘર is neuter, so મારું." },
    { t:"fill", pre:"આ", post:"ભાઈ છે", options:["મારો","મારી","મારું"], answer:"મારો", gu:"આ મારો ભાઈ છે", en:"This is my brother.", why:"ભાઈ is masculine, so મારો." },
    { t:"build", en:"This is my sister.", answer:["આ","મારી","બહેન","છે"], extra:["મારો","ભાઈ"], roman:"aa maari bahen chhe" },
    { t:"speak", gu:"મારું નામ છે", roman:"maaruṁ naam chhe", en:"My name is ..." },
  ]},
  u3l4: { title: "Present tense", ex: [
    { t:"note", title:"Present-tense endings", body:[
      "The verb ending changes with the subject. For પીવું (to drink):",
      "હું પીઉં છું (I drink), તું પીએ છે (you drink), તે પીએ છે (he/she drinks), અમે પીઈએ છીએ (we drink), તમે પીઓ છો (you drink, polite)."], ex:[
      {gu:"હું પીઉં છું",roman:"huṁ piuṁ chuṁ",en:"I drink"},
      {gu:"તમે પીઓ છો",roman:"tame pio chho",en:"you drink (polite)"},
      {gu:"અમે પીઈએ છીએ",roman:"ame piie chhie",en:"we drink"}] },
    { t:"fill", pre:"હું પાણી પીઉં", post:"", options:["છું","છો","છે"], answer:"છું", gu:"હું પાણી પીઉં છું", en:"I drink water.", why:"With હું (I), use છું." },
    { t:"fill", pre:"તમે ચા પીઓ", post:"", options:["છો","છું","છે"], answer:"છો", gu:"તમે ચા પીઓ છો", en:"You drink tea.", why:"With તમે (you, polite), use છો." },
    { t:"fill", pre:"તે ભાત ખાય", post:"", options:["છે","છું","છો"], answer:"છે", gu:"તે ભાત ખાય છે", en:"He eats rice.", why:"With તે (he/she), use છે." },
    { t:"build", en:"We drink milk.", answer:["અમે","દૂધ","પીઈએ","છીએ"], extra:["પીઉં","છું"], roman:"ame doodh piie chhie" },
    { t:"speak", gu:"તમે ક્યાં જાઓ છો?", roman:"tame kyaan jaao chho?", en:"Where are you going?" },
  ]},

  u4l1: { title: "Went and came", ex: [
    { t:"intro", gu:"ગયો", roman:"gayo", en:"went (m.)", sub:"ગઈ for a female subject." },
    { t:"intro", gu:"ગઈકાલે", roman:"gaikaale", en:"yesterday" },
    { t:"intro", gu:"બજાર", roman:"bajaar", en:"market" },
    { t:"fill", pre:"તે ઘરે", post:"", options:["ગયો","ગઈ","ગયું"], answer:"ગયો", gu:"તે ઘરે ગયો", en:"He went home.", why:"A masculine subject takes ગયો." },
    { t:"fill", pre:"તે ઘરે", post:"", options:["ગઈ","ગયો","ગયું"], answer:"ગઈ", gu:"તે ઘરે ગઈ", en:"She went home.", why:"A feminine subject takes ગઈ." },
    { t:"build", en:"I went to the market yesterday.", answer:["હું","ગઈકાલે","બજારે","ગયો"], extra:["જાઉં","છું"], roman:"huṁ gaikaale bajaare gayo" },
    { t:"listen", say:"ગઈકાલે", roman:"gaikaale", options:["yesterday","today","tomorrow"], answer:"yesterday" },
    { t:"speak", gu:"હું ઘરે ગયો", roman:"huṁ ghare gayo", en:"I went home." },
  ]},
  u4l2: { title: "The -e past marker", ex: [
    { t:"note", title:"The -e marker in the past", body:[
      "Gujarati has a special past-tense rule. The DOER takes a small -e ending (the ergative), and the verb agrees with the OBJECT, not the doer.",
      "'I ate a mango' becomes મેં કેરી ખાધી - literally 'by-me mango was-eaten'. ખાધી is feminine because કેરી (mango) is feminine."], ex:[
      {gu:"મેં કેરી ખાધી",roman:"meṁ keri khaadhi",en:"I ate a mango. (mango is f.)"},
      {gu:"કિશોરે કાગળ વાંચ્યો",roman:"kishore kaagaḷ vaanchyo",en:"Kishor read the paper. (paper is m.)"}] },
    { t:"fill", pre:"", post:"કેરી ખાધી", options:["મેં","હું","મને"], answer:"મેં", gu:"મેં કેરી ખાધી", en:"I ate a mango.", why:"In the past the doer takes -e: હું becomes મેં." },
    { t:"fill", pre:"મેં કેરી", post:"", options:["ખાધી","ખાધો","ખાધું"], answer:"ખાધી", gu:"મેં કેરી ખાધી", en:"I ate a mango.", why:"The verb agrees with કેરી (feminine), so ખાધી." },
    { t:"build", en:"Kishor read the paper.", answer:["કિશોરે","કાગળ","વાંચ્યો"], extra:["વાંચી","મેં"], roman:"kishore kaagaḷ vaanchyo" },
    { t:"speak", gu:"મેં ચા પીધી", roman:"meṁ chaa peedhi", en:"I drank tea." },
  ]},
  u4c: { title: "Checkpoint", check:true, ex: [
    { t:"fill", pre:"તે ઘરે", post:"", options:["ગયો","ગઈ","ગયું"], answer:"ગયો", gu:"તે ઘરે ગયો", en:"He went home.", why:"Masculine subject takes ગયો." },
    { t:"fill", pre:"", post:"કેરી ખાધી", options:["મેં","હું","મને"], answer:"મેં", gu:"મેં કેરી ખાધી", en:"I ate a mango.", why:"Past-tense doer takes -e: હું becomes મેં." },
    { t:"build", en:"I ate a mango.", answer:["મેં","કેરી","ખાધી"], extra:["ખાધો","હું"], roman:"meṁ keri khaadhi" },
    { t:"listen", say:"ગઈકાલે", roman:"gaikaale", options:["yesterday","today","market"], answer:"yesterday" },
    { t:"speak", gu:"હું બજારે ગયો", roman:"huṁ bajaare gayo", en:"I went to the market." },
  ]},

  u5l1: { title: "Polite 'you'", ex: [
    { t:"note", title:"Two ways to say 'you'", body:[
      "તું is informal - for close friends, children, and family your own age or younger.",
      "તમે is polite, and also plural. Use it for elders, strangers, and people you respect.",
      "With someone new, choose તમે to be safe."], ex:[
      {gu:"તું ક્યાં જાય છે?",roman:"tuṁ kyaan jaay chhe?",en:"Where are you going? (informal)"},
      {gu:"તમે ક્યાં જાઓ છો?",roman:"tame kyaan jaao chho?",en:"Where are you going? (polite)"}] },
    { t:"intro", gu:"મહેરબાની કરીને", roman:"meherbaani karine", en:"please" },
    { t:"fill", pre:"", post:"ક્યાં જાઓ છો?", options:["તમે","તું","હું"], answer:"તમે", gu:"તમે ક્યાં જાઓ છો?", en:"Where are you going? (polite)", why:"તમે is the polite 'you', paired with છો." },
    { t:"listen", say:"મહેરબાની કરીને", roman:"meherbaani karine", options:["please","thank you","sorry"], answer:"please" },
    { t:"speak", gu:"મહેરબાની કરીને પાણી આપો", roman:"meherbaani karine paṇi aapo", en:"Please give water." },
  ]},
  u5l2: { title: "Everyday phrases", ex: [
    { t:"intro", gu:"કેમ છો?", roman:"kem chho?", en:"how are you? (polite)" },
    { t:"intro", gu:"મજામાં", roman:"majaamaan", en:"doing well / great" },
    { t:"intro", gu:"આવજો", roman:"aavjo", en:"goodbye (lit. 'come again')" },
    { t:"match", pairs:[{gu:"કેમ છો?",en:"how are you?"},{gu:"મજામાં",en:"I'm well"},{gu:"આવજો",en:"goodbye"},{gu:"આભાર",en:"thanks"}] },
    { t:"build", en:"What is your name?", answer:["તમારું","નામ","શું","છે"], extra:["મારું","કેમ"], roman:"tamaaruṁ naam shuṁ chhe?" },
    { t:"listen", say:"કેમ છો?", roman:"kem chho?", options:["how are you?","what's your name?","goodbye"], answer:"how are you?" },
    { t:"speak", gu:"હું મજામાં છું, આભાર", roman:"huṁ majaamaan chuṁ, aabhaar", en:"I'm well, thank you." },
  ]},
  u5c: { title: "Checkpoint", check:true, ex: [
    { t:"match", pairs:[{gu:"કેમ છો?",en:"how are you?"},{gu:"મજામાં",en:"I'm well"},{gu:"આવજો",en:"goodbye"},{gu:"નમસ્તે",en:"hello"}] },
    { t:"build", en:"What is your name?", answer:["તમારું","નામ","શું","છે"], extra:["મારું","મજામાં"], roman:"tamaaruṁ naam shuṁ chhe?" },
    { t:"fill", pre:"", post:"ક્યાં જાઓ છો?", options:["તમે","તું","હું"], answer:"તમે", gu:"તમે ક્યાં જાઓ છો?", en:"Where are you going? (polite)", why:"Polite 'you' is તમે, with છો." },
    { t:"listen", say:"કેમ છો?", roman:"kem chho?", options:["how are you?","please","goodbye"], answer:"how are you?" },
    { t:"speak", gu:"નમસ્તે, કેમ છો?", roman:"namaste, kem chho?", en:"Hello, how are you?" },
  ]},
};

const UNITS = [
  { id:"u1", ku:"Unit 1", title:"Sounds and first words", sub:"Greetings, water, numbers, yes and no", color:"#8A1C3B",
    lessons:[ {id:"u1l1",label:"First words"}, {id:"u1l2",label:"Numbers 1-5"}, {id:"u1l3",label:"Yes, no, sorry"}, {id:"u1c",label:"Checkpoint",kind:"check"} ] },
  { id:"u2", ku:"Unit 2", title:"Everyday words", sub:"Family, food, and the home", color:"#1E6E7E",
    lessons:[ {id:"u2l1",label:"Family"}, {id:"u2l2",label:"Food and drink"}, {id:"u2l3",label:"Around the house"} ] },
  { id:"u3", ku:"Unit 3", title:"Grammar and sentences", sub:"Word order, postpositions, gender, present tense", color:"#C77B1E",
    lessons:[ {id:"u3l1",label:"Word order"}, {id:"u3l2",label:"Postpositions"}, {id:"u3l3",label:"My, your, gender"}, {id:"u3l4",label:"Present tense"} ] },
  { id:"u4", ku:"Unit 4", title:"Talking about the past", sub:"Went and came, and the -e marker", color:"#A23E52",
    lessons:[ {id:"u4l1",label:"Went and came"}, {id:"u4l2",label:"The -e marker"}, {id:"u4c",label:"Checkpoint",kind:"check"} ] },
  { id:"u5", ku:"Unit 5", title:"Conversation and politeness", sub:"Polite 'you' and everyday phrases", color:"#2F6E44",
    lessons:[ {id:"u5l1",label:"Polite 'you'"}, {id:"u5l2",label:"Everyday phrases"}, {id:"u5c",label:"Checkpoint",kind:"check"} ] },
];
const LESSON_ORDER = UNITS.flatMap((u) => u.lessons.map((l) => l.id));

/* ============================ GRAMMAR GUIDE ============================ */
const GRAMMAR = [
  { id:"g1", color:"#1E6E7E", title:"Word order (S-O-V)", summary:"Gujarati puts the verb at the very end.",
    points:["The order is Subject, Object, Verb.","'I water drink' means 'I drink water'.","In the present tense the verb agrees with the subject."],
    examples:[{gu:"હું પાણી પીઉં છું",roman:"huṁ paṇi piuṁ chuṁ",en:"I drink water."},{gu:"તે ભાત ખાય છે",roman:"te bhaat khaay chhe",en:"He eats rice."}] },
  { id:"g2", color:"#C77B1E", title:"Postpositions", summary:"Little words like on, for, with come after the noun.",
    points:["પર on, માટે for, સાથે with, માં in.","They follow the noun, unlike English prepositions.","Pronouns shift before them: તું becomes તારા."],
    examples:[{gu:"મેજ પર",roman:"mej par",en:"on the table"},{gu:"તારા માટે",roman:"taaraa maaṭe",en:"for you"},{gu:"મારી સાથે",roman:"maari saathe",en:"with me"}] },
  { id:"g3", color:"#8A1C3B", title:"Gender and 'my'", summary:"Nouns are masculine, feminine, or neuter, and words around them agree.",
    points:["'my' is મારો (m.), મારી (f.), મારું (neuter).","'your' follows the same shape: તારો / તારી / તારું.","Many adjectives ending in -o change too: મોટો, મોટી, મોટું."],
    examples:[{gu:"મારો ભાઈ",roman:"maaro bhaai",en:"my brother"},{gu:"મારી બહેન",roman:"maari bahen",en:"my sister"},{gu:"મારું ઘર",roman:"maaruṁ ghar",en:"my house"}] },
  { id:"g4", color:"#2F6E44", title:"Present tense", summary:"An ending marks who is doing the action.",
    points:["છું with હું, છે with તે, છો with તમે, છીએ with અમે.","The main verb also takes a matching ending.","Example verb: પીવું, to drink."],
    examples:[{gu:"હું પીઉં છું",roman:"huṁ piuṁ chuṁ",en:"I drink"},{gu:"તમે પીઓ છો",roman:"tame pio chho",en:"you drink (polite)"},{gu:"અમે પીઈએ છીએ",roman:"ame piie chhie",en:"we drink"}] },
  { id:"g5", color:"#A23E52", title:"The past and the -e marker", summary:"Many past verbs mark the doer with a small -e.",
    points:["The doer takes -e: હું becomes મેં, તે becomes તેણે.","The verb then agrees with the object, not the doer.","So the verb can look feminine even when a man is speaking."],
    examples:[{gu:"મેં કેરી ખાધી",roman:"meṁ keri khaadhi",en:"I ate a mango."},{gu:"કિશોરે કાગળ વાંચ્યો",roman:"kishore kaagaḷ vaanchyo",en:"Kishor read the paper."}] },
  { id:"g6", color:"#6B1330", title:"Polite 'you'", summary:"Choose the right 'you' for the person.",
    points:["તું is informal, for close friends and children.","તમે is polite, respectful, and also plural.","Match the verb ending: તું ...છે, but તમે ...છો."],
    examples:[{gu:"તું ક્યાં જાય છે?",roman:"tuṁ kyaan jaay chhe?",en:"Where are you going? (informal)"},{gu:"તમે ક્યાં જાઓ છો?",roman:"tame kyaan jaao chho?",en:"Where are you going? (polite)"},{gu:"મહેરબાની કરીને",roman:"meherbaani karine",en:"please"}] },
];

/* ============================ CONVERSATIONS ============================ */
const CONVERSATIONS = [
  { id:"c1", title:"Saying hello", icon:"👋", turns:[
    { who:"them", gu:"નમસ્તે! કેમ છો?", roman:"namaste! kem chho?", en:"Hello! How are you?" },
    { who:"you", gu:"હું મજામાં છું, આભાર. તમે?", roman:"huṁ majaamaan chuṁ, aabhaar. tame?", en:"I'm well, thanks. You?", choices:["હું મજામાં છું","ના, આભાર","આવજો"] },
    { who:"them", gu:"હું પણ મજામાં છું.", roman:"huṁ paṇ majaamaan chuṁ.", en:"I'm well too." },
    { who:"you", gu:"તમારું નામ શું છે?", roman:"tamaaruṁ naam shuṁ chhe?", en:"What is your name?" },
    { who:"them", gu:"મારું નામ મીરા છે.", roman:"maaruṁ naam Meeraa chhe.", en:"My name is Meera." },
  ]},
  { id:"c2", title:"At the tea stall", icon:"☕", turns:[
    { who:"them", gu:"આવો! શું જોઈએ?", roman:"aavo! shuṁ joie?", en:"Welcome! What would you like?" },
    { who:"you", gu:"મને એક ચા જોઈએ.", roman:"mane ek chaa joie.", en:"I'd like one tea.", choices:["મને એક ચા જોઈએ","પાણી","આભાર"] },
    { who:"them", gu:"ખાંડ સાથે?", roman:"khaanḍ saathe?", en:"With sugar?" },
    { who:"you", gu:"હા, થોડી ખાંડ.", roman:"haa, thoḍi khaanḍ.", en:"Yes, a little sugar." },
    { who:"them", gu:"લો, તમારી ચા.", roman:"lo, tamaari chaa.", en:"Here, your tea." },
    { who:"you", gu:"આભાર!", roman:"aabhaar!", en:"Thank you!" },
  ]},
  { id:"c3", title:"Asking the way", icon:"🧭", turns:[
    { who:"you", gu:"માફ કરો, બજાર ક્યાં છે?", roman:"maaf karo, bajaar kyaan chhe?", en:"Excuse me, where is the market?" },
    { who:"them", gu:"સીધા જાઓ, પછી ડાબે.", roman:"seedhaa jaao, pachhi ḍaabe.", en:"Go straight, then left." },
    { who:"you", gu:"કેટલું દૂર છે?", roman:"keṭluṁ door chhe?", en:"How far is it?", choices:["કેટલું દૂર છે?","આભાર","હા"] },
    { who:"them", gu:"બહુ દૂર નથી.", roman:"bahu door nathi.", en:"It is not very far." },
    { who:"you", gu:"આભાર!", roman:"aabhaar!", en:"Thank you!" },
  ]},
];

/* ============================ VOCAB TOPICS ============================ */
const TOPICS = [
  { id:"slang", title:"Modern slang", icon:"😎", tag:"New", note:"Casual words younger people actually use. Fun with friends, but skip them in formal settings.", words:[
    { gu:"મસ્ત", r:"mast", en:"awesome / cool", cue:"🤩" },
    { gu:"જબરું", r:"jabaruṁ", en:"amazing", cue:"🔥" },
    { gu:"ધમાલ", r:"dhamaal", en:"a blast / great fun", cue:"🎉" },
    { gu:"શું ચાલે?", r:"shu chaale?", en:"what's up?", cue:"👋" },
    { gu:"ટેન્શન નહીં", r:"ṭension nahi", en:"no worries", cue:"😌" },
    { gu:"લોચો", r:"locho", en:"a mix-up / mess", cue:"😅" },
  ]},
  { id:"family", title:"Family", icon:"👪", words:[
    { gu:"માતા", r:"maataa", en:"mother", cue:"👩" },
    { gu:"પિતા", r:"pitaa", en:"father", cue:"👨" },
    { gu:"ભાઈ", r:"bhaai", en:"brother", cue:"🧑" },
    { gu:"બહેન", r:"bahen", en:"sister", cue:"👧" },
    { gu:"દાદા", r:"daadaa", en:"grandfather", cue:"👴" },
    { gu:"દાદી", r:"daadi", en:"grandmother", cue:"👵" },
  ]},
  { id:"numbers", title:"Numbers 1-10", icon:"🔢", words:[
    { gu:"એક", r:"ek", en:"one", cue:"1️⃣" },
    { gu:"બે", r:"be", en:"two", cue:"2️⃣" },
    { gu:"ત્રણ", r:"traṇ", en:"three", cue:"3️⃣" },
    { gu:"ચાર", r:"chaar", en:"four", cue:"4️⃣" },
    { gu:"પાંચ", r:"paanch", en:"five", cue:"5️⃣" },
    { gu:"છ", r:"chha", en:"six", cue:"6️⃣" },
    { gu:"સાત", r:"saat", en:"seven", cue:"7️⃣" },
    { gu:"આઠ", r:"aaṭh", en:"eight", cue:"8️⃣" },
    { gu:"નવ", r:"nav", en:"nine", cue:"9️⃣" },
    { gu:"દસ", r:"das", en:"ten", cue:"🔟" },
  ]},
  { id:"food", title:"Food and drink", icon:"🍲", words:[
    { gu:"ભાત", r:"bhaat", en:"rice", cue:"🍚" },
    { gu:"રોટલી", r:"roṭli", en:"roti", cue:"🫓" },
    { gu:"દાળ", r:"daaḷ", en:"lentils", cue:"🥣" },
    { gu:"શાક", r:"shaak", en:"vegetable curry", cue:"🥘" },
    { gu:"દૂધ", r:"doodh", en:"milk", cue:"🥛" },
    { gu:"ચા", r:"chaa", en:"tea", cue:"☕" },
    { gu:"કેરી", r:"keri", en:"mango", cue:"🥭" },
  ]},
  { id:"verbs", title:"Common verbs", icon:"🏃", words:[
    { gu:"ખાવું", r:"khaavuṁ", en:"to eat", cue:"🍽️" },
    { gu:"પીવું", r:"peevuṁ", en:"to drink", cue:"🥤" },
    { gu:"જવું", r:"javuṁ", en:"to go", cue:"🚶" },
    { gu:"આવવું", r:"aavvuṁ", en:"to come", cue:"👋" },
    { gu:"કરવું", r:"karvuṁ", en:"to do", cue:"🛠️" },
    { gu:"બોલવું", r:"bolvuṁ", en:"to speak", cue:"💬" },
  ]},
  { id:"transport", title:"Getting around", icon:"🚗", words:[
    { gu:"ગાડી", r:"gaaḍi", en:"car", cue:"🚗" },
    { gu:"બસ", r:"bas", en:"bus", cue:"🚌" },
    { gu:"ટ્રેન", r:"ṭren", en:"train", cue:"🚆" },
    { gu:"રિક્ષા", r:"riksaa", en:"auto-rickshaw", cue:"🛺" },
    { gu:"સાઇકલ", r:"saaikal", en:"bicycle", cue:"🚲" },
    { gu:"વિમાન", r:"vimaan", en:"airplane", cue:"✈️" },
  ]},
  { id:"colors", title:"Colors", icon:"🎨", words:[
    { gu:"લાલ", r:"laal", en:"red", cue:"🔴" },
    { gu:"વાદળી", r:"vaadaḷi", en:"blue", cue:"🔵" },
    { gu:"લીલો", r:"leelo", en:"green", cue:"🟢" },
    { gu:"પીળો", r:"peeḷo", en:"yellow", cue:"🟡" },
    { gu:"કાળો", r:"kaaḷo", en:"black", cue:"⚫" },
    { gu:"સફેદ", r:"safed", en:"white", cue:"⚪" },
  ]},
  { id:"animals", title:"Animals", icon:"🐾", words:[
    { gu:"કૂતરો", r:"kootro", en:"dog", cue:"🐕" },
    { gu:"બિલાડી", r:"bilaaḍi", en:"cat", cue:"🐈" },
    { gu:"ગાય", r:"gaay", en:"cow", cue:"🐄" },
    { gu:"હાથી", r:"haathi", en:"elephant", cue:"🐘" },
    { gu:"વાઘ", r:"vaagh", en:"tiger", cue:"🐅" },
    { gu:"પક્ષી", r:"pakshi", en:"bird", cue:"🐦" },
  ]},
];

/* ============================ SCRIPT ============================ */
const VOWELS = [
  { gu:"અ", roman:"a" }, { gu:"આ", roman:"aa" }, { gu:"ઇ", roman:"i" }, { gu:"ઈ", roman:"ii" },
  { gu:"ઉ", roman:"u" }, { gu:"ઊ", roman:"uu" },
  { gu:"ઋ", roman:"ru", hint:"a vocalic r, found in Sanskrit loanwords like ઋતુ (season)" },
  { gu:"એ", roman:"e" }, { gu:"ઐ", roman:"ai" }, { gu:"ઓ", roman:"o" }, { gu:"ઔ", roman:"au" },
  { gu:"ઍ", roman:"ê", hint:"the vowel in the English word 'cat'" },
  { gu:"ઑ", roman:"ô", hint:"the vowel in the English word 'hot'" },
];
const CONS_ROWS = [
  { label:"Velar", chars:[{gu:"ક",roman:"ka"},{gu:"ખ",roman:"kha"},{gu:"ગ",roman:"ga"},{gu:"ઘ",roman:"gha"},{gu:"ઙ",roman:"ṅa"}] },
  { label:"Palatal", chars:[{gu:"ચ",roman:"cha"},{gu:"છ",roman:"chha"},{gu:"જ",roman:"ja"},{gu:"ઝ",roman:"jha"},{gu:"ઞ",roman:"ña"}] },
  { label:"Retroflex", chars:[{gu:"ટ",roman:"ṭa"},{gu:"ઠ",roman:"ṭha"},{gu:"ડ",roman:"ḍa"},{gu:"ઢ",roman:"ḍha"},{gu:"ણ",roman:"ṇa"}] },
  { label:"Dental", chars:[{gu:"ત",roman:"ta"},{gu:"થ",roman:"tha"},{gu:"દ",roman:"da"},{gu:"ધ",roman:"dha"},{gu:"ન",roman:"na"}] },
  { label:"Labial", chars:[{gu:"પ",roman:"pa"},{gu:"ફ",roman:"pha"},{gu:"બ",roman:"ba"},{gu:"ભ",roman:"bha"},{gu:"મ",roman:"ma"}] },
  { label:"Semivowels", chars:[{gu:"ય",roman:"ya"},{gu:"ર",roman:"ra"},{gu:"લ",roman:"la"},{gu:"વ",roman:"va"},{gu:"ળ",roman:"ḷa"}] },
  { label:"Sibilants and H", chars:[{gu:"શ",roman:"sha"},{gu:"ષ",roman:"ṣa",hint:"a retroflex 'sha', mostly in Sanskrit loanwords"},{gu:"સ",roman:"sa"},{gu:"હ",roman:"ha"}] },
];
const CONJUNCTS = [
  { gu:"ક્ષ", roman:"kṣa", hint:"a blend of ક + ષ, as in પક્ષી (bird)" },
  { gu:"જ્ઞ", roman:"gya", hint:"a blend of જ + ઞ, as in જ્ઞાન (knowledge)" },
  { gu:"શ્રી", roman:"shri", hint:"an honorific meaning 'holy' or 'Mr.', very common in names" },
];
const NUMERALS = [
  { gu:"૦", roman:"0" }, { gu:"૧", roman:"1" }, { gu:"૨", roman:"2" }, { gu:"૩", roman:"3" }, { gu:"૪", roman:"4" },
  { gu:"૫", roman:"5" }, { gu:"૬", roman:"6" }, { gu:"૭", roman:"7" }, { gu:"૮", roman:"8" }, { gu:"૯", roman:"9" },
];
const SIGNS = [
  { gu:"ં", roman:"anusvar", hint:"a dot that nasalizes: adds an m or n sound" },
  { gu:"ઃ", roman:"visarg", hint:"a soft h breath at the end of a syllable" },
  { gu:"ઁ", roman:"candrabindu", hint:"nasalizes the whole vowel, as in ચાંદ" },
  { gu:"્", roman:"halant", hint:"removes the built-in 'a' from a consonant" },
  { gu:"ૐ", roman:"om", hint:"the sacred syllable Om" },
];

/* ============================ HISTORY ============================ */
const FP = "https://commons.wikimedia.org/wiki/Special:FilePath/";
const ERAS = [
  { id:"indus", yr:"c. 3000 - 1500 BCE", title:"The Indus cities", emo:"🏺", color:"#B07A3C",
    img: FP + "Dholavira%20gujarat.jpg?width=1000",
    blurb:"Some of the world's earliest planned cities stood in what is now Gujarat.",
    body:[
      "Long before there was a Gujarat, the region held major cities of the Indus Valley civilization. Dholavira, on a dry island in the Rann of Kutch, was built largely of stone, with gateways, reservoirs, and one of the earliest water-harvesting systems ever found.",
      "At Lothal, near the Gulf of Khambhat, archaeologists uncovered what many read as a dockyard, along with bead workshops and standardized weights for trade. Goods and ideas moved between these towns and distant Mesopotamia and the Oman coast.",
      "These sites show that careful planning, craft, and long-distance trade shaped this land from its earliest history."],
    site:{ name:"Dholavira, Kutch", note:"A UNESCO World Heritage Site since 2021, known for its stone architecture and reservoirs." },
    sources:["UNESCO World Heritage Centre, Dholavira: a Harappan City","Archaeological Survey of India, Gujarat excavation reports","Wikipedia, Dholavira and Lothal"] },

  { id:"maurya", yr:"c. 250 BCE", title:"Ashoka's edicts", emo:"🪨", color:"#7C8A3C",
    blurb:"A rock near Girnar carries messages carved for the public over two thousand years ago.",
    body:[
      "By the 3rd century BCE the region was part of the Mauryan empire. On a large boulder near Junagadh, at the foot of Girnar hill, the emperor Ashoka had edicts carved that speak of dharma, non-violence, and care for his subjects.",
      "Later rulers added their own inscriptions to the same rock, including a record of repairs to the Sudarshana lake. Over the centuries the boulder became a layered public notice, one of the oldest in India."],
    site:{ name:"Junagadh rock, near Girnar", note:"One stone carries inscriptions from three different dynasties across seven centuries." },
    sources:["Archaeological Survey of India","Encyclopaedia Britannica, Ashoka and Junagadh","Wikipedia, Junagadh rock inscription"] },

  { id:"vallabhi", yr:"c. 470 - 780 CE", title:"Vallabhi's learning", emo:"📜", color:"#4E7C86",
    blurb:"A coastal kingdom whose university drew students from across Asia.",
    body:[
      "After the Mauryas, several dynasties rose and fell. The Maitrakas ruled from Vallabhi in Saurashtra and made it a center of trade and scholarship.",
      "Vallabhi's monasteries and university were known well beyond the region, and travelers compared it to the great Buddhist center of Nalanda. It was a meeting point for Buddhist, Jain, and Brahmanical learning."],
    sources:["Encyclopaedia Britannica, Maitraka dynasty","Wikipedia, Vallabhi and Maitraka dynasty"] },

  { id:"solanki", yr:"c. 950 - 1300 CE", title:"The Solanki age", emo:"🛕", color:"#B0603C",
    img: FP + "Rani%20ki%20vav%2002.jpg?width=1000",
    blurb:"Under the Chaulukya, or Solanki, kings, Patan became a capital of art, water, and letters.",
    body:[
      "The Chaulukya kings, often called the Solankis, ruled much of the region from Patan. This was a high point for temple building, water architecture, and both Gujarati and Sanskrit scholarship.",
      "Queen Udayamati's stepwell, Rani ki Vav, turns a well into an inverted temple carved with hundreds of sculptures. The scholar-monk Hemachandra, writing at this court, helped shape the grammar and literature that later fed into the Gujarati language.",
      "Historians such as Samira Sheikh and Aparna Kapadia describe this era as the slow making of Gujarat as a region, built through courts, trade routes, and pilgrimage rather than any single fixed identity."],
    site:{ name:"Rani ki Vav, Patan", note:"An 11th-century stepwell and UNESCO World Heritage Site, pictured on the Indian 100-rupee note." },
    sources:["UNESCO World Heritage Centre, Rani-ki-Vav at Patan","Samira Sheikh, Forging a Region: Sultans, Traders, and Pilgrims in Gujarat, 1200-1500","Aparna Kapadia, In Praise of Kings"] },

  { id:"sultanate", yr:"1407 - 1573", title:"The Gujarat Sultanate", emo:"🕌", color:"#4E6C86",
    blurb:"An independent sultanate founded Ahmedabad and made Gujarat a trading power.",
    body:[
      "In 1407 Gujarat became an independent sultanate. Sultan Ahmad Shah founded Ahmedabad in 1411 on the banks of the Sabarmati river, and it grew into one of the great trading and craft cities of the age.",
      "The sultans built a distinctive architecture that blended local carving traditions with Islamic form, seen in the mosques of Ahmedabad and the hilltop city of Champaner-Pavagadh. Gujarat's ports linked inland weavers and dyers to markets across the Indian Ocean."],
    site:{ name:"Champaner-Pavagadh", note:"A UNESCO World Heritage Site preserving a rare, largely unchanged pre-modern city." },
    sources:["UNESCO World Heritage Centre, Champaner-Pavagadh and Historic City of Ahmadabad","Samira Sheikh, Forging a Region","Wikipedia, Gujarat Sultanate"] },
];

ERAS.push(
  { id:"ocean", yr:"1573 - 1800s", title:"Ports and the ocean", emo:"⛵", color:"#3C6E7C",
    blurb:"Surat became a global port, and Gujarati merchants spread across the seas.",
    body:[
      "The Mughals annexed Gujarat in 1573, and the Marathas later contested the region. Through these changes the ports kept thriving. Surat became one of the busiest harbors in the world, a gateway for pilgrims to Mecca and for trade in cotton, indigo, and spices.",
      "Gujarati merchant and banking communities, including Jain, Hindu, Bohra, and Parsi traders, built networks reaching East Africa, Arabia, and Southeast Asia. This is the root of a Gujarati diaspora that remains global today.",
      "The Siddi community, of African descent, also settled along this coast, one of many groups the ocean brought to Gujarat."],
    sources:["Edward A. Alpers and Chhaya Goswami (eds.), Transregional Trade and Traders: Situating Gujarat in the Indian Ocean","Encyclopaedia Britannica, Surat","Wikipedia, Gujarat under the Mughal Empire"] },

  { id:"colonial", yr:"1800s - 1947", title:"Mills, land, and print", emo:"🏭", color:"#6E5A7C",
    blurb:"British rule reshaped land and labor, while a new Gujarati print culture took shape.",
    body:[
      "Under British rule, new revenue systems changed who controlled land, and textile mills in Ahmedabad drew thousands of workers into crowded neighborhoods. Historians such as Jan Breman and Sujata Patel have traced the difficult lives of these mill and rural laborers.",
      "At the same time, printing presses and newspapers created a modern reading public. The poet Narmad and other writers helped standardize Gujarati, turning many spoken forms into a shared written language.",
      "These decades set up the tensions of class, caste, and labor that would go on to shape the region's politics."],
    sources:["Jan Breman, Wage Hunters and Gatherers","Sujata Patel, on the Ahmedabad textile workers' movement","'Gandhi and the Standardisation of Gujarati' (journal article)"] },

  { id:"gandhi", yr:"1915 - 1947", title:"Satyagraha", emo:"🧂", color:"#7C5A2E",
    img: FP + "Gandhi%20at%20Dandi%2C%205%20April%201930.jpg?width=1000",
    blurb:"From Sabarmati Ashram, Gandhi turned Gujarat into a testing ground for non-violent resistance.",
    body:[
      "Returning from South Africa in 1915, Gandhi settled at the Sabarmati Ashram near Ahmedabad. Gujarat became a proving ground for satyagraha, his method of non-violent civil disobedience.",
      "Campaigns in Kheda and Bardoli organized peasants against unjust taxes. In 1930 Gandhi led the Salt March, walking about 385 km from Sabarmati to the coast at Dandi to make salt in open defiance of British law.",
      "The march drew worldwide attention and later inspired other movements, including the American civil rights struggle."],
    site:{ name:"Sabarmati Ashram and Dandi", note:"The ashram and the salt-march route are preserved as national heritage sites." },
    sources:["Gandhi Heritage Portal, materials on Kheda, Bardoli, and Dandi","Encyclopaedia Britannica, Salt March","Wikipedia, Salt March and Sabarmati Ashram"] },

  { id:"state", yr:"1947 - 1960", title:"A state is born", emo:"🗺️", color:"#2F6E5A",
    blurb:"A popular movement won a separate Gujarati-speaking state in 1960.",
    body:[
      "After independence, Gujarat was part of the large bilingual Bombay State. Many Gujaratis wanted a state organized around their own language, and the Mahagujarat movement of the late 1950s pressed this demand through protests and public campaigns.",
      "On 1 May 1960 the state of Gujarat was created, with its capital later built at Gandhinagar. Language, identity, and politics were now closely linked, a pattern that continued in the 1974 Nav Nirman student protests against price rises and corruption."],
    sources:["Scholarship on the Mahagujarat movement and linguistic reorganization of states","'Revisiting the Nav Nirman Andolan of Gujarat' (journal article)","Encyclopaedia Britannica, Gujarat"] },

  { id:"modern", yr:"1960 - present", title:"Growth and its costs", emo:"🏗️", color:"#3C5A8A",
    img: FP + "Statue%20of%20Unity.jpg?width=1000",
    blurb:"Fast industrial growth, a global diaspora, and hard questions about who benefits.",
    body:[
      "Since the 1960s Gujarat has built a reputation for trade, industry, and entrepreneurship, with large chemical, textile, diamond-cutting, and dairy cooperative sectors. A large Gujarati diaspora, especially in East Africa, the United Kingdom, and North America, keeps close ties with the state.",
      "Adivasi and Dalit communities have also organized to assert land rights and dignity, a history traced by scholars such as David Hardiman and Alf Gunvald Nilsen. Researchers of political economy, including Nikita Sud, examine who has gained most from Gujarat's land and industrial policies.",
      "The state has also faced serious tests, including widespread communal violence in 2002 that displaced many families, a history documented by human-rights researchers and scholars such as Sanjeevini Badigar Lokhande. In 2018 the Statue of Unity, a monument to independence leader Sardar Vallabhbhai Patel, opened near the Narmada dam, itself a project with a long and contested history of land and displacement."],
    site:{ name:"Statue of Unity, Kevadia", note:"At 182 meters, the tallest statue in the world, honoring Sardar Patel." },
    sources:["David Hardiman, The Coming of the Devi: Adivasi Assertion in Western India","Nikita Sud, on the political economy of Gujarat's land policy","Sanjeevini Badigar Lokhande, Communal Violence, Forced Migration and the State: Gujarat since 2002"] }
);

/* ============================ SOURCES for language lessons ============================ */
const LANG_SOURCES = [
  "Research synthesis on second-language acquisition methods for Gujarati (High Variability Phonetic Training, spaced retrieval, task-based output)",
  "Colloquial Gujarati: a structured course in the spoken and written language",
  "Grokipedia entries on Gujarati phonology and grammar",
];

/* ============================ small components ============================ */
function Confetti() {
  const colors = ["#8A1C3B", "#E0A63C", "#1E6E7E", "#3E8E5A", "#C77B1E"];
  const pieces = Array.from({ length: 46 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.6 + Math.random() * 1.2,
    color: colors[i % colors.length],
    rot: Math.random() * 90 - 45,
  }));
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i key={p.id} style={{ left: p.left + "%", background: p.color, animationDuration: p.dur + "s", animationDelay: p.delay + "s", transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

function WriteCanvas({ glyph }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => {
      const rect = c.getBoundingClientRect();
      c.width = rect.width * 2;
      c.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#8A1C3B";
    };
    resize();
    const pos = (e) => {
      const rect = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };
    const down = (e) => {
      drawing.current = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e) => {
      if (!drawing.current) return;
      e.preventDefault();
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const up = () => { drawing.current = false; };
    c.addEventListener("mousedown", down);
    c.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    c.addEventListener("touchstart", down, { passive: true });
    c.addEventListener("touchmove", move, { passive: false });
    c.addEventListener("touchend", up);
    return () => {
      c.removeEventListener("mousedown", down);
      c.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      c.removeEventListener("touchstart", down);
      c.removeEventListener("touchmove", move);
      c.removeEventListener("touchend", up);
    };
  }, [glyph]);
  const clear = () => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
  };
  return (
    <div>
      <div className="canvaswrap">
        <div className="canvasghost gu">{glyph}</div>
        <canvas ref={ref} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <button className="btn ghost sm" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}

function SafeImg({ src, alt, className }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return null;
  return <img src={src} alt={alt} className={className} onError={() => setOk(false)} />;
}

/* ============================ MAIN APP ============================ */
export default function App() {
  const [onboarded, setOnboarded] = useLocalState("dhatu_onboarded", false);
  const [screen, setScreen] = useState(() => (onboarded ? "learn" : "onboarding"));
  const [tab, setTab] = useState("learn");
  const [onbStep, setOnbStep] = useState(0);
  const [readWrite, setReadWrite] = useLocalState("dhatu_readWrite", true);
  const [showHistory, setShowHistory] = useLocalState("dhatu_showHistory", true);
  const [vocabTab, setVocabTab] = useLocalState("dhatu_vocabTab", false);

  const [kaudi, setKaudi] = useLocalState("dhatu_kaudi", 0);
  const [streak, setStreak] = useLocalState("dhatu_streak", 1);
  const [completed, setCompleted] = useLocalState("dhatu_completed", []);
  const [srs, setSrs] = useLocalState("dhatu_srs", []);
  const [weekHit, setWeekHit] = useLocalState("dhatu_weekHit", [true, true, false, false, false, false, false]);

  const [activeLesson, setActiveLesson] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exIdx, setExIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionKaudi, setSessionKaudi] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [selChar, setSelChar] = useState(null);
  const [selTopic, setSelTopic] = useState(null);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [selEra, setSelEra] = useState(null);
  const [selConvo, setSelConvo] = useState(null);
  const [convoStep, setConvoStep] = useState(0);
  const [erAudioLang, setErAudioLang] = useState(null);
  const [scriptTab, setScriptTab] = useState("vowels");

  useEffect(() => {
    try {
      if (window.speechSynthesis) window.speechSynthesis.getVoices();
    } catch (e) {}
  }, []);

  function finishOnboarding() {
    setOnboarded(true);
    setScreen("learn");
    setTab("learn");
  }

  function resetAllProgress() {
    try {
      ["dhatu_onboarded", "dhatu_readWrite", "dhatu_showHistory", "dhatu_vocabTab", "dhatu_kaudi", "dhatu_streak", "dhatu_completed", "dhatu_srs", "dhatu_weekHit"].forEach((k) => window.localStorage.removeItem(k));
    } catch (e) {}
    setKaudi(0);
    setStreak(1);
    setCompleted([]);
    setSrs([]);
    setWeekHit([true, true, false, false, false, false, false]);
    setReadWrite(true);
    setShowHistory(true);
    setVocabTab(false);
    setOnboarded(false);
    setConfirmReset(false);
    setOnbStep(0);
    setScreen("onboarding");
    setTab("learn");
  }

  function nextRecommended() {
    for (const id of LESSON_ORDER) {
      if (!completed.includes(id)) return id;
    }
    return LESSON_ORDER[LESSON_ORDER.length - 1];
  }

  function startLesson(id) {
    setActiveLesson(id);
    setExIdx(0);
    setFeedback(null);
    setSessionCorrect(0);
    setSessionKaudi(0);
    setScreen("lesson");
  }

  function exitLesson() {
    stopSpeak();
    setActiveLesson(null);
    setScreen("learn");
  }

  function completeLesson() {
    stopSpeak();
    if (activeLesson && !completed.includes(activeLesson)) {
      setCompleted((c) => [...c, activeLesson]);
    }
    setKaudi((k) => k + sessionKaudi);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1800);
    setScreen("complete");
  }

  function answerCorrect(pts = 10) {
    setSessionCorrect((c) => c + 1);
    setSessionKaudi((k) => k + pts);
  }

  function goNextExercise() {
    setFeedback(null);
    const lesson = LESSONS[activeLesson];
    const list = lesson.ex.filter((e) => readWrite || e.t !== "letter");
    if (exIdx + 1 >= list.length) {
      completeLesson();
    } else {
      setExIdx((i) => i + 1);
    }
  }

  function addTopicToReview(topic) {
    setSrs((prev) => {
      const existing = new Set(prev.map((p) => p.gu));
      const add = topic.words.filter((w) => !existing.has(w.gu)).map((w) => ({ gu: w.gu, roman: w.r, en: w.en, dueIn: 0, streak: 0 }));
      return [...prev, ...add];
    });
  }

  function gradeSrs(item, grade) {
    const map = { again: 0, hard: 1, good: 3, easy: 5 };
    setSrs((prev) =>
      prev.map((p) => (p === item ? { ...p, dueIn: map[grade], streak: grade === "again" ? 0 : p.streak + 1 } : p))
    );
  }

  /* ---------------- ONBOARDING ---------------- */
  if (screen === "onboarding") {
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="onb">
          {onbStep === 0 && (
            <div className="center">
              <div className="big-mark gu">ધા</div>
              <h1>Dhātu</h1>
              <p className="tagline">A Gujarati course built for English speakers, grounded in language-learning research.</p>
              <div style={{ height: 18 }} />
              <button className="btn primary" onClick={() => setOnbStep(1)}>Get started</button>
            </div>
          )}
          {onbStep === 1 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="dots"><i className="on" /><i /><i /></div>
              <p className="oq">What is your goal?</p>
              <p className="osub">This changes how lessons are shown. You can change it later in Profile.</p>
              <button className={"pick" + (readWrite ? " sel" : "")} onClick={() => setReadWrite(true)}>
                <span className="pic"><Ic.script /></span>
                <span><b>Read and write</b><p>Learn the Gujarati script alongside speaking.</p></span>
              </button>
              <button className={"pick" + (!readWrite ? " sel" : "")} onClick={() => setReadWrite(false)}>
                <span className="pic"><Ic.talk /></span>
                <span><b>Speak only</b><p>Focus on conversation using roman letters.</p></span>
              </button>
              <div style={{ height: 8 }} />
              <button className="btn primary" onClick={() => setOnbStep(2)}>Continue</button>
            </div>
          )}
          {onbStep === 2 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="dots"><i /><i className="on" /><i /></div>
              <p className="oq">Interested in history?</p>
              <p className="osub">Short, sourced lessons on the history of Gujarat and its people. You can turn this on or off anytime.</p>
              <button className={"pick" + (showHistory ? " sel" : "")} onClick={() => setShowHistory(true)}>
                <span className="pic"><Ic.temple /></span>
                <span><b>Yes, include History</b><p>Adds a History tab to the app.</p></span>
              </button>
              <button className={"pick" + (!showHistory ? " sel" : "")} onClick={() => setShowHistory(false)}>
                <span className="pic"><Ic.x /></span>
                <span><b>Not right now</b><p>Just the language course.</p></span>
              </button>
              <div style={{ height: 8 }} />
              <button className="btn primary" onClick={finishOnboarding}>Start learning</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- shared top bar + nav ---------------- */
  const TopBar = ({ title, sub }) => (
    <div className="top">
      <div className="brandmark gu">ધા</div>
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="spacer" />
      <div className="chip gold"><Ic.kaudi width={15} height={15} />{kaudi}</div>
      <div className="chip fire"><Ic.diya width={15} height={15} />{streak}</div>
    </div>
  );

  const NavBar = () => (
    <div className="nav">
      <button className={"navb" + (tab === "learn" ? " on" : "")} onClick={() => { setTab("learn"); setScreen("learn"); }}>
        <Ic.learn /> Learn
      </button>
      {readWrite && (
        <button className={"navb" + (tab === "script" ? " on" : "")} onClick={() => { setTab("script"); setScreen("script"); }}>
          <Ic.script /> Script
        </button>
      )}
      <button className={"navb" + (tab === "review" ? " on" : "")} onClick={() => { setTab("review"); setScreen("review"); }}>
        <Ic.review /> Review
      </button>
      {vocabTab && (
        <button className={"navb" + (tab === "vocab" ? " on" : "")} onClick={() => { setTab("vocab"); setScreen("vocab"); }}>
          <Ic.vocab /> Vocab
        </button>
      )}
      {showHistory && (
        <button className={"navb" + (tab === "history" ? " on" : "")} onClick={() => { setTab("history"); setScreen("history"); }}>
          <Ic.temple /> History
        </button>
      )}
      <button className={"navb" + (tab === "profile" ? " on" : "")} onClick={() => { setTab("profile"); setScreen("profile"); }}>
        <Ic.profile /> Profile
      </button>
    </div>
  );

  /* ---------------- LEARN ---------------- */
  if (screen === "learn") {
    const recId = nextRecommended();
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr">
          <TopBar title="Dhātu" sub="Gujarati, one step at a time" />
          <div className="guides">
            <button className="guide" style={{ background: "linear-gradient(135deg,#1E6E7E,#164F5A)" }} onClick={() => setScreen("grammar")}>
              <Ic.book className="gi" />
              <b>Grammar guide</b>
              <span>Six core patterns, explained</span>
            </button>
            <button className="guide" style={{ background: "linear-gradient(135deg,#C77B1E,#96590F)" }} onClick={() => setScreen("talk")}>
              <Ic.talk className="gi" />
              <b>Conversations</b>
              <span>Walk through real dialogues</span>
            </button>
          </div>

          {UNITS.map((u) => (
            <div key={u.id}>
              <div className="unit-h" style={{ background: `linear-gradient(135deg, ${u.color}, ${u.color}CC)` }}>
                <h2>{u.ku}: {u.title}</h2>
                <p>{u.sub}</p>
              </div>
              <div className="path">
                {u.lessons.map((l, i) => {
                  const done = completed.includes(l.id);
                  const isRec = l.id === recId;
                  const align = i % 3 === 0 ? "center" : i % 3 === 1 ? "flex-end" : "flex-start";
                  const shift = i % 3 === 1 ? 40 : i % 3 === 2 ? -40 : 0;
                  return (
                    <div key={l.id} className="node-row" style={{ justifyContent: align === "center" ? "center" : align === "flex-end" ? "flex-end" : "flex-start", paddingRight: align === "flex-end" ? 30 : 0, paddingLeft: align === "flex-start" ? 30 : 0 }}>
                      <div className="node-wrap">
                        {isRec && <div className="startpill">START</div>}
                        <button className={"node " + (done ? "done" : isRec ? "cur" : l.kind === "check" ? "check" : "todo")} onClick={() => startLesson(l.id)}>
                          <div className="disc">
                            {done ? <Ic.check /> : l.kind === "check" ? <Ic.star /> : <Ic.spark />}
                          </div>
                        </button>
                        <div className="node-label">{l.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ height: 10 }} />
        </div>
        <NavBar />
      </div>
    );
  }

  /* ---------------- GRAMMAR GUIDE ---------------- */
  if (screen === "grammar") {
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr plain">
          <div className="lhead">
            <button className="iconbtn" onClick={() => setScreen("learn")}><Ic.back /></button>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Grammar guide</h1>
              <div className="sub" style={{ marginTop: 1 }}>Six patterns that matter most</div>
            </div>
          </div>
          {GRAMMAR.map((g) => (
            <div key={g.id} className="note" style={{ marginBottom: 14, borderLeft: `4px solid ${g.color}` }}>
              <h3>{g.title}</h3>
              <p style={{ fontWeight: 600 }}>{g.summary}</p>
              <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
                {g.points.map((p, i) => (
                  <li key={i} style={{ fontSize: 14, color: "#4b3942", lineHeight: 1.5, marginBottom: 4 }}>{p}</li>
                ))}
              </ul>
              <div className="exrow">
                {g.examples.map((e, i) => (
                  <div key={i} className="exline">
                    <div className="gu">{e.gu}</div>
                    <div className="rm">{e.roman}</div>
                    <div className="en">{e.en}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- CONVERSATIONS (list + walkthrough) ---------------- */
  if (screen === "talk") {
    if (selConvo) {
      const convo = CONVERSATIONS.find((c) => c.id === selConvo);
      const turn = convo.turns[convoStep];
      return (
        <div className="dhatu">
          <style>{CSS}</style>
          <div className="scr plain">
            <div className="lhead">
              <button className="iconbtn" onClick={() => { setSelConvo(null); setConvoStep(0); stopSpeak(); }}><Ic.back /></button>
              <div style={{ flex: 1 }}>
                <div className="bar"><i style={{ width: `${((convoStep + 1) / convo.turns.length) * 100}%` }} /></div>
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: 40, marginBottom: 6 }}>{convo.icon}</div>
            <div className="q-title" style={{ textAlign: "center" }}>{convo.title}</div>
            <div className="card" style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>
                {turn.who === "you" ? "YOUR TURN" : "THEY SAY"}
              </div>
              <div className="bigword" style={{ fontSize: 30, textAlign: "left" }}>{turn.gu}</div>
              <div className="romanline" style={{ textAlign: "left" }}>{turn.roman}</div>
              <div style={{ fontSize: 14, color: "#4b3942", marginTop: 8 }}>{turn.en}</div>
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 10 }}>
                <button className="playbtn" onClick={() => speak(turn.gu)}><Ic.play /></button>
              </div>
              <div className="turn-divider">Now you say it</div>
              <SpeakCheck key={convo.id + "-" + convoStep} target={turn.gu} />
              {turn.choices && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>You could also say:</div>
                  {turn.choices.map((c, i) => (
                    <div key={i} className="tok gu" style={{ display: "inline-block", marginRight: 8, marginBottom: 8, cursor: "default" }}>{c}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: 90 }} />
          </div>
          <div className="foot">
            <button className="btn primary" onClick={() => {
              stopSpeak();
              if (convoStep + 1 >= convo.turns.length) { setSelConvo(null); setConvoStep(0); }
              else setConvoStep((s) => s + 1);
            }}>
              {convoStep + 1 >= convo.turns.length ? "Finish" : "Continue"}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr plain">
          <div className="lhead">
            <button className="iconbtn" onClick={() => setScreen("learn")}><Ic.back /></button>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Conversations</h1>
              <div className="sub" style={{ marginTop: 1 }}>Walk through real exchanges</div>
            </div>
          </div>
          {CONVERSATIONS.map((c) => (
            <button key={c.id} className="card" style={{ width: "100%", textAlign: "left", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => { setSelConvo(c.id); setConvoStep(0); }}>
              <div style={{ fontSize: 30 }}>{c.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{c.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{c.turns.length} lines</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- LESSON ENGINE ---------------- */
  if (screen === "lesson" && activeLesson) {
    const lesson = LESSONS[activeLesson];
    const list = lesson.ex.filter((e) => readWrite || e.t !== "letter");
    const ex = list[exIdx] || list[0];
    const progress = ((exIdx + (feedback ? 1 : 0)) / list.length) * 100;

    return <LessonRunner
      key={activeLesson + "-" + exIdx}
      lesson={lesson}
      ex={ex}
      exIdx={exIdx}
      total={list.length}
      progress={progress}
      readWrite={readWrite}
      feedback={feedback}
      setFeedback={setFeedback}
      onCorrect={answerCorrect}
      onNext={goNextExercise}
      onExit={exitLesson}
    />;
  }

  /* ---------------- COMPLETE ---------------- */
  if (screen === "complete") {
    const justUnlockedVocab = !vocabTab;
    const finishedLesson = activeLesson ? LESSONS[activeLesson] : null;
    const completeSources = (finishedLesson && finishedLesson.sources) ? finishedLesson.sources : LANG_SOURCES;
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        {showConfetti && <Confetti />}
        <div className="done-wrap">
          <div className="done-medal"><Ic.star /></div>
          <h1>Lesson complete</h1>
          <div className="ds">Well done. Here is how it went.</div>
          <div className="done-stats">
            <div className="done-stat">
              <div className="n"><Ic.kaudi width={16} height={16} />{sessionKaudi}</div>
              <div className="l">Kaudi earned</div>
            </div>
            <div className="done-stat">
              <div className="n"><Ic.check width={16} height={16} />{sessionCorrect}</div>
              <div className="l">Correct</div>
            </div>
            <div className="done-stat">
              <div className="n"><Ic.diya width={16} height={16} />{streak}</div>
              <div className="l">Day streak</div>
            </div>
          </div>
          {justUnlockedVocab && (
            <button className="unlock" onClick={() => setVocabTab(true)}>
              <span className="ic"><Ic.vocab /></span>
              <span><b>Add the Vocab tab</b><p>Unlock themed word lists, starting with modern slang.</p></span>
            </button>
          )}
          <button className="btn primary" onClick={() => { setScreen("learn"); setTab("learn"); }}>Continue</button>
          <div className="sources" style={{ width: "100%", textAlign: "left" }}>
            <h4>Sources for this lesson</h4>
            <ul>
              {completeSources.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- SCRIPT ---------------- */
  if (screen === "script") {
    if (selChar) {
      return (
        <div className="dhatu">
          <style>{CSS}</style>
          <div className="scr plain">
            <div className="lhead">
              <button className="iconbtn" onClick={() => setSelChar(null)}><Ic.back /></button>
            </div>
            <div className="cd-hero">
              <div className="cd-glyph">{selChar.gu}</div>
              <div className="cd-roman">{selChar.roman}</div>
              {selChar.hint && <div className="cd-hint">{selChar.hint}</div>}
            </div>
            <div className="playrow">
              <button className="playbtn big" onClick={() => speak(selChar.gu)}><Ic.play /></button>
            </div>
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>
              Trace the letter with your finger or mouse
            </div>
            <WriteCanvas glyph={selChar.gu} />
          </div>
        </div>
      );
    }
    const sections = [
      { id: "vowels", label: "Vowels" },
      { id: "cons", label: "Consonants" },
      { id: "conj", label: "Conjuncts" },
      { id: "num", label: "Numerals" },
      { id: "signs", label: "Signs" },
    ];
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr">
          <TopBar title="Script" sub="The Gujarati abugida" />
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
            {sections.map((s) => (
              <button key={s.id} className="btn ghost sm" style={{ flex: "none", ...(scriptTab === s.id ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : {}) }} onClick={() => setScriptTab(s.id)}>
                {s.label}
              </button>
            ))}
          </div>

          {scriptTab === "vowels" && (
            <>
              <div className="section-h">Vowels</div>
              <div className="chargrid">
                {VOWELS.map((v, i) => (
                  <button key={i} className="chartile" onClick={() => setSelChar(v)}>
                    <div className="gu">{v.gu}</div>
                    <small>{v.roman}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {scriptTab === "cons" && CONS_ROWS.map((row) => (
            <div key={row.label}>
              <div className="section-h">{row.label}</div>
              <div className="chargrid">
                {row.chars.map((c, i) => (
                  <button key={i} className="chartile" onClick={() => setSelChar(c)}>
                    <div className="gu">{c.gu}</div>
                    <small>{c.roman}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {scriptTab === "conj" && (
            <>
              <div className="section-h">Conjunct and special letters</div>
              <div className="chargrid">
                {CONJUNCTS.map((c, i) => (
                  <button key={i} className="chartile" onClick={() => setSelChar(c)}>
                    <div className="gu">{c.gu}</div>
                    <small>{c.roman}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {scriptTab === "num" && (
            <>
              <div className="section-h">Numerals</div>
              <div className="chargrid numgrid">
                {NUMERALS.map((n, i) => (
                  <button key={i} className="chartile" onClick={() => setSelChar(n)}>
                    <div className="gu">{n.gu}</div>
                    <small>{n.roman}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {scriptTab === "signs" && (
            <>
              <div className="section-h">Signs and symbols</div>
              <div className="chargrid">
                {SIGNS.map((s, i) => (
                  <button key={i} className="chartile" onClick={() => setSelChar(s)}>
                    <div className="gu">{s.gu}</div>
                    <small>{s.roman}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{ height: 10 }} />
        </div>
        <NavBar />
      </div>
    );
  }

  /* ---------------- REVIEW (SRS) ---------------- */
  if (screen === "review") {
    const due = srs.filter((s) => s.dueIn === 0);
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr">
          <TopBar title="Review" sub={`${due.length} due now`} />
          {srs.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>🗂️</div>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>Nothing to review yet</div>
              <div style={{ fontSize: 13.5, color: "var(--muted)" }}>Add words from Vocab, or finish lessons to build your review pile.</div>
            </div>
          )}
          {due.map((item, i) => (
            <div key={i} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="gu" style={{ fontSize: 22, fontWeight: 700 }}>{item.gu}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{item.roman}</div>
                  <div style={{ fontSize: 14, marginTop: 2 }}>{item.en}</div>
                </div>
                <button className="playbtn" onClick={() => speak(item.gu)}><Ic.play /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 12 }}>
                <button className="btn sm ghost" onClick={() => gradeSrs(item, "again")}>Again</button>
                <button className="btn sm ghost" onClick={() => gradeSrs(item, "hard")}>Hard</button>
                <button className="btn sm ok" onClick={() => gradeSrs(item, "good")}>Good</button>
                <button className="btn sm gold" onClick={() => gradeSrs(item, "easy")}>Easy</button>
              </div>
            </div>
          ))}
          {srs.length > 0 && due.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>All caught up</div>
              <div style={{ fontSize: 13.5, color: "var(--muted)" }}>{srs.length} words are scheduled for later.</div>
            </div>
          )}
          <div style={{ height: 10 }} />
        </div>
        <NavBar />
      </div>
    );
  }

  /* ---------------- VOCAB ---------------- */
  if (screen === "vocab") {
    if (selTopic) {
      const topic = TOPICS.find((t) => t.id === selTopic);
      return (
        <div className="dhatu">
          <style>{CSS}</style>
          <div className="scr plain">
            <div className="lhead">
              <button className="iconbtn" onClick={() => setSelTopic(null)}><Ic.back /></button>
              <div>
                <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{topic.icon} {topic.title}</h1>
              </div>
            </div>
            {topic.note && (
              <div className="note" style={{ marginBottom: 14 }}>
                <p style={{ margin: 0 }}>{topic.note}</p>
              </div>
            )}
            {topic.words.map((w, i) => (
              <div key={i} className="wordcard">
                <div className="cue">{w.cue}</div>
                <div>
                  <div className="gu">{w.gu}</div>
                  <div className="rm">{w.r}</div>
                  <div className="en">{w.en}</div>
                </div>
                <button className="sp" onClick={() => speak(w.gu)}><Ic.play width={16} height={16} /></button>
              </div>
            ))}
            <button className="btn ok" style={{ marginTop: 6, marginBottom: 10 }} onClick={() => { setPracticeIdx(0); setScreen("vocabPractice"); }}>
              Practice speaking these words
            </button>
            <button className="btn primary" onClick={() => addTopicToReview(topic)}>
              Add these words to Review
            </button>
            <div style={{ height: 10 }} />
          </div>
        </div>
      );
    }
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr">
          <TopBar title="Vocab" sub="Words by topic" />
          {TOPICS.map((t) => (
            <button key={t.id} className="card" style={{ width: "100%", textAlign: "left", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => setSelTopic(t.id)}>
              <div style={{ fontSize: 28 }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{t.title}{t.tag && <span className="tag">{t.tag}</span>}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{t.words.length} words</div>
              </div>
            </button>
          ))}
          <div style={{ height: 10 }} />
        </div>
        <NavBar />
      </div>
    );
  }

  /* ---------------- VOCAB PRACTICE (speak and get feedback) ---------------- */
  if (screen === "vocabPractice" && selTopic) {
    const topic = TOPICS.find((t) => t.id === selTopic);
    const word = topic.words[practiceIdx];
    const isLast = practiceIdx + 1 >= topic.words.length;
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr plain">
          <div className="lhead">
            <button className="iconbtn" onClick={() => { stopSpeak(); setScreen("vocab"); }}><Ic.x /></button>
            <div className="bar"><i style={{ width: `${(practiceIdx / topic.words.length) * 100}%` }} /></div>
            <div className="chip gold">{practiceIdx + 1}/{topic.words.length}</div>
          </div>
          <div className="q-title" style={{ textAlign: "center" }}>Say this word</div>
          <div style={{ textAlign: "center", fontSize: 36, marginBottom: 2 }}>{word.cue}</div>
          <div className="bigword gu">{word.gu}</div>
          <div className="romanline">{word.r}</div>
          <div style={{ textAlign: "center", fontWeight: 600, marginTop: 6 }}>{word.en}</div>
          <div className="playrow"><button className="playbtn" onClick={() => speak(word.gu)}><Ic.play /></button></div>
          <SpeakCheck key={selTopic + "-" + practiceIdx} target={word.gu} />
          <div style={{ height: 100 }} />
        </div>
        <div className="foot">
          <button className="btn primary" onClick={() => {
            stopSpeak();
            if (isLast) { setScreen("vocab"); setPracticeIdx(0); }
            else setPracticeIdx((i) => i + 1);
          }}>{isLast ? "Finish" : "Next word"}</button>
        </div>
      </div>
    );
  }

  /* ---------------- HISTORY ---------------- */
  if (screen === "history") {
    if (selEra) {
      const era = ERAS.find((e) => e.id === selEra);
      const fullText = era.body.join(" ");
      return (
        <div className="dhatu">
          <style>{CSS}</style>
          <div className="scr plain">
            <div className="lhead">
              <button className="iconbtn" onClick={() => { setSelEra(null); stopSpeak(); setErAudioLang(null); }}><Ic.back /></button>
            </div>
            <div className="hd-hero" style={{ background: era.color }}>
              <SafeImg src={era.img} alt={era.title} />
              <div className="shade" />
              <div className="emo">{era.emo}</div>
              <div className="txt">
                <h2>{era.title}</h2>
                <div className="yr">{era.yr}</div>
              </div>
            </div>
            <div className="listenrow">
              <button
                className={"listenbtn" + (erAudioLang === "en" ? " on" : "")}
                onClick={() => {
                  if (erAudioLang === "en") { stopSpeak(); setErAudioLang(null); }
                  else { speakEn(fullText); setErAudioLang("en"); }
                }}
              >
                <Ic.play width={14} height={14} /> {erAudioLang === "en" ? "Stop" : "Listen in English"}
              </button>
              <button
                className={"listenbtn" + (erAudioLang === "gu" ? " on" : "")}
                onClick={() => {
                  if (erAudioLang === "gu") { stopSpeak(); setErAudioLang(null); }
                  else { speakGu(era.guSummary || fullText); setErAudioLang("gu"); }
                }}
              >
                <Ic.play width={14} height={14} /> {erAudioLang === "gu" ? "Stop" : "Listen in Gujarati"}
              </button>
            </div>
            {erAudioLang === "gu" && (
              <div className="gu-caption gu">{era.guSummary}</div>
            )}
            <div className="body">
              {era.body.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {era.site && (
              <div className="sitebox">
                <b>Where to see it: {era.site.name}</b>
                <p>{era.site.note}</p>
              </div>
            )}
            <div className="sources">
              <h4>Sources</h4>
              <ul>
                {era.sources.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div style={{ height: 10 }} />
          </div>
        </div>
      );
    }
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr">
          <TopBar title="History" sub="Gujarat, era by era" />
          {ERAS.map((e) => (
            <div key={e.id} className="era-card" onClick={() => setSelEra(e.id)}>
              <div className="era-band" style={{ background: e.color }}>
                <SafeImg src={e.img} alt={e.title} />
                <div className="shade" />
                <div className="emo">{e.emo}</div>
                <div className="txt">
                  <h3>{e.title}</h3>
                  <div className="yr">{e.yr}</div>
                </div>
              </div>
              <div className="blurb">{e.blurb}</div>
            </div>
          ))}
          <div style={{ height: 10 }} />
        </div>
        <NavBar />
      </div>
    );
  }

  /* ---------------- PROFILE ---------------- */
  if (screen === "profile") {
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    const badgeDefs = [
      { id: "b1", label: "First lesson", sub: "Complete a lesson", on: completed.length >= 1, color: "#8A1C3B" },
      { id: "b2", label: "Checkpoint", sub: "Pass a checkpoint", on: completed.some((c) => c.endsWith("c")), color: "#C77B1E" },
      { id: "b3", label: "Wordsmith", sub: "50 Kaudi earned", on: kaudi >= 50, color: "#1E6E7E" },
      { id: "b4", label: "Reviewer", sub: "Add words to Review", on: srs.length > 0, color: "#2F6E44" },
    ];
    return (
      <div className="dhatu">
        <style>{CSS}</style>
        <div className="scr">
          <TopBar title="Profile" sub="Your progress" />
          <div className="stats">
            <div className="stat">
              <div className="n"><Ic.kaudi width={20} height={20} style={{ color: "var(--gold)" }} />{kaudi}</div>
              <div className="l">Kaudi</div>
            </div>
            <div className="stat">
              <div className="n"><Ic.diya width={20} height={20} style={{ color: "var(--diya)" }} />{streak}</div>
              <div className="l">Day streak</div>
            </div>
            <div className="stat">
              <div className="n">{srs.length}</div>
              <div className="l">Words in review</div>
            </div>
            <div className="stat">
              <div className="n">{completed.length}</div>
              <div className="l">Lessons done</div>
            </div>
          </div>

          <div className="section-h">This week</div>
          <div className="card">
            <div className="week">
              {days.map((d, i) => (
                <div key={i} className={"day" + (weekHit[i] ? " hit" : "")}>
                  <div className="dot">{weekHit[i] ? <Ic.diya width={16} height={16} /> : d}</div>
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div className="section-h">Badges</div>
          <div className="badges">
            {badgeDefs.map((b) => (
              <div key={b.id} className={"badge2" + (b.on ? "" : " off")}>
                <div className="ic" style={{ background: b.color }}><Ic.star width={20} height={20} /></div>
                <div>
                  <b>{b.label}</b>
                  <small>{b.sub}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="section-h">Settings</div>
          <div className="card">
            <div className="toggle">
              <span className="tt"><b>Read and write mode</b><small>Show the Gujarati script in lessons</small></span>
              <div className={"sw" + (readWrite ? " on" : "")} onClick={() => setReadWrite((v) => !v)}><i /></div>
            </div>
            <div className="toggle">
              <span className="tt"><b>History tab</b><small>Short lessons on Gujarat's history</small></span>
              <div className={"sw" + (showHistory ? " on" : "")} onClick={() => setShowHistory((v) => !v)}><i /></div>
            </div>
            <div className="toggle">
              <span className="tt"><b>Vocab tab</b><small>Themed word lists</small></span>
              <div className={"sw" + (vocabTab ? " on" : "")} onClick={() => setVocabTab((v) => !v)}><i /></div>
            </div>
          </div>
          {!confirmReset ? (
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setConfirmReset(true)}>
              Reset progress
            </button>
          ) : (
            <div style={{ marginTop: 14 }}>
              <button className="btn" style={{ background: "var(--no)", color: "#fff", boxShadow: "0 4px 0 var(--no-dark)" }} onClick={resetAllProgress}>
                Tap again to confirm reset
              </button>
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          )}
          <div style={{ height: 10 }} />
        </div>
        <NavBar />
      </div>
    );
  }

  return null;
}

/* ============================ LESSON RUNNER ============================ */
function LessonRunner({ lesson, ex, exIdx, total, progress, readWrite, feedback, setFeedback, onCorrect, onNext, onExit }) {
  const [picked, setPicked] = useState(null);
  const [matchLeft, setMatchLeft] = useState(null);
  const [matchDone, setMatchDone] = useState([]);
  const [matchWrong, setMatchWrong] = useState(null);
  const [rightOrder] = useState(() => (ex.t === "match" ? shuffle(ex.pairs) : []));
  const [leftOrder] = useState(() => (ex.t === "match" ? shuffle(ex.pairs) : []));
  const [buildAns, setBuildAns] = useState([]);
  const [buildBank] = useState(() => (ex.t === "build" ? shuffle([...ex.answer, ...(ex.extra || [])]) : []));
  const [spoke, setSpoke] = useState(false);

  const Header = () => (
    <div className="lhead">
      <button className="iconbtn" onClick={onExit}><Ic.x /></button>
      <div className="bar"><i style={{ width: `${progress}%` }} /></div>
      <div className="chip gold"><Ic.kaudi width={14} height={14} />{exIdx + 1}/{total}</div>
    </div>
  );

  function checkSingle(correctVal) {
    const isRight = picked === correctVal;
    if (isRight) onCorrect(10);
    setFeedback(isRight ? "good" : "bad");
  }

  function pickMatch(side, item) {
    if (side === "left") {
      setMatchLeft(item);
      setMatchWrong(null);
    } else {
      if (!matchLeft) return;
      if (matchLeft.en === item.en) {
        onCorrect(4);
        setMatchDone((d) => [...d, item.en]);
        setMatchLeft(null);
        if (matchDone.length + 1 >= ex.pairs.length) {
          setTimeout(() => setFeedback("matchdone"), 250);
        }
      } else {
        setMatchWrong(item.en);
        setTimeout(() => setMatchWrong(null), 500);
      }
    }
  }

  function tapBank(tok, i) {
    setBuildAns((a) => [...a, { tok, i }]);
  }
  function tapAnswer(idx) {
    setBuildAns((a) => a.filter((_, j) => j !== idx));
  }
  function checkBuild() {
    const guess = buildAns.map((a) => a.tok);
    const isRight = guess.length === ex.answer.length && guess.every((g, i) => g === ex.answer[i]);
    if (isRight) onCorrect(15);
    setFeedback(isRight ? "good" : "bad");
  }

  const usedIdx = new Set(buildAns.map((a) => a.i));

  return (
    <div className="dhatu">
      <style>{CSS}</style>
      <div className="scr">
        <Header />

        {ex.t === "intro" && (
          <>
            {readWrite ? (
              <>
                <div className="bigword gu">{ex.gu}</div>
                <div className="romanline">{ex.roman}</div>
              </>
            ) : (
              <>
                <div className="bigword" style={{ fontSize: 32 }}>{ex.roman}</div>
                <div className="romanline gu" style={{ fontSize: 22 }}>{ex.gu}</div>
              </>
            )}
            <div className="playrow"><button className="playbtn big" onClick={() => speak(ex.gu)}><Ic.play /></button></div>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 17 }}>{ex.en}</div>
            {ex.sub && <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{ex.sub}</div>}
          </>
        )}

        {ex.t === "hvpt" && (
          <>
            <div className="q-title">Which sound do you hear?</div>
            <div className="playrow"><button className="playbtn big" onClick={() => speak(ex.say)}><Ic.play /></button></div>
            <div className="grid2">
              {ex.options.map((o, i) => (
                <button key={i} className={"gopt" + (picked === o.roman ? " sel" : "") + (feedback && o.roman === ex.answer ? " good" : "") + (feedback === "bad" && picked === o.roman ? " bad" : "")}
                  onClick={() => !feedback && setPicked(o.roman)}>
                  <div className="gu">{o.gu}</div>
                  <small>{o.roman}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {ex.t === "letter" && (
          <>
            <div className="q-title">What sound does this letter make?</div>
            <div className="bigword gu" style={{ fontSize: 70 }}>{ex.glyph}</div>
            <div className="opts">
              {ex.options.map((o, i) => (
                <button key={i} className={"opt" + (picked === o ? " sel" : "") + (feedback && o === ex.answer ? " good" : "") + (feedback === "bad" && picked === o ? " bad" : "")}
                  onClick={() => !feedback && setPicked(o)}>
                  <span className="optnum">{String.fromCharCode(65 + i)}</span>{o}
                </button>
              ))}
            </div>
          </>
        )}

        {ex.t === "match" && (
          <>
            <div className="q-title">Tap a Gujarati word, then its meaning</div>
            <div className="matchwrap">
              <div className="mcol">
                {leftOrder.map((p, i) => (
                  <button key={i} className={"mtile gu" + (matchLeft && matchLeft.en === p.en ? " sel" : "") + (matchDone.includes(p.en) ? " done" : "")}
                    disabled={matchDone.includes(p.en)} onClick={() => pickMatch("left", p)}>
                    {p.gu}
                  </button>
                ))}
              </div>
              <div className="mcol">
                {rightOrder.map((p, i) => (
                  <button key={i} className={"mtile" + (matchDone.includes(p.en) ? " done" : "") + (matchWrong === p.en ? " err" : "")}
                    disabled={matchDone.includes(p.en)} onClick={() => pickMatch("right", p)}>
                    {p.en}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {ex.t === "listen" && (
          <>
            <div className="q-title">What does this mean?</div>
            <div className="playrow"><button className="playbtn big" onClick={() => speak(ex.say)}><Ic.play /></button></div>
            <div className="opts">
              {ex.options.map((o, i) => (
                <button key={i} className={"opt" + (picked === o ? " sel" : "") + (feedback && o === ex.answer ? " good" : "") + (feedback === "bad" && picked === o ? " bad" : "")}
                  onClick={() => !feedback && setPicked(o)}>
                  <span className="optnum">{String.fromCharCode(65 + i)}</span>{o}
                </button>
              ))}
            </div>
          </>
        )}

        {ex.t === "build" && (
          <>
            <div className="q-title">{ex.en}</div>
            <div className="q-sub">Tap the words in order</div>
            <div className="answerbox">
              {buildAns.map((a, i) => (
                <div key={i} className="tok gu inans" onClick={() => !feedback && tapAnswer(i)}>{a.tok}</div>
              ))}
            </div>
            <div className="bank">
              {buildBank.map((tok, i) => (
                <div key={i} className={"tok gu" + (usedIdx.has(i) ? " used" : "")} onClick={() => !feedback && !usedIdx.has(i) && tapBank(tok, i)}>{tok}</div>
              ))}
            </div>
          </>
        )}

        {ex.t === "fill" && (
          <>
            <div className="q-title gu" style={{ fontSize: 25 }}>{ex.pre} _____ {ex.post}</div>
            <div className="opts">
              {ex.options.map((o, i) => (
                <button key={i} className={"opt gu" + (picked === o ? " sel" : "") + (feedback && o === ex.answer ? " good" : "") + (feedback === "bad" && picked === o ? " bad" : "")}
                  onClick={() => !feedback && setPicked(o)}>
                  {o}
                </button>
              ))}
            </div>
          </>
        )}

        {ex.t === "note" && (
          <div className="note">
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
              <span style={{ color: "var(--gold-dark)" }}><Ic.bulb width={20} height={20} /></span>
              <h3 style={{ margin: 0 }}>{ex.title}</h3>
            </div>
            {ex.body.map((p, i) => <p key={i}>{p}</p>)}
            <div className="exrow">
              {ex.ex.map((e, i) => (
                <div key={i} className="exline">
                  <div className="gu">{e.gu}</div>
                  <div className="rm">{e.roman}</div>
                  <div className="en">{e.en}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ex.t === "speak" && (
          <>
            <div className="q-title">Say this out loud</div>
            {readWrite ? (
              <>
                <div className="bigword gu">{ex.gu}</div>
                <div className="romanline">{ex.roman}</div>
              </>
            ) : (
              <div className="bigword" style={{ fontSize: 30 }}>{ex.roman}</div>
            )}
            <div style={{ textAlign: "center", fontWeight: 600, marginTop: 6 }}>{ex.en}</div>
            <div className="playrow"><button className="playbtn big" onClick={() => speak(ex.gu)}><Ic.play /></button></div>
            <SpeakCheck
              target={ex.gu}
              onResult={(r) => {
                setSpoke(true);
                if (r.verdict === "good") onCorrect(10);
                else if (r.verdict === "close") onCorrect(5);
              }}
            />
          </>
        )}

        <div style={{ height: 100 }} />
      </div>

      {feedback && feedback !== "matchdone" && (
        <div className={"sheet " + feedback}>
          <div className="sh">
            <span className="badge">{feedback === "good" ? <Ic.check width={16} height={16} /> : <Ic.x width={16} height={16} />}</span>
            {feedback === "good" ? "Correct" : "Not quite"}
          </div>
          {feedback === "bad" && (
            <div className="ans">
              Correct answer: {(() => {
                if (ex.t === "hvpt") {
                  const c = ex.options.find((o) => o.roman === ex.answer);
                  return <span className="gu">{c.gu} ({c.roman})</span>;
                }
                if (ex.t === "fill") return <span><span className="gu">{ex.gu}</span> - {ex.en}</span>;
                return <span>{ex.answer}</span>;
              })()}
            </div>
          )}
          {ex.why && <div className="why">{ex.why}</div>}
          <div style={{ height: 10 }} />
          <button className="btn primary" onClick={onNext}>Continue</button>
        </div>
      )}

      {feedback === "matchdone" && (
        <div className="sheet good">
          <div className="sh"><span className="badge"><Ic.check width={16} height={16} /></span>All matched</div>
          <div style={{ height: 10 }} />
          <button className="btn primary" onClick={onNext}>Continue</button>
        </div>
      )}

      {!feedback && (ex.t === "intro" || ex.t === "note") && (
        <div className="foot">
          <button className="btn primary" onClick={onNext}>{ex.t === "note" ? "Got it" : "Continue"}</button>
        </div>
      )}

      {!feedback && ex.t === "speak" && (
        <div className="foot">
          <button className="btn primary" disabled={!spoke} onClick={onNext}>Continue</button>
        </div>
      )}

      {!feedback && (ex.t === "hvpt" || ex.t === "letter" || ex.t === "listen" || ex.t === "fill") && (
        <div className="foot">
          <button className="btn primary" disabled={!picked} onClick={() => checkSingle(ex.answer)}>Check</button>
        </div>
      )}

      {!feedback && ex.t === "build" && (
        <div className="foot">
          <button className="btn primary" disabled={buildAns.length === 0} onClick={checkBuild}>Check</button>
        </div>
      )}
    </div>
  );
}

/* ============================ UNIT 6: MODERN CULTURE (added lesson) ============================ */
UNITS.push({ id:"u6", ku:"Unit 6", title:"Modern Gujarati culture", sub:"Festivals, textiles, food, and popular culture", color:"#B23A6B",
  lessons:[ {id:"u6l1",label:"Festivals and Garba"}, {id:"u6l2",label:"Textiles and fashion"}, {id:"u6l3",label:"Food beyond the thali"}, {id:"u6l4",label:"Cinema, music, comedy"}, {id:"u6c",label:"Checkpoint",kind:"check"} ] });
LESSON_ORDER.push("u6l1", "u6l2", "u6l3", "u6l4", "u6c");

const CULTURE_SOURCES_FEST = ["Gujarat Tourism, Fairs and Festivals of Gujarat", "Gujarat Tourism, Handicrafts of Gujarat"];
const CULTURE_SOURCES_TEXT = ["Gujarat Tourism, Handicrafts of Gujarat", "Asia InCH Encyclopedia of Intangible Cultural Heritage, Tangaliya Weaving of Gujarat"];
const CULTURE_SOURCES_FOOD = ["Gujarat Tourism, Gujarati Cuisines"];
const CULTURE_SOURCES_FILM = ["Times of India, on the Gujarati cinema revival and the 71st National Film Awards", "Wikipedia, Hellaro"];

Object.assign(LESSONS, {
  u6l1: { title:"Festivals and Garba", sources: CULTURE_SOURCES_FEST, ex: [
    { t:"intro", gu:"તહેવાર", roman:"tehvaar", en:"festival" },
    { t:"intro", gu:"નવરાત્રિ", roman:"navraatri", en:"Navratri", sub:"Nine nights of dance and worship honoring the goddess Shakti." },
    { t:"intro", gu:"ગરબા", roman:"garbaa", en:"Garba, the circular dance" },
    { t:"note", title:"Three layers of Garba", body:[
      "Garba can be read on three levels at once. As devotion, it honors Amba, or Shakti, with dancers circling a lamp or image.",
      "As a social event, it is where neighborhoods gather, youth fashion is on display, and community and caste networks often shape who dances with whom.",
      "As an economy, large ticketed garba events, costume markets, singer circuits, and sponsorships have grown alongside it. Garba was added to UNESCO's list of intangible cultural heritage in 2023.",
      "Worth asking: Garba is often called open to everyone, but cost, dress codes, and community networks still shape who takes part."], ex:[
      {gu:"ગરબા રમવો",roman:"garbaa ramvo",en:"to play/dance garba"},
      {gu:"નવરાત્રિ પર",roman:"navraatri par",en:"during Navratri"}] },
    { t:"intro", gu:"ઉત્તરાયણ", roman:"uttaraayan", en:"Uttarayan, the kite festival", sub:"Celebrated with kites across Gujarat in mid-January." },
    { t:"intro", gu:"મેળો", roman:"melo", en:"fair", sub:"Rann Utsav, Tarnetar, and Kavant are among Gujarat's best-known fairs." },
    { t:"match", pairs:[{gu:"તહેવાર",en:"festival"},{gu:"નવરાત્રિ",en:"Navratri"},{gu:"ગરબા",en:"Garba dance"},{gu:"ઉત્તરાયણ",en:"kite festival"}] },
    { t:"listen", say:"ગરબા", roman:"garbaa", options:["Garba, the circular dance","a kite festival","a type of food"], answer:"Garba, the circular dance" },
    { t:"speak", gu:"હું ગરબા રમું છું", roman:"huṁ garbaa ramuṁ chuṁ", en:"I dance garba." },
  ]},

  u6l2: { title:"Textiles and fashion", sources: CULTURE_SOURCES_TEXT, ex: [
    { t:"intro", gu:"પટોળું", roman:"paṭoḷuṁ", en:"Patola, a silk weave from Patan", sub:"A double-ikat silk textile, prized and extremely time-consuming to weave by hand." },
    { t:"intro", gu:"બાંધણી", roman:"baandhaṇi", en:"Bandhani, tie-dye cloth", sub:"Tiny dye-resist dots, especially associated with Kutch and Jamnagar." },
    { t:"note", title:"Craft is labor, not just heritage", body:[
      "Textiles like Patola and Bandhani are often shown as timeless heritage, but each piece depends on skilled, often underpaid hand labor.",
      "Ajrakh block printing, closely tied to Kutch and to Sindhi Muslim craft traditions, shows that Gujarati textile history reaches well beyond any single religious community.",
      "Tangaliya, a dotted weaving technique from Surendranagar, is made by the Dangasia community, a Scheduled Caste group. Only a small number of traditional weavers remain today.",
      "Much of this work, especially embroidery and mirror work from Kutch, is done by women, whose labor is often praised as tradition while the profit is captured by traders or boutiques.",
      "Worth asking: when a craft appears in a fashion show or an online shop, who actually gets paid for it?"], ex:[
      {gu:"પટોળું વણવું",roman:"paṭoḷuṁ vaṇvuṁ",en:"to weave a Patola"},
      {gu:"બાંધણી ઓઢણી",roman:"baandhaṇi oḍhṇi",en:"a Bandhani stole"}] },
    { t:"intro", gu:"ચણિયાચોળી", roman:"chaṇiyaachoḷi", en:"chaniya choli, the mirrored skirt and top worn for Garba" },
    { t:"intro", gu:"કેડિયું", roman:"keḍiyuṁ", en:"kediyu, a short embroidered top worn by men for Garba" },
    { t:"intro", gu:"ઓઢણી", roman:"oḍhṇi", en:"a woman's stole or shawl" },
    { t:"match", pairs:[{gu:"પટોળું",en:"Patola silk"},{gu:"બાંધણી",en:"tie-dye cloth"},{gu:"ચણિયાચોળી",en:"Garba skirt and top"},{gu:"કેડિયું",en:"men's Garba top"}] },
    { t:"speak", gu:"આ ચણિયાચોળી સુંદર છે", roman:"aa chaṇiyaachoḷi sundar chhe", en:"This chaniya choli is beautiful." },
  ]},

  u6l3: { title:"Food beyond the thali", sources: CULTURE_SOURCES_FOOD, ex: [
    { t:"intro", gu:"થાળી", roman:"thaaḷi", en:"thali, a full plate meal" },
    { t:"intro", gu:"ફરસાણ", roman:"pharsaaṇ", en:"farsan, savory snacks" },
    { t:"intro", gu:"ઊંધિયું", roman:"uṅdhiyuṁ", en:"undhiyu, a winter mixed-vegetable dish", sub:"Traditionally eaten in winter, especially around Uttarayan." },
    { t:"intro", gu:"થેપલા", roman:"theplaa", en:"thepla, spiced flatbread", sub:"A common travel food, since it keeps well for days." },
    { t:"intro", gu:"દાબેલી", roman:"daabeli", en:"dabeli, a spiced potato street-food bun" },
    { t:"note", title:"One thali does not fit all", body:[
      "Gujarati food is often stereotyped as only vegetarian and sweet. That describes many Hindu and Jain households, but not the whole picture.",
      "Muslim, Bohra, Khoja, tribal, and coastal communities in Gujarat have their own non-vegetarian cooking traditions.",
      "Food also varies sharply by region: Surti, Kathiawadi, Kutchi, and Amdavadi kitchens each have their own staples and style.",
      "Behind all of it is mostly unpaid domestic labor, largely done by women, that rarely gets the same credit as a restaurant thali."], ex:[
      {gu:"ઊંધિયું અને પુરી",roman:"uṅdhiyuṁ ane puri",en:"undhiyu and puri"},
      {gu:"ફરસાણ ભાવે છે",roman:"pharsaaṇ bhaave chhe",en:"(I) like farsan"}] },
    { t:"match", pairs:[{gu:"થાળી",en:"full plate meal"},{gu:"થેપલા",en:"travel flatbread"},{gu:"દાબેલી",en:"street-food bun"},{gu:"ઊંધિયું",en:"winter vegetable dish"}] },
    { t:"build", en:"I eat dabeli.", answer:["હું","દાબેલી","ખાઉં","છું"], extra:["ભાત","પીઉં"], roman:"huṁ daabeli khaauṁ chuṁ" },
    { t:"speak", gu:"મને થેપલા બહુ ભાવે છે", roman:"mane theplaa bahu bhaave chhe", en:"I like thepla a lot." },
  ]},

  u6l4: { title:"Cinema, music, and comedy", sources: CULTURE_SOURCES_FILM, ex: [
    { t:"intro", gu:"ફિલ્મ", roman:"philm", en:"film" },
    { t:"intro", gu:"ગીત", roman:"geet", en:"song" },
    { t:"note", title:"From folk stage to streaming", body:[
      "Gujarati cinema has gone through a recent revival. Films like Kevi Rite Jaish and Chhello Divas reconnected younger audiences with Gujarati-language film.",
      "Hellaro, about gender and Garba as liberation, became the first Gujarati film to win India's National Film Award for Best Feature Film.",
      "Vash won Best Gujarati Film at the 71st National Film Awards, and Laalo was a major box-office success, showing the industry growing beyond family drama into horror and genre film.",
      "Garba music itself keeps moving, from folk and devotional roots into electronic, Bollywood-influenced, wedding, and diaspora styles, alongside newer Gujarati-language fusion and rock experiments.",
      "Stand-up comedy, YouTube sketches, and Instagram reels now do similar work to film and music: they make Gujarati sound current, urban, and funny rather than only traditional."], ex:[
      {gu:"ગુજરાતી ફિલ્મ",roman:"gujaraati philm",en:"a Gujarati film"},
      {gu:"ગરબાનું ગીત",roman:"garbaanuṁ geet",en:"a garba song"}] },
    { t:"intro", gu:"હાસ્ય", roman:"haasya", en:"comedy, humor" },
    { t:"match", pairs:[{gu:"ફિલ્મ",en:"film"},{gu:"ગીત",en:"song"},{gu:"હાસ્ય",en:"comedy"},{gu:"તહેવાર",en:"festival"}] },
    { t:"listen", say:"ગુજરાતી ફિલ્મ", roman:"gujaraati philm", options:["a Gujarati film","a Gujarati song","a Gujarati festival"], answer:"a Gujarati film" },
    { t:"speak", gu:"મને ગુજરાતી ફિલ્મો ગમે છે", roman:"mane gujaraati philmo gamechhe", en:"I like Gujarati films." },
  ]},

  u6c: { title:"Checkpoint", check:true, sources: [...CULTURE_SOURCES_FEST, ...CULTURE_SOURCES_FOOD, ...CULTURE_SOURCES_FILM], ex: [
    { t:"match", pairs:[{gu:"ગરબા",en:"Garba dance"},{gu:"પટોળું",en:"Patola silk"},{gu:"થાળી",en:"full plate meal"},{gu:"ફિલ્મ",en:"film"}] },
    { t:"listen", say:"ઉત્તરાયણ", roman:"uttaraayan", options:["kite festival","tie-dye cloth","a song"], answer:"kite festival" },
    { t:"build", en:"I eat dabeli.", answer:["હું","દાબેલી","ખાઉં","છું"], extra:["પટોળું","પીઉં"], roman:"huṁ daabeli khaauṁ chuṁ" },
    { t:"listen", say:"બાંધણી", roman:"baandhaṇi", options:["tie-dye cloth","a festival","a snack"], answer:"tie-dye cloth" },
    { t:"speak", gu:"હું ગરબા રમું છું અને થેપલા ખાઉં છું", roman:"huṁ garbaa ramuṁ chuṁ ane theplaa khaauṁ chuṁ", en:"I dance garba and eat thepla." },
  ]},
});

/* ============================ VOCAB: festivals + textiles (added) ============================ */
TOPICS.push(
  { id:"festivals", title:"Festivals and fairs", icon:"🪔", words:[
    { gu:"તહેવાર", r:"tehvaar", en:"festival", cue:"🎉" },
    { gu:"નવરાત્રિ", r:"navraatri", en:"Navratri", cue:"💃" },
    { gu:"ગરબા", r:"garbaa", en:"Garba dance", cue:"🕺" },
    { gu:"ઉત્તરાયણ", r:"uttaraayan", en:"kite festival", cue:"🪁" },
    { gu:"દિવાળી", r:"divaaḷi", en:"Diwali", cue:"🪔" },
    { gu:"મેળો", r:"melo", en:"fair", cue:"🎪" },
  ]},
  { id:"culture", title:"Textiles, food, and culture", icon:"🧵", note:"Terms for Gujarati craft, dress, and everyday food beyond the basics.", words:[
    { gu:"પટોળું", r:"paṭoḷuṁ", en:"Patola silk", cue:"🧣" },
    { gu:"બાંધણી", r:"baandhaṇi", en:"tie-dye cloth", cue:"👘" },
    { gu:"ચણિયાચોળી", r:"chaṇiyaachoḷi", en:"Garba skirt and top", cue:"💃" },
    { gu:"કેડિયું", r:"keḍiyuṁ", en:"men's Garba top", cue:"👕" },
    { gu:"ફરસાણ", r:"pharsaaṇ", en:"savory snacks", cue:"🍥" },
    { gu:"ઊંધિયું", r:"uṅdhiyuṁ", en:"winter vegetable dish", cue:"🍲" },
    { gu:"થેપલા", r:"theplaa", en:"spiced flatbread", cue:"🫓" },
    { gu:"દાબેલી", r:"daabeli", en:"street-food bun", cue:"🥪" },
  ]}
);

/* ============================ SPEECH RECOGNITION (pronunciation practice) ============================ */
Ic.mic = (p) => (
  <svg {...S(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
    <path d="M8.5 21h7" />
  </svg>
);

function _getRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}
function _normalizeSpeechText(s) {
  return String(s || "").trim().toLowerCase().replace(/[.,!?।؟]/g, "").replace(/\s+/g, " ");
}
function _editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
function _speechSimilarity(heard, target) {
  const a = _normalizeSpeechText(heard);
  const b = _normalizeSpeechText(target);
  if (!a || !b) return 0;
  const dist = _editDistance(a, b);
  return Math.max(0, 1 - dist / Math.max(a.length, b.length));
}
function _gradeSpeech(heard, target) {
  const score = _speechSimilarity(heard, target);
  const verdict = score >= 0.72 ? "good" : score >= 0.42 ? "close" : "retry";
  return { heard, score, verdict };
}

function useVoiceCheck(lang) {
  const [supported] = useState(() => !!_getRecognitionCtor());
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const recRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recRef.current) {
        try { recRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  function start(target) {
    const Ctor = _getRecognitionCtor();
    if (!Ctor) { setErr("unsupported"); return; }
    setErr(null);
    setResult(null);
    try {
      const rec = new Ctor();
      rec.lang = lang || "gu-IN";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      recRef.current = rec;
      rec.onresult = (e) => {
        const heard = e.results && e.results[0] && e.results[0][0] ? e.results[0][0].transcript : "";
        setResult(_gradeSpeech(heard, target));
      };
      rec.onerror = (e) => {
        setErr(e && e.error === "not-allowed" ? "denied" : "error");
        setListening(false);
      };
      rec.onend = () => setListening(false);
      setListening(true);
      rec.start();
    } catch (e) {
      setErr("error");
      setListening(false);
    }
  }
  function stop() {
    if (recRef.current) {
      try { recRef.current.stop(); } catch (e) {}
    }
    setListening(false);
  }
  function reset() {
    setResult(null);
    setErr(null);
  }
  return { supported, listening, result, err, start, stop, reset };
}

function SpeakCheck({ target, onResult }) {
  const vc = useVoiceCheck("gu-IN");

  useEffect(() => {
    if (vc.result && onResult) onResult(vc.result);
    // eslint-disable-next-line
  }, [vc.result]);

  if (!vc.supported) {
    return (
      <div className="speakcheck">
        <div className="speakcheck-unsupported">Speaking practice needs Chrome, Edge, or Safari on this device.</div>
        <button className="btn ghost sm" onClick={() => onResult && onResult({ verdict: "skip", score: 0, heard: "" })}>
          I said it out loud
        </button>
      </div>
    );
  }

  return (
    <div className="speakcheck">
      <button
        className={"micbtn" + (vc.listening ? " on" : "")}
        onClick={() => {
          if (vc.listening) { vc.stop(); }
          else { vc.reset(); vc.start(target); }
        }}
      >
        <Ic.mic />
      </button>
      <div className="speakcheck-label">{vc.listening ? "Listening..." : "Tap and say it"}</div>
      {vc.err === "denied" && <div className="speakcheck-msg bad">Microphone access was blocked. Check your browser settings.</div>}
      {vc.err === "error" && <div className="speakcheck-msg bad">Didn't catch that. Try again.</div>}
      {vc.result && (
        <div className={"speakcheck-msg " + (vc.result.verdict === "good" ? "good" : vc.result.verdict === "close" ? "close" : "bad")}>
          {vc.result.verdict === "good" && "Nice, that's a strong match."}
          {vc.result.verdict === "close" && "Close. Listen again and try once more."}
          {vc.result.verdict === "retry" && "Let's try that again."}
          {vc.result.heard && (
            <span className="heard">You said: <span className="gu">{vc.result.heard}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ HISTORY: Gujarati narration summaries ============================ */
const ERA_GU_SUMMARY = {
  indus: "ધોળાવીરા અને લોથલ ગુજરાતનાં ખૂબ જૂનાં શહેરો હતાં. આ શહેરો પથ્થરથી બનેલાં હતાં અને પાણી માટે મોટા હોજ હતા. લોકો દૂર દેશો સાથે વેપાર કરતા હતા.",
  maurya: "જૂનાગઢ પાસે ગિરનાર ડુંગર છે. ત્યાં એક મોટા પથ્થર પર રાજા અશોકના સંદેશા કોતરેલા છે. આ સંદેશા શાંતિ અને ધર્મ વિશે છે.",
  vallabhi: "વલ્લભી સૌરાષ્ટ્રમાં એક જૂનું શહેર હતું. ત્યાં એક મોટી યુનિવર્સિટી હતી. દૂર દેશોમાંથી વિદ્યાર્થીઓ ભણવા આવતા હતા.",
  solanki: "સોલંકી રાજાઓ પાટણમાં રાજ કરતા હતા. રાણી ઉદયમતિએ રાણી કી વાવ બનાવી. આ વાવ પાણી માટે અને કલા માટે બંને પ્રખ્યાત છે.",
  sultanate: "સન ૧૪૧૧માં અહમદ શાહે અમદાવાદ શહેર વસાવ્યું. અમદાવાદ વેપાર અને હસ્તકલા માટે મોટું શહેર બન્યું.",
  ocean: "સુરત બંદર દુનિયાભરમાં જાણીતું હતું. ગુજરાતી વેપારીઓ આફ્રિકા અને અરબસ્તાન સુધી વેપાર કરતા હતા.",
  colonial: "અમદાવાદમાં કાપડનો ઉદ્યોગ શરૂ થયો. હજારો મજૂરો ત્યાં કામ કરતા હતા. આ સમયમાં ગુજરાતી ભાષાનાં છાપાં અને પુસ્તકો પણ વધ્યાં.",
  gandhi: "ગાંધીજી સાબરમતી આશ્રમમાં રહેતા હતા. ગાંધીજીએ મીઠાના કાયદા સામે પદયાત્રા કરી. આ પદયાત્રા આખી દુનિયામાં જાણીતી થઈ.",
  state: "૧લી મે, ૧૯૬૦ના રોજ ગુજરાત રાજ્ય બન્યું. લોકોએ ગુજરાતી ભાષા માટે પોતાનું રાજ્ય માગ્યું હતું.",
  modern: "આજનું ગુજરાત ઉદ્યોગ અને વેપાર માટે જાણીતું છે. ઘણા ગુજરાતીઓ દુનિયાભરમાં વસ્યા છે. પણ વિકાસ સાથે જમીન અને ન્યાયના પ્રશ્નો પણ છે.",
};
ERAS.forEach((e) => { e.guSummary = ERA_GU_SUMMARY[e.id] || ""; });
