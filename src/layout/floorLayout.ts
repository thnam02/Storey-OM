/**
 * Generated office floor layouts. Desks and meeting seats are sized from the
 * department's headcount, not drawn from the real office. Pure and
 * deterministic: the same people always get the same seats.
 *
 * Coordinates are floor-local, in metres-ish scene units: x runs left (-7) to
 * right (+7), z runs from the back wall (-5) to the open front (+5).
 */
import { createRandom } from '../lib/seededRandom';
import type { DepartmentId, Employee } from '../data/types';

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const rect = (cx: number, cz: number, w: number, d: number): Rect => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
export const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
export const inside = (a: Rect, b: Rect) => a.x0 >= b.x0 && a.x1 <= b.x1 && a.z0 >= b.z0 && a.z1 <= b.z1;

/* ---------- zones ---------- */

/** Left and back of the floor: where desks go. */
export const DESK_ZONE: Rect = { x0: -6.5, x1: 1.8, z0: -4.6, z1: 2.4 };
/** Right of the floor: meeting furniture and department features. */
export const MEETING_ZONE: Rect = { x0: 2.2, x1: 6.6, z0: -4.6, z1: 2.4 };
/** Strip along the open front where people away from their desk walk. */
export const WALKWAY: Rect = { x0: -5.8, x1: 5.8, z0: 3.0, z1: 4.1 };

/* ---------- furniture sizes (match scene/props/furniture.tsx) ---------- */

export const DESK = { w: 1.5, d: 0.75, seatOffset: 0.66, chairBack: 0.92 } as const;
const POD_COL = 1.6;
const POD_HALF_GAP = 0.42;
const ROW_COL = 1.7;
const ROW_DEPTH = 2.2;
const ROUND_TABLE_REACH = 0.95 + 0.21; // chair ring radius + half a chair
const BOARD_CHAIR_X = 1.2;
const BOARD_CHAIR_GAP = 1.1;
const CHAIR_HALF = 0.24;

/* ---------- department specs ---------- */

export type OfficeDepartmentId = Exclude<DepartmentId, 'warehouse'>;

export interface Seat {
  x: number;
  z: number;
  kind: 'desk' | 'meeting' | 'reception';
}

export interface FloorSpec {
  /** Back-to-back pods, or rows all facing the back wall. */
  desks: 'pods' | 'rows';
  meeting: 'round' | 'boardroom' | 'none';
  /** A fixed reception seat, for the ground floor. */
  reception: Seat | null;
  /** Footprints of the department's fixed features (see scene/office/decor). Generated furniture avoids them. */
  reserved: Rect[];
}

export const FLOOR_SPECS: Record<OfficeDepartmentId, FloorSpec> = {
  'import-export': {
    desks: 'pods',
    meeting: 'none',
    reception: { x: 3.6, z: 0.9, kind: 'reception' },
    reserved: [{ x0: 1.95, x1: 5.25, z0: 0.6, z1: 2.0 }, { x0: 4.3, x1: 5.95, z0: -4.3, z1: -2.5 }],
  },
  sales: { desks: 'pods', meeting: 'round', reception: null, reserved: [rect(6.0, 1.9, 0.9, 0.9)] },
  marketing: { desks: 'pods', meeting: 'round', reception: null, reserved: [{ x0: 5.45, x1: 6.65, z0: 0.65, z1: 2.45 }] },
  finance: {
    desks: 'rows',
    meeting: 'none',
    reception: null,
    reserved: [{ x0: 2.15, x1: 6.05, z0: -4.75, z1: -4.05 }, rect(5.6, -1.6, 1.0, 0.9), rect(6.0, 1.9, 0.9, 0.9), rect(2.4, 1.9, 0.7, 0.7)],
  },
  management: {
    desks: 'pods',
    meeting: 'boardroom',
    reception: null,
    reserved: [{ x0: 2.9, x1: 5.5, z0: 1.85, z1: 2.8 }, rect(4.2, 1.3, 1.2, 0.6), rect(6.2, 0.9, 0.85, 0.85)],
  },
};

