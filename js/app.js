// ================= 工具函数 =================
const $ = id => document.getElementById(id);
const API_BASE = ""; // 同源：同步接口与页面同域
const store = {
  get(k, def) { try { const v = localStorage.getItem("wb_" + k); return v ? JSON.parse(v) : def; } catch(e){ return def; } },
  set(k, v) { localStorage.setItem("wb_" + k, JSON.stringify(v)); if (!k.startsWith("sync_")) scheduleSync(); }
};
function todayStr(d) { d = d || new Date(); const p = n => String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); }
function dayOfYear() { const now = new Date(); return Math.floor((now - new Date(now.getFullYear(),0,0)) / 864e5); }
function toast(msg) { const t = $("toast"); if(!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(t._tm); t._tm = setTimeout(()=>t.classList.remove("show"), 2200); }
function esc(s){ return String(s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }

// ================= 模块系统（动态侧边栏） =================
const DEFAULT_MODULES = [
  {id:"home",    label:"今日总览", icon:"🏡", builtin:true,  visible:true},
  {id:"exam",    label:"考公备考", icon:"📚", builtin:true,  visible:true},
  {id:"writing", label:"小说写作", icon:"✍️", builtin:true,  visible:true},
  {id:"job",     label:"求职投递", icon:"💼", builtin:true,  visible:true},
  {id:"xhs",     label:"账号运营", icon:"📱", builtin:true,  visible:true},
  {id:"status",  label:"状态记录", icon:"💚", builtin:true,  visible:true},
  {id:"diary",   label:"私密日记", icon:"🔒", builtin:true,  visible:true},
  {id:"plan",    label:"生活规划", icon:"🗓️", builtin:true,  visible:true},
  {id:"money",   label:"收支记账", icon:"💰", builtin:true,  visible:true},
];
function getModules() {
  let m = store.get("modules", null);
  if (!m) { m = DEFAULT_MODULES.slice(); store.set("modules", m); }
  // 兼容：保证默认模块存在
  DEFAULT_MODULES.forEach(d => { if (!m.find(x=>x.id===d.id)) m.unshift(d); });
  return m;
}
function setModules(m) { store.set("modules", m); }

function renderSidebar() {
  const list = $("nav-list");
  const mods = getModules().filter(m => m.visible);
  list.innerHTML = mods.map(m =>
    `<div class="nav-item" data-page="${m.id}"><span class="nav-icon">${m.icon}</span><span class="nav-label">${esc(m.label)}</span></div>`
  ).join("");
}

function gotoPage(page) {
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.page === page));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
  window.scrollTo(0, 0);
}

// 自定义模块页面（清单式）
function ensureCustomPages() {
  const cont = $("custom-pages");
  const mods = getModules().filter(m => !m.builtin);
  cont.querySelectorAll(".page").forEach(p => {
    if (!mods.find(m => "page-" + m.id === p.id)) p.remove();
  });
  mods.forEach(m => {
    let sec = $("page-" + m.id);
    if (!sec) {
      sec = document.createElement("section");
      sec.className = "page"; sec.id = "page-" + m.id;
      sec.innerHTML =
        `<div class="page-title">${m.icon} ${esc(m.label)}</div>
         <div class="page-sub">自定义模块 · 清单</div>
         <div class="card">
           <div class="card-title">➕ 添加条目</div>
           <div class="row">
             <input type="text" id="cinput-${m.id}" placeholder="添加一条，如：今日普拉提30分钟" style="flex:1">
             <button class="btn" data-cadd="${m.id}">添加</button>
           </div>
         </div>
         <div class="card">
           <div class="card-title">📋 清单</div>
           <div id="clist-${m.id}"><div class="muted">还没有内容～</div></div>
         </div>`;
      cont.appendChild(sec);
    }
  });
  mods.forEach(m => renderCustom(m.id));
}
$("custom-pages").addEventListener("click", e => {
  const add = e.target.closest("[data-cadd]");
  if (add) {
    const id = add.dataset.cadd;
    const inp = $("cinput-" + id);
    const v = inp.value.trim();
    if (!v) return toast("写点内容～");
    const l = store.get("custom_" + id, []);
    l.push({text: v, done: false});
    store.set("custom_" + id, l);
    inp.value = "";
    renderCustom(id);
  }
});
$("custom-pages").addEventListener("keydown", e => {
  const add = e.target.closest("[data-cadd]");
  if (add && e.key === "Enter") add.click();
});
function renderCustom(id) {
  const list = store.get("custom_" + id, []);
  const el = $("clist-" + id);
  if (!el) return;
  el.innerHTML = list.length ? list.map((it, i) =>
    `<div class="list-item ${it.done?'done':''}">
       <input type="checkbox" data-cidx="${id}:${i}" ${it.done?'checked':''} style="width:18px;height:18px;accent-color:var(--green-500)">
       <span class="item-text">${esc(it.text)}</span>
       <span class="del" data-cdel="${id}:${i}">✕</span>
     </div>`
  ).join("") : '<div class="muted">还没有内容～</div>';
  el.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener("change", () => {
    const [cid, ci] = cb.dataset.cidx.split(":");
    const l = store.get("custom_" + cid, []);
    l[+ci].done = cb.checked; store.set("custom_" + cid, l); renderCustom(cid);
  }));
  el.querySelectorAll(".del").forEach(d => d.addEventListener("click", () => {
    const [cid, ci] = d.dataset.cdel.split(":");
    const l = store.get("custom_" + cid, []);
    l.splice(+ci, 1); store.set("custom_" + cid, l); renderCustom(cid);
  }));
}

