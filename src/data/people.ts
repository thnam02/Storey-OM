import type { Employee } from './types';

const PRESENCE_LABEL: Record<Employee['presence'], string> = {
  at_desk: 'At desk',
  in_meeting: 'In a meeting',
  away: 'Away from desk',
  on_floor: 'On the floor',
  off_shift: 'Off shift',
};

/** Human label for where someone is right now. */
export function presenceLabel(e: Pick<Employee, 'presence' | 'activity'>): string {
  if (e.activity === 'forklift') return 'Driving forklift';
  return PRESENCE_LABEL[e.presence];
}