/* ---------- layout ---------- */

export interface DeskPlacement {
  x: number;
  z: number;
  /** 0: chair towards the front (+z). π: chair towards the back wall. */
  ry: number;
}

export interface RoundTablePlacement {
  x: number;
  z: number;
  chairs: number;
}

export interface BoardroomPlacement {
  x: number;
  z: number;
  chairsPerSide: number;
  length: number;
}

export interface FloorLayout {
  desks: DeskPlacement[];
  roundTables: RoundTablePlacement[];
  boardroom: BoardroomPlacement | null;
  deskSeats: Seat[];
  meetingSeats: Seat[];
  receptionSeat: Seat | null;
}

/** Most desks a floor can hold. People beyond this hot-desk (they're drawn walking). */
export const MAX_DESKS = { pods: 20, rows: 12 } as const;

/** Everyone gets a desk, plus one spare; pods come in pairs. */
export function desksNeeded(people: number, style: FloorSpec['desks']): number {
  if (people <= 0) return 0;
  const n = people + 1;
  return style === 'pods' ? Math.ceil(n / 2) * 2 : n;
}

export function deskFootprint(d: DeskPlacement): Rect {
  const front = d.ry === 0;
  return {
    x0: d.x - DESK.w / 2,
    x1: d.x + DESK.w / 2,
    z0: front ? d.z - DESK.d / 2 : d.z - DESK.chairBack,
    z1: front ? d.z + DESK.chairBack : d.z + DESK.d / 2,
  };
}

export const roundTableFootprint = (t: RoundTablePlacement): Rect => rect(t.x, t.z, ROUND_TABLE_REACH * 2, ROUND_TABLE_REACH * 2);

export const boardroomFootprint = (b: BoardroomPlacement): Rect =>
  rect(b.x, b.z, (BOARD_CHAIR_X + CHAIR_HALF) * 2, Math.max(b.length, b.chairsPerSide * BOARD_CHAIR_GAP + CHAIR_HALF));

function podDesks(count: number): DeskPlacement[] {
  const cols = Math.ceil(Math.min(count, MAX_DESKS.pods) / 2);
  const rows = cols > 3 ? 2 : 1;
  const perRow = Math.ceil(cols / rows);
  const rowZ = rows === 2 ? [-2.7, 0.7] : [-2.2];
  const x0 = DESK_ZONE.x0 + DESK.w / 2 + 0.15;
  const desks: DeskPlacement[] = [];
  let left = cols;
  rowZ.forEach((cz) => {
    const n = Math.min(perRow, left);
    left -= n;
    for (let c = 0; c < n; c++) {
      const x = x0 + c * POD_COL;
      desks.push({ x, z: cz + POD_HALF_GAP, ry: 0 }, { x, z: cz - POD_HALF_GAP, ry: Math.PI });
    }
  });
  return desks;
}

function rowDesks(count: number): DeskPlacement[] {
  const n = Math.min(count, MAX_DESKS.rows);
  const x0 = DESK_ZONE.x0 + DESK.w / 2 + 0.15;
  const z0 = DESK_ZONE.z0 + DESK.d / 2 + 0.25;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + (i % 4) * ROW_COL, z: z0 + Math.floor(i / 4) * ROW_DEPTH, ry: 0 }));
}

const deskSeat = (d: DeskPlacement): Seat => ({ x: d.x, z: d.z + (d.ry === 0 ? DESK.seatOffset : -DESK.seatOffset), kind: 'desk' });

