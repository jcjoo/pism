import { PeriodFilter, DueStatus } from "@/services/relatorios.service";
import { colors } from "@/theme/color";

export const R$ = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
export const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

export const PERIODS: { label: string; value: PeriodFilter }[] = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "3 meses", value: "90d" },
  { label: "Tudo", value: "all" },
];

export const RANK_COLORS: Record<
  number,
  { bg: string; badge: string; text: string }
> = {
  0: { bg: colors.warning.light, badge: "#F0C040", text: "white" },
  1: { bg: "#F5F5F5", badge: "#C0C0C0", text: "white" },
  2: { bg: "#FFF0EB", badge: "#CD7F32", text: "white" },
};

export const RANK_DEFAULT = {
  bg: "#F8F5FC",
  badge: "#D8CCE6",
  text: colors.primary.dark,
};

export const DUE_CONFIG: Record<
  DueStatus,
  { label: string; color: string; bg: string }
> = {
  overdue: {
    label: "Atrasado",
    color: colors.danger.main,
    bg: colors.danger.light,
  },
  today: {
    label: "Vence hoje",
    color: colors.warning.dark,
    bg: colors.warning.light,
  },
  soon: { label: "Esta semana", color: colors.secondary.dark, bg: "#F6FBEA" },
  future: {
    label: "A vencer",
    color: colors.primary.main,
    bg: colors.light.main,
  },
};