// 模块管理 UI
function renderSettings() {
  const mods = getModules();
  $("module-list").innerHTML = mods.map(m =>
    `<div class="mod-item">
       <span class="mod-icon">${m.icon}</span>
       <span class="mod-label">${esc(m.label)}</span>
       ${m.builtin ? '<span class="muted" style="font-size:11px">内置</span>' : '<span class="del" data-remove="'+m.id+'" title="删除该模块">✕</span>'}
       <label class="switch"><input type="checkbox" data-visible="${m.id}" ${m.visible?'checked':''}><span class="slider"></span></label>
     </div>`
  ).join("");
  $("module-list").querySelectorAll("[data-visible]").forEach(cb => cb.addEventListener("change", () => {
    const mods = getModules();
    const m = mods.find(x => x.id === cb.dataset.visible);
    if (m) { m.visible = cb.checked; setModules(mods); renderSidebar(); }
  }));
  $("module-list").querySelectorAll("[data-remove]").forEach(el => el.addEventListener("click", () => {
    const id = el.dataset.remove;
    if (!confirm("删除该自定义模块？其记录也会一并清除。")) return;
    let mods = getModules().filter(x => x.id !== id);
    setModules(mods);
    localStorage.removeItem("wb_custom_" + id);
    const sec = $("page-" + id); if (sec) sec.remove();
    renderSidebar(); renderSettings();
    toast("已删除模块");
  }));
  // 同步码回填
  const key = store.get("sync_key", "");
  if (key) $("sync-key").value = key;
}
$("custom-add").addEventListener("click", () => {
  const name = $("custom-name").value.trim();
  const icon = $("custom-icon").value.trim() || "📌";
  if (!name) return toast("给模块起个名字吧～");
  const id = "custom_" + Date.now();
  const mods = getModules();
  mods.push({id, label: name, icon, builtin: false, visible: true});
  setModules(mods);
  $("custom-name").value = ""; $("custom-icon").value = "";
  renderSidebar(); ensureCustomPages(); renderSettings();
  toast("已添加模块：" + name);
});
$("custom-icon").addEventListener("keydown", e => { if (e.key === "Enter") $("custom-add").click(); });

// ================= 多设备同步 =================
let syncTimer = null, dirty = false;
function scheduleSync() {
  dirty = true;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { if (dirty) doPush(); }, 1500);
}
function collectAll() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("wb_")) {
      try { data[k] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
    }
  }
  return data;
}
function applyAll(data) {
  for (const k in data) localStorage.setItem(k, JSON.stringify(data[k]));
  renderAll();
}
function setSyncStatus(msg) { const el = $("sync-status"); if (el) el.textContent = msg; }
async function doPush() {
  const key = store.get("sync_key", "");
  if (!key) return;
  dirty = false;
  const snap = { updatedAt: Date.now(), data: collectAll() };
  try {
    const res = await fetch(API_BASE + "/api/sync/" + encodeURIComponent(key), {
      method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(snap)
    });
    const text = await res.text();
    let ok = false;
    try { const j = JSON.parse(text); ok = j && j.ok === true; } catch(e) {}
    if (ok) { store.set("sync_updated", snap.updatedAt); setSyncStatus("✅ 已同步 · " + new Date().toLocaleTimeString("zh-CN")); }
    else setSyncStatus("⚠️ 当前链接未启用云端同步（不影响本机使用）。请用「导出备份 / 导入备份」在两设备间搬运数据，或参考设置里的自托管说明。");
  } catch(e) {
    setSyncStatus("⚠️ 当前无法连接同步服务（不影响本机使用）。可用「导出备份」在两设备间搬运数据。");
  }
}
async function doPull() {
  const key = store.get("sync_key", "");
  if (!key) return;
  try {
    const res = await fetch(API_BASE + "/api/sync/" + encodeURIComponent(key));
    if (!res.ok) return;
    const snap = await res.json();
    const local = store.get("sync_updated", 0);
    if (snap.updatedAt > local) {
      applyAll(snap.data);
      store.set("sync_updated", snap.updatedAt);
      setSyncStatus("✅ 已拉取最新数据 · " + new Date().toLocaleTimeString("zh-CN"));
    }
  } catch(e) {}
}
$("sync-save").addEventListener("click", () => {
  const key = $("sync-key").value.trim();
  if (!key) return toast("填一个同步码～");
  store.set("sync_key", key);
  toast("同步码已保存，正在拉取…");
  doPull().then(doPush);
});
$("sync-now").addEventListener("click", () => {
  const key = store.get("sync_key", "");
  if (!key) return toast("请先保存同步码");
  doPull().then(doPush);
});
$("sync-export").addEventListener("click", () => {
  const data = collectAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "元气工作台备份_" + todayStr() + ".json";
  a.click();
  toast("已导出备份文件 ⬇️");
});
$("sync-import").addEventListener("click", () => $("sync-file").click());
$("sync-file").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (typeof data !== "object") throw 0;
      applyAll(data);
      toast("已导入备份 ✅");
    } catch(err) { toast("备份文件格式不对～"); }
  };
  reader.readAsText(file);
});
$("reset-data").addEventListener("click", () => {
  if (!confirm("确定清空本设备所有本地数据？此操作不可撤销（已开启云端同步则云端不受影响）。")) return;
  const keep = store.get("sync_key", "");
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith("wb_") && k !== "wb_sync_key") localStorage.removeItem(k);
  }
  toast("已清空本地数据");
  setTimeout(() => location.reload(), 600);
});
window.addEventListener("beforeunload", () => {
  const key = store.get("sync_key", "");
  if (!key || !dirty) return;
  const snap = JSON.stringify({ updatedAt: Date.now(), data: collectAll() });
  try { navigator.sendBeacon(API_BASE + "/api/sync/" + encodeURIComponent(key), new Blob([snap], {type:"application/json"})); } catch(e) {}
});

