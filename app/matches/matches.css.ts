import { style } from "@vanilla-extract/css";

export const savedPet = style({ display: "grid", alignContent: "start", gap: 12 });

export const overlay = style({
  position: "fixed", inset: 0, background: "rgba(36, 22, 19, 0.55)", zIndex: 10,
});

export const dialog = style({
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(440px, calc(100vw - 32px))",
  maxHeight: "calc(100dvh - 32px)",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: 24,
  borderRadius: 20,
  background: "#fff8f0",
  color: "#593b32",
  boxShadow: "0 16px 64px rgba(36, 22, 19, 0.3)",
  zIndex: 11,
});

export const dialogActions = style({ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 });
