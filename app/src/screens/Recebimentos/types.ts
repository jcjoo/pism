import { PendingSale } from '@/services/recebimentos.service';

export type DueStatus = 'overdue' | 'today' | 'week' | 'future';
export type ManualFilter = 'all' | 'overdue' | 'today' | 'week';

export interface RouteStop {
  sale: PendingSale;
  status: DueStatus;
  days: number;
  total: number;
  city: string;
}

export interface SwipeCardHandle {
  animateOut: (dir: 'left' | 'right') => Promise<void>;
}