// ================= 首页 =================
const QUOTES = [
  "上岸的路是一步一步背出来的，今天也要加油鸭 🦆",
  "写作和备考一样，拼的不是灵感，是坐得住。",
  "投出去的每一份简历，都是给未来的自己多一个选项。",
  "不焦虑未来，先做好今天的 7 小时。",
  "你已经比昨天的自己多背了一页笔记，这就够了。",
  "慢慢来，比较快。所有的坚持终会有回响。",
  "考公、写作、求职三线作战的你，本身就很了不起。",
  "先完成，再完美。今天的任务清单等你打勾 ✅",
];
function renderHome() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 6 ? "夜深了，早点休息" : hour < 12 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
  $("home-greeting").textContent = greet + "呀 🌱";
  const week = ["日","一","二","三","四","五","六"][now.getDay()];
  $("home-date").textContent = todayStr() + " 星期" + week;
  const cd = daysBetween(todayStr(), "2026-11-30");
  $("home-countdown").textContent = cd > 0 ? cd : 0;
  $("home-quote").textContent = "「" + QUOTES[dayOfYear() % QUOTES.length] + "」";
  // 统计
  const plan = store.get("plan_" + todayStr(), []);
  $("home-study").textContent = plan.filter(Boolean).length + "/" + STUDY_PLAN_TEMPLATE.length;
  const wlogs = store.get("write_logs", []);
  const twords = wlogs.filter(l => l.date === todayStr()).reduce((s,l)=>s+l.words,0);
  $("home-words").textContent = twords;
  const jobs = store.get("job_logs", []);
  $("home-resume").textContent = jobs.filter(j => j.date === todayStr()).length + "/10";
  // 今日待办
  const todos = store.get("todos", []).filter(t => t.date === todayStr());
  if (todos.length) {
    $("home-todos").innerHTML = todos.slice(0,5).map(t =>
      `<div class="list-item ${t.done?'done':''}"><span>${t.done?'✅':'⬜'}</span><span class="item-text">${t.time?'<b style="color:var(--green-600)">'+t.time+'</b> ':''}${esc(t.text)}</span><span class="tag">${t.cat}</span></div>`
    ).join("");
  } else {
    $("home-todos").innerHTML = '<div class="muted">今天还没有待办，去「生活规划」添加吧～</div>';
  }
}

// ================= 考公备考 =================
function renderExam() {
  const cd = daysBetween(todayStr(), "2026-11-30");
  $("exam-countdown").textContent = cd > 0 ? cd : 0;
  const m = new Date().getMonth() + 1;
  $("exam-phase-tip").textContent = m < 8 ? "当前阶段：抄笔记 + 背笔记，打牢基础 💪" : m < 10 ? "刷题阶段：模块专项突破 + 错题本 📝" : "冲刺阶段：套题模考 + 时政收尾 🚀";

  // 学习计划
  const key = "plan_" + todayStr();
  let checks = store.get(key, STUDY_PLAN_TEMPLATE.map(()=>false));
  const list = $("study-plan-list");
  list.innerHTML = STUDY_PLAN_TEMPLATE.map((p,i) =>
    `<div class="plan-item ${checks[i]?'checked':''}"><input type="checkbox" data-i="${i}" ${checks[i]?'checked':''}><span class="plan-time">${p.time}</span><span class="plan-task">${p.task}</span><span class="tag" style="margin-left:auto">${p.hours}h</span></div>`
  ).join("");
  list.querySelectorAll("input").forEach(cb => cb.addEventListener("change", () => {
    checks[+cb.dataset.i] = cb.checked;
    store.set(key, checks);
    if (checks.some(Boolean)) {
      const days = store.get("study_days", {});
      days[todayStr()] = STUDY_PLAN_TEMPLATE.reduce((s,p,idx)=> s + (checks[idx]?p.hours:0), 0);
      store.set("study_days", days);
    }
    renderExam(); renderHome();
  }));
  const done = checks.filter(Boolean).length;
  const pct = Math.round(done / STUDY_PLAN_TEMPLATE.length * 100);
  $("study-progress").style.width = pct + "%";
  $("study-progress-text").textContent = pct + "%";
  $("plan-reset").onclick = () => { store.set(key, STUDY_PLAN_TEMPLATE.map(()=>false)); renderExam(); renderHome(); };

  // 今日公式
  renderFormula(store.get("formula_offset", 0));
  $("formula-another").onclick = () => {
    const off = store.get("formula_offset", 0) + 1;
    store.set("formula_offset", off);
    renderFormula(off);
  };
  // 时政
  const pol = POLITICS_LIB[dayOfYear() % POLITICS_LIB.length];
  $("daily-politics").innerHTML =
    `<div class="rec-card"><div class="rec-head">📋 今日任务</div>${esc(pol.task)}</div>
     <div class="rec-card"><div class="rec-head">⭐ 今日考点卡片</div>${esc(pol.point)}</div>`;

  // 打卡统计
  const days = store.get("study_days", {});
  const dates = Object.keys(days).sort();
  $("exam-total-days").textContent = dates.length;
  $("exam-total-hours").textContent = Object.values(days).reduce((s,h)=>s+(+h||0),0).toFixed(1);
  let streak = 0; let d = new Date();
  if (!days[todayStr()]) d.setDate(d.getDate()-1);
  while (days[todayStr(d)]) { streak++; d.setDate(d.getDate()-1); }
  $("exam-streak").textContent = streak;
}
function renderFormula(offset) {
  const f = FORMULA_LIB[(dayOfYear() + offset) % FORMULA_LIB.length];
  $("daily-formula").innerHTML =
    `<div class="rec-card"><div class="rec-head"><span class="tag yellow">${f.tag}</span> ${esc(f.title)}</div><pre>${esc(f.content)}</pre></div>`;
}

