import { PeriodFilter, DueStatus } from '@/services/relatorios.service';

export const R$ = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
export const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');

export const PERIODS: { label: string; value: PeriodFilter }[] = [
  { label: '7 dias',  value: '7d'  },
  { label: '30 dias', value: '30d' },
  { label: '3 meses', value: '90d' },
  { label: 'Tudo',    value: 'all' },
];

export const RANK_COLORS: Record<number, { bg: string; badge: string; text: string }> = {
  0: { bg: '#FFF8E6', badge: '#F0C040', text: '#fff' },
  1: { bg: '#F5F5F5', badge: '#C0C0C0', text: '#fff' },
  2: { bg: '#FFF0EB', badge: '#CD7F32', text: '#fff' },
};

export const RANK_DEFAULT = { bg: '#F8F5FC', badge: '#D8CCE6', text: '#3C096C' };

export const DUE_CONFIG: Record<DueStatus, { label: string; color: string; bg: string }> = {
  overdue: { label: 'Atrasado',    color: '#DF1515', bg: '#FFF0F0' },
  today:   { label: 'Vence hoje',  color: '#B86E00', bg: '#FFF8E6' },
  soon:    { label: 'Esta semana', color: '#758C36', bg: '#F6FBEA' },
  future:  { label: 'A vencer',    color: '#5A189A', bg: '#EAE3F0' },
};
