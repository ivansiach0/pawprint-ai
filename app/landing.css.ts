import { style } from "@vanilla-extract/css";

const mobile = "screen and (max-width: 800px)";

export const shell = style({
  width: "min(100% - 48px, 1180px)",
  marginInline: "auto",
  paddingBottom: "clamp(28px, 6vw, 84px)",
  "@media": { [mobile]: { width: "calc(100% - 32px)" } },
});

export const header = style({
  display: "flex",
  alignItems: "center",
  minHeight: "clamp(72px, 9vw, 108px)",
});

export const wordmark = style({
  color: "#862e30",
  fontSize: "1.65rem",
  fontWeight: 850,
  letterSpacing: "-0.065em",
});

export const hero = style({
  display: "grid",
  gridTemplateColumns: "0.9fr 1.1fr",
  alignItems: "stretch",
  overflow: "hidden",
  borderRadius: 32,
  background: "#ffe3d1",
  "@media": { [mobile]: { gridTemplateColumns: "1fr", borderRadius: 24 } },
});

export const intro = style({
  display: "grid",
  alignContent: "center",
  justifyItems: "start",
  gap: 24,
  padding: "clamp(40px, 5.5vw, 88px)",
  "@media": { [mobile]: { padding: "36px 28px", gap: 16 } },
});

export const title = style({
  margin: 0,
  maxWidth: "8ch",
  fontFamily: "Georgia, serif",
  fontSize: "clamp(3.15rem, 7vw, 6.5rem)",
  fontWeight: 400,
  lineHeight: 0.94,
  letterSpacing: "-0.075em",
});

export const accent = style({ color: "#862e30" });

export const description = style({
  maxWidth: "29ch",
  margin: 0,
  color: "#593b32",
  fontSize: "clamp(1rem, 2vw, 1.2rem)",
  lineHeight: 1.6,
});

export const photoFrame = style({
  position: "relative",
  minHeight: "clamp(460px, 48vw, 640px)",
  background: "#e0b282",
  "@media": { [mobile]: { minHeight: 0, aspectRatio: "1 / 1" } },
});

export const photo = style({ objectFit: "cover" });
