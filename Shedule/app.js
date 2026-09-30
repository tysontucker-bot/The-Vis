/* Classroom Visual Schedule - static app (GitHub Pages friendly)
   - Central Time clock (America/Chicago)
   - Split schedule rows (top 8, bottom remainder)
   - Active/upcoming/completed states
   - Current activity box with time remaining + circular countdown fill
   - Edit mode: reorder drag/drop, edit time, delete, rename, change symbol via search
   - localStorage persistence + reset
   - Videos: modal + draggable floating YouTube frames
   - Meetings: modal with weekday logic
*/

const STORAGE_KEY = "sched:v1";
const MIGRATION_KEY = "sched:migratedTo24h:v1";
const MIGRATION_KEY_2 = "sched:migratedEnglishUrl:v1";
const MIGRATION_KEY_3 = "sched:migratedEnglishUnique:v1";
const MIGRATION_KEY_4 = "sched:migratedEnglishUniqueScreenshots:v1";
const MIGRATION_KEY_5 = "sched:migratedMorningAfternoonSchedule:v1";
const POS_KEY = "sched:currentBoxPos:v1";
const SIZE_KEY = "sched:currentBoxSize:v1";
const TIMER_COLOR = "#e53935";
const DEFAULT_PREFERENCES = {
  showFullSchedule: true,
  showNowNext: true,
  substituteMode: false,
  dayEnd: "14:20",        // when the last activity (Bus) ends
  runOnWeekends: false,   // keep the board quiet on Saturday/Sunday
};

const SUBSTITUTE_GUIDE = {
  title: "SUBSTITUTE TEACHER DIRECTIONS",
  subtitle: "Mr. Tucker’s Life Skills Classroom",
  important: "Keep the students safe, supervised, and engaged. Follow the visual schedule throughout the day. The exact academic expectations are less important than maintaining a calm, predictable routine.",
  sections: [
    {
      title: "Morning",
      entries: [
        {
          title: "Breakfast",
          scheduleNames: ["Breakfast"],
          bullets: [
            "Students eat breakfast in the classroom.",
            "Help students as needed with opening containers, eating, and cleaning up.",
            "Students should remain seated unless they need assistance.",
            "Begin transitioning students when breakfast is finished.",
          ],
        },
        {
          title: "Writing",
          scheduleNames: ["Writing"],
          bullets: [
            "Complete the name writing activity at each student's desk.",
            "Keep this activity short and highly supported.",
            "Some students may need hand-over-hand or visual prompting depending on their individual needs.",
          ],
        },
        {
          title: "Morning Meeting",
          scheduleNames: ["Morning Meeting"],
          bullets: [
            "Follow the morning meeting materials provided (go to meetings, then morning meeting on the visual schedule).",
            "Follow prompts and play videos.",
          ],
        },
        {
          title: "Gross Motor",
          scheduleNames: ["Swing"],
          occurrence: 1, // first Swing of the day
          bullets: [
            "Take students to the gross motor area.",
            "Allow students to participate in the activities available in the room.",
            "Closely supervise students while using equipment.",
          ],
        },
        {
          title: "Group Tables",
          scheduleNames: ["English"],
          bullets: [
            "Table 1 — Ayden, Jaxon, Juan, Emmi: Alphabet match flashcards.",
            "Table 2 — Jacob, Zane: Zane works on picture match. Jacob works on sitting, and every minute he sits he gets a skittle.",
            "Table 3 — Mason, Jesse: Unique Learning on the iPads at the back of the room by the window. Scan the QR code provided for each and do English. Give Jesse a whiteboard with marker and redirect him to that if he tries to mark up the assignment in Unique.",
          ],
        },
        {
          title: "Attendance",
          scheduleNames: ["Attendance"],
          bullets: [
            "Complete attendance.",
            "Make sure all students are accounted for before transitioning.",
          ],
        },
        {
          title: "Recess",
          scheduleNames: ["Recess"],
          bullets: [
            "Take students to recess.",
            "Maintain close supervision.",
            "Watch closely for eloping and mouthing of woodchips.",
          ],
        },
      ],
    },
    {
      title: "Late Morning",
      entries: [
        {
          title: "Water Break",
          scheduleNames: ["Break", "Drink Water"],
          bullets: [
            "Return to the classroom.",
            "Give students water from the locker labeled \"Water\".",
            "Depending on mood, turn on the 10 minute sensory timer.",
          ],
        },
        {
          title: "Math",
          scheduleNames: ["Math"],
          bullets: [
            "Table 1 — Ayden, Jaxon, Juan, Emmi: Alphabet match flashcards. Give reinforcement for each correct response and move tokens after each round.",
            "Table 2 — Jacob, Zane: Zane works on number flashcards. Jacob works on sitting, and every minute he sits he gets a skittle.",
            "Table 3 — Mason, Jesse: Unique Learning on the iPads at the back of the room by the window. Scan the QR code provided for each and do Math.",
          ],
        },
        {
          title: "Snack",
          scheduleNames: ["Snack"],
          bullets: [
            "Students eat snack.",
            "Assist with food and communication as needed.",
            "Clean up before transitioning.",
          ],
        },
        {
          title: "Gross Motor / PE",
          scheduleNames: ["PE"],
          bullets: [
            "Short gross-motor break.",
            "Closely supervise students using equipment.",
            "This is PE time.",
          ],
        },
      ],
    },
    {
      title: "Lunch & Afternoon",
      entries: [
        {
          title: "Lunch",
          scheduleNames: ["Lunch"],
          bullets: [
            "Take students to lunch.",
            "Assist as needed.",
            "Monitor students closely.",
          ],
        },
        {
          title: "Bathroom",
          timeLabel: "12:00–12:05",
          bullets: [
            "Follow the classroom bathroom routine.",
            "Maintain appropriate supervision and privacy.",
          ],
        },
        {
          title: "Gross Motor",
          scheduleNames: ["Swing"],
          occurrence: 2, // second Swing of the day
          bullets: [
            "Return to the gross motor room.",
            "Allow students to participate in appropriate activities.",
            "This is a good opportunity for students to move before the quieter afternoon activities.",
          ],
        },
        {
          title: "Quiet Time",
          scheduleNames: ["Rest"],
          bullets: [
            "Zane, Jacob, Juan go to sensory.",
            "If you want to try afternoon meeting with them during this time using an iPad, please do.",
            "Others return to the classroom.",
            "Lower the activity level.",
            "Students should participate in quiet activities.",
            "Use individual sensory and communication supports as needed.",
          ],
        },
        {
          title: "Afternoon Meeting",
          scheduleNames: ["Afternoon Meeting"],
          bullets: [
            "Follow the prepared meeting.",
          ],
        },
        {
          title: "Prepare to Go Home",
          scheduleNames: ["Television", "Bus"],
          bullets: [
            "Begin dismissal routines.",
            "Pack student belongings.",
            "Check communication folders and backpacks.",
            "Follow individual dismissal procedures.",
            "Shoes.",
            "Socks.",
            "Keep students supervised and in the classroom until they are dismissed.",
          ],
        },
      ],
    },
  ],
};

const SUBSTITUTE_GENERAL_ENTRY = {
  title: "General Guidance",
  bullets: [
    "Keep the students safe, supervised, and engaged.",
    "Follow the visual schedule and keep the routine calm and predictable.",
    "The exact academic expectations are less important than maintaining structure throughout the day.",
  ],
};

const ENGLISH_UNIQUE_IMAGES = [
  { src:"./table1.png", caption:"Table 1" },
  { src:"./table2.png", caption:"Table 2" },
  { src:"./table3.png", caption:"Table 3" },
  { src:"./screenshot-2026-08-12-233411.png", caption:"Screenshot 1" },
  { src:"./screenshot-2026-08-12-233416.png", caption:"Screenshot 2" },
  { src:"./screenshot-2026-08-12-233428.png", caption:"Screenshot 3" },
];

const ENGLISH_UNIQUE_IMAGE_RENAMES = new Map([
  ["./Screenshot 2026-08-12 233411.png", "./screenshot-2026-08-12-233411.png"],
  ["./Screenshot 2026-08-12 233416.png", "./screenshot-2026-08-12-233416.png"],
  ["./Screenshot 2026-08-12 233428.png", "./screenshot-2026-08-12-233428.png"],
]);

