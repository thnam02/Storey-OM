import { useMemo } from 'react';
import { describeActivity, type ActivityEntry } from '../data/activity';
import { formatDay } from '../lib/dates';
import { useSnapshot } from '../state/serverData';
import { Feed, Section } from './ui';

/** Recent changes from the activity log: time today, or the day for earlier ones. */
export function ActivityFeed({ entries, title = 'Recent activity', limit = 6 }: { entries: ActivityEntry[]; title?: string; limit?: number }) {
  const { team, viewerId } = useSnapshot();
  const names = useMemo(() => new Map(team.employees.map((e) => [e.id, e.name])), [team.employees]);
  if (!entries.length) return null;
  const nameOf = (id: string) => names.get(id) ?? 'someone';

  return (
    <Section title={title} small={entries.length > limit ? `Latest ${limit}` : undefined}>
      <Feed
        items={entries.slice(0, limit).map((e) => {
          const day = e.at.slice(0, 10);
          return { t: day === team.today ? e.at.slice(11, 16) : formatDay(day), body: describeActivity(e, nameOf, viewerId) };
        })}
      />
    </Section>
  );
}
