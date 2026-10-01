/* Bathroom timers — a countdown per student to their next scheduled trip.
   Resets when the student's QR code is scanned (via a Google Sheet + Apps Script)
   or when "Reset now" is tapped on the board. Loaded after app.js. */

const BATHROOM_POS_KEY = "sched:bathroomPos:v1";
const BATHROOM_POLL_MS = 15000;
const BATHROOM_WARN_MIN = 15;
const BATHROOM_COLORS = ["#1e88e5", "#8e24aa", "#f4511e", "#00897b", "#6d4c41", "#3949ab", "#c0ca33", "#d81b60"];

const bathroomBox = document.getElementById("bathroomBox");
const bathroomList = document.getElementById("bathroomList");
const bathroomStatus = document.getElementById("bathroomStatus");
const toggleBathroom = document.getElementById("toggleBathroom");
const btnBathroomSetup = document.getElementById("btnBathroomSetup");
const bathroomSetupOverlay = document.getElementById("bathroomSetupOverlay");
const bathroomQrOverlay = document.getElementById("bathroomQrOverlay");
const phoneSetupOverlay = document.getElementById("phoneSetupOverlay");

let bathroomServerLast = {};
let bathroomConn = { state: "off", checkedAt: null }; // off | ok | error | wrong-code
let bathroomPollTimer = null;
let bathroomQrStudentId = null;

function getBathroom(){
  const b = state.bathroom && typeof state.bathroom === "object" ? state.bathroom : {};
  state.bathroom = {
    enabled: !!b.enabled,
    intervalMin: Number(b.intervalMin) > 0 ? Number(b.intervalMin) : 120,
    endpoint: typeof b.endpoint === "string" ? b.endpoint : "",
    key: typeof b.key === "string" && b.key ? b.key : makeBathroomKey(),
    students: Array.isArray(b.students) ? b.students : [],
    last: b.last && typeof b.last === "object" ? b.last : {},
  };
  return state.bathroom;
}

function makeBathroomKey(){
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, x => x.toString(36).padStart(2, "0")).join("").slice(0, 14);
}

/* ---------- timing ---------- */

function getSchoolDayWindow(now = new Date()){
  const ordered = getOrderedActivities();
  if (!ordered.length) return null;
  const ct = getCentralParts(now);
  if (!getPreferences().runOnWeekends && (ct.weekday === 0 || ct.weekday === 6)) return null;
  const nowMin = ct.hour * 60 + ct.minute;
  const startMin = timeToMinutes(ordered[0].time);
  const endMin = getDayEndMin(ordered);
  if (nowMin < startMin || nowMin >= endMin) return null;
  // Midnight Central, so a trip scanned on arrival (before the first activity) still counts as today
  const minuteFloor = Math.floor(now.getTime() / 60000) * 60000;
  const midnight = minuteFloor - (((ct.hour % 24) * 60) + ct.minute) * 60000;
  return { midnight };
}

function getLastTrip(id){
  const local = Date.parse(getBathroom().last[id] || "") || 0;
  const server = Date.parse(bathroomServerLast[id] || "") || 0;
  return Math.max(local, server);
}

// Returns null until the student's first trip of the day is logged
function getStudentTimer(student, win, now){
  const intervalMs = getBathroom().intervalMin * 60000;
  const last = getLastTrip(student.id);
  if (last < win.midnight) return null;
  const due = last + intervalMs;
  const remainingMs = due - now.getTime();
  return { due, remainingMs, fraction: clamp(remainingMs / intervalMs, 0, 1) };
}