// ================= 写作 =================
function writeStateText(words) {
  if (words === 0) return {t:"今天还没动笔哦，哪怕先写 100 字热热身？", tag:"待启动", cls:"yellow"};
  if (words < 500) return {t:"慢热启动中～别停，写作状态是写着写着才来的。", tag:"热身中", cls:"yellow"};
  if (words < 1500) return {t:"状态稳定！保持这个节奏，今天目标 2000 字可期。", tag:"稳定输出", cls:""};
  if (words < 3000) return {t:"手感很好！记得中途起来活动一下，保护腰椎～", tag:"高效输出", cls:"pink"};
  return {t:"爆发状态！！今天的你就是番茄榜一大神本人 🔥", tag:"灵感爆发", cls:"pink"};
}
function renderWriting() {
  const logs = store.get("write_logs", []);
  const tw = logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.words,0);
  const now = new Date(); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const weekWords = logs.filter(l => l.date >= todayStr(monday)).reduce((s,l)=>s+l.words,0);
  const total = logs.reduce((s,l)=>s+l.words,0);
  $("write-today").textContent = tw;
  $("write-week").textContent = weekWords;
  $("write-total").textContent = total;
  const st = writeStateText(tw);
  $("write-state").innerHTML = `<span class="tag ${st.cls}">${st.tag}</span> <span style="font-size:14px">${st.t}</span>`;
  const byDate = {};
  logs.forEach(l => byDate[l.date] = (byDate[l.date]||0) + l.words);
  const dates = Object.keys(byDate).sort().reverse();
  $("write-history").innerHTML = dates.length ? dates.slice(0,7).map(d =>
    `<div class="list-item"><span>📅 ${d}</span><span style="margin-left:auto;font-weight:700;color:var(--green-600)">${byDate[d]} 字</span></div>`
  ).join("") : '<div class="muted">还没有记录～</div>';
  drawBars("write-chart", getLastNDays(14).map(d => byDate[d]||0), getLastNDays(14));
  renderReading(store.get("reading_offset", 0));
  renderTip(store.get("tip_offset", 0));
  $("tip-another").onclick = () => { const o = store.get("tip_offset",0)+1; store.set("tip_offset",o); renderTip(o); };
  $("reading-another").onclick = () => { const o = store.get("reading_offset",0)+1; store.set("reading_offset",o); renderReading(o); };
}
function renderTip(offset) {
  $("daily-tip").innerHTML = `<div class="rec-card">${esc(WRITING_TIPS[(dayOfYear()+offset) % WRITING_TIPS.length])}</div>`;
}
function renderReading(offset) {
  const idx = dayOfYear() + offset;
  const r = READING_LIB[idx % READING_LIB.length];
  const r2 = READING_LIB[(idx+5) % READING_LIB.length];
  const platTag = p => p.indexOf("知乎") >= 0 ? "tag pink" : "tag";
  $("daily-reading").innerHTML =
    `<div class="rec-card"><div class="rec-head"><span class="${platTag(r.plat)}">${esc(r.plat)}</span> 💔 ${esc(r.title)}</div>${esc(r.tip)}</div>
     <div class="rec-card"><div class="rec-head"><span class="${platTag(r2.plat)}">${esc(r2.plat)}</span> 💔 ${esc(r2.title)}</div>${esc(r2.tip)}</div>
     <div class="muted">⏰ 阅读提醒：今天至少精读拆解 1 篇追妻向短篇，记下它的「开头钩子」和「男主后悔的临界点」！</div>`;
}
$("write-save").addEventListener("click", () => {
  const w = parseInt($("write-words").value);
  if (!w || w <= 0) return toast("请输入今日字数～");
  const logs = store.get("write_logs", []);
  logs.push({date: todayStr(), words: w, note: $("write-note").value.trim(), ts: Date.now()});
  store.set("write_logs", logs);
  $("write-words").value = ""; $("write-note").value = "";
  toast("已记录 " + w + " 字，棒！✍️");
  renderWriting(); renderHome();
});
function getLastNDays(n) {
  const arr = [];
  for (let i = n-1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); arr.push(todayStr(d)); }
  return arr;
}

// ================= 求职 =================
function renderJob() {
  const jobs = store.get("job_logs", []);
  const today = jobs.filter(j => j.date === todayStr());
  const n = today.length;
  $("job-count-text").textContent = n + " / 10";
  $("job-progress").style.width = Math.min(100, n*10) + "%";
  $("job-cheer").textContent = n === 0 ? "今天还没开始投，打开招聘软件冲一波！" : n < 5 ? "已投 "+n+" 份，继续保持节奏～" : n < 10 ? "过半啦！再坚持一下就达标 💪" : "今日目标达成！🎉 给自己点个赞！";
  $("job-total").textContent = jobs.length;
  $("job-interview").textContent = jobs.filter(j => j.status === "约面试" || j.status === "已面试").length;
  $("job-offer").textContent = jobs.filter(j => j.status === "Offer").length;
  const STATUSES = ["已投递","已查看","约面试","已面试","Offer","未通过"];
  $("job-list").innerHTML = jobs.length ? jobs.slice().reverse().slice(0, 30).map((j) => {
    const idx = jobs.indexOf(j);
    return `<div class="list-item"><div style="flex:1;min-width:0">
      <div style="font-weight:600">${esc(j.company)} <span class="muted">· ${esc(j.position)}</span></div>
      <div class="muted">${j.date} · ${esc(j.channel)}</div></div>
      <select data-idx="${idx}" class="job-status" style="padding:4px 6px;font-size:12px;border-radius:8px">${STATUSES.map(s=>`<option ${j.status===s?'selected':''}>${s}</option>`).join("")}</select>
      <span class="del" data-del="${idx}">✕</span></div>`;
  }).join("") : '<div class="muted">还没有投递记录～</div>';
  $("job-list").querySelectorAll(".job-status").forEach(sel => sel.addEventListener("change", () => {
    jobs[+sel.dataset.idx].status = sel.value; store.set("job_logs", jobs); renderJob();
    toast("状态已更新 → " + sel.value);
  }));
  $("job-list").querySelectorAll(".del").forEach(el => el.addEventListener("click", () => {
    jobs.splice(+el.dataset.del, 1); store.set("job_logs", jobs); renderJob(); renderHome();
  }));
}
$("job-add").addEventListener("click", () => {
  const company = $("job-company").value.trim();
  if (!company) return toast("填一下公司名称吧～");
  const jobs = store.get("job_logs", []);
  jobs.push({date: todayStr(), company, position: $("job-position").value.trim()||"未填岗位", channel: $("job-channel").value, status: "已投递"});
  store.set("job_logs", jobs);
  $("job-company").value = ""; $("job-position").value = "";
  const n = jobs.filter(j=>j.date===todayStr()).length;
  toast(n >= 10 ? "🎉 今日 10 份目标达成！" : "已投 " + n + "/10 份");
  renderJob(); renderHome();
});