const DEFAULT_ACTIVITIES = [
  { id: uid(), name:"Breakfast", time:"7:15", icon:"https://globalsymbols.com/uploads/production/image/imagefile/6256/14_6256_4ab7e0f6-4376-4c6d-8664-55cb0d0c2c2d.svg" },
  { id: uid(), name:"Writing", time:"8:00", icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/writing.png.varianted-skin.png" },
  { id: uid(), name:"Morning Meeting", time:"8:05", icon:"https://globalsymbols.com/uploads/production/image/imagefile/21487/17_21488_2252fa6e-4757-45be-b905-4760804fa3d5.png", steps:[
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/3120/13_3120_590a8d73-a9f5-49f6-9f26-9e1befbb2898.svg", label:"Take attendance", completed:false },
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/21487/17_21488_2252fa6e-4757-45be-b905-4760804fa3d5.png", label:"Morning greeting", completed:false },
    { icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/english.svg", label:"Review the schedule", completed:false },
  ] },
  { id: uid(), name:"Swing", time:"8:30", icon:"https://globalsymbols.com/uploads/production/image/imagefile/46310/17_46311_4d68b6dc-e99c-462a-875f-c76297d2e2a8.png" },
  { id: uid(), name:"English", time:"8:50", icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/english.svg", steps:[
    { icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/english.svg", label:"Unique", type:"images", images:structuredClone(ENGLISH_UNIQUE_IMAGES), completed:false },
  ] },
  { id: uid(), name:"Attendance", time:"9:10", icon:"https://globalsymbols.com/uploads/production/image/imagefile/3120/13_3120_590a8d73-a9f5-49f6-9f26-9e1befbb2898.svg" },
  { id: uid(), name:"Recess", time:"9:15", icon:"https://globalsymbols.com/uploads/production/image/imagefile/15894/17_15895_8fbcb320-e261-4ebc-8834-8aeb58e5b03c.png" },
  { id: uid(), name:"Break", time:"9:30", icon:"https://globalsymbols.com/uploads/production/image/imagefile/3260/13_3260_8cd0ea5c-3d75-49bd-836a-526966edf6e6.svg" },
  { id: uid(), name:"Snack", time:"9:50", icon:"https://globalsymbols.com/uploads/production/image/imagefile/21820/17_21821_f58239d7-c408-4494-b7e7-d2808ddf08fa.png" },
  { id: uid(), name:"Math", time:"10:05", icon:"https://globalsymbols.com/uploads/production/image/imagefile/55337/120_55338_d6018f6e-ea20-43e6-9f4b-68e33fc67fc9.png", steps:[
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/55337/120_55338_d6018f6e-ea20-43e6-9f4b-68e33fc67fc9.png", label:"Vocabulary", url:"./Extension%20PowerPoint.pptx.mp4", completed:false },
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/15657/17_15658_197b592f-bf8e-4879-b9b4-960bdaa27018.png", label:"Worksheet", completed:false },
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/3260/13_3260_8cd0ea5c-3d75-49bd-836a-526966edf6e6.svg", label:"Folder", completed:false },
  ] },
  { id: uid(), name:"PE", time:"10:40", icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/PE.svg.varianted-skin.svg" },
  { id: uid(), name:"Music", time:"11:00", icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/noun-project/Music-24b69f41d0.svg" },
  { id: uid(), name:"Lunch", time:"11:30", icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/lunch 2.svg", steps:[
    { icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/lunch 2.svg", label:"Get lunch tray", completed:false },
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/3260/13_3260_8cd0ea5c-3d75-49bd-836a-526966edf6e6.svg", label:"Find a seat", completed:false },
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/21820/17_21821_f58239d7-c408-4494-b7e7-d2808ddf08fa.png", label:"Eat and enjoy", completed:false },
    { icon:"https://globalsymbols.com/uploads/production/image/imagefile/3426/13_3426_bf2a3b9e-4973-466b-9c31-46e35e0b1d17.svg", label:"Clean up tray", completed:false },
  ] },
  { id: uid(), name:"Swing", time:"12:00", icon:"https://globalsymbols.com/uploads/production/image/imagefile/46310/17_46311_4d68b6dc-e99c-462a-875f-c76297d2e2a8.png" },
  { id: uid(), name:"Drink Water", time:"12:30", icon:"./DrinkWater.png" },
  { id: uid(), name:"Rest", time:"12:35", icon:"https://globalsymbols.com/uploads/production/image/imagefile/3260/13_3260_8cd0ea5c-3d75-49bd-836a-526966edf6e6.svg" },
  { id: uid(), name:"Desk Work", time:"13:10", icon:"https://globalsymbols.com/uploads/production/image/imagefile/15657/17_15658_197b592f-bf8e-4879-b9b4-960bdaa27018.png" },
  { id: uid(), name:"Afternoon Meeting", time:"13:15", icon:"https://globalsymbols.com/uploads/production/image/imagefile/21487/17_21488_2252fa6e-4757-45be-b905-4760804fa3d5.png" },
  { id: uid(), name:"Television", time:"13:45", icon:"https://globalsymbols.com/uploads/production/image/imagefile/6268/14_6268_8b0276ac-2f63-4972-81bc-601383681b04.svg" },
  { id: uid(), name:"Bus", time:"14:10", icon:"https://globalsymbols.com/uploads/production/image/imagefile/3426/13_3426_bf2a3b9e-4973-466b-9c31-46e35e0b1d17.svg" },
];

const VIDEOS = [
  { title:"Morning",       id:"KuMdgPu4HEI",  img:"https://img.youtube.com/vi/KuMdgPu4HEI/mqdefault.jpg" },
  { title:"Roller Coaster",id:"-5ajUAyLUOg",  img:"https://img.youtube.com/vi/-5ajUAyLUOg/mqdefault.jpg" },
  { title:"Snack",         id:"i_JQwhPKzdI",  img:"https://img.youtube.com/vi/i_JQwhPKzdI/mqdefault.jpg" },
  { title:"Lunch",         id:"JegZYWlaq8w",  img:"https://img.youtube.com/vi/JegZYWlaq8w/mqdefault.jpg" },
  { title:"Afternoon",     id:"eji41cH7R54",  img:"https://img.youtube.com/vi/eji41cH7R54/mqdefault.jpg" },
  { title:"Animals",       id:"ecVQvgnKDug",  img:"https://img.youtube.com/vi/ecVQvgnKDug/mqdefault.jpg" },
  { title:"Numberblocks",  id:"GnVLJowv6eU",  img:"https://img.youtube.com/vi/GnVLJowv6eU/mqdefault.jpg" },
];
const SENSORY_PLAYLIST_ID = "PLNT83Pmw8EuLtQwswYKpNIaaSagVLFhm-";
const HOLIDAY_VIDEO_RULES = [
  // Month-based guardrails are intentionally simple: allow only during the listed month(s).
  { months: [1], keywords: ["new year", "new years"] },
  { months: [2], keywords: ["valentine", "valentines"] },
  { months: [3], keywords: ["st patrick", "saint patrick", "st. patrick"] },
  { months: [3, 4], keywords: ["easter"] },
  { months: [7], keywords: ["fourth of july", "4th of july"] },
  { months: [10], keywords: ["halloween", "spooky"] },
  { months: [11], keywords: ["thanksgiving", "turkey day"] },
  { months: [12], keywords: ["christmas", "xmas", "santa", "reindeer", "hanukkah", "kwanzaa", "holiday"] },
];
let ytIframeApiPromise = null;

const MEETING_URLS = {
  morning: "https://tysontucker-bot.github.io/morning-meeting/MorningMeeting/morning-meeting.html",
  afternoonMW: "https://docs.google.com/presentation/d/1Ky8pVzQlebqWIBbcfNAMni8VbtqwMehrAO5tnsCzsis/edit?slide=id.p1#slide=id.p1",
  afternoonTTh: "https://docs.google.com/presentation/d/1lpEoEn4zEsGPOeRcUa9bM8ZMIf38VMEwt0lImswLBSA/edit?slide=id.p1#slide=id.p1",
  powerschool: "https://saisd.powerschool.com/teachers/home.html",
};

const TIMER_OPTIONS = [
  { title: "Kitty Race",     url: "https://www.online-stopwatch.com/kitty-race-timer/full-screen/?countdown=00:10:00",  img: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f431.svg" },
  { title: "Puppy Dog Race", url: "https://www.online-stopwatch.com/puppy-dog-race/full-screen/?countdown=00:10:00",    img: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f436.svg" },
  { title: "Princess Race",  url: "https://www.online-stopwatch.com/princess-race/full-screen/?countdown=00:10:00",     img: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f478.svg" },
  { title: "Go-Kart Race",   url: "https://www.online-stopwatch.com/go-kart-race/full-screen/?countdown=00:10:00",      img: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3ce.svg" },
  { title: "Lorry Race",     url: "https://www.online-stopwatch.com/lorry-race/full-screen/?countdown=00:10:00",        img: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f69a.svg" },
  { title: "Motorbike Race", url: "https://www.online-stopwatch.com/motorbike-race/?countdown=00:10:00",                img: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3cd.svg" },
];

// DOM
const scheduleGrid = document.getElementById("scheduleGrid");
const currentTimeEl = document.getElementById("currentTime");

const currentBox = document.getElementById("currentBox");
const timerDisk = document.getElementById("timerDisk");
const timerCenterReadout = document.getElementById("timerCenterReadout");
const timerResize = document.getElementById("timerResize");
const currentIcon = document.getElementById("currentIcon");
const currentName = document.getElementById("currentName");
const currentRemaining = document.getElementById("currentRemaining");
const nextIcon = document.getElementById("nextIcon");
const nextName = document.getElementById("nextName");

const btnTools = document.getElementById("btnTools");
const toolsDropdown = document.getElementById("toolsDropdown");
const toolsCoreBoard = document.getElementById("toolsCoreBoard");
const toolsWhosHere = document.getElementById("toolsWhosHere");
const btnVideos = document.getElementById("btnVideos");
const btnMeetings = document.getElementById("btnMeetings");
const btnWebsites = document.getElementById("btnWebsites");
const settingsMenu = document.getElementById("settingsMenu");
const btnSettings = document.getElementById("btnSettings");
const settingsPanel = document.getElementById("settingsPanel");
const toggleEditMode = document.getElementById("toggleEditMode");
const toggleShowFullSchedule = document.getElementById("toggleShowFullSchedule");
const toggleShowNowNext = document.getElementById("toggleShowNowNext");
const toggleSubstitute = document.getElementById("toggleSubstitute");
const btnReset = document.getElementById("btnReset");
const inputDayEnd = document.getElementById("inputDayEnd");
const toggleRunOnWeekends = document.getElementById("toggleRunOnWeekends");
const btnExport = document.getElementById("btnExport");
const btnImport = document.getElementById("btnImport");
const importFile = document.getElementById("importFile");
const subsLauncher = document.getElementById("subsLauncher");

const videosOverlay = document.getElementById("videosOverlay");
const closeVideos = document.getElementById("closeVideos");
const videoButtons = document.getElementById("videoButtons");

// NEW: resizable Videos modal hookup
const videosResize = document.getElementById("videosResize");
const videosModal = videosOverlay.querySelector(".modal");
setupModalResize(videosModal, videosResize);

const meetingsOverlay = document.getElementById("meetingsOverlay");
const closeMeetings = document.getElementById("closeMeetings");
const openMorningSlides = document.getElementById("openMorningSlides");
const openAfternoonSlides = document.getElementById("openAfternoonSlides");
const openPowerSchool = document.getElementById("openPowerSchool");
const afternoonHint = document.getElementById("afternoonHint");

const websitesOverlay = document.getElementById("websitesOverlay");
const closeWebsites = document.getElementById("closeWebsites");
const openWebPowerSchool = document.getElementById("openWebPowerSchool");
const openClassroomTimer = document.getElementById("openClassroomTimer");

const timerPickerOverlay = document.getElementById("timerPickerOverlay");
const closeTimerPicker = document.getElementById("closeTimerPicker");
const timerButtons = document.getElementById("timerButtons");
const timerPickerResize = document.getElementById("timerPickerResize");
const timerPickerModal = timerPickerOverlay.querySelector(".modal");
setupModalResize(timerPickerModal, timerPickerResize);

const editOverlay = document.getElementById("editOverlay");
const closeEdit = document.getElementById("closeEdit");
const editTitle = document.getElementById("editTitle");
const symbolQuery = document.getElementById("symbolQuery");
const btnSearchCurrent = document.getElementById("btnSearchCurrent");
const btnChangeName = document.getElementById("btnChangeName");
const btnSearchSymbols = document.getElementById("btnSearchSymbols");
const symbolSpinner = document.getElementById("symbolSpinner");
const symbolError = document.getElementById("symbolError");
const symbolResults = document.getElementById("symbolResults");
const stepsEditor = document.getElementById("stepsEditor");
const btnAddStep = document.getElementById("btnAddStep");

const floatLayer = document.getElementById("floatLayer");
const btnDetails = document.getElementById("btnDetails");

// State
let state = loadState();
let editMode = false;
let editingId = null;
let editingStepIndex = null;
let lastActiveId = null;
let currentActivity = null;
let floatZCounter = 900;
const SUBSTITUTE_ENTRIES = SUBSTITUTE_GUIDE.sections.flatMap(section =>
  section.entries.map(entry => ({ ...entry, sectionTitle: section.title }))
);

// Timer animation state
let hasTicked = false;
let timerState = null; // { activeStartSec, nextStartSec } or null
let timerAnimFrameId = null;

function setTimerState(activeStartSec, nextStartSec) {
  timerState = { activeStartSec, nextStartSec };
}

function clearTimerState() {
  timerState = null;
  timerDisk.style.background = "transparent";
  timerCenterReadout.textContent = "--:--";
}

function updateTimerDiskFrame() {
  if (!timerState) return;
  const now = new Date();
  const nowCT = getCentralParts(now);
  // getSeconds() returns the same 0-59 value in any timezone (offsets are whole minutes)
  const nowTotalSec = nowCT.hour * 3600 + nowCT.minute * 60 + now.getSeconds();
  const { activeStartSec, nextStartSec } = timerState;
  const total = Math.max(1, nextStartSec - activeStartSec);
  const elapsed = Math.min(total, Math.max(0, nowTotalSec - activeStartSec));
  const remaining = Math.max(0, 1 - elapsed / total);
  const remainingSec = Math.max(0, nextStartSec - nowTotalSec);
  const fillPercent = remaining * 100;
  const fillStartPercent = 100 - fillPercent;
  timerDisk.style.background =
    `linear-gradient(to bottom, transparent 0% ${fillStartPercent}%, ${TIMER_COLOR} ${fillStartPercent}% 100%)`;
  timerCenterReadout.textContent = formatCountdownClock(remainingSec);
}

function startTimerRAF() {
  if (timerAnimFrameId) cancelAnimationFrame(timerAnimFrameId);
  function frame() {
    updateTimerDiskFrame();
    timerAnimFrameId = requestAnimationFrame(frame);
  }
  timerAnimFrameId = requestAnimationFrame(frame);
}

const transitionSound = new Audio("./transition-chime.mp3");
const btnSound = document.getElementById("btnSound");

function playTransitionSound(){
  transitionSound.currentTime = 0;
  transitionSound.play().catch(() => {
    // Browser blocked audio because nobody has tapped the page yet
    btnSound.classList.remove("hidden");
  });
}

function setupSoundUnlock(){
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    btnSound.classList.remove("hidden");
  }
  const unlock = () => {
    btnSound.classList.add("hidden");
    transitionSound.muted = true;
    transitionSound.play().then(() => {
      transitionSound.pause();
      transitionSound.currentTime = 0;
      transitionSound.muted = false;
    }).catch(() => { transitionSound.muted = false; });
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  btnSound.addEventListener("click", unlock);
}

// Init
render();
setupClock();
startTimerRAF();
setupCurrentBoxDrag();
setupTimerResize();
setupVideos();
setupMeetings();
setupWebsites();
setupEditModal();
setupSoundUnlock();

// Details button: prevent drag start, open popup on click
btnDetails.addEventListener("pointerdown", (e) => e.stopPropagation());
currentIcon.addEventListener("pointerdown", (e) => {
  if (isSubstituteModeEnabled()) e.stopPropagation();
});
btnDetails.addEventListener("click", () => {
  if (currentActivity && Array.isArray(currentActivity.steps) && currentActivity.steps.length) {
    renderDetailsWindow(currentActivity);
  }
});

btnSettings.addEventListener("click", () => {
  setSettingsPanelOpen(settingsPanel.classList.contains("hidden"));
  toolsDropdown.classList.add("hidden");
  syncSettingsUI();
});

btnSettings.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" && settingsPanel.classList.contains("hidden")) {
    e.preventDefault();
    setSettingsPanelOpen(true);
    toggleEditMode.focus();
  } else if (e.key === "Escape" && !settingsPanel.classList.contains("hidden")) {
    e.preventDefault();
    setSettingsPanelOpen(false, true);
  }
});

settingsPanel.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    setSettingsPanelOpen(false, true);
  }
});

toggleEditMode.addEventListener("change", () => {
  editMode = toggleEditMode.checked;
  render();
});

toggleShowFullSchedule.addEventListener("change", () => {
  state.preferences = {
    ...getPreferences(),
    showFullSchedule: toggleShowFullSchedule.checked,
  };
  saveState();
  applyDisplayPreferences();
  syncSettingsUI();
});

toggleShowNowNext.addEventListener("change", () => {
  state.preferences = {
    ...getPreferences(),
    showNowNext: toggleShowNowNext.checked,
  };
  saveState();
  applyDisplayPreferences();
  syncSettingsUI();
});

toggleSubstitute.addEventListener("change", () => {
  state.preferences = {
    ...getPreferences(),
    substituteMode: toggleSubstitute.checked,
  };
  saveState();
  if (!toggleSubstitute.checked) closeSubstituteWindows();
  render();
});

inputDayEnd.addEventListener("change", () => {
  if (!inputDayEnd.value) return;
  state.preferences = { ...getPreferences(), dayEnd: normalizeTime(inputDayEnd.value) };
  saveState();
  render();
});

toggleRunOnWeekends.addEventListener("change", () => {
  state.preferences = { ...getPreferences(), runOnWeekends: toggleRunOnWeekends.checked };
  saveState();
  render();
});

btnExport.addEventListener("click", () => {
  const today = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `sched-backup-${today}.json`;
  link.click(); // not attached to the page, so it won't close the Settings panel
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

btnImport.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  if (!file) return;
  const data = safeParse(await file.text());
  const valid = Array.isArray(data?.activities) && data.activities.length > 0 &&
    data.activities.every(a => a && typeof a.name === "string" && typeof a.time === "string");
  if (!valid) {
    alert("That file isn't a Sched backup. Choose a file saved with Export Schedule.");
    return;
  }
  if (!confirm(`Replace the current schedule with the ${data.activities.length} activities in "${file.name}"?`)) return;
  state = {
    activities: data.activities,
    preferences: { ...DEFAULT_PREFERENCES, ...(data.preferences || {}) },
    bathroom: data.bathroom || state.bathroom,
  };
  state.activities.forEach(a => { if (!a.id) a.id = uid(); });
  saveState();
  render();
});

btnReset.addEventListener("click", () => {
  if (!editMode) return;
  if (!confirm("Reset schedule to defaults?")) return;
  state = {
    activities: structuredClone(DEFAULT_ACTIVITIES),
    preferences: { ...getPreferences() },
    bathroom: state.bathroom, // resetting the schedule keeps bathroom timer setup
  };
  saveState();
  render();
});

btnTools.addEventListener("click", (e) => {
  e.stopPropagation();
  toolsDropdown.classList.toggle("hidden");
});
toolsCoreBoard.addEventListener("click", () => {
  toolsDropdown.classList.add("hidden");
  openCoreBoardFloat();
});
toolsWhosHere.addEventListener("click", () => {
  toolsDropdown.classList.add("hidden");
  window.open("https://canva.link/who-is-here", "_blank");
});
document.addEventListener("click", (e) => {
  if (!document.getElementById("toolsMenu").contains(e.target)) {
    toolsDropdown.classList.add("hidden");
  }
  if (!settingsMenu.contains(e.target)) {
    setSettingsPanelOpen(false);
  }
});

btnVideos.addEventListener("click", () => openOverlay(videosOverlay));
closeVideos.addEventListener("click", () => closeOverlay(videosOverlay));
videosOverlay.addEventListener("click", (e) => { if (e.target === videosOverlay) closeOverlay(videosOverlay); });

btnMeetings.addEventListener("click", () => {
  updateAfternoonMeetingButton();
  openOverlay(meetingsOverlay);
});
closeMeetings.addEventListener("click", () => closeOverlay(meetingsOverlay));
meetingsOverlay.addEventListener("click", (e) => { if (e.target === meetingsOverlay) closeOverlay(meetingsOverlay); });

btnWebsites.addEventListener("click", () => openOverlay(websitesOverlay));
closeWebsites.addEventListener("click", () => closeOverlay(websitesOverlay));
websitesOverlay.addEventListener("click", (e) => { if (e.target === websitesOverlay) closeOverlay(websitesOverlay); });

subsLauncher.addEventListener("click", () => {
  if (!isSubstituteModeEnabled()) return;
  openSubstituteDocumentWindow();
});

currentIcon.addEventListener("click", () => {
  if (!isSubstituteModeEnabled() || !currentActivity) return;
  openSubstituteDirectionsWindow(currentActivity);
});
currentIcon.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  if (!isSubstituteModeEnabled() || !currentActivity) return;
  e.preventDefault();
  openSubstituteDirectionsWindow(currentActivity);
});

/* ------------------ Rendering ------------------ */

function render(){
  scheduleGrid.innerHTML = "";

  state.activities.forEach(a => scheduleGrid.appendChild(renderCard(a)));

  tickSchedule();
  applyDisplayPreferences();
  syncSettingsUI();
}

function renderCard(a){
  const hasSteps = Array.isArray(a.steps) && a.steps.length > 0;
  const substituteEnabled = isSubstituteModeEnabled() && !editMode;

  const card = document.createElement("div");
  card.className = "card" + (editMode ? " editable edit-mode" : "") + (hasSteps ? " has-steps" : "");
  card.dataset.id = a.id;
  card.draggable = !!editMode;
  if (hasSteps && !editMode) {
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${a.name} — tap to view steps`);
    card.setAttribute("tabindex", "0");
  }

  const img = document.createElement("img");
  img.className = "card-icon" + (substituteEnabled ? " substitute-hotspot" : "");
  img.src = a.icon;
  img.alt = "";
  if (substituteEnabled) {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", `Open substitute directions for ${a.name}`);
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      openSubstituteDirectionsWindow(a);
    });
    img.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      openSubstituteDirectionsWindow(a);
    });
  }

  const meta = document.createElement("div");
  meta.className = "card-meta";

  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = a.name;

  const timeWrap = document.createElement("div");
  timeWrap.className = "card-time";

  if (editMode){
    const input = document.createElement("input");
    input.className = "time-input";
    input.value = a.time;
    input.inputMode = "numeric";
    input.addEventListener("change", () => {
      a.time = normalizeTime(input.value);
      input.value = a.time;
      saveState();
      tickSchedule();
    });
    timeWrap.appendChild(input);
  } else {
    timeWrap.textContent = timeToAmPmLabel(a.time);
  }

  meta.appendChild(name);
  meta.appendChild(timeWrap);

  const del = document.createElement("button");
  del.className = "delbtn";
  del.textContent = "✕";
  del.title = "Delete";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    state.activities = state.activities.filter(x => x.id !== a.id);
    saveState();
    render();
  });

  card.appendChild(img);
  card.appendChild(meta);
  card.appendChild(del);

  card.addEventListener("click", () => {
    if (editMode) {
      openEditFor(a.id);
    } else if (hasSteps) {
      renderDetailsWindow(a);
    }
  });

  if (hasSteps && !editMode) {
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        renderDetailsWindow(a);
      }
    });
  }

  // Drag reorder
  if (editMode){
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", a.id);
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  }

  // Allow drops into the schedule grid
  scheduleGrid.ondragover = (e) => { if (editMode) e.preventDefault(); };
  scheduleGrid.ondrop = (e) => {
    if (!editMode) return;
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    reorderByDrop(id, e.clientX, e.clientY);
  };

  return card;
}

function reorderByDrop(id, clientX, clientY){
  const all = [...state.activities];
  const dragged = all.find(a => a.id === id);
  if (!dragged) return;

  const without = all.filter(a => a.id !== id);
  const cards = [...scheduleGrid.querySelectorAll(".card")].filter(c => c.dataset.id !== id);

  let insertBeforeId = null;
  for (const c of cards){
    const r = c.getBoundingClientRect();
    const midX = r.left + r.width/2;
    const midY = r.top + r.height/2;
    if (clientY < midY || (Math.abs(clientY-midY) < r.height/2 && clientX < midX)){
      insertBeforeId = c.dataset.id;
      break;
    }
  }

  const ids = without.map(x => x.id);
  let insertIdx = ids.length;
  if (insertBeforeId){
    const idx = ids.indexOf(insertBeforeId);
    if (idx >= 0) insertIdx = idx;
  }
  ids.splice(insertIdx, 0, id);

  const dict = new Map(all.map(x => [x.id, x]));
  state.activities = ids.map(xid => dict.get(xid)).filter(Boolean);
  saveState();
  render();
}

/* ------------------ Time + schedule logic (Central Time) ------------------ */

function setupClock(){
  setInterval(() => {
    const now = new Date();
    currentTimeEl.textContent = formatCentralTime(now, true);
    tickSchedule();
  }, 1000);
}

function tickSchedule(){
  const now = new Date();
  const nowCT = getCentralParts(now);

  const ordered = [...state.activities].slice().sort((a,b)=> timeToMinutes(a.time) - timeToMinutes(b.time));
  if (!ordered.length){
    setCurrentDisplay(null, null);
    setNextDisplay(null);
    lastActiveId = null;
    markCards({ activeId:null, completedBeforeMin: -1, ordered });
    return;
  }
  const startMin = timeToMinutes(ordered[0]?.time ?? "7:15");
  const endMin = getDayEndMin(ordered);
  const isFirstTick = !hasTicked;
  hasTicked = true;

  // Weekends: keep the board quiet (no chime, no auto-opening steps)
  if (!getPreferences().runOnWeekends && (nowCT.weekday === 0 || nowCT.weekday === 6)){
    setCurrentDisplay(null, null);
    setNextDisplay(null);
    currentName.textContent = "No school today";
    lastActiveId = null;
    markCards({ activeId:null, completedBeforeMin: -1, ordered });
    return;
  }

  const nowMin = nowCT.hour*60 + nowCT.minute;
  const nowTotalSec = nowMin * 60 + now.getSeconds();

  // Before start: show time until first activity
  if (nowMin < startMin){
    const next = ordered[0] ?? null;
    const minsUntil = Math.max(0, startMin - nowMin);

    if (next){
      // show the next activity's icon + name
      setCurrentDisplay(next, null);
      setNextDisplay(ordered[1] ?? null);

      // show countdown text
      currentRemaining.textContent =
        `Starts in ${formatRemaining(minsUntil).replace(" remaining","")}`;
      timerDisk.style.background =
        `linear-gradient(to bottom, ${TIMER_COLOR} 0% 100%)`;
      timerCenterReadout.textContent = formatCountdownClock(Math.max(0, startMin * 60 - nowTotalSec));

      // Before schedule start, keep the disk fully filled and show a numeric countdown.
      clearTimerState();
    } else {
      setCurrentDisplay(null, null);
      setNextDisplay(null);
    }

    lastActiveId = null;
    markCards({ activeId:null, completedBeforeMin: -1, ordered });
    return;
  }

  // After last
  if (nowMin >= endMin){
    setCurrentDisplay(null, null);
    setNextDisplay(null);
    currentName.textContent = "All done";
    lastActiveId = null;
    markCards({ activeId:null, completedBeforeMin: endMin, ordered });
    return;
  }

  // Find active: last activity whose start <= now < nextStart
  let active = null;
  let activeIndex = -1;
  let nextStartMin = endMin;

  for (let i=0;i<ordered.length;i++){
    const a = ordered[i];
    const aMin = timeToMinutes(a.time);
    const bMin = timeToMinutes(ordered[i+1]?.time ?? minutesToTime(endMin));
    if (nowMin >= aMin && nowMin < bMin){
      active = a;
      activeIndex = i;
      nextStartMin = bMin;
      break;
    }
  }

  if (!active){
    setCurrentDisplay(null, null);
    setNextDisplay(null);
    lastActiveId = null;
    markCards({ activeId:null, completedBeforeMin: -1, ordered });
    return;
  }

  const activeStart = timeToMinutes(active.time);
  const remaining = Math.max(0, nextStartMin - nowMin);
  const total = Math.max(1, nextStartMin - activeStart);
  const elapsed = Math.min(total, nowMin - activeStart);
  const progress = elapsed / total; // 0..1

  if (active.id !== lastActiveId) {
    lastActiveId = active.id;
    // Chime only on a real transition, not when the page is first opened mid-activity
    if (!isFirstTick) playTransitionSound();
    if (Array.isArray(active.steps) && active.steps.length) {
      renderDetailsWindow(active);
    }
  }

  setCurrentDisplay(active, remaining);
  setNextDisplay(ordered[activeIndex + 1] ?? null);
  // Update timer state for smooth RAF animation
  setTimerState(activeStart * 60, nextStartMin * 60);

  markCards({ activeId: active.id, completedBeforeMin: activeStart, ordered });
}

function markCards({ activeId, completedBeforeMin, ordered }){
  const completedIds = new Set(
    ordered.filter(a => timeToMinutes(a.time) < completedBeforeMin).map(a => a.id)
  );

  document.querySelectorAll(".card").forEach(card => {
    const id = card.dataset.id;
    card.classList.toggle("active", id === activeId);
    card.classList.toggle("completed", completedIds.has(id));
  });
}

function setCurrentDisplay(activity, remainingMinutes){
  if (!activity){
    currentActivity = null;
    currentIcon.src = "";
    currentIcon.alt = "";
    currentIcon.style.visibility = "hidden";
    currentName.textContent = "-";
    currentRemaining.textContent = "-";
    timerCenterReadout.textContent = "--:--";
    clearTimerState();
    btnDetails.classList.add("hidden");
    currentBox.classList.remove("has-steps");
    syncCurrentIconSubstituteState();
    return;
  }
  currentActivity = activity;
  currentIcon.style.visibility = "visible";
  currentIcon.src = activity.icon;
  currentIcon.alt = "";
  currentName.textContent = activity.name;
  currentRemaining.textContent = formatRemaining(remainingMinutes);

  const hasSteps = Array.isArray(activity.steps) && activity.steps.length > 0;
  btnDetails.classList.toggle("hidden", !hasSteps);
  currentBox.classList.toggle("has-steps", hasSteps);
  syncCurrentIconSubstituteState();
}

function setNextDisplay(activity){
  if (!activity){
    nextIcon.src = "";
    nextIcon.style.visibility = "hidden";
    nextName.textContent = "-";
    return;
  }
  nextIcon.style.visibility = "visible";
  nextIcon.src = activity.icon;
  nextName.textContent = activity.name;
}

/* ------------------ Draggable current activity box ------------------ */

function setupCurrentBoxDrag(){
  // Restore pos
  const saved = safeParse(localStorage.getItem(POS_KEY));
  if (saved && typeof saved.x === "number" && typeof saved.y === "number"){
    moveWithinBoard(currentBox, saved.x, saved.y);
  }

  let dragging = false;
  let startX = 0, startY = 0;
  let boxStartLeft = 0, boxStartTop = 0;

  currentBox.addEventListener("pointerdown", (e) => {
    if (e.target === timerResize) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const r = currentBox.getBoundingClientRect();
    boxStartLeft = r.left;
    boxStartTop = r.top;
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    moveWithinBoard(currentBox, boxStartLeft + dx, boxStartTop + dy);
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    const r = currentBox.getBoundingClientRect();
    localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
}

function setupTimerResize(){
  const MIN_SIZE = 160;
  const MAX_SIZE = 600;
  const PAD = 8;

  // Restore saved size
  const savedSize = safeParse(localStorage.getItem(SIZE_KEY));
  if (typeof savedSize === "number" && savedSize >= MIN_SIZE && savedSize <= MAX_SIZE){
    currentBox.style.setProperty("--timer-size", `${savedSize}px`);
  }

  let resizing = false;
  let startX = 0, startY = 0;
  let startSize = 0;
  let startCenterX = 0, startCenterY = 0;

  timerResize.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    timerResize.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    const r = currentBox.getBoundingClientRect();
    startSize = r.width;
    startCenterX = r.left + r.width / 2;
    startCenterY = r.top + r.height / 2;
  });

  timerResize.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    // Use the larger of dx/dy so the circle grows uniformly from any direction
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const newSize = clamp(startSize + delta, MIN_SIZE, MAX_SIZE);
    currentBox.style.setProperty("--timer-size", `${newSize}px`);
    // Keep the center of the timer fixed at the position captured on pointerdown
    moveWithinBoard(currentBox, startCenterX - newSize / 2, startCenterY - newSize / 2);
  });

  timerResize.addEventListener("pointerup", (e) => {
    if (!resizing) return;
    resizing = false;
    localStorage.setItem(SIZE_KEY, JSON.stringify(currentBox.offsetWidth));
  });

  timerResize.addEventListener("pointercancel", () => { resizing = false; });
}

function moveWithinBoard(el, left, top){
  const pad = 8;
  const maxLeft = window.innerWidth - el.offsetWidth - pad;
  const maxTop = window.innerHeight - el.offsetHeight - pad;
  const clampedLeft = clamp(left, pad, maxLeft);
  const clampedTop = clamp(top, pad, maxTop);
  el.style.left = `${clampedLeft}px`;
  el.style.top = `${clampedTop}px`;
}

/* ------------------ Substitute directions ------------------ */

function isSubstituteModeEnabled(){
  return !!getPreferences().substituteMode;
}

function closeSubstituteWindows({ restoreFocus = true } = {}){
  floatLayer.querySelectorAll(".substitute-window").forEach(el => {
    if (typeof el.__closeSubstituteWindow === "function") {
      el.__closeSubstituteWindow({ restoreFocus });
    } else {
      el.remove();
    }
  });
}

function syncCurrentIconSubstituteState(){
  const enabled = isSubstituteModeEnabled() && !!currentActivity;
  currentIcon.classList.toggle("substitute-hotspot", enabled);
  if (enabled) {
    currentIcon.tabIndex = 0;
    currentIcon.setAttribute("role", "button");
    currentIcon.setAttribute("aria-label", `Open substitute directions for ${currentActivity.name}`);
  } else {
    currentIcon.removeAttribute("tabindex");
    currentIcon.removeAttribute("role");
    currentIcon.removeAttribute("aria-label");
    currentIcon.alt = "";
  }
}

function matchesSubstituteEntry(activity, entry){
  if (!activity || !entry) return false;
  const scheduleNames = Array.isArray(entry.scheduleNames) ? entry.scheduleNames : [];
  const scheduleTimes = Array.isArray(entry.scheduleTimes) ? entry.scheduleTimes : [];
  if (scheduleNames.length === 0 && scheduleTimes.length === 0) return false;
  const normalizedName = normalizeSubstituteToken(activity.name);
  const normalizedTime = normalizeTime(activity.time);
  const nameMatch = scheduleNames.length === 0 || scheduleNames.some(name => normalizeSubstituteToken(name) === normalizedName);
  const timeMatch = scheduleTimes.length === 0 || scheduleTimes.some(time => normalizeTime(time) === normalizedTime);
  if (!nameMatch || !timeMatch) return false;
  if (entry.occurrence) {
    // e.g. the 1st vs 2nd "Swing" of the day, so moving Swing's time doesn't break the match
    const sameName = getOrderedActivities().filter(a => normalizeSubstituteToken(a.name) === normalizedName);
    return sameName.indexOf(activity) + 1 === entry.occurrence;
  }
  return true;
}

function getOrderedActivities(){
  return [...state.activities].sort((a,b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

function formatClockShort(min){
  const h = Math.floor(min / 60) % 12 || 12;
  return `${h}:${String(min % 60).padStart(2, "0")}`;
}

// Build the sub-guide time ranges from the real schedule so they never drift.
function getSubstituteTimeInfo(entry){
  const ordered = getOrderedActivities();
  const dayEnd = getDayEndMin(ordered);
  const ranges = [];
  ordered.forEach((a, i) => {
    if (!matchesSubstituteEntry(a, entry)) return;
    const start = timeToMinutes(a.time);
    const end = i + 1 < ordered.length ? timeToMinutes(ordered[i + 1].time) : dayEnd;
    const last = ranges[ranges.length - 1];
    if (last && last.end === start) last.end = end; // merge back-to-back activities
    else ranges.push({ start, end });
  });
  if (ranges.length) {
    return {
      start: ranges[0].start,
      label: ranges.map(r => `${formatClockShort(r.start)}–${formatClockShort(r.end)}`).join(" and "),
    };
  }
  if (entry.timeLabel) {
    // Entries not tied to a schedule card (e.g. Bathroom) keep their written label
    const m = entry.timeLabel.match(/^(\d{1,2}):(\d{2})/);
    let start = m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : Infinity;
    if (m && parseInt(m[1], 10) < 7) start += 12 * 60;
    return { start, label: entry.timeLabel };
  }
  return { start: Infinity, label: "" };
}

function getSubstituteEntryForActivity(activity){
  if (!activity) return null;
  return SUBSTITUTE_ENTRIES.find(entry => matchesSubstituteEntry(activity, entry)) || null;
}

function createSubstituteEntryCard(entry){
  const card = document.createElement("section");
  card.className = "substitute-entry";

  const timeLabel = entry === SUBSTITUTE_GENERAL_ENTRY ? "" : getSubstituteTimeInfo(entry).label;
  if (timeLabel) {
    const time = document.createElement("div");
    time.className = "substitute-entry-time";
    time.textContent = timeLabel;
    card.appendChild(time);
  }

  const title = document.createElement("div");
  title.className = "substitute-entry-title";
  title.textContent = entry.title;
  card.appendChild(title);

  const list = document.createElement("ul");
  (entry.bullets || []).forEach(text => {
    const item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
  });
  card.appendChild(list);

  return card;
}

function createSubstituteDirectionsContent(activity){
  const entry = getSubstituteEntryForActivity(activity);
  const wrap = document.createElement("div");
  wrap.className = "substitute-doc";

  const title = document.createElement("div");
  title.className = "substitute-doc-title";
  title.textContent = activity?.name || SUBSTITUTE_GENERAL_ENTRY.title;
  wrap.appendChild(title);

  if (entry?.sectionTitle) {
    const section = document.createElement("div");
    section.className = "substitute-doc-subtitle";
    section.textContent = entry.sectionTitle;
    wrap.appendChild(section);
  }

  if (!entry) {
    const note = document.createElement("div");
    note.className = "substitute-doc-note";
    note.textContent = `No event-specific substitute note was added for this activity. Most important: ${SUBSTITUTE_GUIDE.important}`;
    wrap.appendChild(note);
  }

  wrap.appendChild(createSubstituteEntryCard(entry || SUBSTITUTE_GENERAL_ENTRY));
  return wrap;
}

function createSubstituteDocumentContent(){
  const wrap = document.createElement("div");
  wrap.className = "substitute-doc";

  const title = document.createElement("div");
  title.className = "substitute-doc-title";
  title.textContent = SUBSTITUTE_GUIDE.title;
  wrap.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "substitute-doc-subtitle";
  subtitle.textContent = SUBSTITUTE_GUIDE.subtitle;
  wrap.appendChild(subtitle);

  const note = document.createElement("div");
  note.className = "substitute-doc-note";
  note.textContent = `Most important: ${SUBSTITUTE_GUIDE.important}`;
  wrap.appendChild(note);

  SUBSTITUTE_GUIDE.sections.forEach(section => {
    const sectionEl = document.createElement("section");
    sectionEl.className = "substitute-doc-section";

    const sectionTitle = document.createElement("div");
    sectionTitle.className = "substitute-doc-section-title";
    sectionTitle.textContent = section.title;
    sectionEl.appendChild(sectionTitle);

    section.entries
      .map(entry => ({ entry, start: getSubstituteTimeInfo(entry).start }))
      .sort((a, b) => a.start - b.start)
      .forEach(({ entry }) => sectionEl.appendChild(createSubstituteEntryCard(entry)));

    wrap.appendChild(sectionEl);
  });

  return wrap;
}

function openSubstituteWindow(windowTitle, bodyContent, { width = 460, height = 360 } = {}){
  closeSubstituteWindows({ restoreFocus: false });

  const frame = document.createElement("div");
  frame.className = "float substitute-float substitute-window";
  frame.setAttribute("role", "dialog");
  frame.setAttribute("aria-modal", "false");
  frame.tabIndex = -1;
  const initialWidth = Math.min(width, window.innerWidth - 16);
  const initialHeight = Math.min(height, window.innerHeight - 16);
  frame.style.width = `${initialWidth}px`;
  frame.style.height = `${initialHeight}px`;
  frame.style.left = `${Math.max(8, (window.innerWidth - initialWidth) / 2)}px`;
  frame.style.top = `${Math.max(8, (window.innerHeight - initialHeight) / 2)}px`;
  const restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  function closeWindow({ restoreFocus = true } = {}){
    if (!frame.isConnected) return;
    frame.remove();
    if (restoreFocus && restoreTarget && restoreTarget.isConnected && typeof restoreTarget.focus === "function") {
      restoreTarget.focus();
    }
  }
  frame.__closeSubstituteWindow = closeWindow;

  const header = document.createElement("div");
  header.className = "float-header";

  const title = document.createElement("div");
  title.className = "float-title";
  title.textContent = windowTitle;
  title.id = `substituteWindowTitle-${uid()}`;
  frame.setAttribute("aria-labelledby", title.id);

  const close = document.createElement("button");
  close.className = "float-close";
  close.textContent = "✕";
  close.addEventListener("click", () => closeWindow());

  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement("div");
  body.className = "float-body";
  body.appendChild(bodyContent);

  frame.appendChild(header);
  frame.appendChild(body);

  floatLayer.appendChild(frame);
  frame.style.left = `${Math.max(8, (window.innerWidth - frame.offsetWidth) / 2)}px`;
  frame.style.top = `${Math.max(8, (window.innerHeight - frame.offsetHeight) / 2)}px`;
  frame.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeWindow();
    }
  });
  frame.focus();
}

function openSubstituteDirectionsWindow(activity){
  if (!isSubstituteModeEnabled() || !activity) return;
  openSubstituteWindow(
    `${activity.name} Directions`,
    createSubstituteDirectionsContent(activity),
    { width: 460, height: 360 }
  );
}

function openSubstituteDocumentWindow(){
  if (!isSubstituteModeEnabled()) return;
  openSubstituteWindow(
    "Substitute Directions",
    createSubstituteDocumentContent(),
    { width: 720, height: Math.min(680, window.innerHeight - 24) }
  );
}

/* ------------------ Videos ------------------ */

function setupVideos(){
  videoButtons.innerHTML = "";
  VIDEOS.forEach(v => {
    const b = createVideoButton(v.title, v.img, () => openVideoFloat(v.title, v.id));
    videoButtons.appendChild(b);
  });

  const sensoryBtn = createVideoButton(
    "Sensory",
    "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/sensory.svg",
    () => openSensoryRandomFloat()
  );
  videoButtons.appendChild(sensoryBtn);
}

function createVideoButton(title, imgUrl, onClick){
  const b = document.createElement("button");
  b.className = "btn btn-yellow video-btn";
  if (imgUrl) {
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = title;
    img.className = "video-btn-thumb";
    b.appendChild(img);
  }
  const label = document.createElement("span");
  label.textContent = title;
  b.appendChild(label);
  b.addEventListener("click", onClick);
  return b;
}

function loadYouTubeIframeApi(){
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytIframeApiPromise) return ytIframeApiPromise;

  ytIframeApiPromise = new Promise((resolve, reject) => {
    const existingReady = window.onYouTubeIframeAPIReady;
    let settled = false;
    const finishResolve = () => {
      if (settled) return;
      settled = true;
      window.onYouTubeIframeAPIReady = existingReady || null;
      resolve(window.YT);
    };
    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      window.onYouTubeIframeAPIReady = existingReady || null;
      ytIframeApiPromise = null;
      reject(error);
    };

    const readyHandler = () => {
      if (typeof existingReady === "function" && !existingReady.__schedYtReadyWrapper) {
        existingReady();
      }
      finishResolve();
    };
    readyHandler.__schedYtReadyWrapper = true;
    window.onYouTubeIframeAPIReady = readyHandler;

    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => finishReject(new Error("Failed to load YouTube Iframe API."));
      document.head.appendChild(script);
    }

    const checkInterval = window.setInterval(() => {
      if (window.YT && window.YT.Player) {
        window.clearInterval(checkInterval);
        finishResolve();
      }
    }, 100);

    window.setTimeout(() => {
      window.clearInterval(checkInterval);
      if (!(window.YT && window.YT.Player)) {
        finishReject(new Error("YouTube Iframe API timed out."));
      }
    }, 10000);
  });

  return ytIframeApiPromise;
}

function isOutOfSeasonHolidayVideo(title){
  const normalized = (title ?? "").toString().toLowerCase();
  if (!normalized) return false;

  const currentMonth = (new Date()).getMonth() + 1;
  for (const rule of HOLIDAY_VIDEO_RULES) {
    if (!rule.keywords.some(k => normalized.includes(k))) continue;
    return !rule.months.includes(currentMonth);
  }
  return false;
}

function playRandomSensoryVideo(player, excludedVideoId = null){
  const playlist = player.getPlaylist();
  if (Array.isArray(playlist) && playlist.length > 0) {
    const candidates = excludedVideoId
      ? playlist
          .map((videoId, index) => ({ videoId, index }))
          .filter(item => item.videoId !== excludedVideoId)
      : playlist.map((videoId, index) => ({ videoId, index }));
    const pool = candidates.length ? candidates : playlist.map((videoId, index) => ({ videoId, index }));
    const randomIndex = pool[Math.floor(Math.random() * pool.length)].index;
    player.playVideoAt(randomIndex);
  } else {
    player.nextVideo();
  }
}

async function openSensoryRandomFloat(){
  const frame = document.createElement("div");
  frame.className = "float";
  frame.style.left = "40px";
  frame.style.top = "120px";

  const header = document.createElement("div");
  header.className = "float-header";

  const titleEl = document.createElement("div");
  titleEl.className = "float-title";
  titleEl.textContent = "Sensory";

  const close = document.createElement("button");
  close.className = "float-close";
  close.textContent = "✕";
  close.addEventListener("click", () => frame.remove());

  header.appendChild(titleEl);
  header.appendChild(close);

  const body = document.createElement("div");
  body.className = "float-body";

  const playerHost = document.createElement("div");
  playerHost.style.width = "100%";
  playerHost.style.height = "100%";
  body.appendChild(playerHost);

  frame.appendChild(header);
  frame.appendChild(body);
  floatLayer.appendChild(frame);

  const resize = document.createElement("div");
  resize.className = "float-resize";
  frame.appendChild(resize);
  setupResizeLockedAspect(frame, resize, 16/9);
  dragWithinBoard(frame, header);

  try {
    const YT = await loadYouTubeIframeApi();
    let skipCount = 0;
    const maxSkips = 50;

    new YT.Player(playerHost, {
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        rel: 0,
        listType: "playlist",
        list: SENSORY_PLAYLIST_ID,
      },
      events: {
        onReady: (event) => {
          event.target.setShuffle(true);
          playRandomSensoryVideo(event.target);
        },
        onStateChange: (event) => {
          if (event.data !== YT.PlayerState.PLAYING) return;
          const data = event.target.getVideoData();
          if (isOutOfSeasonHolidayVideo(data?.title)) {
            skipCount += 1;
            if (skipCount >= maxSkips) {
              titleEl.textContent = "No in-season videos available";
              window.setTimeout(() => frame.remove(), 1200);
              return;
            }
            playRandomSensoryVideo(event.target, data?.video_id || null);
            return;
          }
          skipCount = 0;
        },
      },
    });
  } catch (error) {
    console.error("Sensory playlist error:", error);
    titleEl.textContent = "Could not load sensory playlist";
    window.setTimeout(() => frame.remove(), 1200);
  }
}

function openVideoFloat(title, youtubeId){
  const frame = document.createElement("div");
  frame.className = "float";
  frame.style.left = "40px";
  frame.style.top = "120px";

  const header = document.createElement("div");
  header.className = "float-header";

  const t = document.createElement("div");
  t.className = "float-title";
  t.textContent = title;

  const close = document.createElement("button");
  close.className = "float-close";
  close.textContent = "✕";
  close.addEventListener("click", () => frame.remove());

  header.appendChild(t);
  header.appendChild(close);

  const body = document.createElement("div");
  body.className = "float-body";

  const iframe = document.createElement("iframe");
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?rel=0`;
  body.appendChild(iframe);

  frame.appendChild(header);
  frame.appendChild(body);
  floatLayer.appendChild(frame);

  // resize handle (bottom-right)
  const resize = document.createElement("div");
  resize.className = "float-resize";
  frame.appendChild(resize);

  setupResizeLockedAspect(frame, resize, 16/9);

  // drag
  dragWithinBoard(frame, header);
}


function openLocalVideoFloat(title, url){
  const frame = document.createElement("div");
  frame.className = "float";
  frame.style.left = "40px";
  frame.style.top = "120px";

  const header = document.createElement("div");
  header.className = "float-header";

  const t = document.createElement("div");
  t.className = "float-title";
  t.textContent = title;

  const close = document.createElement("button");
  close.className = "float-close";
  close.textContent = "✕";
  close.addEventListener("click", () => frame.remove());

  header.appendChild(t);
  header.appendChild(close);

  const body = document.createElement("div");
  body.className = "float-body";

  const video = document.createElement("video");
  video.src = url;
  video.controls = true;
  video.autoplay = true;
  body.appendChild(video);

  frame.appendChild(header);
  frame.appendChild(body);
  floatLayer.appendChild(frame);

  // resize handle (bottom-right)
  const resize = document.createElement("div");
  resize.className = "float-resize";
  frame.appendChild(resize);

  setupResizeLockedAspect(frame, resize, 16/9);

  // drag
  dragWithinBoard(frame, header);
}


function openImagesFloat(title, images){
  const frame = document.createElement("div");
  frame.className = "float";
  frame.style.left = "60px";
  frame.style.top = "120px";
  frame.style.width = "480px";

  const header = document.createElement("div");
  header.className = "float-header";

  const t = document.createElement("div");
  t.className = "float-title";
  t.textContent = title;

  const close = document.createElement("button");
  close.className = "float-close";
  close.textContent = "✕";
  close.addEventListener("click", () => frame.remove());

  header.appendChild(t);
  header.appendChild(close);

  const body = document.createElement("div");
  body.className = "float-body";
  body.style.display = "flex";
  body.style.flexWrap = "wrap";
  body.style.gap = "12px";
  body.style.padding = "12px";
  body.style.justifyContent = "center";
  body.style.overflowY = "auto";

  images.forEach(({ src, caption }) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";

    const img = document.createElement("img");
    img.src = src;
    img.alt = caption;
    img.style.width = "130px";
    img.style.height = "130px";
    img.style.objectFit = "contain";
    img.style.borderRadius = "8px";
    img.style.background = "#fff";

    const lbl = document.createElement("div");
    lbl.textContent = caption;
    lbl.style.fontSize = "14px";
    lbl.style.fontWeight = "700";
    lbl.style.color = "#fff";

    wrapper.appendChild(img);
    wrapper.appendChild(lbl);
    body.appendChild(wrapper);
  });

  frame.appendChild(header);
  frame.appendChild(body);
  floatLayer.appendChild(frame);

  dragWithinBoard(frame, header);
}


function openCoreBoardFloat(){
  const frame = document.createElement("div");
  frame.className = "float";
  frame.style.left = "60px";
  frame.style.top = "120px";
  frame.style.width = "480px";

  const header = document.createElement("div");
  header.className = "float-header";

  const t = document.createElement("div");
  t.className = "float-title";
  t.textContent = "Core Boards";

  const close = document.createElement("button");
  close.className = "float-close";
  close.textContent = "✕";
  close.addEventListener("click", () => frame.remove());

  header.appendChild(t);
  header.appendChild(close);

  const body = document.createElement("div");
  body.className = "float-body";
  body.style.background = "#000";
  body.style.display = "flex";
  body.style.alignItems = "center";
  body.style.justifyContent = "center";
  body.style.overflow = "hidden";

  const img = document.createElement("img");
  img.src = "./Core Boards.jpg";
  img.alt = "Core Boards";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";

  body.appendChild(img);
  frame.appendChild(header);
  frame.appendChild(body);

  const resize = document.createElement("div");
  resize.className = "float-resize";
  frame.appendChild(resize);

  floatLayer.appendChild(frame);

  // Set initial height based on image natural dimensions once loaded
  img.addEventListener("load", () => {
    const aspect = img.naturalWidth / img.naturalHeight;
    const w = frame.offsetWidth;
    const headerH = header.offsetHeight || 44;
    frame.style.height = `${Math.round(w / aspect) + headerH}px`;
  }, { once: true });

  setupFreeResize(frame, resize);
  dragWithinBoard(frame, header);
}

function setupFreeResize(frame, handle){
  const PAD = 8;
  const MIN_W = 200;
  const MIN_H = 150;

  let resizing = false;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    const r = frame.getBoundingClientRect();
    startW = r.width;
    startH = r.height;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    const maxW = window.innerWidth - PAD * 2;
    const maxH = window.innerHeight - PAD * 2;
    const w = clamp(startW + (e.clientX - startX), MIN_W, maxW);
    const h = clamp(startH + (e.clientY - startY), MIN_H, maxH);
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    const r = frame.getBoundingClientRect();
    frame.style.left = `${clamp(r.left, PAD, window.innerWidth - w - PAD)}px`;
    frame.style.top  = `${clamp(r.top,  PAD, window.innerHeight - h - PAD)}px`;
  });

  handle.addEventListener("pointerup", () => { resizing = false; });
  handle.addEventListener("pointercancel", () => { resizing = false; });
}