function formatBathroomRemaining(ms){
  if (ms <= 0) {
    const over = Math.floor(-ms / 60000);
    return over < 1 ? "Due now" : `${over} min over`;
  }
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function formatClockTime(ms){
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

/* ---------- board widget ---------- */

function renderBathroomBox(){
  const b = getBathroom();
  const now = new Date();
  const win = getSchoolDayWindow(now);
  const show = b.enabled && !!win && b.students.length > 0;
  bathroomBox.classList.toggle("hidden", !show);
  if (!show) return;

  // Rebuild rows only when the student list changes; otherwise just update them
  const sig = b.students.map(s => s.id + s.label + s.color).join("|");
  if (bathroomList.dataset.sig !== sig) {
    bathroomList.dataset.sig = sig;
    bathroomList.innerHTML = "";
    b.students.forEach(s => {
      const row = document.createElement("button");
      row.className = "bathroom-row";
      row.dataset.id = s.id;
      row.innerHTML = `<span class="bathroom-chip"></span><span class="bathroom-time"></span><span class="bathroom-bar"><span></span></span>`;
      row.querySelector(".bathroom-chip").textContent = s.label;
      row.querySelector(".bathroom-chip").style.background = s.color;
      row.addEventListener("pointerdown", e => e.stopPropagation());
      row.addEventListener("click", () => openBathroomQr(s.id));
      bathroomList.appendChild(row);
    });
  }

  b.students.forEach(s => {
    const row = bathroomList.querySelector(`[data-id="${CSS.escape(s.id)}"]`);
    if (!row) return;
    const t = getStudentTimer(s, win, now);
    if (!t) {
      row.dataset.status = "waiting";
      row.querySelector(".bathroom-time").textContent = "No trip yet";
      row.querySelector(".bathroom-bar span").style.width = "0%";
      row.setAttribute("aria-label", `${s.label}: no bathroom trip logged yet today. Open QR code and reset.`);
      return;
    }
    const status = t.remainingMs <= 0 ? "overdue" : t.remainingMs <= BATHROOM_WARN_MIN * 60000 ? "soon" : "ok";
    row.dataset.status = status;
    row.querySelector(".bathroom-time").textContent = formatBathroomRemaining(t.remainingMs);
    row.querySelector(".bathroom-bar span").style.width = `${Math.round(t.fraction * 100)}%`;
    row.setAttribute("aria-label", `${s.label}: ${t.remainingMs <= 0 ? "bathroom trip due" : "next bathroom trip at " + formatClockTime(t.due)}. Open QR code and reset.`);
  });

  bathroomStatus.textContent =
    !b.endpoint ? "Tap a student to reset" :
    bathroomConn.state === "ok" ? "" :
    bathroomConn.state === "wrong-code" ? "Sheet code doesn't match" :
    bathroomConn.state === "error" ? "Can't reach Google Sheet" : "Connecting…";
  bathroomStatus.classList.toggle("hidden", !bathroomStatus.textContent);
}

async function bathroomRequest(params){
  const b = getBathroom();
  if (!b.endpoint) return null;
  const url = new URL(b.endpoint);
  Object.entries({ ...params, key: b.key }).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) {
      bathroomConn = { state: data.error === "wrong-code" ? "wrong-code" : "error", checkedAt: Date.now() };
      return null;
    }
    bathroomServerLast = data.last || {};
    bathroomConn = { state: "ok", checkedAt: Date.now() };
    return data;
  } catch (err) {
    console.warn("Bathroom timer sync failed:", err);
    bathroomConn = { state: "error", checkedAt: Date.now() };
    return null;
  } finally {
    renderBathroomBox();
    renderBathroomSetupStatus();
  }
}

function pollBathroom(){
  const b = getBathroom();
  if (!b.enabled || !b.endpoint || document.hidden || !getSchoolDayWindow()) return;
  bathroomRequest({ action: "state" });
}

function resetBathroomTimer(id){
  const b = getBathroom();
  const student = b.students.find(s => s.id === id);
  if (!student) return;
  b.last[id] = new Date().toISOString();
  saveState();
  renderBathroomBox();
  bathroomRequest({ action: "reset", student: id, label: student.label, source: "board" });
}

/* ---------- QR codes ---------- */

