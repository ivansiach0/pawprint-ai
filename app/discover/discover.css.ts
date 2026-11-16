import { style } from "@vanilla-extract/css";

export const page = style({
  width: "min(100% - 32px, 500px)",
  margin: "clamp(24px, 5vw, 64px) auto",
});

export const card = style({
  position: "relative",
  display: "flex",
  alignItems: "flex-end",
  aspectRatio: "4 / 5",
  overflow: "hidden",
  isolation: "isolate",
  borderRadius: 24,
  background: "#593b32",
  color: "white",
});

export const photo = style({
  objectFit: "cover",
  zIndex: -2,
});

export const details = style({
  width: "100%",
  padding: "48px 24px 24px",
  background: "linear-gradient(transparent, rgba(0, 0, 0, 0.85))",
});

export const name = style({ margin: 0, fontSize: "clamp(2rem, 6vw, 3rem)" });
export const description = style({ margin: "4px 0 0", fontSize: "1.125rem" });

export const header = style({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 16,
});

export const secondaryButton = style({
  padding: "8px 14px",
  border: "1px solid #862e30",
  borderRadius: 8,
  background: "transparent",
  color: "#862e30",
  font: "inherit",
  fontWeight: 700,
  cursor: "pointer",
  ":disabled": { opacity: 0.65, cursor: "wait" },
});

export const navigation = style({
  display: "flex",
  alignItems: "baseline",
  gap: 14,
});

export const navLink = style({ color: "#862e30", fontWeight: 700 });

export const actions = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 16,
});

export const galleryPage = style({
  width: "min(100% - 32px, 900px)",
  margin: "clamp(24px, 5vw, 64px) auto",
});

export const gallery = style({
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 245px), 1fr))",
});

export const swipeSurface = style({
  touchAction: "pan-y pinch-zoom",
  userSelect: "none",
  selectors: {
    '&[data-swipe-enabled="true"]': { cursor: "grab" },
    '&[data-swipe-enabled="true"]:active': { cursor: "grabbing" },
  },
});