// ================= 小红书运营 =================
function renderXhs() {
  renderXhsTopic(store.get("xhs_offset", 0));
  $("xhs-another").onclick = () => { const o = store.get("xhs_offset",0)+1; store.set("xhs_offset",o); renderXhsTopic(o); };
  $("xhs-templates").innerHTML = XHS_TEMPLATES.map(t => `<div class="list-item" style="font-size:13px">${esc(t)}</div>`).join("");
  $("xhs-img-tips").innerHTML = XHS_IMG_TIPS.map(t => `<div class="list-item" style="font-size:13px">📷 ${esc(t)}</div>`).join("");
  const posts = store.get("xhs_posts", []);
  $("xhs-post-list").innerHTML = posts.length ? posts.slice().reverse().map((p,ri) => {
    const idx = posts.length - 1 - ri;
    return `<div class="list-item"><span>📱</span><span class="item-text">${esc(p.title)}</span><span class="muted" style="margin-left:auto">${p.date}</span><span class="del" data-del="${idx}">✕</span></div>`;
  }).join("") : '<div class="muted">还没有发布记录～</div>';
  $("xhs-post-list").querySelectorAll(".del").forEach(el => el.addEventListener("click", () => {
    posts.splice(+el.dataset.del,1); store.set("xhs_posts", posts); renderXhs();
  }));
}
function renderXhsTopic(offset) {
  const t = XHS_TOPICS[(dayOfYear()+offset) % XHS_TOPICS.length];
  const trackTag = t.track === "A" ? '<span class="tag">A线·守住老粉</span>'
                 : t.track === "B" ? '<span class="tag yellow">B线·破圈桥梁</span>'
                 : '<span class="tag pink">C线·女性成长</span>';
  $("daily-xhs").innerHTML =
    `<div class="rec-card"><div class="rec-head">${trackTag} ${esc(t.title)}</div>
     <b>参考文案：</b><br>${esc(t.copy)}</div>`;
}
$("xhs-post-add").addEventListener("click", () => {
  const title = $("xhs-post-title").value.trim();
  if (!title) return toast("填一下笔记标题～");
  const posts = store.get("xhs_posts", []);
  posts.push({title, date: todayStr()});
  store.set("xhs_posts", posts);
  $("xhs-post-title").value = "";
  toast("发布打卡成功 🎉");
  renderXhs();
});