function dragWithinBoard(frame, handle){
  let dragging = false;
  let startX = 0, startY = 0;
  let startL = 0, startT = 0;

  handle.style.touchAction = "none";
  handle.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const r = frame.getBoundingClientRect();
    startL = r.left;
    startT = r.top;
    frame.style.zIndex = String(++floatZCounter);
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const pad = 8;
    const maxLeft = window.innerWidth - frame.offsetWidth - pad;
    const maxTop = window.innerHeight - frame.offsetHeight - pad;
    frame.style.left = `${clamp(startL + dx, pad, maxLeft)}px`;
    frame.style.top = `${clamp(startT + dy, pad, maxTop)}px`;
  });

  window.addEventListener("pointerup", () => dragging = false);
  window.addEventListener("pointercancel", () => dragging = false);
}

/* ------------------ enableDrag helper ------------------ */

function enableDrag(element, handle){
  let dragging = false;
  let startX = 0, startY = 0;
  let startL = 0, startT = 0;

  handle.style.touchAction = "none";
  handle.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const r = element.getBoundingClientRect();
    startL = r.left;
    startT = r.top;
    element.style.zIndex = String(++floatZCounter);
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const pad = 8;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxLeft = window.innerWidth - element.offsetWidth - pad;
    const maxTop = window.innerHeight - element.offsetHeight - pad;
    element.style.left = `${clamp(startL + dx, pad, maxLeft)}px`;
    element.style.top = `${clamp(startT + dy, pad, maxTop)}px`;
  });

  window.addEventListener("pointerup", () => { dragging = false; });
  window.addEventListener("pointercancel", () => { dragging = false; });
}