export function generateFloorLayout(spec: FloorSpec, { people, inMeeting }: { people: number; inMeeting: number }): FloorLayout {
  const wanted = desksNeeded(people, spec.desks);
  // Rows don't scale far; switch to pods when they would overflow.
  const style = spec.desks === 'rows' && wanted > MAX_DESKS.rows ? 'pods' : spec.desks;
  const desks = style === 'pods' ? podDesks(desksNeeded(people, 'pods')) : rowDesks(wanted);

  const roundTables: RoundTablePlacement[] = [];
  let boardroom: BoardroomPlacement | null = null;
  const meetingSeats: Seat[] = [];

  if (spec.meeting === 'round') {
    const tables = Math.min(2, Math.max(1, Math.ceil(inMeeting / 5)));
    const chairs = Math.min(6, Math.max(4, Math.ceil(inMeeting / tables)));
    const zs = tables === 1 ? [-1.4] : [-2.6, 0.6];
    zs.forEach((z) => {
      const t = { x: 3.9, z, chairs };
      roundTables.push(t);
      for (let i = 0; i < chairs; i++) {
        const a = (i / chairs) * Math.PI * 2;
        meetingSeats.push({ x: t.x + Math.cos(a) * 0.95, z: t.z + Math.sin(a) * 0.95, kind: 'meeting' });
      }
    });
  } else if (spec.meeting === 'boardroom') {
    const perSide = Math.min(4, Math.max(3, Math.ceil(inMeeting / 2)));
    boardroom = { x: 4.4, z: -1.9, chairsPerSide: perSide, length: perSide * BOARD_CHAIR_GAP + 0.2 };
    for (let k = 0; k < perSide; k++) {
      const z = boardroom.z + (k - (perSide - 1) / 2) * BOARD_CHAIR_GAP;
      meetingSeats.push({ x: boardroom.x - BOARD_CHAIR_X, z, kind: 'meeting' }, { x: boardroom.x + BOARD_CHAIR_X, z, kind: 'meeting' });
    }
  }

  return { desks, roundTables, boardroom, deskSeats: desks.map(deskSeat), meetingSeats, receptionSeat: spec.reception };
}

/* ---------- seating people ---------- */

export type Placement = { kind: 'seat'; seat: Seat } | { kind: 'walking' };

type Seatable = Pick<Employee, 'id' | 'presence' | 'role'>;

/** How many people on this floor need a desk, and how many are in a meeting right now. */
export function floorDemand(team: readonly Seatable[], spec: FloorSpec) {
  const onSite = team.filter((p) => p.presence !== 'off_shift');
  const atReception = spec.reception ? onSite.filter((p) => p.role === 'Receptionist').length : 0;
  return { people: onSite.length - atReception, inMeeting: onSite.filter((p) => p.presence === 'in_meeting').length };
}

/**
 * Who sits where. Everyone on site owns a desk (seeded shuffle, so it never
 * changes between loads); people in a meeting sit at the meeting table, people
 * away from their desk walk the front aisle, and the receptionist sits at reception.
 */
export function seatPeople(team: readonly Seatable[], layout: FloorLayout, seed: number): Map<string, Placement> {
  const r = createRandom(seed);
  const desks = layout.deskSeats.slice();
  for (let i = desks.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [desks[i], desks[j]] = [desks[j]!, desks[i]!];
  }
  const meeting = layout.meetingSeats.slice();
  let reception = layout.receptionSeat;
  const out = new Map<string, Placement>();

  for (const p of team) {
    if (p.presence === 'off_shift') continue;
    if (reception && p.role === 'Receptionist') {
      out.set(p.id, { kind: 'seat', seat: reception });
      reception = null;
      continue;
    }
    const own = desks.shift();
    if (p.presence === 'away' || !own) {
      out.set(p.id, { kind: 'walking' });
    } else if (p.presence === 'in_meeting' && meeting.length) {
      out.set(p.id, { kind: 'seat', seat: meeting.shift()! });
    } else {
      out.set(p.id, { kind: 'seat', seat: own });
    }
  }
  return out;
}

/** Stable per-department seed, so each floor shuffles differently. */
export function seedFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}
