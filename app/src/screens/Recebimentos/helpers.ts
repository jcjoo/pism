import { Linking } from 'react-native';
import { PendingSale, SaleInstallment } from '@/services/recebimentos.service';
import { DueStatus, RouteStop } from './types';

export const saleTotal        = (sale: PendingSale) => sale.sale_items.reduce((acc, i) => acc + i.price * i.quantity, 0);
export const renderPrice      = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
export const formatDate       = (d: string | Date | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
export const isInstallment    = (sale: PendingSale) => sale.payment !== 'cash' && (sale.installments ?? 1) > 1;
export const installmentCount = (sale: PendingSale) => sale.installments ?? 1;

export const pendingInstallments = (sale: PendingSale): SaleInstallment[] =>
  (sale.sale_installments ?? [])
    .filter(i => !i.received_at)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

export const sortedInstallments = (sale: PendingSale): SaleInstallment[] =>
  [...(sale.sale_installments ?? [])].sort((a, b) => a.installment_number - b.installment_number);

export const effectiveDueDate = (sale: PendingSale): string => {
  if (!isInstallment(sale)) return sale.dueDate;
  const pending = pendingInstallments(sale);
  return pending.length > 0 ? pending[0].due_date : sale.dueDate;
};

export const pendingTotal = (sale: PendingSale): number => {
  if (!isInstallment(sale)) return saleTotal(sale);
  return pendingInstallments(sale).reduce((a, i) => a + i.amount, 0);
};

export const getDays = (dueDate: string, ref: Date = new Date()) => {
  const due  = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const base = new Date(ref);     base.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - base.getTime()) / 86400000);
};

export const getStatus = (dueDate: string, ref?: Date): DueStatus => {
  const d = getDays(dueDate, ref);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 7) return 'week';
  return 'future';
};

export const STATUS: Record<DueStatus, { label: string; color: string }> = {
  overdue: { label: 'Atrasado',    color: '#DF1515' },
  today:   { label: 'Vence hoje',  color: '#FF8C00' },
  week:    { label: 'Esta semana', color: '#758C36' },
  future:  { label: 'Em dia',      color: '#5A189A' },
};

export function openDrivingNav(address: string, city: string) {
  const q = encodeURIComponent([address, city, 'Brasil'].filter(Boolean).join(', '));
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`,
  ).catch(() => {});
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestNeighborSort(
  stops: RouteStop[],
  originLat?: number,
  originLon?: number,
): RouteStop[] {
  if (stops.length < 2) return stops;

  const hasCoord = (s: RouteStop) =>
    s.sale.clients?.latitude != null && s.sale.clients?.longitude != null;

  if (!stops.some(hasCoord)) return stops;

  const remaining = [...stops];
  const sorted: RouteStop[] = [];

  // Start from user's current location if available; otherwise from first stop
  if (originLat != null && originLon != null) {
    let nearestIdx  = 0;
    let nearestDist = Infinity;
    remaining.forEach((stop, i) => {
      const lat = stop.sale.clients?.latitude;
      const lon = stop.sale.clients?.longitude;
      if (lat == null || lon == null) return;
      const d = haversineKm(originLat, originLon, lat, lon);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    sorted.push(remaining.splice(nearestIdx, 1)[0]);
  } else {
    sorted.push(remaining.splice(0, 1)[0]);
  }

  while (remaining.length > 0) {
    const last    = sorted[sorted.length - 1];
    const lastLat = last.sale.clients?.latitude;
    const lastLon = last.sale.clients?.longitude;

    if (lastLat == null || lastLon == null) {
      sorted.push(remaining.splice(0, 1)[0]);
      continue;
    }

    let nearestIdx  = 0;
    let nearestDist = Infinity;

    remaining.forEach((stop, i) => {
      const lat = stop.sale.clients?.latitude;
      const lon = stop.sale.clients?.longitude;
      if (lat == null || lon == null) return;
      const d = haversineKm(lastLat, lastLon, lat, lon);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });

    sorted.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return sorted;
}

export function buildRoute(
  sales: PendingSale[],
  workHours: number,
  avgMins: number,
  targetDate: Date,
  originLat?: number,
  originLon?: number,
): { route: RouteStop[]; excluded: RouteStop[] } {
  const maxStops = Math.max(1, Math.floor((workHours * 60) / avgMins));

  const scored: RouteStop[] = sales.map(sale => {
    const due    = effectiveDueDate(sale);
    const days   = getDays(due, targetDate);
    const status = getStatus(due, targetDate);
    const city   = sale.clients?.municipio?.nome ||
      sale.clients?.address?.split(',')[0]?.trim() || 'Sem cidade';
    return { sale, status, days, total: pendingTotal(sale), city };
  });

  const priorityOf = (s: RouteStop) => {
    if (s.status === 'overdue') return -1000 + s.days;
    if (s.status === 'today')   return 0;
    if (s.status === 'week')    return s.days;
    return 100 + s.days;
  };

  const pool     = [...scored].sort((a, b) => priorityOf(a) - priorityOf(b));
  const selected = pool.splice(0, maxStops);
  const route    = nearestNeighborSort(selected, originLat, originLon);

  return { route, excluded: pool };
}