function getScanUrl(student){
  const b = getBathroom();
  const url = new URL("scan.html", location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("s", student.id);
  url.searchParams.set("n", student.label);
  url.searchParams.set("k", b.key);
  // Standard Apps Script links only need their deployment ID, which keeps the QR code much simpler
  const m = b.endpoint.match(/^https:\/\/script\.google\.com\/macros\/s\/([\w-]+)\/exec$/);
  url.searchParams.set("e", m ? m[1] : b.endpoint);
  return url.toString();
}

function getEndpointShort(){
  const b = getBathroom();
  const m = b.endpoint.match(/^https:\/\/script\.google\.com\/macros\/s\/([\w-]+)\/exec$/);
  return m ? m[1] : b.endpoint;
}

// Link for the phone page: carries the Sheet link, code, interval and students
function getRemoteUrl(){
  const b = getBathroom();
  // Compact format keeps the setup QR code scannable: s=id.LABEL.color*id.LABEL.color
  const students = b.students
    .map(s => [s.id, s.label.replace(/[.*]/g, ""), s.color.replace("#", "")].join("."))
    .join("*");
  const url = new URL("remote.html", location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("e", getEndpointShort());
  url.searchParams.set("k", b.key);
  url.searchParams.set("i", b.intervalMin);
  url.searchParams.set("s", students);
  return url.toString();
}

function openPhoneSetup(){
  const b = getBathroom();
  const holder = document.getElementById("phoneSetupCode");
  const note = document.getElementById("phoneSetupNote");
  const copyBtn = document.getElementById("btnPhoneCopyLink");
  let problem = "";
  if (isRunningFromFile()) problem = "Phone setup only works when Sched is opened from its web address (github.io), not from a file on this computer.";
  else if (!b.endpoint) problem = "Connect the Google Sheet first (Web app link above).";
  else if (!b.students.length) problem = "Add students first.";
  holder.innerHTML = problem ? "" : qrSvg(getRemoteUrl(), 6);
  note.textContent = problem || "Scan with the phone's camera, then add the page to the home screen. If you add or remove students, set up the phone again.";
  copyBtn.disabled = !!problem;
  openOverlay(phoneSetupOverlay);
}

function isRunningFromFile(){
  return location.protocol === "file:";
}

function qrSvg(text, cellSize = 4){
  const qr = qrcode(0, "L"); // lowest error correction = fewest, biggest squares
  qr.addData(text);
  qr.make();
  // Wide white border ("quiet zone") helps phone cameras lock on
  return qr.createSvgTag({ cellSize, margin: 4, scalable: true });
}

function openBathroomQr(id){
  const b = getBathroom();
  const s = b.students.find(x => x.id === id);
  if (!s) return;
  bathroomQrStudentId = id;
  document.getElementById("bathroomQrTitle").textContent = `Bathroom — ${s.label}`;
  const holder = document.getElementById("bathroomQrCode");
  const win = getSchoolDayWindow();
  const note = document.getElementById("bathroomQrNote");
  if (isRunningFromFile()) {
    holder.innerHTML = "";
    note.textContent = "QR codes only work when Sched is opened from its web address (github.io), not from a file on this computer. Tap Reset now instead.";
  } else if (b.endpoint) {
    holder.innerHTML = qrSvg(getScanUrl(s));
    note.textContent = "Scan with a phone camera after the trip, or tap Reset now.";
  } else {
    holder.innerHTML = "";
    note.textContent = "Connect a Google Sheet in Settings to reset by QR code. For now, tap Reset now.";
  }
  const due = document.getElementById("bathroomQrDue");
  const t = win ? getStudentTimer(s, win, new Date()) : null;
  due.textContent = !win ? "" : t ? `Next trip due ${formatClockTime(t.due)}` : "No trip logged yet today";
  openOverlay(bathroomQrOverlay);
  document.getElementById("btnBathroomReset").focus();
}

function printBathroomQrCodes(){
  const b = getBathroom();
  if (!b.endpoint || !b.students.length) return;
  if (isRunningFromFile()) {
    alert("QR codes only work when Sched is opened from its web address (github.io), not from a file on this computer. Open Sched from GitHub Pages and print from there.");
    return;
  }
  const cards = b.students.map(s => `
    <div class="card">
      <div class="qr">${qrSvg(getScanUrl(s), 6)}</div>
      <div class="name" style="background:${s.color}">${escapeHtml(s.label)}</div>
      <div class="hint">Scan after bathroom trip</div>
    </div>`).join("");
  const w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups for this site to print QR codes."); return; }
  w.document.write(`<!doctype html><html><head><title>Bathroom QR codes</title>
    <style>
      body{font-family:Nunito,Arial,sans-serif;margin:24px}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(2.6in,1fr));gap:24px}
      .card{border:3px solid #000;border-radius:14px;padding:14px;text-align:center;break-inside:avoid}
      .qr svg{width:2.1in;height:2.1in}
      .name{display:inline-block;color:#fff;font-weight:900;font-size:28px;padding:4px 18px;border-radius:999px;margin-top:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .hint{font-weight:700;margin-top:6px}
    </style></head><body><div class="grid">${cards}</div>
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

/* ---------- setup modal ---------- */

function renderBathroomSetup(){
  const b = getBathroom();
  document.getElementById("bathroomInterval").value = b.intervalMin;
  document.getElementById("bathroomEndpoint").value = b.endpoint;
  document.getElementById("bathroomKey").value = b.key;

  const list = document.getElementById("bathroomStudents");
  list.innerHTML = "";
  if (!b.students.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "No students yet. Add one for each student on a bathroom schedule.";
    list.appendChild(empty);
  }
  b.students.forEach(s => {
    const row = document.createElement("div");
    row.className = "bathroom-student";
    const chip = document.createElement("input");
    chip.type = "color";
    chip.value = s.color;
    chip.setAttribute("aria-label", `Color for ${s.label}`);
    chip.addEventListener("change", () => { s.color = chip.value; saveBathroom(); });
    const label = document.createElement("input");
    label.className = "text-input";
    label.value = s.label;
    label.maxLength = 4;
    label.setAttribute("aria-label", "Student initials");
    label.addEventListener("change", () => { s.label = label.value.trim().toUpperCase() || s.label; label.value = s.label; saveBathroom(); });
    const remove = document.createElement("button");
    remove.className = "btn btn-danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      if (!confirm(`Remove ${s.label}'s bathroom timer? Their printed QR code will stop working.`)) return;
      b.students = b.students.filter(x => x.id !== s.id);
      delete b.last[s.id];
      saveBathroom();
      renderBathroomSetup();
    });
    row.append(chip, label, remove);
    list.appendChild(row);
  });
  document.getElementById("btnBathroomPrint").disabled = !b.endpoint || !b.students.length;
  renderBathroomSetupStatus();
}