// ================= 状态记录 =================
function renderStatus() {
  const moods = store.get("moods", {});
  const todayMood = moods[todayStr()];
  $("mood-row").innerHTML = MOODS.map((m,i) =>
    `<button class="mood-btn ${todayMood===i?'selected':''}" data-i="${i}"><span class="m-emoji">${m.emoji}</span>${m.label}</button>`
  ).join("");
  $("mood-row").querySelectorAll(".mood-btn").forEach(b => b.addEventListener("click", () => {
    moods[todayStr()] = +b.dataset.i; store.set("moods", moods);
    toast("心情已记录 " + MOODS[+b.dataset.i].emoji);
    renderStatus();
  }));
  $("mood-saved").textContent = todayMood !== undefined ? "今日心情：" + MOODS[todayMood].emoji + " " + MOODS[todayMood].label : "";

  const weights = store.get("weights", []);
  if (weights.length) {
    const latest = weights[weights.length-1].w;
    const prev = weights.length > 1 ? weights[weights.length-2].w : latest;
    const first = weights[0].w;
    const fmt = n => (n > 0 ? "+" : "") + n.toFixed(1);
    $("weight-now").textContent = latest;
    $("weight-delta").textContent = weights.length > 1 ? fmt(latest - prev) : "--";
    $("weight-total").textContent = weights.length > 1 ? fmt(latest - first) : "--";
    drawLine("weight-chart", weights.slice(-20).map(x=>x.w), weights.slice(-20).map(x=>x.date));
  }
  renderStatusCal();
  const periods = store.get("periods", []);
  const last = periods[periods.length-1];
  let info = "";
  if (!periods.length) {
    info = '<span class="muted">还没有记录。姨妈来的那天点上面的按钮记录～</span>';
  } else {
    if (last && !last.end) {
      const d = daysBetween(last.start, todayStr()) + 1;
      info += `<span class="tag pink">经期第 ${d} 天</span> 多喝热水，注意休息，运动改为轻量拉伸 🌸<br>`;
    }
    if (periods.length >= 2) {
      let gaps = [];
      for (let i=1;i<periods.length;i++) gaps.push(daysBetween(periods[i-1].start, periods[i].start));
      const cycle = Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
      const next = new Date(last.start); next.setDate(next.getDate()+cycle);
      const togo = daysBetween(todayStr(), todayStr(next));
      info += `平均周期约 <b>${cycle}</b> 天，预计下次：<b>${todayStr(next)}</b>${togo>=0 ? "（还有 "+togo+" 天）" : "（可能推迟了 "+(-togo)+" 天）"}`;
    } else if (last && last.end) {
      const next = new Date(last.start); next.setDate(next.getDate()+28);
      info += `按 28 天周期估算，下次约在 <b>${todayStr(next)}</b>（记录满 2 次后会自动计算你的真实周期）`;
    }
  }
  $("period-info").innerHTML = info;
  $("period-history").innerHTML = periods.slice(-6).reverse().map(p =>
    `<div class="list-item"><span>🌸</span><span>${p.start} ~ ${p.end || "进行中"}</span>${p.end?`<span class="muted" style="margin-left:auto">${daysBetween(p.start,p.end)+1} 天</span>`:""}</div>`
  ).join("");
}
$("weight-save").addEventListener("click", () => {
  const w = parseFloat($("weight-input").value);
  if (!w || w < 50 || w > 300) return toast("输入一个合理的体重（斤）～");
  const weights = store.get("weights", []);
  const idx = weights.findIndex(x => x.date === todayStr());
  if (idx >= 0) weights[idx].w = w; else weights.push({date: todayStr(), w});
  store.set("weights", weights);
  $("weight-input").value = "";
  toast("体重已记录 ⚖️");
  renderStatus();
});
$("period-start").addEventListener("click", () => {
  const periods = store.get("periods", []);
  const last = periods[periods.length-1];
  if (last && !last.end) return toast("上一次经期还没结束哦～");
  periods.push({start: todayStr(), end: null});
  store.set("periods", periods);
  toast("已记录，这几天好好照顾自己 🌸");
  renderStatus();
});
$("period-end").addEventListener("click", () => {
  const periods = store.get("periods", []);
  const last = periods[periods.length-1];
  if (!last || last.end) return toast("当前没有进行中的经期记录～");
  last.end = todayStr();
  store.set("periods", periods);
  toast("已记录结束 ✅");
  renderStatus();
});

let calCur = new Date();
function renderStatusCal() {
  const y = calCur.getFullYear(), m = calCur.getMonth();
  $("cal-title").textContent = y + " 年 " + (m + 1) + " 月";
  const moods = store.get("moods", {});
  const weights = store.get("weights", []);
  const wByDate = {};
  weights.forEach(x => wByDate[x.date] = x.w);
  const periods = store.get("periods", []);
  const inPeriod = ds => periods.some(p => ds >= p.start && ds <= (p.end || todayStr()));
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  let html = '<div class="cal-grid">';
  ["日","一","二","三","四","五","六"].forEach(w => html += `<div class="cal-head">${w}</div>`);
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = todayStr(new Date(y, m, d));
    const mood = moods[ds];
    const w = wByDate[ds];
    const per = inPeriod(ds);
    const isToday = ds === todayStr();
    html += `<div class="cal-cell${per ? ' period' : ''}${isToday ? ' today' : ''}">
      <div class="cal-day">${d}${per ? '<span class="cal-flower">🌸</span>' : ''}</div>
      <div class="cal-mood">${mood !== undefined ? MOODS[mood].emoji : ''}</div>
      <div class="cal-weight">${w !== undefined ? w + '斤' : ''}</div></div>`;
  }
  html += '</div>';
  $("status-calendar").innerHTML = html;
}
$("cal-prev").addEventListener("click", () => { calCur.setMonth(calCur.getMonth() - 1); renderStatusCal(); });
$("cal-next").addEventListener("click", () => { calCur.setMonth(calCur.getMonth() + 1); renderStatusCal(); });