/* ------------------ Details popup ------------------ */

function renderDetailsWindow(activity){
  // Only one details popup at a time
  const existing = floatLayer.querySelector(".details-popup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.className = "details-popup";

  // Default position: center of viewport
  const W = Math.min(340, window.innerWidth - 40);
  popup.style.width = `${W}px`;
  popup.style.left = `${Math.max(8, (window.innerWidth - W) / 2)}px`;
  popup.style.top = `${Math.max(8, (window.innerHeight - 350) / 2)}px`;

  // Header (drag handle)
  const header = document.createElement("div");
  header.className = "details-popup-header";

  const title = document.createElement("div");
  title.className = "details-popup-title";
  title.textContent = activity.name;

  const closeBtn = document.createElement("button");
  closeBtn.className = "xbtn";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => popup.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Body: checklist steps
  const body = document.createElement("div");
  body.className = "details-popup-body";

  (activity.steps || []).forEach((step) => {
    const row = document.createElement("div");
    row.className = "details-step" + (step.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "details-step-check";
    checkbox.checked = !!step.completed;
    checkbox.addEventListener("change", () => {
      step.completed = checkbox.checked;
      row.classList.toggle("completed", step.completed);
      saveState();
    });

    const icon = document.createElement("img");
    icon.className = "details-step-icon";
    icon.src = step.icon || "";
    icon.alt = "";
    icon.onerror = () => { icon.style.display = "none"; };

    const label = document.createElement("div");
    label.className = "details-step-label";
    label.textContent = step.label;

    if (step.url) {
      row.classList.add("details-step-link");
      row.addEventListener("click", (e) => {
        if (e.target === checkbox) return;
        openLocalVideoFloat(step.label, step.url);
      });
    } else if (step.type === "images" && Array.isArray(step.images)) {
      row.classList.add("details-step-link");
      row.addEventListener("click", (e) => {
        if (e.target === checkbox) return;
        openImagesFloat(step.label, step.images);
      });
    }

    row.appendChild(checkbox);
    row.appendChild(icon);
    row.appendChild(label);
    body.appendChild(row);
  });

  // Resize handle (bottom-right, like video floats)
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "float-resize";

  popup.appendChild(header);
  popup.appendChild(body);
  popup.appendChild(resizeHandle);
  floatLayer.appendChild(popup);

  enableDrag(popup, header);
  setupDetailsPopupResize(popup);
}

function setupResizeLockedAspect(frame, handle, aspect){
  // aspect = width/height of the VIDEO area (not counting header)
  // current CSS: header is 44px tall
  const HEADER_H = 44;
  const PAD = 8;

  let resizing = false;
  let startX = 0;
  let startW = 0;

  const minW = 320;

  function clampW(w){
    const maxW = window.innerWidth - PAD*2;
    return clamp(w, minW, maxW);
  }

  function applyWidth(w){
    w = clampW(w);

    // Convert desired width => total frame height (video area + header)
    const desiredVideoH = Math.round(w / aspect);
    let totalH = desiredVideoH + HEADER_H;

    // Keep within viewport height
    const maxH = window.innerHeight - PAD*2;
    totalH = clamp(totalH, Math.round(minW/aspect) + HEADER_H, maxH);

    // Recompute width from the (possibly clamped) height so ratio stays exact
    const finalVideoH = totalH - HEADER_H;
    const finalW = Math.round(finalVideoH * aspect);

    frame.style.width = `${finalW}px`;
    frame.style.height = `${totalH}px`;

    // Ensure resized window stays on-screen
    const r = frame.getBoundingClientRect();
    const maxLeft = window.innerWidth - frame.offsetWidth - PAD;
    const maxTop = window.innerHeight - frame.offsetHeight - PAD;
    frame.style.left = `${clamp(r.left, PAD, maxLeft)}px`;
    frame.style.top = `${clamp(r.top, PAD, maxTop)}px`;
  }

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    startX = e.clientX;
    startW = frame.getBoundingClientRect().width;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    const dx = e.clientX - startX;
    applyWidth(startW + dx);
  });

  handle.addEventListener("pointerup", () => { resizing = false; });
  handle.addEventListener("pointercancel", () => { resizing = false; });
}

