export const timeslots = [
  "Mon 0730-0830", "Mon 0830-0930", "Mon 0930-1030", "Mon 1030-1130", "Mon 1100-1200", "Mon 1200-1300", "Mon 1300-1400", "Mon 1700-1800", "Mon 1800-1900",
  "Tue 0730-0830", "Tue 0830-0930", "Tue 0930-1030", "Tue 1030-1130", "Tue 1100-1200", "Tue 1200-1300", "Tue 1300-1400", "Tue 1700-1800", "Tue 1800-1900",
  "Wed 0730-0830", "Wed 0830-0930", "Wed 0930-1030", "Wed 1030-1130", "Wed 1100-1200", "Wed 1200-1300", "Wed 1300-1400", "Wed 1700-1800", "Wed 1800-1900",
  "Thu 0730-0830", "Thu 0830-0930", "Thu 0930-1030", "Thu 1030-1130", "Thu 1100-1200", "Thu 1200-1300", "Thu 1300-1400", "Thu 1700-1800", "Thu 1800-1900",
  "Fri 0730-0830", "Fri 0830-0930", "Fri 0930-1030", "Fri 1030-1130", "Fri 1100-1200", "Fri 1200-1300", "Fri 1300-1400"
];

export const timeBuckets = [
  "0730-0830", "0830-0930", "0930-1030", "1030-1130",
  "1100-1200", "1200-1300", "1300-1400", "1700-1800", "1800-1900"
];

export const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const shiftTypes = {
  "0730-0830": ["0730 Door"],
  "0830-0930": ["0830 Door", "0900 Food", "0830 Dish"],
  "0930-1030": ["0930 Door", "0930 Dish"],
  "1030-1130": ["1030 Dish"],
  "1100-1200": ["1100 Door", "1100 Food", "1130 Dish"],
  "1200-1300": ["1200 Door", "1200 Food", "1230 Dish"],
  "1300-1400": ["1300 Door", "1300 Food", "1330 Dish"],
  "1700-1800": ["1700 Door", "1700 Food", "1715 Dish"],
  "1800-1900": ["1800 Door", "1800 Food", "1815 Dish", "1800 Floater"]
};

export const MAX_PICKS = 4;
export const MAX_PER_TYPE = 2;
export const TOP_PREFS = 10;
export const BLANK_RANK = 100;
export const DRAFT_SEED = 42;

export function roleFromType(type) {
  const s = String(type);
  if (s.includes("Floater") || s.includes("Float")) return "Float";
  if (s.includes("Door")) return "Door";
  if (s.includes("Dish")) return "Dish";
  if (s.includes("Food")) return "Food";
  return s;
}

export function bucketsForShift(shift) {
  const home = shift.timeBucket || shift.homeBucket;
  const isNineFood = String(shift.type || shift.shiftName || "").includes("0900 Food");
  const extra = isNineFood ? (shift.alsoBuckets || []) : [];
  return [home, ...extra].filter(Boolean);
}

export function shiftTouchesSlot(shift, slot) {
  return bucketsForShift(shift).includes(slot);
}

export function findShiftByName(name) {
  return shifts.find((s) => s.shiftName === name || s.id === name) || null;
}

export function shiftDay(shift) {
  const match = String(shift.timeBucket || shift.shiftName || "").match(/^(Mon|Tue|Wed|Thu|Fri)/);
  return match ? match[1] : null;
}

export function shiftStartMinutes(shift) {
  const match = `${shift.type || ""} ${shift.shiftName || ""}`.match(/(\d{4})/);
  if (!match) return null;
  return Number(match[1].slice(0, 2)) * 60 + Number(match[1].slice(2, 4));
}

export function intervalsOverlap(a, b) {
  if (!a || !b) return false;
  if (shiftDay(a) && shiftDay(b) && shiftDay(a) !== shiftDay(b)) return false;
  const startA = shiftStartMinutes(a);
  const startB = shiftStartMinutes(b);
  if (startA == null || startB == null) return false;
  return startA < startB + 60 && startB < startA + 60;
}

export function resolvePick(name) {
  return findShiftByName(name) || { shiftName: name, type: name };
}

export function shiftsOverlap(shift, picks) {
  return (picks || []).some((name) => intervalsOverlap(shift, resolvePick(name)));
}

