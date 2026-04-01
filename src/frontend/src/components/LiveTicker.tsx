import { useEffect, useRef, useState } from "react";

const FAKE_EVENTS = [
  { user: "user2331", amount: 120, color: "green" },
  { user: "player9821", amount: 200, color: "violet" },
  { user: "trader4472", amount: 90, color: "red" },
  { user: "lucky7777", amount: 450, color: "violet" },
  { user: "user5563", amount: 100, color: "green" },
  { user: "winner991", amount: 180, color: "green" },
  { user: "ace1234", amount: 300, color: "violet" },
  { user: "betpro88", amount: 150, color: "red" },
  { user: "user6610", amount: 80, color: "green" },
  { user: "high5star", amount: 225, color: "violet" },
  { user: "trader0042", amount: 110, color: "red" },
  { user: "user3309", amount: 400, color: "violet" },
  { user: "bigwin22", amount: 160, color: "green" },
  { user: "user7741", amount: 95, color: "green" },
  { user: "probet55", amount: 500, color: "violet" },
  { user: "user1198", amount: 130, color: "red" },
  { user: "coinguru", amount: 220, color: "green" },
  { user: "user8823", amount: 75, color: "red" },
  { user: "fastwin3", amount: 350, color: "violet" },
  { user: "user4456", amount: 140, color: "green" },
];

const COLOR_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    green: {
      bg: "oklch(0.85 0.2 168 / 0.1)",
      text: "oklch(0.85 0.2 168)",
      dot: "#33F5A4",
    },
    red: {
      bg: "oklch(0.60 0.22 25 / 0.1)",
      text: "oklch(0.70 0.18 25)",
      dot: "#FF4A4A",
    },
    violet: {
      bg: "oklch(0.57 0.28 300 / 0.1)",
      text: "oklch(0.68 0.25 300)",
      dot: "#B455FF",
    },
  };

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function LiveTicker() {
  const [items, setItems] = useState(() => shuffle(FAKE_EVENTS));
  const tickerRef = useRef<HTMLDivElement>(null);

  // Occasionally inject a new random event to keep it dynamic
  useEffect(() => {
    const id = setInterval(() => {
      const random =
        FAKE_EVENTS[Math.floor(Math.random() * FAKE_EVENTS.length)];
      setItems((prev) => {
        const next = [...prev, random];
        return next.slice(-30); // keep max 30
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Duplicate items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      className="overflow-hidden relative"
      style={{
        background: "oklch(0.07 0.015 240 / 0.95)",
        borderTop: "1px solid oklch(0.2 0.03 240 / 0.6)",
        height: "32px",
      }}
    >
      {/* Fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, oklch(0.07 0.015 240), transparent)",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to left, oklch(0.07 0.015 240), transparent)",
        }}
      />

      <div
        ref={tickerRef}
        className="flex items-center h-full"
        style={{
          animation: "ticker-scroll 40s linear infinite",
          width: "max-content",
        }}
      >
        {doubled.map((evt, i) => {
          const style = COLOR_STYLES[evt.color];
          return (
            <div
              key={`tick-${i}-${evt.user}`}
              className="flex items-center gap-1.5 mx-4 shrink-0"
            >
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: style.dot }}
              />
              <span className="text-[11px] text-muted-foreground font-medium">
                <span className="font-bold" style={{ color: style.text }}>
                  {evt.user}
                </span>
                {" earned "}
                <span className="font-bold" style={{ color: style.text }}>
                  {evt.amount} coins
                </span>
                {" on "}
                <span style={{ color: style.text }}>{evt.color}</span>
              </span>
              <span className="text-muted-foreground/30 mx-1">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