function setupDetailsPopupResize(popup){
  // Base width used to compute the scale factor (matches initial popup width)
  const BASE_W = 340;
  const MIN_W = 260;
  const MIN_H = 150;
  const PAD = 8;

  const handle = popup.querySelector(".float-resize");
  if (!handle) return;

  let resizing = false;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;

  function applySize(w, h){
    const maxW = window.innerWidth - PAD * 2;
    const maxH = window.innerHeight - PAD * 2;
    w = clamp(w, MIN_W, maxW);
    h = clamp(h, MIN_H, maxH);

    popup.style.width = `${w}px`;
    popup.style.height = `${h}px`;

    // Scale content proportionally: icons, fonts, spacing all grow with width
    const scale = w / BASE_W;
    popup.style.setProperty("--ds-scale", scale);

    // Body fills remaining height below the header
    const headerEl = popup.querySelector(".details-popup-header");
    const headerH = headerEl ? headerEl.offsetHeight : Math.round(48 * scale);
    const body = popup.querySelector(".details-popup-body");
    if (body) body.style.maxHeight = `${h - headerH}px`;

    // Keep popup on-screen after resize
    const r = popup.getBoundingClientRect();
    if (r.right > window.innerWidth - PAD){
      popup.style.left = `${window.innerWidth - w - PAD}px`;
    }
    if (r.bottom > window.innerHeight - PAD){
      popup.style.top = `${window.innerHeight - h - PAD}px`;
    }
  }

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    const r = popup.getBoundingClientRect();
    startW = r.width;
    startH = r.height;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    applySize(startW + (e.clientX - startX), startH + (e.clientY - startY));
  });

  handle.addEventListener("pointerup", () => { resizing = false; });
  handle.addEventListener("pointercancel", () => { resizing = false; });
}

function setupModalResize(modalEl, handleEl){
  const PAD = 12;
  const minW = 360;
  const minH = 260;

  let resizing = false;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;

  function applySize(w, h){
    const maxW = window.innerWidth - PAD*2;
    const maxH = window.innerHeight - PAD*2;

    modalEl.style.width = `${clamp(w, minW, maxW)}px`;
    modalEl.style.height = `${clamp(h, minH, maxH)}px`;
  }

  handleEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;

    const r = modalEl.getBoundingClientRect();
    startW = r.width;
    startH = r.height;

    handleEl.setPointerCapture(e.pointerId);
  });

  handleEl.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    applySize(startW + (e.clientX - startX), startH + (e.clientY - startY));
  });

  handleEl.addEventListener("pointerup", () => { resizing = false; });
  handleEl.addEventListener("pointercancel", () => { resizing = false; });
}

/* ------------------ Meetings ------------------ */

function setupMeetings(){
  openMorningSlides.addEventListener("click", () => openNewTab(MEETING_URLS.morning));
  openPowerSchool.addEventListener("click", () => openNewTab(MEETING_URLS.powerschool));
  openAfternoonSlides.addEventListener("click", () => {
    const url = afternoonMeetingUrl();
    if (!url) return;
    openNewTab(url);
  });
}

function updateAfternoonMeetingButton(){
  const url = afternoonMeetingUrl();
  const disabled = !url;

  openAfternoonSlides.disabled = disabled;
  openAfternoonSlides.style.opacity = disabled ? "0.45" : "1";
  openAfternoonSlides.style.cursor = disabled ? "not-allowed" : "pointer";

  if (disabled){
    afternoonHint.textContent = "Afternoon Meeting is disabled on Saturdays and Sundays.";
  } else {
    afternoonHint.textContent = "";
  }
}

function afternoonMeetingUrl(){
  const now = new Date();
  // Use Central Time weekday
  const ct = getCentralParts(now);
  const day = ct.weekday; // 0 Sun..6 Sat
  if (day === 0 || day === 6) return null;
  // Mon/Wed/Fri => MW deck; Tue/Thu => TTh deck
  if (day === 2 || day === 4) return MEETING_URLS.afternoonTTh;
  return MEETING_URLS.afternoonMW;
}

