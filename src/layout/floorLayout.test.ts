import { describe, expect, it } from 'vitest';
import { SAMPLE_EMPLOYEES } from '../data/sampleTeam';
import type { Employee } from '../data/types';
import {
  boardroomFootprint,
  DESK_ZONE,
  deskFootprint,
  desksNeeded,
  FLOOR_SPECS,
  floorDemand,
  generateFloorLayout,
  inside,
  MAX_DESKS,
  MEETING_ZONE,
  overlaps,
  roundTableFootprint,
  seatPeople,
  seedFor,
  type OfficeDepartmentId,
} from './floorLayout';

const OFFICE = Object.keys(FLOOR_SPECS) as OfficeDepartmentId[];
const teamOf = (id: string) => SAMPLE_EMPLOYEES.filter((e) => e.departmentId === id);

describe('generateFloorLayout', () => {
  it('is deterministic', () => {
    for (const id of OFFICE) {
      const a = generateFloorLayout(FLOOR_SPECS[id], { people: 9, inMeeting: 2 });
      const b = generateFloorLayout(FLOOR_SPECS[id], { people: 9, inMeeting: 2 });
      expect(a).toEqual(b);
    }
  });

  it('gives everyone a desk plus a spare, up to capacity', () => {
    expect(desksNeeded(0, 'pods')).toBe(0);
    expect(desksNeeded(8, 'pods')).toBe(10);
    expect(desksNeeded(14, 'pods')).toBe(16);
    expect(desksNeeded(6, 'rows')).toBe(7);
  });

  it.each(OFFICE)('%s: furniture stays in its zone and clear of fixed features, for 0 to 24 people', (id) => {
    const spec = FLOOR_SPECS[id];
    for (let people = 0; people <= 24; people++) {
      for (const inMeeting of [0, 2, 5, 9]) {
        const layout = generateFloorLayout(spec, { people, inMeeting });
        const desks = layout.desks.map(deskFootprint);
        desks.forEach((d, i) => {
          expect(inside(d, DESK_ZONE), `desk ${i} inside desk zone (${people} people)`).toBe(true);
          desks.slice(i + 1).forEach((o) => expect(overlaps(d, o)).toBe(false));
          spec.reserved.forEach((r) => expect(overlaps(d, r)).toBe(false));
        });
        const meeting = [...layout.roundTables.map(roundTableFootprint), ...(layout.boardroom ? [boardroomFootprint(layout.boardroom)] : [])];
        meeting.forEach((m, i) => {
          expect(inside(m, MEETING_ZONE), `meeting area ${i} inside meeting zone`).toBe(true);
          meeting.slice(i + 1).forEach((o) => expect(overlaps(m, o)).toBe(false));
          spec.reserved.forEach((r) => expect(overlaps(m, r)).toBe(false));
        });
        expect(layout.desks.length).toBeLessThanOrEqual(MAX_DESKS.pods);
      }
    }
  });

  it.each(OFFICE)('%s: has enough seats for the sample team', (id) => {
    const spec = FLOOR_SPECS[id];
    const demand = floorDemand(teamOf(id), spec);
    const layout = generateFloorLayout(spec, demand);
    expect(layout.deskSeats.length).toBeGreaterThan(demand.people);
    if (spec.meeting !== 'none') expect(layout.meetingSeats.length).toBeGreaterThanOrEqual(demand.inMeeting);
  });

  it('switches finance from rows to pods when rows would overflow', () => {
    const layout = generateFloorLayout(FLOOR_SPECS.finance, { people: 15, inMeeting: 0 });
    expect(layout.desks.some((d) => d.ry !== 0)).toBe(true);
  });
});

describe('seatPeople', () => {
  const person = (id: string, presence: Employee['presence'] = 'at_desk', role = 'Staff') => ({ id, presence, role });

  it.each(OFFICE)('%s: places every on-site person once, never two in one seat', (id) => {
    const team = teamOf(id);
    const spec = FLOOR_SPECS[id];
    const layout = generateFloorLayout(spec, floorDemand(team, spec));
    const placed = seatPeople(team, layout, seedFor(id));
    expect(placed.size).toBe(team.filter((p) => p.presence !== 'off_shift').length);
    const seats = [...placed.values()].flatMap((p) => (p.kind === 'seat' ? [`${p.seat.x},${p.seat.z}`] : []));
    expect(new Set(seats).size).toBe(seats.length);
  });

  it('is the same on every load', () => {
    const team = teamOf('sales');
    const layout = generateFloorLayout(FLOOR_SPECS.sales, floorDemand(team, FLOOR_SPECS.sales));
    expect(seatPeople(team, layout, seedFor('sales'))).toEqual(seatPeople(team, layout, seedFor('sales')));
  });

  it('sends people to the right place for their presence', () => {
    const team = [person('desk'), person('meet', 'in_meeting'), person('away', 'away'), person('front', 'at_desk', 'Receptionist'), person('home', 'off_shift')];
    const spec = FLOOR_SPECS['import-export'];
    const withMeeting = { ...spec, meeting: 'round' as const };
    const layout = generateFloorLayout(withMeeting, floorDemand(team, withMeeting));
    const placed = seatPeople(team, layout, 1);
    expect(placed.get('desk')).toMatchObject({ kind: 'seat', seat: { kind: 'desk' } });
    expect(placed.get('meet')).toMatchObject({ kind: 'seat', seat: { kind: 'meeting' } });
    expect(placed.get('away')).toEqual({ kind: 'walking' });
    expect(placed.get('front')).toMatchObject({ kind: 'seat', seat: { kind: 'reception' } });
    expect(placed.has('home')).toBe(false);
  });

  it('sits people in a meeting at their desk when the floor has no meeting area', () => {
    const team = [person('a', 'in_meeting')];
    const layout = generateFloorLayout(FLOOR_SPECS.finance, floorDemand(team, FLOOR_SPECS.finance));
    expect(seatPeople(team, layout, 1).get('a')).toMatchObject({ kind: 'seat', seat: { kind: 'desk' } });
  });

  it('lets people beyond capacity hot-desk by walking', () => {
    const team = Array.from({ length: 25 }, (_, i) => person(`p${i}`));
    const layout = generateFloorLayout(FLOOR_SPECS.sales, floorDemand(team, FLOOR_SPECS.sales));
    const placed = [...seatPeople(team, layout, 1).values()];
    expect(placed.filter((p) => p.kind === 'seat')).toHaveLength(MAX_DESKS.pods);
    expect(placed.filter((p) => p.kind === 'walking')).toHaveLength(5);
  });
});
