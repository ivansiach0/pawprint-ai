import { globalStyle, style } from "@vanilla-extract/css";

export const panel = style({
  width: "min(100% - 32px, 460px)",
  margin: "clamp(24px, 8vw, 96px) auto",
  padding: "clamp(20px, 5vw, 40px)",
  borderRadius: 24,
  background: "#ffe3d1",
});

export const form = style({ display: "grid", gap: 16 });

export const field = style({ display: "grid", gap: 6 });

globalStyle(`${panel} a`, { color: "#862e30" });
globalStyle(`${field} input`, {
  minWidth: 0,
  padding: 10,
  border: "1px solid #ab7767",
  borderRadius: 8,
  background: "#fffaf4",
  font: "inherit",
});

export const primary = style({
  border: 0,
  borderRadius: 8,
  background: "#862e30",
  color: "white",
  font: "inherit",
  fontWeight: 700,
  padding: "10px 16px",
  cursor: "pointer",
  ":disabled": { opacity: 0.65, cursor: "wait" },
});
