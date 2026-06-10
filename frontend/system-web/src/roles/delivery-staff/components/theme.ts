export const t = {
  bg: "#0A0A0B",
  surface: "#111113",
  surface2: "#16161A",
  surface3: "#1C1C21",
  border: "#1F1F23",
  borderStrong: "#2A2A30",
  text: "#FAFAFA",
  textMuted: "#A1A1AA",
  textDim: "#71717A",
  accent: "#F59E0B",
  accentSoft: "rgba(245,158,11,0.12)",
  accentBorder: "rgba(245,158,11,0.35)",
  success: "#10B981",
  successSoft: "rgba(16,185,129,0.12)",
  info: "#60A5FA",
  infoSoft: "rgba(96,165,250,0.12)",
  violet: "#A78BFA",
  violetSoft: "rgba(167,139,250,0.12)",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.12)",
};

export const statusMeta: Record<
  string,
  { label: string; color: string; soft: string; border: string }
> = {
  new: { label: "Đơn mới", color: t.accent, soft: t.accentSoft, border: t.accentBorder },
  picked: { label: "Đã nhận", color: t.violet, soft: t.violetSoft, border: "rgba(167,139,250,0.35)" },
  delivering: { label: "Đang giao", color: t.info, soft: t.infoSoft, border: "rgba(96,165,250,0.35)" },
  done: { label: "Thành công", color: t.success, soft: t.successSoft, border: "rgba(16,185,129,0.35)" },
  cancelled: { label: "Đã hủy", color: t.danger, soft: t.dangerSoft, border: "rgba(248,113,113,0.35)" },
};

export const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";
