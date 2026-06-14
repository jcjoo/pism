export type Step = 'filter' | 'list' | 'details' | 'edit';
export type StatusFilter = 'all' | 'pending' | 'received';
export type DueStatus = 'received' | 'overdue' | 'today' | 'soon' | 'ok';

export const STATUS_CONFIG: Record<DueStatus, { label: string; color: string; bg: string }> = {
  received: { label: 'Recebido',       color: '#1B8A3D', bg: '#E6F7EC' },
  overdue:  { label: 'Atrasado',       color: '#DF1515', bg: '#FFF0F0' },
  today:    { label: 'Vence hoje',     color: '#B86E00', bg: '#FFF8E6' },
  soon:     { label: 'Vence em breve', color: '#758C36', bg: '#F6FBEA' },
  ok:       { label: 'A receber',      color: '#5A189A', bg: '#EAE3F0' },
};