/* ------------------ Websites ------------------ */

function setupWebsites(){
  openWebPowerSchool.addEventListener("click", () => {
    closeOverlay(websitesOverlay);
    openNewTab(MEETING_URLS.powerschool);
  });

  openClassroomTimer.addEventListener("click", () => {
    closeOverlay(websitesOverlay);
    buildTimerPicker();
    openOverlay(timerPickerOverlay);
  });

  closeTimerPicker.addEventListener("click", () => closeOverlay(timerPickerOverlay));
  timerPickerOverlay.addEventListener("click", (e) => {
    if (e.target === timerPickerOverlay) closeOverlay(timerPickerOverlay);
  });
}

function buildTimerPicker(){
  if (timerButtons.childElementCount > 0) return; // already built

  TIMER_OPTIONS.forEach(({ title, url, img }) => {
    const btn = document.createElement("button");
    btn.className = "timer-btn";
    btn.setAttribute("aria-label", title);

    const image = document.createElement("img");
    image.className = "timer-btn-img";
    image.src = img;
    image.alt = title;

    const label = document.createElement("span");
    label.textContent = title;

    btn.appendChild(image);
    btn.appendChild(label);

    btn.addEventListener("click", () => {
      closeOverlay(timerPickerOverlay);
      openNewTab(url);
    });

    timerButtons.appendChild(btn);
  });
}

/* ------------------ Symbol search: local AAC symbol catalog ------------------ */

/**
 * Built-in local AAC symbol catalog.
 * Each entry has a label, optional tags for search, and a URL pointing to a
 * real AAC pictographic symbol image.
 *
 * Sources (all open-license, CORS-enabled, no API key required):
 *   MUL — Mulberry Symbols (CC-BY-SA) via Open Symbols CDN
 *   ARA — ARASAAC pictograms (CC-BY-NC-SA) via Open Symbols CDN
 *   NP  — Noun Project icons via Open Symbols CDN
 *   GS  — Global Symbols CDN
 *
 * The catalog works without any backend and is safe for static GitHub Pages deployments.
 */
const MUL = "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/";
const ARA = "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/";
const NP  = "https://d18vdu4p71yql0.cloudfront.net/libraries/noun-project/";
const GS  = "https://globalsymbols.com/uploads/production/image/imagefile/";

const LOCAL_SYMBOL_CATALOG = [
  /* ── General ── */

  // math
  { label: "Math",                 url: GS+"55337/120_55338_d6018f6e-ea20-43e6-9f4b-68e33fc67fc9.png", tags: ["math","mathematics","numbers","addition","subtraction","count"] },
  { label: "Maths",                url: MUL+"maths.svg",                                                tags: ["math","maths","mathematics","numbers","count","numeracy"] },
  { label: "Numbers",              url: MUL+"numbers.svg",                                              tags: ["math","numbers","counting","numeracy","digits"] },
  { label: "Calculator",           url: MUL+"calculator.svg",                                           tags: ["math","calculator","compute","arithmetic"] },

  // reading
  { label: "Reading",              url: MUL+"reading.svg",                                              tags: ["reading","book","read","literacy","story"] },
  { label: "Reading a Book",       url: MUL+"reading a book.svg",                                       tags: ["reading","book","read","story","literacy"] },
  { label: "Book",                 url: MUL+"book.svg",                                                  tags: ["reading","book","read","text","story"] },
  { label: "Books",                url: MUL+"books.svg",                                                 tags: ["reading","books","library","text","literacy"] },

  // writing
  { label: "Writing",              url: ARA+"writing.png.varianted-skin.png",                           tags: ["writing","write","journal","notes","pencil"] },
  { label: "Handwriting",          url: MUL+"writing.svg",                                              tags: ["writing","write","handwriting","notebook","notes"] },
  { label: "Pencil",               url: MUL+"pencil.svg",                                               tags: ["writing","pencil","draw","notes","pen"] },

  // science
  { label: "Science",              url: MUL+"science.svg",                                              tags: ["science","experiment","lab","biology","nature"] },
  { label: "Experiment",           url: MUL+"experiment.svg",                                           tags: ["science","experiment","lab","beaker","chemistry"] },
  { label: "Laboratory",           url: ARA+"science.png",                                              tags: ["science","lab","laboratory","experiment","research"] },

  // lunch
  { label: "Lunch",                url: MUL+"lunch 2.svg",                                              tags: ["lunch","eat","food","meal","cafeteria"] },
  { label: "Lunchtime",            url: MUL+"lunch.svg",                                                tags: ["lunch","food","meal","cafeteria","eat"] },
  { label: "Eating",               url: MUL+"eating.svg",                                               tags: ["lunch","eat","food","meal","cafeteria"] },
  { label: "Lunch Tray",           url: ARA+"lunch.png",                                                tags: ["lunch","tray","cafeteria","meal","eat"] },

  // recess
  { label: "Recess",               url: GS+"15894/17_15895_8fbcb320-e261-4ebc-8834-8aeb58e5b03c.png",  tags: ["recess","play","playground","outside","outdoor"] },
  { label: "Playground",           url: MUL+"playground.svg",                                           tags: ["recess","playground","play","outside","swing"] },
  { label: "Outside",              url: MUL+"outside.svg",                                              tags: ["recess","outside","outdoor","play","fresh air"] },
  { label: "Play",                 url: GS+"46310/17_46311_4d68b6dc-e99c-462a-875f-c76297d2e2a8.png",  tags: ["recess","play","outside","playground","fun"] },
  { label: "Playground",           url: "./Playground.png",                                             tags: ["recess","playground","play","outside","swing","fun"] },

  // PE
  { label: "PE",                   url: MUL+"PE.svg.varianted-skin.svg",                               tags: ["pe","gym","physical","exercise","sport","fitness"] },
  { label: "Physical Education",   url: MUL+"physical education.svg",                                   tags: ["pe","physical education","gym","exercise","sport"] },
  { label: "Exercise",             url: MUL+"exercise.svg",                                             tags: ["pe","exercise","gym","fitness","sport","active"] },
  { label: "Sports",               url: ARA+"physical education.png",                                   tags: ["pe","sports","exercise","gym","athletics","active"] },

  // music
  { label: "Music",                url: NP+"Music-24b69f41d0.svg",                                      tags: ["music","sing","song","instrument","band","choir"] },
  { label: "Music Class",          url: MUL+"music.svg",                                                tags: ["music","class","song","instrument","band"] },
  { label: "Singing",              url: MUL+"singing.svg",                                              tags: ["music","singing","sing","song","choir","voice"] },
  { label: "Instruments",          url: ARA+"music.png",                                                tags: ["music","instruments","band","play music","instrument"] },

  // art
  { label: "Art",                  url: MUL+"art.svg",                                                  tags: ["art","draw","paint","drawing","craft","creative"] },
  { label: "Painting",             url: MUL+"painting.svg",                                             tags: ["art","painting","paint","brush","craft","creative"] },
  { label: "Drawing",              url: MUL+"drawing.svg",                                              tags: ["art","drawing","draw","sketch","pencil","creative"] },
  { label: "Art Class",            url: ARA+"art.png",                                                  tags: ["art","craft","make","create","project","art class"] },

  // library
  { label: "Library",              url: MUL+"library.svg",                                              tags: ["library","books","checkout","librarian","reading"] },
  { label: "Library Books",        url: MUL+"library books.svg",                                        tags: ["library","books","reading","checkout","shelf"] },
  { label: "Bookshelf",            url: MUL+"bookshelf.svg",                                            tags: ["library","bookshelf","books","reading","shelf"] },
  { label: "Book Checkout",        url: ARA+"library.png",                                              tags: ["library","checkout","books","borrow","librarian"] },

  // bus
  { label: "Bus",                  url: MUL+"bus.svg",                                                  tags: ["bus","school bus","transport","ride","travel"] },
  { label: "School Bus",           url: MUL+"school bus.svg",                                           tags: ["bus","school bus","transport","ride","pickup"] },
  { label: "Riding the Bus",       url: ARA+"school bus.png",                                           tags: ["bus","school bus","transport","ride","going home"] },

  // breakfast
  { label: "Breakfast",            url: GS+"6256/14_6256_4ab7e0f6-4376-4c6d-8664-55cb0d0c2c2d.svg",   tags: ["breakfast","morning","eat","food","meal"] },
  { label: "Breakfast Food",       url: MUL+"breakfast.svg",                                            tags: ["breakfast","food","morning","meal","eat"] },
  { label: "Morning Meal",         url: ARA+"breakfast.png",                                            tags: ["breakfast","morning","food","eat","meal"] },

  // bathroom
  { label: "Bathroom",             url: MUL+"bathroom.svg",                                             tags: ["bathroom","restroom","toilet","lavatory","wash"] },
  { label: "Toilet",               url: MUL+"toilet.svg",                                               tags: ["bathroom","toilet","restroom","lavatory","flush"] },
  { label: "Wash Hands",           url: MUL+"wash hands.svg",                                           tags: ["bathroom","wash hands","hygiene","toilet","clean"] },
  { label: "Restroom",             url: ARA+"bathroom.png",                                             tags: ["bathroom","restroom","toilet","lavatory","hygiene"] },

  /* ── Tasks / Materials ── */

  // worksheets
  { label: "Worksheet",            url: GS+"15657/17_15658_197b592f-bf8e-4879-b9b4-960bdaa27018.png",  tags: ["worksheet","worksheets","paper","assignment","work"] },
  { label: "Worksheets",           url: MUL+"worksheets.svg",                                           tags: ["worksheets","worksheet","paper","assignment","task"] },
  { label: "Paper Work",           url: MUL+"paper.svg",                                                tags: ["worksheet","paper","work","assignment","write"] },
  { label: "Assignment",           url: ARA+"worksheet.png",                                            tags: ["worksheet","assignment","paper","task","work"] },
  { label: "Worksheets",           url: "./Worksheets.png",                                             tags: ["worksheets","worksheet","paper","assignment","task","work"] },

  // file folder tasks
  { label: "File Folder",          url: GS+"3260/13_3260_8cd0ea5c-3d75-49bd-836a-526966edf6e6.svg",   tags: ["file folder","folder","file","task","work"] },
  { label: "File Folder Task",     url: MUL+"file folder.svg",                                         tags: ["file folder","folder","file","task","activity"] },
  { label: "Folder Work",          url: ARA+"folder.png",                                              tags: ["file folder","folder","activity","work","task"] },
  { label: "File Folder",          url: "./File_Folder.png",                                           tags: ["file folder","folder","file","task","work","activity"] },

  // flashcards
  { label: "Flashcards",           url: MUL+"flashcards.svg",                                           tags: ["flashcards","cards","flash","memory","study"] },
  { label: "Flash Cards",          url: MUL+"flash cards.svg",                                          tags: ["flashcards","flash cards","study","memory","practice"] },
  { label: "Study Cards",          url: ARA+"flashcards.png",                                           tags: ["flashcards","cards","study","memory","learn"] },

  // small group
  { label: "Small Group",          url: MUL+"small group.svg",                                          tags: ["small group","group","partner","team","together"] },
  { label: "Group Work",           url: GS+"21487/17_21488_2252fa6e-4757-45be-b905-4760804fa3d5.png",  tags: ["small group","group","team","partner","work together"] },
  { label: "Group",                url: MUL+"group.svg",                                                tags: ["small group","group","team","partner","collaborate"] },
  { label: "Working Together",     url: ARA+"small group.png",                                          tags: ["small group","group","team","partner","together"] },

  // independent work
  { label: "Independent Work",     url: MUL+"independent work.svg",                                     tags: ["independent work","independent","solo","alone","work"] },
  { label: "Work Alone",           url: MUL+"working alone.svg",                                        tags: ["independent work","alone","solo","independent","desk"] },
  { label: "Desk Work",            url: GS+"15657/17_15658_197b592f-bf8e-4879-b9b4-960bdaa27018.png",  tags: ["independent work","desk","alone","solo","work"] },
  { label: "My Work",              url: ARA+"independent work.png",                                     tags: ["independent work","my work","alone","independent","task"] },
  { label: "Seatwork",             url: "./Seatwork.png",                                               tags: ["seatwork","seat work","independent work","desk","work","solo"] },

  // centers
  { label: "Centers",              url: MUL+"centers.svg",                                              tags: ["centers","centre","station","rotation","activity"] },
  { label: "Learning Centers",     url: MUL+"learning centres.svg",                                     tags: ["centers","learning","station","activity","rotation"] },
  { label: "Stations",             url: ARA+"centers.png",                                              tags: ["centers","stations","activity","learning","rotation"] },

  // computer
  { label: "Computer",             url: MUL+"computer.svg",                                             tags: ["computer","technology","tech","coding","screen","laptop"] },
  { label: "Laptop",               url: MUL+"laptop.svg",                                               tags: ["computer","laptop","technology","tech","screen"] },
  { label: "Desktop Computer",     url: ARA+"computer.png",                                             tags: ["computer","desktop","technology","screen","code"] },

  // tablet
  { label: "Tablet",               url: MUL+"tablet.svg",                                               tags: ["tablet","ipad","technology","screen","computer"] },
  { label: "iPad",                 url: MUL+"ipad.svg",                                                  tags: ["tablet","ipad","touch screen","computer","technology"] },
  { label: "Touch Screen",         url: ARA+"tablet.png",                                               tags: ["tablet","touch screen","ipad","computer","technology"] },

  // sorting
  { label: "Sorting",              url: MUL+"sorting.svg",                                              tags: ["sorting","sort","organize","categorize","classify","order"] },
  { label: "Sort Objects",         url: MUL+"sorting objects.svg",                                      tags: ["sorting","sort","objects","categorize","classify"] },
  { label: "Organize",             url: ARA+"sorting.png",                                              tags: ["sorting","sort","classify","order","organize"] },

  // matching
  { label: "Matching",             url: MUL+"matching.svg",                                             tags: ["matching","match","same","compare","pair"] },
  { label: "Match",                url: MUL+"match.svg",                                                tags: ["matching","match","pair","same","find"] },
  { label: "Find the Match",       url: ARA+"matching.png",                                             tags: ["matching","match","find","pair","same"] },

  // cutting
  { label: "Cutting",              url: MUL+"cutting.svg",                                              tags: ["cutting","cut","scissors","snip","trim"] },
  { label: "Scissors",             url: MUL+"scissors.svg",                                             tags: ["cutting","scissors","cut","snip","trim"] },
  { label: "Cut",                  url: ARA+"cutting.png",                                              tags: ["cutting","cut","scissors","paper","trim"] },

  // gluing
  { label: "Gluing",               url: MUL+"gluing.svg",                                               tags: ["gluing","glue","paste","stick","craft"] },
  { label: "Glue",                 url: MUL+"glue.svg",                                                 tags: ["gluing","glue","stick","paste","craft"] },
  { label: "Paste",                url: ARA+"glue.png",                                                 tags: ["gluing","paste","glue","stick","craft"] },

  // coloring
  { label: "Coloring",             url: MUL+"colouring.svg",                                            tags: ["coloring","colour","color","crayon","art","drawing"] },
  { label: "Crayons",              url: MUL+"crayons.svg",                                              tags: ["coloring","crayons","color","draw","art"] },
  { label: "Color",                url: ARA+"colouring.png",                                            tags: ["coloring","color","colouring","crayon","art","draw"] },

  // puzzles
  { label: "Puzzles",              url: MUL+"puzzles.svg",                                              tags: ["puzzles","puzzle","jigsaw","piece","fit"] },
  { label: "Jigsaw Puzzle",        url: MUL+"jigsaw puzzle.svg",                                        tags: ["puzzles","jigsaw","puzzle","piece","fit together"] },
  { label: "Puzzle",               url: ARA+"puzzle.png",                                               tags: ["puzzles","puzzle","piece","jigsaw","fit"] },

  /* ── Routines ── */

  // clean up
  { label: "Clean Up",             url: MUL+"clean up.svg",                                             tags: ["clean up","clean","tidy","organize","sweep","put away"] },
  { label: "Tidying Up",           url: MUL+"tidying up.svg",                                           tags: ["clean up","tidy","tidying","organize","put away","clear"] },
  { label: "Put Away",             url: MUL+"putting away.svg",                                         tags: ["clean up","put away","tidy","organize","clean"] },
  { label: "Clean",                url: ARA+"clean up.png",                                             tags: ["clean up","clean","tidy","sweep","organize"] },

  // line up
  { label: "Line Up",              url: MUL+"line up.svg",                                              tags: ["line up","lineup","line","queue","stand","wait"] },
  { label: "Stand in Line",        url: MUL+"standing in line.svg",                                     tags: ["line up","stand","line","queue","wait","hallway"] },
  { label: "Queue",                url: ARA+"line up.png",                                              tags: ["line up","queue","line","stand","wait in line"] },

  // transition
  { label: "Transition",           url: MUL+"transition.svg",                                           tags: ["transition","move","change","walk","hallway","switch"] },
  { label: "Moving On",            url: MUL+"moving on.svg",                                            tags: ["transition","move","change","switch","walk","change activity"] },
  { label: "Change Activity",      url: ARA+"transition.png",                                           tags: ["transition","change","activity","move","switch","hallway"] },

  // quiet time
  { label: "Quiet Time",           url: MUL+"quiet.svg",                                                tags: ["quiet time","quiet","calm","silence","rest","break"] },
  { label: "Quiet",                url: MUL+"quiet time.svg",                                           tags: ["quiet time","quiet","silence","calm","rest","shhh"] },
  { label: "Silent",               url: ARA+"quiet.png",                                                tags: ["quiet time","quiet","silent","calm","peace","shhh"] },

  // sensory break
  { label: "Sensory Break",        url: MUL+"sensory break.svg",                                        tags: ["sensory break","sensory","calm","break","rest","regulation"] },
  { label: "Calm Down",            url: MUL+"calm down.svg",                                            tags: ["sensory break","calm","regulation","break","sensory","relax"] },
  { label: "Break Time",           url: MUL+"break.svg",                                                tags: ["sensory break","break","rest","calm","regulation","sensory"] },

  // help
  { label: "Help",                 url: MUL+"help.svg",                                                 tags: ["help","ask","support","raise hand","assistance"] },
  { label: "Ask for Help",         url: MUL+"asking for help.svg",                                      tags: ["help","ask","raise hand","support","assistance","need help"] },
  { label: "I Need Help",          url: ARA+"help.png",                                                 tags: ["help","need help","ask","support","assistance","raise hand"] },

  // finished
  { label: "Finished",             url: MUL+"finished.svg",                                             tags: ["finished","done","complete","all done","end"] },
  { label: "All Done",             url: MUL+"all done.svg",                                             tags: ["finished","all done","done","complete","end","fin"] },
  { label: "Done",                 url: ARA+"finished.png",                                             tags: ["finished","done","complete","all done","end","fin"] },

  // turn in
  { label: "Turn In",              url: MUL+"turn in.svg",                                              tags: ["turn in","hand in","submit","give to teacher","finish"] },
  { label: "Hand In",              url: MUL+"handing in.svg",                                           tags: ["turn in","hand in","submit","give","teacher","work"] },
  { label: "Submit Work",          url: ARA+"turn in.png",                                              tags: ["turn in","submit","hand in","work","teacher","give"] },

  /* ── Additional Activities ── */

  // hands-on activity
  { label: "Hands-On Activity",    url: MUL+"hands on activity.svg",                                    tags: ["hands-on","hands on","activity","manipulative","project","do","make"] },
  { label: "Building",             url: MUL+"building.svg",                                             tags: ["hands-on","building","construct","blocks","make","create"] },
  { label: "Making",               url: MUL+"making.svg",                                               tags: ["hands-on","making","make","build","create","craft"] },
  { label: "Craft",                url: MUL+"craft.svg",                                                tags: ["hands-on","craft","make","create","activity","project"] },

  // snack
  { label: "Snack",                url: GS+"21820/17_21821_f58239d7-c408-4494-b7e7-d2808ddf08fa.png",  tags: ["snack","eat","food","break","snack time"] },
  { label: "Snack Time",           url: MUL+"snack.svg",                                                tags: ["snack","snack time","eat","food","break"] },
  { label: "Eating Snack",         url: MUL+"eating a snack.svg",                                       tags: ["snack","eating","snack time","food","break"] },
  { label: "Snack",                url: "./Snack.png",                                                  tags: ["snack","snack time","eat","food","break"] },

  // attendance / morning
  { label: "Attendance",           url: GS+"3120/13_3120_590a8d73-a9f5-49f6-9f26-9e1befbb2898.svg",   tags: ["attendance","register","morning","greeting","check in"] },
  { label: "Morning Meeting",      url: GS+"21487/17_21488_2252fa6e-4757-45be-b905-4760804fa3d5.png",  tags: ["morning meeting","meeting","greeting","circle","morning"] },
  { label: "Circle Time",          url: MUL+"circle time.svg",                                          tags: ["circle time","morning","meeting","group","gathering","calendar"] },
  { label: "Calendar",             url: MUL+"calendar.svg",                                             tags: ["calendar","date","morning","schedule","month","day"] },
  { label: "Attendance",           url: "./Attendance.png",                                             tags: ["attendance","register","morning","greeting","check in"] },

  // rest / break
  { label: "Rest",                 url: GS+"3260/13_3260_8cd0ea5c-3d75-49bd-836a-526966edf6e6.svg",   tags: ["rest","relax","quiet","break","sleep","down time"] },
  { label: "Rest Time",            url: MUL+"resting.svg",                                              tags: ["rest","resting","relax","quiet","break","calm","rest time"] },
  { label: "Nap Time",             url: MUL+"nap time.svg",                                             tags: ["rest","nap","sleep","quiet","relax","break"] },

  // swing / sensory equipment
  { label: "Swing",                url: GS+"46310/17_46311_4d68b6dc-e99c-462a-875f-c76297d2e2a8.png",  tags: ["swing","sensory","movement","vestibular","playground","play"] },
  { label: "Sensory Equipment",    url: MUL+"sensory.svg",                                              tags: ["sensory","equipment","swing","vestibular","tactile","regulation"] },
  { label: "Movement Break",       url: MUL+"movement break.svg",                                       tags: ["movement break","sensory","movement","active","exercise","break"] },
  { label: "Swing",                url: "./Swing.png",                                                  tags: ["swing","sensory","movement","vestibular","playground","play"] },

  // television / screen time
  { label: "Television",           url: GS+"6268/14_6268_8b0276ac-2f63-4972-81bc-601383681b04.svg",   tags: ["television","tv","video","screen","movie","show","watch"] },
  { label: "Watch Video",          url: MUL+"watching tv.svg",                                          tags: ["television","video","tv","watch","screen","movie"] },
  { label: "Screen Time",          url: MUL+"screen time.svg",                                          tags: ["screen time","tv","tablet","computer","video","watch"] },

  // jobs / classroom tasks
  { label: "Job",                  url: MUL+"job.svg",                                                  tags: ["job","classroom job","task","responsibility","chore","role"] },
  { label: "Classroom Job",        url: MUL+"classroom job.svg",                                        tags: ["job","classroom","task","responsibility","helper","chore"] },
  { label: "Helper",               url: MUL+"helper.svg",                                               tags: ["helper","job","help","assist","classroom","responsible"] },

  // choice / first-then
  { label: "Choice",               url: MUL+"choice.svg",                                               tags: ["choice","choose","pick","decide","option","select"] },
  { label: "First Then",           url: MUL+"first then.svg",                                           tags: ["first then","first","then","schedule","sequence","board"] },
  { label: "First",                url: MUL+"first.svg",                                                tags: ["first","then","sequence","schedule","first then","before"] },
  { label: "Then",                 url: MUL+"then.svg",                                                  tags: ["then","first","sequence","schedule","next","after"] },

  // wait
  { label: "Wait",                 url: MUL+"wait.svg",                                                 tags: ["wait","waiting","patience","stop","hold on","pause"] },
  { label: "Waiting",              url: MUL+"waiting.svg",                                              tags: ["wait","waiting","patience","turn","hold on","stop"] },
  { label: "My Turn",              url: MUL+"my turn.svg",                                               tags: ["turn","my turn","wait","waiting","patience","share"] },

  // walking / movement
  { label: "Walk",                 url: MUL+"walk.svg",                                                 tags: ["walk","walking","hallway","line","transition","movement"] },
  { label: "Hallway",              url: MUL+"hallway.svg",                                               tags: ["hallway","walk","line","transition","corridor","movement"] },

  // sit / stand
  { label: "Sit Down",             url: MUL+"sit down.svg",                                             tags: ["sit down","sit","chair","seat","sitting","calm"] },
  { label: "Stand Up",             url: MUL+"stand up.svg",                                              tags: ["stand up","stand","standing","rise","up","movement"] },

  // English / language arts
  { label: "English",              url: MUL+"english.svg",                                              tags: ["english","language arts","reading","writing","literacy","ela"] },
  { label: "Language Arts",        url: MUL+"language arts.svg",                                        tags: ["language arts","english","ela","reading","writing","literacy"] },
  { label: "Vocabulary",           url: MUL+"vocabulary.svg",                                           tags: ["vocabulary","words","english","language","reading","spelling"] },
  { label: "Spelling",             url: MUL+"spelling.svg",                                             tags: ["spelling","words","writing","vocabulary","english","language"] },

  // additional math
  { label: "Counting",             url: MUL+"counting.svg",                                             tags: ["counting","count","math","numbers","numeracy","one two three"] },
  { label: "Number Line",          url: MUL+"number line.svg",                                          tags: ["number line","math","numbers","count","sequence","order"] },

  // additional PE/sports
  { label: "Ball",                 url: MUL+"ball.svg",                                                 tags: ["ball","pe","sport","throw","catch","kick","game"] },
  { label: "Running",              url: MUL+"running.svg",                                              tags: ["running","run","pe","exercise","sport","active","fitness"] },
  { label: "Gym",                  url: MUL+"gym.svg",                                                  tags: ["gym","pe","physical education","exercise","sport","fitness"] },

  // token / reward
  { label: "Token Board",          url: MUL+"token board.svg",                                          tags: ["token board","token","reward","earn","sticker","points"] },
  { label: "Reward",               url: MUL+"reward.svg",                                               tags: ["reward","prize","earn","token","reinforcement","good job"] },
  { label: "Star Chart",           url: MUL+"star chart.svg",                                           tags: ["star chart","star","reward","earn","chart","points","token"] },

];


