import { DueStatus, STATUS_CONFIG } from './types';

export const renderPrice = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
export const formatDate  = (d: Date | null | string) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
export const calcTotal   = (items: any[]) => items.reduce((a, i) => a + i.price * i.quantity, 0);

export const getDaysUntilDue = (dueDate: string) => {
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const now = new Date();        now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
};

export function getDueStatus(sale: any): DueStatus {
  if (sale.received_at) return 'received';
  const d = getDaysUntilDue(sale.dueDate);
  if (d < 0)   return 'overdue';
  if (d === 0) return 'today';
  if (d <= 5)  return 'soon';
  return 'ok';
}
