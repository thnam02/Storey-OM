import { incomingFor, isLowStock, lowStock, rackSpaceUsed } from '../../data/metrics';
import type { Department } from '../../data/types';
import { useSnapshot } from '../../state/serverData';
import { Chip, DeptLink, Feed, Kpi, Section } from '../ui';

/** Zones and capacity, stock against reorder points, and recent movements. */
export function WarehouseWorkspace({ dept }: { dept: Department }) {
  const W = useSnapshot().company.warehouse;
  const shipments = useSnapshot().company.importExport.shipments;

  return (
    <>
      <div className="kpis">
        <Kpi k="Rack space used" v={`${rackSpaceUsed(W)}%`} s="all zones" />
        <Kpi k="Trucks in today" v={W.inboundTrucks} />
        <Kpi k="Orders out today" v={W.outboundOrders} />
      </div>
      <Section title="Zones">
        <div className="zones">
          {W.zones.map((z) => (
            <div className="zone" key={z.name}>
              <div className="sub">Zone {z.name}</div>
              <div className="v">{z.fill}%</div>
              <div className="sub">{z.label}</div>
              <span className="bar" style={{ marginTop: 6 }}>
                <i style={{ width: `${z.fill}%`, background: z.fill >= 90 ? '#c98a12' : dept.color }} />
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Stock levels" small={`${lowStock(W).length} low`}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">On hand</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {W.stock.map((s) => {
                const low = isLowStock(s);
                const inc = low ? incomingFor(s.sku, shipments) : undefined;
                return (
                  <tr key={s.sku}>
                    <td>
                      <span className="mono">{s.sku}</span>
                      <div className="sub">{s.name}</div>
                      {inc && (
                        <div className="sub">
                          Restock: {inc.id} ({inc.status.toLowerCase()}, ETA {inc.eta})
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {s.onHand.toLocaleString('en-AU')}
                      <div className="sub">reorder at {s.reorder}</div>
                    </td>
                    <td>
                      <Chip tone={low ? 'bad' : 'ok'}>{low ? 'Low' : 'OK'}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Recent movements">
        <Feed items={W.moves.map((m) => ({ t: m.t, body: m.what }))} />
      </Section>
      <div className="note">
        Inbound shipments are managed by <DeptLink id="import-export" /> on Level 1 of the office.
      </div>
    </>
  );
}