// Pre-compute lowercase labels once at startup to avoid repeated conversions on each search.
LOCAL_SYMBOL_CATALOG.forEach(e => { e._lower = e.label.toLowerCase(); });

/**
 * Search the local catalog for symbols matching the query.
 * Matches any term in the query against entry tags and labels.
 * Returns results immediately — no network requests.
 */
function searchLocalSymbols(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];
  for (const entry of LOCAL_SYMBOL_CATALOG) {
    const entryTags = entry.tags || [];
    const matched = terms.some(t =>
      entry._lower.includes(t) ||
      entryTags.some(k => k.includes(t) || t.includes(k))
    );
    if (matched) {
      results.push({ url: entry.url, label: entry.label });
    }
  }
  return results;
}

/* ------------------ Edit modal (rename/symbol search) ------------------ */

function setupEditModal(){
  closeEdit.addEventListener("click", () => closeOverlay(editOverlay));
  editOverlay.addEventListener("click", (e) => { if (e.target === editOverlay) closeOverlay(editOverlay); });

  btnSearchCurrent.addEventListener("click", () => {
    const a = state.activities.find(x => x.id === editingId);
    if (!a) return;
    symbolQuery.value = a.name;
    editingStepIndex = null;
    runSymbolSearch(a.name);
  });

  btnChangeName.addEventListener("click", () => {
    const a = state.activities.find(x => x.id === editingId);
    if (!a) return;
    const next = prompt("New activity name:", a.name);
    if (!next) return;
    a.name = next.trim();
    saveState();
    render();
    openEditFor(a.id);
  });

  btnSearchSymbols.addEventListener("click", () => {
    editingStepIndex = null;
    const q = symbolQuery.value.trim();
    runSymbolSearch(q);
  });

  btnAddStep.addEventListener("click", () => {
    const a = state.activities.find(x => x.id === editingId);
    if (!a) return;
    if (!Array.isArray(a.steps)) a.steps = [];
    a.steps.push({ label: "New Step", icon: "", completed: false });
    saveState();
    render();
    renderStepsEditor();
  });
}

function openEditFor(id){
  editingId = id;
  editingStepIndex = null;
  const a = state.activities.find(x => x.id === id);
  if (!a) return;
  editTitle.textContent = `Edit: ${a.name}`;
  symbolResults.innerHTML = "";
  symbolError.classList.add("hidden");
  symbolSpinner.classList.add("hidden");
  renderStepsEditor();
  openOverlay(editOverlay);
}

