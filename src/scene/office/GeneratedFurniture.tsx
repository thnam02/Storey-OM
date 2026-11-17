import type { FloorLayout } from '../../layout/floorLayout';
import { BoardroomTable, Desk, RoundTable } from '../props/furniture';

/** Desks and meeting furniture from the generated floor layout. */
export function GeneratedFurniture({ layout }: { layout: FloorLayout }) {
  return (
    <>
      {layout.desks.map((d, i) => (
        <Desk key={i} x={d.x} z={d.z} ry={d.ry} />
      ))}
      {layout.roundTables.map((t, i) => (
        <RoundTable key={i} x={t.x} z={t.z} chairs={t.chairs} />
      ))}
      {layout.boardroom && <BoardroomTable x={layout.boardroom.x} z={layout.boardroom.z} length={layout.boardroom.length} seats={layout.meetingSeats} />}
    </>
  );
}
