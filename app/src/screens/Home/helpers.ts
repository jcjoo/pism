import { PendingSale } from '@/services/recebimentos.service';
import { DueStatus, CalendarPayment } from './types';
import { colors } from '@/theme/color';

export const renderPrice = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export const toDateKey = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const todayKey = () => toDateKey(new Date());

export const getDayStatus = (dateKey: string): DueStatus => {
  const today = todayKey();
  if (dateKey < today)  return 'overdue';
  if (dateKey === today) return 'today';
  return 'future';
};

export const STATUS_COLOR: Record<DueStatus, string> = {
  overdue: colors.danger.main,
  today:   colors.warning.main,
  future:  colors.primary.main,
};

export const STATUS_LABEL: Record<DueStatus, string> = {
  overdue: 'Atrasado',
  today:   'Vence hoje',
  future:  'A vencer',
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const DOW_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function buildPaymentMap(sales: PendingSale[]): Record<string, CalendarPayment[]> {
  const map: Record<string, CalendarPayment[]> = {};

  const add = (key: string, p: CalendarPayment) => {
    if (!map[key]) map[key] = [];
    map[key].push(p);
  };

  for (const sale of sales) {
    const clientName = sale.clients?.name ?? 'Cliente';

    if (sale.payment === 'cash') {
      const key = toDateKey(sale.dueDate);
      add(key, {
        saleId: clientName,
        clientName,
        amount: sale.sale_items.reduce((a, i) => a + i.price * i.quantity, 0),
        status: getDayStatus(key),
      });
    } else {
      const totalInstallments = sale.installments ?? 1;
      for (const inst of sale.sale_installments ?? []) {
        if (inst.received_at) continue;
        const key = toDateKey(inst.due_date);
        add(key, {
          saleId: sale.id + '-' + inst.id,
          clientName,
          amount: inst.amount,
          status: getDayStatus(key),
          installmentNumber: inst.installment_number,
          installmentTotal:  totalInstallments,
        });
      }
    }
  }

  return map;
}

export function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}
