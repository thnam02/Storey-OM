import { isLowStock } from '../../data/metrics';
import type { ShipmentStatus } from '../../data/types';
import { addDays, formatDay, parseDayMonth } from '../../lib/dates';
import { useSnapshot } from '../../state/serverData';
import { Chip, DeptLink, Feed, Kpi, Section, type Tone } from '../ui';

const SHIP_TONE: Record<ShipmentStatus, Tone> = { 'At customs': 'warn', 'In transit': 'info', Booked: 'muted', Delivered: 'ok' };
const WORDS = ['no', 'one', 'two', 'three'];
const products = (n: number) => `${WORDS[n] ?? n} product${n === 1 ? '' : 's'}`;

/** Shipments in and out (route, mode, ETA, customs) and paperwork to do. */
export function ImportExportWorkspace() {
  const I = useSnapshot().company.importExport;
  const stock = useSnapshot().company.warehouse.stock;
  const today = useSnapshot().team.today;

  const active = I.shipments.filter((s) => s.status !== 'Delivered');
  const arrivingBy = addDays(today, 6);
  const arriving = active.filter((s) => {
    const eta = parseDayMonth(s.eta, today);
    return eta !== null && eta <= arrivingBy;
  });
  const held = I.shipments.filter((s) => s.status === 'At customs');
  const lowSkus = new Set(stock.filter(isLowStock).map((s) => s.sku));
  const restocks = active
    .filter((s) => s.dir === 'Import')
    .map((s) => ({ id: s.id, n: s.skus.filter((sku) => lowSkus.has(sku)).length }))
    .filter((r) => r.n > 0);

  return (
    <>
      <div className="kpis">
        <Kpi
          k="Active shipments"
          v={active.length}
          s={`${active.filter((s) => s.dir === 'Import').length} import · ${active.filter((s) => s.dir === 'Export').length} export`}
        />
        <Kpi k={`Arriving by ${formatDay(arrivingBy)}`} v={arriving.length} />
        <Kpi k="Held at customs" v={held.length} s={held.map((s) => s.id).join(', ')} />
      </div>
      <Section title="Shipments">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Shipment</th>
                <th>Status</th>
                <th className="num">Date</th>
              </tr>
            </thead>
            <tbody>
              {I.shipments.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="mono">{s.id}</span>
                    <div className="sub">{s.route}</div>
                    <div className="sub">{s.goods}</div>
                  </td>
                  <td>
                    <Chip tone={SHIP_TONE[s.status]}>{s.status}</Chip>
                    <div className="sub">
                      {s.mode} · {s.load}
                    </div>
                  </td>
                  <td className="num">
                    {s.status === 'Delivered' ? 'Arrived' : 'ETA'} {s.eta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Paperwork to do">
        <Feed
          items={I.paperwork.map((p) => ({
            t: p.id.split('-')[1] ?? p.id,
            body: (
              <>
                <span className="mono">{p.id}</span> · {p.what}
              </>
            ),
          }))}
        />
      </Section>
      <div className="note">
        Imports go to the <DeptLink id="warehouse" /> when they land.
        {restocks.length > 0 &&
          ` ${restocks.map((r) => `${r.id} restocks ${products(r.n)}`).join(' and ')} that ${restocks.length === 1 && restocks[0]!.n === 1 ? 'is' : 'are'} below reorder level.`}
      </div>
    </>
  );
}
