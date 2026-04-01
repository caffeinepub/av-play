import { ScrollArea } from "@/components/ui/scroll-area";
import type { RoundView } from "../backend.d";
import { getColorConfig } from "../utils/gameUtils";

interface RoundHistoryProps {
  rounds: RoundView[];
}

const MOCK_HISTORY = [
  { id: 42, result: "green", time: "2m ago" },
  { id: 41, result: "red", time: "3m ago" },
  { id: 40, result: "violet", time: "5m ago" },
  { id: 39, result: "green", time: "7m ago" },
  { id: 38, result: "red", time: "9m ago" },
  { id: 37, result: "green", time: "11m ago" },
  { id: 36, result: "violet", time: "13m ago" },
  { id: 35, result: "red", time: "15m ago" },
];

function timeAgo(nsTimestamp: bigint): string {
  const ms = Number(nsTimestamp) / 1_000_000;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function RoundHistory({ rounds }: RoundHistoryProps) {
  const completed = rounds.filter((r) => r.result);
  const items = completed.length > 0 ? completed.slice(-20).reverse() : null;

  return (
    <div className="card-surface rounded-xl p-4" data-ocid="history.panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Round History
        </h3>
        <span className="text-xs text-muted-foreground">
          {items ? `Last ${items.length} rounds` : "No history yet"}
        </span>
      </div>

      {/* Dot trail */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(items ?? MOCK_HISTORY).slice(0, 20).map((item) => {
          const result = "result" in item ? item.result! : (item as any).result;
          const id =
            "roundId" in item ? Number(item.roundId) : (item as any).id;
          const cfg = getColorConfig(result);
          return (
            <div
              key={`dot-${id}`}
              className="w-5 h-5 rounded-full"
              style={{ background: cfg.hex, boxShadow: `0 0 6px ${cfg.hex}88` }}
              title={cfg.label}
            />
          );
        })}
      </div>

      <ScrollArea className="h-52">
        <table className="w-full text-xs" data-ocid="history.table">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left pb-2 font-medium">Round</th>
              <th className="text-left pb-2 font-medium">Result</th>
              <th className="text-right pb-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {items
              ? items.map((round, i) => {
                  const cfg = getColorConfig(round.result!);
                  return (
                    <tr
                      key={Number(round.roundId)}
                      className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                      data-ocid={`history.item.${i + 1}`}
                    >
                      <td className="py-2 font-mono text-muted-foreground">
                        #{Number(round.roundId)}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{
                              background: cfg.hex,
                              boxShadow: `0 0 4px ${cfg.hex}`,
                            }}
                          />
                          <span className={`font-semibold ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {timeAgo(round.startTime)}
                      </td>
                    </tr>
                  );
                })
              : MOCK_HISTORY.map((item, i) => {
                  const cfg = getColorConfig(item.result);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                      data-ocid={`history.item.${i + 1}`}
                    >
                      <td className="py-2 font-mono text-muted-foreground">
                        #{item.id}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{
                              background: cfg.hex,
                              boxShadow: `0 0 4px ${cfg.hex}`,
                            }}
                          />
                          <span className={`font-semibold ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {item.time}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
