import { ScrollArea } from "@/components/ui/scroll-area";
import { getColorConfig, getResultForRound } from "../utils/gameUtils";

export interface HistoryEntry {
  roundId: number;
  color: "red" | "green" | "violet";
  size: "BIG" | "SMALL";
  timestamp: number;
}

interface RoundHistoryProps {
  history: HistoryEntry[];
}

function getSeedHistory(): HistoryEntry[] {
  const now = Math.floor(Date.now() / 60000);
  return Array.from({ length: 10 }, (_, i) => {
    const roundId = now - (i + 1);
    const result = getResultForRound(roundId);
    return {
      roundId,
      color: result.color,
      size: result.size,
      timestamp: (roundId + 1) * 60000,
    };
  });
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function RoundHistory({ history }: RoundHistoryProps) {
  const seed = getSeedHistory();

  // Merge live history with seed, deduplicate by roundId, newest first, max 30
  const merged = [...history, ...seed]
    .reduce<HistoryEntry[]>((acc, entry) => {
      if (!acc.find((e) => e.roundId === entry.roundId)) acc.push(entry);
      return acc;
    }, [])
    .sort((a, b) => b.roundId - a.roundId)
    .slice(0, 30);

  return (
    <div className="card-surface rounded-xl p-4" data-ocid="history.panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Round History
        </h3>
        <span className="text-xs text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">
          Last {merged.length} rounds
        </span>
      </div>

      {/* Color dot trail */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {merged.slice(0, 20).map((entry) => {
          const cfg = getColorConfig(entry.color);
          return (
            <div
              key={`dot-${entry.roundId}`}
              className="w-5 h-5 rounded-full"
              style={{
                background: cfg.hex,
                boxShadow: `0 0 6px ${cfg.hex}88`,
              }}
              title={`${cfg.label} / ${entry.size}`}
            />
          );
        })}
      </div>

      <ScrollArea className="h-52">
        <table className="w-full text-xs" data-ocid="history.table">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left pb-2 font-medium">Round</th>
              <th className="text-left pb-2 font-medium">Color</th>
              <th className="text-left pb-2 font-medium">Size</th>
              <th className="text-right pb-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {merged.map((entry, i) => {
              const cfg = getColorConfig(entry.color);
              const sizeColor = entry.size === "BIG" ? "#4AA8FF" : "#FF8C42";
              return (
                <tr
                  key={entry.roundId}
                  className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                  data-ocid={`history.item.${i + 1}`}
                >
                  <td className="py-2 font-mono text-muted-foreground">
                    #{entry.roundId}
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
                  <td className="py-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: `${sizeColor}22`,
                        color: sizeColor,
                        border: `1px solid ${sizeColor}55`,
                      }}
                    >
                      {entry.size}
                    </span>
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {timeAgo(entry.timestamp)}
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