function renderStepsEditor(){
  const a = state.activities.find(x => x.id === editingId);
  stepsEditor.innerHTML = "";

  const steps = a ? (a.steps || []) : [];

  if (steps.length === 0){
    const empty = document.createElement("div");
    empty.className = "steps-empty-hint";
    empty.textContent = "No steps yet. Click Add Step to build a mini-schedule for this activity.";
    stepsEditor.appendChild(empty);
    return;
  }

  steps.forEach((step, i) => {
    const row = document.createElement("div");
    row.className = "step-edit-row" + (editingStepIndex === i ? " step-edit-row--active" : "");

    // Icon button — click to pick symbol for this step
    const iconBtn = document.createElement("button");
    iconBtn.className = "step-icon-btn";
    iconBtn.title = "Change symbol for this step";
    if (step.icon){
      const img = document.createElement("img");
      img.src = step.icon;
      img.alt = "";
      img.onerror = () => { img.remove(); iconBtn.textContent = "?"; };
      iconBtn.appendChild(img);
    } else {
      iconBtn.textContent = "?";
    }
    iconBtn.addEventListener("click", () => {
      editingStepIndex = i;
      symbolQuery.value = step.label || "";
      symbolError.textContent = "Select a symbol for this step — click a result to apply.";
      symbolError.classList.remove("hidden");
      runSymbolSearch(step.label || (a ? a.name : ""));
      renderStepsEditor();
    });

    // Label input
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "text-input step-label-input";
    textInput.value = step.label || "";
    textInput.placeholder = "Step label";
    textInput.addEventListener("change", () => {
      step.label = textInput.value.trim();
      saveState();
    });

    // Controls: up / down / delete
    const controls = document.createElement("div");
    controls.className = "step-edit-controls";

    const upBtn = document.createElement("button");
    upBtn.className = "btn step-ctrl-btn";
    upBtn.textContent = "Up";
    upBtn.disabled = i === 0;
    upBtn.addEventListener("click", () => {
      [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
      if (a) a.steps = steps;
      if (editingStepIndex === i) editingStepIndex = i - 1;
      else if (editingStepIndex === i - 1) editingStepIndex = i;
      saveState();
      renderStepsEditor();
    });

    const downBtn = document.createElement("button");
    downBtn.className = "btn step-ctrl-btn";
    downBtn.textContent = "Down";
    downBtn.disabled = i === steps.length - 1;
    downBtn.addEventListener("click", () => {
      [steps[i + 1], steps[i]] = [steps[i], steps[i + 1]];
      if (a) a.steps = steps;
      if (editingStepIndex === i) editingStepIndex = i + 1;
      else if (editingStepIndex === i + 1) editingStepIndex = i;
      saveState();
      renderStepsEditor();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger step-ctrl-btn";
    delBtn.textContent = "X";
    delBtn.addEventListener("click", () => {
      steps.splice(i, 1);
      if (a) a.steps = steps;
      if (editingStepIndex === i) editingStepIndex = null;
      else if (editingStepIndex !== null && editingStepIndex > i) editingStepIndex--;
      saveState();
      render();
      renderStepsEditor();
    });

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(delBtn);

    row.appendChild(iconBtn);
    row.appendChild(textInput);
    row.appendChild(controls);
    stepsEditor.appendChild(row);
  });
}

function runSymbolSearch(q){
  q = (q || "").trim();
  if (!q){
    symbolError.textContent = "Type something to search.";
    symbolError.classList.remove("hidden");
    return;
  }
  symbolError.classList.add("hidden");
  symbolResults.innerHTML = "";

  // Search the local catalog — instant, no network required
  const results = searchLocalSymbols(q);

  if (results.length === 0){
    symbolError.textContent = "No symbols found. Try a different keyword.";
    symbolError.classList.remove("hidden");
    return;
  }

  if (editingStepIndex !== null){
    symbolError.textContent = "Click a symbol to apply it to the step.";
    symbolError.classList.remove("hidden");
  }

  results.forEach(item => {
    const tile = document.createElement("div");
    tile.className = "symbol";
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.label || "";
    img.onerror = () => { tile.remove(); };
    tile.appendChild(img);

    tile.addEventListener("click", () => {
      const a = state.activities.find(x => x.id === editingId);
      if (!a) return;

      if (editingStepIndex !== null){
        // Apply symbol to step
        if (!Array.isArray(a.steps)) a.steps = [];
        const step = a.steps[editingStepIndex];
        if (step){
          step.icon = item.url;
          saveState();
          editingStepIndex = null;
          symbolResults.innerHTML = "";
          symbolError.classList.add("hidden");
          renderStepsEditor();
        }
      } else {
        // Apply symbol to activity icon
        a.icon = item.url;
        saveState();
        render();
      }
    });

    symbolResults.appendChild(tile);
  });
}

/* ------------------ Persistence ------------------ */

function loadState(){
  const saved = safeParse(localStorage.getItem(STORAGE_KEY));
  if (saved?.activities?.length){
    if (!localStorage.getItem(MIGRATION_KEY)){
      saved.activities.forEach(a => {
        // Convert ambiguous 12-hour afternoon times (h:mm where h is 1..6) to 24-hour
        const m = String(a.time || "").match(/^([1-6]):(\d{2})$/);
        if (m){
          a.time = `${parseInt(m[1], 10) + 12}:${m[2]}`;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      localStorage.setItem(MIGRATION_KEY, "1");
    }
    // MIGRATION_KEY_2 (old Canva -> Vehicles.mp4) retired: Vehicles.mp4 is no longer used,
    // and MIGRATION_KEY_3 below replaces those English steps anyway.
    localStorage.setItem(MIGRATION_KEY_2, "1");
    if (!localStorage.getItem(MIGRATION_KEY_3)){
      // Replace old English steps (Vocabulary/Worksheet/Folder) with the single Unique step
      saved.activities.forEach(a => {
        if (a.name === "English" && Array.isArray(a.steps)){
          const hasUnique = a.steps.some(s => s.label === "Unique");
          if (!hasUnique){
            a.steps = [
              { icon:"https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/english.svg", label:"Unique", type:"images", images:structuredClone(ENGLISH_UNIQUE_IMAGES), completed:false },
            ];
          }
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      localStorage.setItem(MIGRATION_KEY_3, "1");
    }
    if (!localStorage.getItem(MIGRATION_KEY_4)){
      // Add newly bundled screenshot assets to the English Unique image set
      saved.activities.forEach(a => {
        if (a.name === "English" && Array.isArray(a.steps)){
          a.steps.forEach(step => {
            if (step.label === "Unique"){
              const existingImages = Array.isArray(step.images) ? step.images : [];
              existingImages.forEach(img => {
                if (img && ENGLISH_UNIQUE_IMAGE_RENAMES.has(img.src)){
                  img.src = ENGLISH_UNIQUE_IMAGE_RENAMES.get(img.src);
                }
              });
              const existingBySrc = new Map(existingImages.map(img => [img?.src, img]));
              const orderedImages = ENGLISH_UNIQUE_IMAGES.map(img => existingBySrc.get(img.src) || structuredClone(img));
              const defaultSrcs = new Set(ENGLISH_UNIQUE_IMAGES.map(img => img.src));
              const extraImages = existingImages.filter(img => img?.src && !defaultSrcs.has(img.src));
              step.type = "images";
              step.images = orderedImages.concat(extraImages);
            }
          });
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      localStorage.setItem(MIGRATION_KEY_4, "1");
    }
    if (!localStorage.getItem(MIGRATION_KEY_5)){
      // Update morning times: add Swing at 8:30, shift English→8:50, Attendance→9:10, Recess→9:15
      // Remove any pre-existing morning Swing entries (before noon) to avoid duplicates
      const toMins = t => { const [h,m] = String(t||"").split(":").map(Number); return h*60+(m||0); };
      saved.activities = saved.activities.filter(a => !(a.name === "Swing" && toMins(a.time) < 720));
      saved.activities.forEach(a => {
        if (a.name === "English" && a.time === "8:30") a.time = "8:50";
        if (a.name === "Attendance" && a.time === "8:50") a.time = "9:10";
        if (a.name === "Recess" && a.time === "8:55") a.time = "9:15";
      });
      // Insert morning Swing at 8:30 after Morning Meeting
      const mmIdx = saved.activities.findIndex(a => a.name === "Morning Meeting");
      const morningSwing = { id: uid(), name:"Swing", time:"8:30", icon:"https://globalsymbols.com/uploads/production/image/imagefile/46310/17_46311_4d68b6dc-e99c-462a-875f-c76297d2e2a8.png" };
      if (mmIdx !== -1){
        saved.activities.splice(mmIdx + 1, 0, morningSwing);
      }
      // Add Drink Water at 12:30 and shift Rest to 12:35
      saved.activities.forEach(a => {
        if (a.name === "Rest" && a.time === "12:30") a.time = "12:35";
      });
      const hasDrinkWater = saved.activities.some(a => a.name === "Drink Water");
      if (!hasDrinkWater){
        const swingIdx = saved.activities.findIndex(a => a.name === "Swing" && a.time === "12:00");
        const drinkWater = { id: uid(), name:"Drink Water", time:"12:30", icon:"./DrinkWater.png" };
        if (swingIdx !== -1){
          saved.activities.splice(swingIdx + 1, 0, drinkWater);
        } else {
          saved.activities.push(drinkWater);
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      localStorage.setItem(MIGRATION_KEY_5, "1");
    }
    saved.preferences = {
      ...DEFAULT_PREFERENCES,
      ...(saved.preferences || {}),
    };
    return saved;
  }
  return {
    activities: structuredClone(DEFAULT_ACTIVITIES),
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getPreferences(){
  state.preferences = {
    ...DEFAULT_PREFERENCES,
    ...(state.preferences && typeof state.preferences === "object" ? state.preferences : {}),
  };
  return state.preferences;
}

function applyDisplayPreferences(){
  const prefs = getPreferences();
  if (!prefs.showFullSchedule && scheduleGrid.contains(document.activeElement)) {
    btnSettings.focus();
  }
  if (!prefs.showNowNext && currentBox.contains(document.activeElement)) {
    btnSettings.focus();
  }
  scheduleGrid.classList.toggle("hidden", !prefs.showFullSchedule);
  currentBox.classList.toggle("hidden", !prefs.showNowNext);
  scheduleGrid.setAttribute("aria-hidden", String(!prefs.showFullSchedule));
  currentBox.setAttribute("aria-hidden", String(!prefs.showNowNext));
}

function syncSettingsUI(){
  const prefs = getPreferences();
  btnSettings.setAttribute("aria-expanded", String(!settingsPanel.classList.contains("hidden")));
  toggleEditMode.checked = editMode;
  toggleShowFullSchedule.checked = !!prefs.showFullSchedule;
  toggleShowNowNext.checked = !!prefs.showNowNext;
  toggleSubstitute.checked = !!prefs.substituteMode;
  btnReset.classList.toggle("hidden", !editMode);
  subsLauncher.classList.toggle("hidden", !prefs.substituteMode || editMode);
  const endMin = getDayEndMin(getOrderedActivities());
  inputDayEnd.value = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
  toggleRunOnWeekends.checked = !!prefs.runOnWeekends;
  if (typeof syncBathroomSettingsUI === "function") syncBathroomSettingsUI();
  document.body.classList.toggle("substitute-mode-active", !!prefs.substituteMode);
  syncCurrentIconSubstituteState();
}

function setSettingsPanelOpen(isOpen, focusButton = false){
  settingsPanel.classList.toggle("hidden", !isOpen);
  syncSettingsUI();
  if (focusButton) btnSettings.focus();
}

/* ------------------ Helpers ------------------ */

function openOverlay(el){ el.classList.remove("hidden"); }
function closeOverlay(el){ el.classList.add("hidden"); }

function openNewTab(url){
  window.open(url, "_blank", "noopener,noreferrer");
}

function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function safeParse(s){
  try{ return JSON.parse(s); } catch{ return null; }
}

function normalizeSubstituteToken(value){
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeTime(v){
  // Accept "7:15", "07:15", "715", "7 15", etc.
  const raw = String(v || "").trim();
  const m = raw.match(/^(\d{1,2})\s*[: ]\s*(\d{2})$/) || raw.match(/^(\d{1,2})(\d{2})$/);
  if (!m) return raw;
  let hh = parseInt(m[1], 10);
  let mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return raw;
  hh = clamp(hh, 0, 23);
  mm = clamp(mm, 0, 59);
  // Keep classroom-style (no leading zero)
  return `${hh}:${String(mm).padStart(2,"0")}`;
}

function getDayEndMin(ordered){
  const lastStart = ordered.length ? timeToMinutes(ordered[ordered.length - 1].time) : 0;
  const pref = normalizeTime(getPreferences().dayEnd);
  const prefMin = /^\d{1,2}:\d{2}$/.test(pref) ? timeToMinutes(pref) : NaN;
  // Fall back to the old behavior if the end time is missing or earlier than the last card
  return prefMin > lastStart ? prefMin : lastStart;
}

function timeToMinutes(t){
  const [hStr,mStr] = String(t).split(":");
  const h = parseInt(hStr,10);
  const m = parseInt(mStr,10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h*60 + m;
}

function minutesToAmPmLabel(min){
  const totalMin = Math.round(min);
  const h24 = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

function timeToAmPmLabel(t){
  return minutesToAmPmLabel(timeToMinutes(t));
}

function minutesToTime(min){
  const h = Math.floor(min/60);
  const m = min%60;
  return `${h}:${String(m).padStart(2,"0")}`;
}

function formatRemaining(mins){
  if (mins == null) return "-";
  if (mins < 60) return `${mins} min remaining`;
  const h = Math.floor(mins/60);
  const m = mins%60;
  if (m === 0) return `${h} hr remaining`;
  return `${h} hr ${m} min remaining`;
}

function formatCountdownClock(totalSeconds){
  if (totalSeconds === null || totalSeconds === undefined) return "--:--";
  const safe = Math.max(0, Math.floor(totalSeconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function formatCentralTime(date, twelveHour){
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: !!twelveHour,
  });
  return fmt.format(date);
}

function getCentralParts(date){
  // Pull parts in America/Chicago, including weekday.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const hour = parseInt(parts.find(p=>p.type==="hour")?.value || "0", 10);
  const minute = parseInt(parts.find(p=>p.type==="minute")?.value || "0", 10);
  const wd = parts.find(p=>p.type==="weekday")?.value || "Sun";
  const weekdayMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const weekday = weekdayMap[wd] ?? 0;
  return { hour, minute, weekday };
}