// ================= 日记（密码 + 语音） =================
let diaryUnlocked = false;
function renderDiaryLock() {
  const hasPass = !!store.get("diary_pass", null);
  $("diary-lock-tip").textContent = hasPass ? "请输入密码查看日记" : "首次使用，请设置一个日记密码（记牢哦！）";
  $("diary-unlock").textContent = hasPass ? "解锁" : "设置密码";
}
$("diary-unlock").addEventListener("click", () => {
  const pass = $("diary-pass").value;
  if (!pass) return toast("请输入密码");
  const saved = store.get("diary_pass", null);
  if (!saved) {
    store.set("diary_pass", btoa(unescape(encodeURIComponent(pass))));
    diaryUnlocked = true;
    toast("密码已设置 🔐");
  } else if (btoa(unescape(encodeURIComponent(pass))) === saved) {
    diaryUnlocked = true;
    toast("欢迎回来 💚");
  } else {
    return toast("密码不对哦～");
  }
  $("diary-pass").value = "";
  renderDiary();
});
$("diary-lock-btn").addEventListener("click", () => { diaryUnlocked = false; renderDiary(); });
function renderDiary() {
  $("diary-locked").style.display = diaryUnlocked ? "none" : "block";
  $("diary-open").style.display = diaryUnlocked ? "block" : "none";
  if (!diaryUnlocked) { renderDiaryLock(); return; }
  const list = store.get("diaries", []);
  $("diary-list").innerHTML = list.length ? list.slice().reverse().map((d,ri) => {
    const idx = list.length - 1 - ri;
    return `<div class="diary-entry"><div class="d-date">📅 ${d.date} ${d.time||""} <span class="del" style="float:right" data-del="${idx}">删除</span></div><div class="d-text">${esc(d.text)}</div></div>`;
  }).join("") : '<div class="muted">还没有日记～</div>';
  $("diary-list").querySelectorAll(".del").forEach(el => el.addEventListener("click", () => {
    if (!confirm("确定删除这篇日记吗？")) return;
    list.splice(+el.dataset.del,1); store.set("diaries", list); renderDiary();
  }));
}
$("diary-save").addEventListener("click", () => {
  const text = $("diary-text").value.trim();
  if (!text) return toast("写点什么再保存吧～");
  const list = store.get("diaries", []);
  const now = new Date();
  list.push({date: todayStr(), time: String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0"), text});
  store.set("diaries", list);
  $("diary-text").value = "";
  toast("日记已保存 📖");
  renderDiary();
});
let recognition = null, recording = false;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  recognition = new SR();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;
  let finalBase = "";
  recognition.onstart = () => { finalBase = $("diary-text").value; };
  recognition.onresult = (e) => {
    let interim = "", final = "";
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    $("diary-text").value = finalBase + final + interim;
  };
  recognition.onerror = (e) => {
    recording = false; updateVoiceUI();
    $("voice-status").textContent = e.error === "not-allowed" ? "请允许麦克风权限后重试" : "语音识别出错了，再试一次～";
  };
  recognition.onend = () => { recording = false; updateVoiceUI(); };
}
function updateVoiceUI() {
  $("voice-btn").classList.toggle("recording", recording);
  $("voice-btn").textContent = recording ? "⏹" : "🎤";
  if (recording) $("voice-status").textContent = "正在听...说完点 ⏹ 停止";
}
$("voice-btn").addEventListener("click", () => {
  if (!recognition) return toast("当前浏览器不支持语音输入，建议用手机 Chrome/Edge 打开");
  if (recording) { recognition.stop(); recording = false; }
  else { try { recognition.start(); recording = true; $("voice-status").textContent = "正在听..."; } catch(e){} }
  updateVoiceUI();
});

// ================= 生活规划 =================
function autoCat(text) {
  for (const c of TODO_CATS) if (c.kw.some(k => text.toLowerCase().includes(k))) return c.name;
  return "📎 其他";
}
function renderPlan() {
  const todos = store.get("todos", []).filter(t => t.date === todayStr());
  const all = store.get("todos", []);
  const timed = todos.filter(t => t.time).sort((a,b) => a.time.localeCompare(b.time));
  $("todo-timeline").innerHTML = timed.length ? timed.map(t => {
    const idx = all.indexOf(t);
    return `<div class="list-item ${t.done?'done':''}"><input type="checkbox" data-idx="${idx}" ${t.done?'checked':''} style="width:18px;height:18px;accent-color:var(--green-500)"><b style="color:var(--green-600);min-width:48px">${t.time}</b><span class="item-text">${esc(t.text)}</span><span class="tag" style="margin-left:auto">${t.cat}</span></div>`;
  }).join("") : '<div class="muted">带时间的待办会按时间排在这里～</div>';
  const groups = {};
  todos.forEach(t => { (groups[t.cat] = groups[t.cat] || []).push(t); });
  const names = Object.keys(groups);
  $("todo-groups").innerHTML = names.length ? names.map(name =>
    `<div style="margin-bottom:10px"><div style="font-weight:700;font-size:13.5px;margin-bottom:4px">${name} <span class="muted">(${groups[name].filter(t=>t.done).length}/${groups[name].length})</span></div>` +
    groups[name].map(t => {
      const idx = all.indexOf(t);
      return `<div class="list-item ${t.done?'done':''}"><input type="checkbox" data-idx="${idx}" ${t.done?'checked':''} style="width:18px;height:18px;accent-color:var(--green-500)"><span class="item-text">${t.time?'<b style="color:var(--green-600)">'+t.time+'</b> ':''}${esc(t.text)}</span><span class="del" data-del="${idx}">✕</span></div>`;
    }).join("") + `</div>`
  ).join("") : '<div class="muted">还没有待办～</div>';
  document.querySelectorAll("#todo-timeline input[type=checkbox], #todo-groups input[type=checkbox]").forEach(cb =>
    cb.addEventListener("change", () => { all[+cb.dataset.idx].done = cb.checked; store.set("todos", all); renderPlan(); renderHome(); }));
  document.querySelectorAll("#todo-groups .del").forEach(el =>
    el.addEventListener("click", () => { all.splice(+el.dataset.del,1); store.set("todos", all); renderPlan(); renderHome(); }));
}
$("todo-add").addEventListener("click", addTodo);
$("todo-input").addEventListener("keydown", e => { if (e.key === "Enter") addTodo(); });
function addTodo() {
  const text = $("todo-input").value.trim();
  if (!text) return toast("写点要做的事～");
  const all = store.get("todos", []);
  all.push({date: todayStr(), text, time: $("todo-time").value || "", cat: autoCat(text), done: false});
  store.set("todos", all);
  $("todo-input").value = ""; $("todo-time").value = "";
  toast("已添加 → " + autoCat(text));
  renderPlan(); renderHome();
}

// ================= 记账 =================
function renderMoneyCats() {
  const type = $("money-type").value;
  const cats = type === "in" ? INCOME_CATS : EXPENSE_CATS;
  $("money-cat").innerHTML = cats.map(c => `<option>${c}</option>`).join("");
}
$("money-type").addEventListener("change", renderMoneyCats);
function renderMoney() {
  const year = new Date().getFullYear();
  const month = todayStr().slice(0,7);
  $("money-year-sub").textContent = year + " 年收支一览";
  const bills = store.get("bills", []);
  const yearBills = bills.filter(b => b.date.startsWith(String(year)));
  const inSum = yearBills.filter(b=>b.type==="in").reduce((s,b)=>s+b.amount,0);
  const outSum = yearBills.filter(b=>b.type==="out").reduce((s,b)=>s+b.amount,0);
  $("money-in").textContent = "¥" + inSum.toLocaleString("zh-CN",{maximumFractionDigits:2});
  $("money-out").textContent = "¥" + outSum.toLocaleString("zh-CN",{maximumFractionDigits:2});
  $("money-balance").textContent = "¥" + (inSum-outSum).toLocaleString("zh-CN",{maximumFractionDigits:2});
  const mBills = bills.filter(b => b.date.startsWith(month));
  const mIn = mBills.filter(b=>b.type==="in").reduce((s,b)=>s+b.amount,0);
  const mOut = mBills.filter(b=>b.type==="out").reduce((s,b)=>s+b.amount,0);
  $("month-in").textContent = "¥" + mIn.toLocaleString("zh-CN",{maximumFractionDigits:2});
  $("month-out").textContent = "¥" + mOut.toLocaleString("zh-CN",{maximumFractionDigits:2});
  $("month-balance").textContent = "¥" + (mIn-mOut).toLocaleString("zh-CN",{maximumFractionDigits:2});
  $("money-list").innerHTML = bills.length ? bills.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,40).map(b => {
    const idx = bills.indexOf(b);
    return `<div class="list-item"><span>${b.type==="in"?"💚":"🧾"}</span>
      <div style="flex:1;min-width:0"><div style="font-weight:600">${esc(b.cat)}${b.note?' <span class="muted">· '+esc(b.note)+'</span>':''}</div><div class="muted">${b.date}</div></div>
      <span class="${b.type==='in'?'amount-in':'amount-out'}">${b.type==='in'?'+':'-'}¥${b.amount.toLocaleString("zh-CN",{maximumFractionDigits:2})}</span>
      <span class="del" data-del="${idx}">✕</span></div>`;
  }).join("") : '<div class="muted">还没有账单～</div>';
  $("money-list").querySelectorAll(".del").forEach(el => el.addEventListener("click", () => {
    bills.splice(+el.dataset.del,1); store.set("bills", bills); renderMoney();
  }));
}
$("money-add").addEventListener("click", () => {
  const amount = parseFloat($("money-amount").value);
  if (!amount || amount <= 0) return toast("请输入金额～");
  const bills = store.get("bills", []);
  bills.push({type: $("money-type").value, cat: $("money-cat").value, amount, date: $("money-date").value || todayStr(), note: $("money-note").value.trim()});
  store.set("bills", bills);
  $("money-amount").value = ""; $("money-note").value = "";
  toast("已记账 💰");
  renderMoney();
});

