import { colors } from '@/theme/color';
export type Step = 'filter' | 'list' | 'details' | 'edit';
export type StatusFilter = 'all' | 'pending' | 'received';
export type DueStatus = 'received' | 'overdue' | 'today' | 'soon' | 'ok';

export const STATUS_CONFIG: Record<DueStatus, { label: string; color: string; bg: string }> = {
  received: { label: 'Recebido',       color: colors.success.main, bg: colors.success.light },
  overdue:  { label: 'Atrasado',       color: colors.danger.main, bg: colors.danger.light },
  today:    { label: 'Vence hoje',     color: colors.warning.dark, bg: colors.warning.light },
  soon:     { label: 'Vence em breve', color: colors.secondary.dark, bg: '#F6FBEA' },
  ok:       { label: 'A receber',      color: colors.primary.main, bg: colors.light.main },
};
