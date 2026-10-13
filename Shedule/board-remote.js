/* Phone remote — the board side.
   Checks the Google Sheet (the same Apps Script as the bathroom timers) for commands
   sent from the phone page, carries them out, and reports what's on screen.
   Loaded after app.js and bathroom.js. */

const REMOTE_FAST_MS = 2000;   // during the school day
const REMOTE_SLOW_MS = 8000;   // before/after school and weekends
const REMOTE_MAX_AGE_MS = 2 * 60 * 1000; // ignore commands older than this (e.g. sent while the board was closed)

const MEETING_PAGES = {
  morning:   { title: "Morning Meeting",   url: "https://tysontucker-bot.github.io/morning-meeting/MorningMeeting/morning-meeting.html" },
  afternoon: { title: "Afternoon Meeting", url: "https://tysontucker-bot.github.io/Afternoon-Meeting/?screen=projector" },
};

const remoteViewer = document.getElementById("remoteViewer");
const remoteViewerFrame = document.getElementById("remoteViewerFrame");
const remoteViewerTitle = document.getElementById("remoteViewerTitle");
const togglePhoneControl = document.getElementById("togglePhoneControl");
const inputWhosHereUrl = document.getElementById("inputWhosHereUrl");

let remoteAfter = null;        // highest command number already handled (null = not synced yet)
let remoteAck = 0;
let remoteViewerKind = "";     // "", "whos", "morning", "afternoon"
let remoteLastStatus = "";
let remoteLastStatusSent = 0;
let remoteTimer = null;
let remoteBusy = false;

function remoteEnabled(){
  return !!getBathroom().endpoint && getPreferences().phoneControl !== false;
}

/* ---------- what the board can do ---------- */

function openRemoteViewer(kind, title, url){
  remoteViewerKind = kind;
  remoteViewerTitle.textContent = title;
  remoteViewerFrame.title = title;
  remoteViewerFrame.dataset.url = url;
  if (remoteViewerFrame.src !== url) remoteViewerFrame.src = url;
  remoteViewer.classList.remove("hidden");
}

function closeRemoteViewer(){
  remoteViewer.classList.add("hidden");
  remoteViewerFrame.src = "about:blank"; // stops any sound playing inside
  remoteViewerKind = "";
}

// The Afternoon Meeting projector waits for "Start projector"; the board is on the same site, so it can press it
function autoStartProjector(){
  let tries = 0;
  const attempt = () => {
    if (remoteViewerKind !== "afternoon") return;
    try {
      const doc = remoteViewerFrame.contentDocument;
      const btn = doc && [...doc.querySelectorAll("button")].find(b => /start projector/i.test(b.textContent));
      if (btn) { btn.click(); return; }
    } catch (err) { return; } // different site: nothing we can do
    if (++tries < 40) setTimeout(attempt, 500);
  };
  setTimeout(attempt, 800);
}

function closeVideoWindows(){
  floatLayer.querySelectorAll(".video-float").forEach(el => el.remove());
}

function runRemoteCommand(cmd){
  switch (cmd.c) {
    case "whos-open": {
      const url = (getPreferences().whosHereUrl || "").trim();
      if (url) openRemoteViewer("whos", "Who's here", url);
      break;
    }
    case "meeting-open": {
      const m = MEETING_PAGES[cmd.a];
      if (!m) break;
      openRemoteViewer(cmd.a, m.title, m.url);
      if (cmd.a === "afternoon") autoStartProjector();
      break;
    }
    case "video-open": {
      closeVideoWindows(); // one video at a time
      if (cmd.a === "sensory") { openSensoryRandomFloat(); break; }
      const v = VIDEOS.find(x => x.id === cmd.a);
      if (v) openVideoFloat(v.title, v.id, true);
      break;
    }
    case "video-close":
      closeVideoWindows();
      break;
    case "viewer-close":
      closeRemoteViewer();
      break;
    case "close-all":
      closeVideoWindows();
      closeRemoteViewer();
      break;
  }
}

/* ---------- status for the phone ---------- */

function getRemoteStatus(){
  const video = floatLayer.querySelector(".video-float");
  return JSON.stringify({
    viewer: remoteViewerKind,
    video: video ? (video.dataset.title || "Video") : "",
    videos: VIDEOS.map(v => [v.title, v.id]),
  });
}

/* ---------- checking for commands ---------- */

async function remoteTick(){
  if (remoteBusy || !remoteEnabled()) return;
  remoteBusy = true;
  try {
    const b = getBathroom();
    const url = new URL(b.endpoint);
    const status = getRemoteStatus();
    const params = { action: "board", key: b.key, after: remoteAfter ?? 0, ack: remoteAck };
    if (status !== remoteLastStatus || Date.now() - remoteLastStatusSent > 30000) params.status = status;
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) return;
    if (params.status) { remoteLastStatus = status; remoteLastStatusSent = Date.now(); }

    // Share the bathroom data from the same request, so the board doesn't need a second one
    bathroomServerLast = data.last || {};
    bathroomConn = { state: "ok", checkedAt: Date.now() };
    renderBathroomBox();

    if (remoteAfter === null) {
      // First check after the board opens: skip anything sent before it was open
      remoteAfter = data.seq || 0;
      remoteAck = remoteAfter;
      return;
    }
    const fresh = (data.cmds || []).filter(c => c.s > remoteAfter).sort((a, b) => a.s - b.s);
    // Ages are measured on Google's clock, so a computer with the wrong time still works
    const serverNow = Number(data.serverNow) || Date.now();
    fresh.forEach(c => {
      remoteAfter = Math.max(remoteAfter, c.s);
      if (serverNow - c.t < REMOTE_MAX_AGE_MS) runRemoteCommand(c);
    });
    if (fresh.length) {
      remoteAck = remoteAfter;
      setTimeout(remoteTick, 300); // report back to the phone right away
    }
  } catch (err) {
    console.warn("Phone remote check failed:", err);
  } finally {
    remoteBusy = false;
  }
}

function scheduleRemote(){
  clearTimeout(remoteTimer);
  const wait = getSchoolDayWindow() ? REMOTE_FAST_MS : REMOTE_SLOW_MS;
  remoteTimer = setTimeout(async () => {
    if (!document.hidden) await remoteTick();
    scheduleRemote();
  }, wait);
}

/* ---------- settings ---------- */

function syncBoardRemoteSettingsUI(){
  const prefs = getPreferences();
  togglePhoneControl.checked = prefs.phoneControl !== false;
  if (document.activeElement !== inputWhosHereUrl) inputWhosHereUrl.value = prefs.whosHereUrl || "";
}

function setupBoardRemote(){
  togglePhoneControl.addEventListener("change", () => {
    state.preferences = { ...getPreferences(), phoneControl: togglePhoneControl.checked };
    saveState();
    remoteAfter = null; // re-sync when turned back on
  });
  inputWhosHereUrl.addEventListener("change", () => {
    state.preferences = { ...getPreferences(), whosHereUrl: inputWhosHereUrl.value.trim() };
    saveState();
  });
  document.getElementById("remoteViewerClose").addEventListener("click", closeRemoteViewer);
  document.getElementById("remoteViewerNewTab").addEventListener("click", () => {
    const url = remoteViewerFrame.dataset.url;
    if (url) openNewTab(url);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !remoteViewer.classList.contains("hidden")) closeRemoteViewer();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) remoteTick(); });

  syncBoardRemoteSettingsUI();
  remoteTick();
  scheduleRemote();
}

setupBoardRemote();