export function userWantsSlot(user, slot) {
  const index = timeslots.indexOf(slot);
  if (index < 0) return false;
  if (user?.availability?.[index] === true) return true;
  const n = Number(user?.prefs?.[index]);
  return Number.isFinite(n) && n > 0 && n < BLANK_RANK;
}

export function slotHasOpenStation(slot, shiftRows, picks) {
  return (shiftRows || []).some((s) =>
    !s.pickedBy && shiftTouchesSlot(s, slot) && !shiftsOverlap(s, picks || [])
  );
}

export function slotIsFull(slot, shiftRows) {
  const rows = (shiftRows || []).filter((s) => shiftTouchesSlot(s, slot));
  return rows.length > 0 && rows.every((s) => s.pickedBy);
}

export function placeInQueue(queue, order, entry) {
  const uid = entry.userId;
  const without = (queue || []).filter((x) => x.userId !== uid);
  const active = without.filter((x) => !x.passed);
  const passed = without.filter((x) => x.passed);
  const rankOf = (id) => {
    const i = (order || []).findIndex((x) => x.userId === id);
    return i < 0 ? 9999 : i;
  };
  let idx = active.filter((x) => rankOf(x.userId) < rankOf(uid)).length;
  if (idx === 0 && active.length > 0) idx = 1;
  const next = [...active];
  next.splice(idx, 0, { userId: entry.userId, name: entry.name });
  return [...next, ...passed];
}

export function timeslotDocId(slot) {
  return String(slot).replace(/\s+/g, "");
}

export function shiftDocId(slot, type) {
  return `${slot} ${type}`.replace(/\s+/g, "_");
}

export const shifts = [];
timeslots.forEach((slot) => {
  const [day, time] = slot.split(" ");
  (shiftTypes[time] || []).forEach((type) => {
    shifts.push({
      id: shiftDocId(slot, type),
      shiftName: `${slot} ${type}`,
      type,
      role: roleFromType(type),
      timeBucket: slot,
      alsoBuckets: type === "0900 Food" ? [`${day} 0930-1030`] : []
    });
  });
});

export function generateAvatar(name) {
  const safe = (name || "User").trim() || "User";
  const initials = safe.split(/\s+/).map((n) => n[0]?.toUpperCase() || "").slice(0, 2).join("") || "U";
  const hash = safe.split("").reduce((acc, ch) => ch.charCodeAt(0) + ((acc << 5) - acc), 0);
  return { initials, color: `hsl(${Math.abs(hash) % 360}, 62%, 42%)` };
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function rankFor(user, index) {
  const value = user.prefs?.[index];
  if (value === undefined || value === null || value === "") return BLANK_RANK;
  const n = Number(value);
  return Number.isFinite(n) ? n : BLANK_RANK;
}

function wantsSlot(user, index) {
  return user.availability?.[index] === true || rankFor(user, index) < BLANK_RANK;
}

export function generateQueues(users, seed = DRAFT_SEED) {
  const rand = mulberry32(seed);
  const topWins = {};
  users.forEach((u) => { topWins[u.uid] = 0; });
  const orders = {};
  timeslots.forEach((slot) => {
    const index = timeslots.indexOf(slot);
    const cands = users.filter((u) => u.uid && wantsSlot(u, index));
    cands.sort((a, b) => {
      const rankA = rankFor(a, index);
      const rankB = rankFor(b, index);
      if (rankA !== rankB) return rankA - rankB;
      if (topWins[a.uid] !== topWins[b.uid]) return topWins[a.uid] - topWins[b.uid];
      const sen = (Number(b.seniority) || 0) - (Number(a.seniority) || 0);
      if (sen) return sen;
      return rand() - rand();
    });
    orders[slot] = cands.map((u) => ({ userId: u.uid, name: u.fullName || u.email || u.uid }));
    const winner = cands.find((u) => rankFor(u, index) < BLANK_RANK);
    if (!winner) return;
    const winnerRank = rankFor(winner, index);
    if (cands.some((other) => other.uid !== winner.uid && rankFor(other, index) === winnerRank)) {
      topWins[winner.uid] += 1;
    }
  });
  return orders;
}