// ================= 简易图表 =================
function drawBars(svgId, values, labels) {
  const svg = $(svgId);
  const W = 600, H = 120, max = Math.max(...values, 100);
  const bw = W / values.length;
  let html = "";
  values.forEach((v,i) => {
    const h = v / max * 90;
    html += `<rect x="${i*bw+4}" y="${105-h}" width="${bw-8}" height="${Math.max(h,2)}" rx="4" fill="${v>0?'#82c99a':'#e3f4e6'}"/>`;
    if (v > 0) html += `<text x="${i*bw+bw/2}" y="${100-h}" font-size="9" fill="#5cb87e" text-anchor="middle">${v}</text>`;
    html += `<text x="${i*bw+bw/2}" y="118" font-size="8" fill="#7d9184" text-anchor="middle">${labels[i].slice(5)}</text>`;
  });
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = html;
}
function drawLine(svgId, values, labels, target) {
  const svg = $(svgId);
  if (!values.length) return;
  const W = 600, H = 120;
  const min = Math.min(...values, target||Infinity) - 2, max = Math.max(...values) + 2;
  const x = i => values.length === 1 ? W/2 : 20 + i * (W-40) / (values.length-1);
  const y = v => 10 + (max - v) / (max - min || 1) * 85;
  let html = "";
  if (target) html += `<line x1="0" y1="${y(target)}" x2="${W}" y2="${y(target)}" stroke="#f8bbd0" stroke-width="1.5" stroke-dasharray="5,4"/><text x="${W-4}" y="${y(target)-4}" font-size="10" fill="#c2607f" text-anchor="end">目标 ${target}斤</text>`;
  html += `<polyline points="${values.map((v,i)=>x(i)+','+y(v)).join(' ')}" fill="none" stroke="#5cb87e" stroke-width="2.5" stroke-linecap="round"/>`;
  values.forEach((v,i) => {
    html += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#fff" stroke="#5cb87e" stroke-width="2"/>`;
    html += `<text x="${x(i)}" y="${y(v)-8}" font-size="9.5" fill="#429a63" text-anchor="middle">${v}</text>`;
    html += `<text x="${x(i)}" y="115" font-size="8" fill="#7d9184" text-anchor="middle">${labels[i].slice(5)}</text>`;
  });
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = html;
}

// ================= 导航事件 =================
document.addEventListener("click", e => {
  const nav = e.target.closest(".nav-item");
  if (nav) { gotoPage(nav.dataset.page); return; }
  const go = e.target.closest("[data-goto]");
  if (go) { gotoPage(go.dataset.goto); }
});

// ================= 总渲染 =================
function renderAll() {
  renderHome();
  renderExam();
  renderWriting();
  renderJob();
  renderXhs();
  renderStatus();
  renderDiary();
  renderPlan();
  renderMoney();
  renderSettings();
  ensureCustomPages();
}

// ================= 初始化 =================
async function init() {
  $("money-date").value = todayStr();
  renderMoneyCats();
  renderSidebar();
  renderSettings();
  ensureCustomPages();
  // 先拉取云端（若已设置同步码），再渲染
  await doPull();
  renderHome();
  renderExam();
  renderWriting();
  renderJob();
  renderXhs();
  renderStatus();
  renderDiary();
  renderPlan();
  renderMoney();
}
init();