function renderBathroomSetupStatus(){
  const el = document.getElementById("bathroomConnStatus");
  if (!el) return;
  const b = getBathroom();
  el.dataset.state = b.endpoint ? bathroomConn.state : "off";
  el.textContent =
    !b.endpoint ? "Not connected. Timers can only be reset from the board." :
    bathroomConn.state === "ok" ? `Connected. Last checked ${formatClockTime(bathroomConn.checkedAt)}.` :
    bathroomConn.state === "wrong-code" ? "The Sheet answered, but its secret code doesn't match. Paste the code above into the Apps Script and redeploy." :
    bathroomConn.state === "error" ? "Can't reach the Sheet. Check the web app link and that access is set to Anyone." :
    "Not checked yet. Tap Test connection.";
}

function saveBathroom(){
  saveState();
  bathroomList.dataset.sig = "";
  renderBathroomBox();
}

function setupBathroom(){
  getBathroom();
  saveState();

  const saved = safeParse(localStorage.getItem(BATHROOM_POS_KEY));
  if (saved && typeof saved.x === "number") moveWithinBoard(bathroomBox, saved.x, saved.y);
  const handle = bathroomBox.querySelector(".bathroom-head");
  enableDrag(bathroomBox, handle);
  handle.addEventListener("pointerup", () => {
    const r = bathroomBox.getBoundingClientRect();
    localStorage.setItem(BATHROOM_POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
  });

  toggleBathroom.addEventListener("change", () => {
    getBathroom().enabled = toggleBathroom.checked;
    saveBathroom();
    pollBathroom();
  });
  btnBathroomSetup.addEventListener("click", () => {
    setSettingsPanelOpen(false);
    renderBathroomSetup();
    openOverlay(bathroomSetupOverlay);
  });

  document.getElementById("closeBathroomSetup").addEventListener("click", () => closeOverlay(bathroomSetupOverlay));
  bathroomSetupOverlay.addEventListener("click", e => { if (e.target === bathroomSetupOverlay) closeOverlay(bathroomSetupOverlay); });
  document.getElementById("closeBathroomQr").addEventListener("click", () => closeOverlay(bathroomQrOverlay));
  bathroomQrOverlay.addEventListener("click", e => { if (e.target === bathroomQrOverlay) closeOverlay(bathroomQrOverlay); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!phoneSetupOverlay.classList.contains("hidden")) { closeOverlay(phoneSetupOverlay); return; }
    closeOverlay(bathroomQrOverlay);
    closeOverlay(bathroomSetupOverlay);
  });
  document.getElementById("btnBathroomReset").addEventListener("click", () => {
    if (bathroomQrStudentId) resetBathroomTimer(bathroomQrStudentId);
    closeOverlay(bathroomQrOverlay);
  });

  document.getElementById("bathroomInterval").addEventListener("change", e => {
    const v = parseInt(e.target.value, 10);
    if (v >= 5 && v <= 600) { getBathroom().intervalMin = v; saveBathroom(); }
    else e.target.value = getBathroom().intervalMin;
  });
  document.getElementById("bathroomEndpoint").addEventListener("change", e => {
    const v = e.target.value.trim();
    if (v && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(v)) {
      alert("Paste the web app link from Apps Script. It starts with https://script.google.com/ and ends with /exec.");
      e.target.value = getBathroom().endpoint;
      return;
    }
    getBathroom().endpoint = v;
    bathroomConn = { state: v ? "unknown" : "off", checkedAt: null };
    saveBathroom();
    renderBathroomSetup();
    if (v) bathroomRequest({ action: "state" });
  });
  document.getElementById("btnBathroomAdd").addEventListener("click", () => {
    const b = getBathroom();
    const initials = (prompt("Student initials (up to 4 letters). Don't use full names.") || "").trim().toUpperCase().slice(0, 4);
    if (!initials) return;
    b.students.push({ id: Math.random().toString(36).slice(2, 8), label: initials, color: BATHROOM_COLORS[b.students.length % BATHROOM_COLORS.length] });
    saveBathroom();
    renderBathroomSetup();
  });
  document.getElementById("btnBathroomCopyKey").addEventListener("click", async () => {
    const btn = document.getElementById("btnBathroomCopyKey");
    try { await navigator.clipboard.writeText(getBathroom().key); btn.textContent = "Copied"; }
    catch { document.getElementById("bathroomKey").select(); btn.textContent = "Press Ctrl+C"; }
    setTimeout(() => { btn.textContent = "Copy"; }, 2000);
  });
  document.getElementById("btnBathroomTest").addEventListener("click", () => {
    bathroomConn = { state: "unknown", checkedAt: null };
    renderBathroomSetupStatus();
    bathroomRequest({ action: "state" });
  });
  document.getElementById("btnBathroomPrint").addEventListener("click", printBathroomQrCodes);
  document.getElementById("btnPhoneSetup").addEventListener("click", openPhoneSetup);
  document.getElementById("closePhoneSetup").addEventListener("click", () => closeOverlay(phoneSetupOverlay));
  phoneSetupOverlay.addEventListener("click", e => { if (e.target === phoneSetupOverlay) closeOverlay(phoneSetupOverlay); });
  document.getElementById("btnPhoneCopyLink").addEventListener("click", async () => {
    const btn = document.getElementById("btnPhoneCopyLink");
    try { await navigator.clipboard.writeText(getRemoteUrl()); btn.textContent = "Link copied"; }
    catch { prompt("Copy this link and text it to the phone:", getRemoteUrl()); }
    setTimeout(() => { btn.textContent = "Copy link to text it"; }, 2000);
  });

  document.addEventListener("visibilitychange", () => { if (!document.hidden) pollBathroom(); });
  setInterval(renderBathroomBox, 1000);
  bathroomPollTimer = setInterval(pollBathroom, BATHROOM_POLL_MS);
  renderBathroomBox();
  pollBathroom();
}

function syncBathroomSettingsUI(){
  toggleBathroom.checked = getBathroom().enabled;
}

setupBathroom();
