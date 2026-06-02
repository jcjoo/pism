import { supabase } from './supabase';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type PeriodFilter = '7d' | '30d' | '90d' | 'all';

export interface ProdutoRanking {
  product_id: string;
  name: string;
  description: string | null;
  total_qty: number;
  total_revenue: number;
}

export interface ClienteRanking {
  client_id: string;
  name: string;
  total_orders: number;
  total_spent: number;
}

export interface FaturamentoMes {
  month_key: string;  // "2025-01"
  label: string;      // "Jan/25"
  total: number;
  orders: number;
}

export type DueStatus = 'overdue' | 'today' | 'soon' | 'future';

export interface VendaAberta {
  id: string;
  client_name: string;
  due_date: string;
  total: number;
  status: DueStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function periodToDate(period: PeriodFilter): string | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function calcDueStatus(dueDateStr: string): DueStatus {
  const due = new Date(dueDateStr); due.setHours(0, 0, 0, 0);
  const now = new Date();           now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diff < 0)   return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7)  return 'soon';
  return 'future';
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ── Service ───────────────────────────────────────────────────────────────────

export const relatoriosService = {

  // Produto mais vendido
  async getProdutosMaisVendidos(period: PeriodFilter = 'all'): Promise<ProdutoRanking[]> {
    const since = periodToDate(period);

    let query = supabase
      .from('sale_items')
      .select(`product_id, quantity, price, products(name, description), sales!inner(created_at)`);

    if (since) query = query.gte('sales.created_at', since);

    const { data, error } = await query;
    if (error) throw error;

    const map: Record<string, ProdutoRanking> = {};
    for (const item of data ?? []) {
      const id = item.product_id;
      if (!map[id]) map[id] = {
        product_id: id,
        name: (item.products as any)?.name ?? 'Produto removido',
        description: (item.products as any)?.description ?? null,
        total_qty: 0,
        total_revenue: 0,
      };
      map[id].total_qty     += item.quantity ?? 0;
      map[id].total_revenue += (item.quantity ?? 0) * (item.price ?? 0);
    }
    return Object.values(map).sort((a, b) => b.total_qty - a.total_qty);
  },

  // Cliente que mais compra
  async getClientesMaisCompradores(period: PeriodFilter = 'all'): Promise<ClienteRanking[]> {
    const since = periodToDate(period);

    let query = supabase
      .from('sales')
      .select(`id, clientId, created_at, clients(name), sale_items(quantity, price)`);

    if (since) query = query.gte('created_at', since);

    const { data, error } = await query;
    if (error) throw error;

    const map: Record<string, ClienteRanking> = {};
    for (const sale of data ?? []) {
      const id = sale.clientId ?? '__unknown__';
      if (!map[id]) map[id] = {
        client_id: id,
        name: (sale.clients as any)?.name ?? 'Cliente removido',
        total_orders: 0,
        total_spent: 0,
      };
      map[id].total_orders += 1;
      map[id].total_spent  += ((sale.sale_items as any[]) ?? [])
        .reduce((a: number, i: any) => a + (i.quantity ?? 0) * (i.price ?? 0), 0);
    }
    return Object.values(map)
      .filter(c => c.client_id !== '__unknown__')
      .sort((a, b) => b.total_spent - a.total_spent);
  },

  // Faturamento mensal (últimos N meses)
  async getFaturamentoMensal(months = 6): Promise<FaturamentoMes[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1); since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('sales')
      .select(`created_at, sale_items(quantity, price)`)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Build skeleton of last N months
    const skeleton: Record<string, FaturamentoMes> = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i); d.setDate(1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      skeleton[key] = {
        month_key: key,
        label: `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        total: 0,
        orders: 0,
      };
    }

    for (const sale of data ?? []) {
      const d = new Date(sale.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!skeleton[key]) continue;
      skeleton[key].orders += 1;
      skeleton[key].total  += ((sale.sale_items as any[]) ?? [])
        .reduce((a: number, i: any) => a + (i.quantity ?? 0) * (i.price ?? 0), 0);
    }

    return Object.values(skeleton);
  },

  // Vendas em aberto (não recebidas)
  async getVendasEmAberto(): Promise<VendaAberta[]> {
    const { data, error } = await supabase
      .from('sales')
      .select(`id, clientId, dueDate, clients(name), sale_items(quantity, price)`)
      .is('received_at', null)
      .order('dueDate', { ascending: true });

    if (error) throw error;

    return (data ?? []).map(sale => ({
      id: sale.id,
      client_name: (sale.clients as any)?.name ?? 'Cliente removido',
      due_date: sale.dueDate,
      total: ((sale.sale_items as any[]) ?? [])
        .reduce((a: number, i: any) => a + (i.quantity ?? 0) * (i.price ?? 0), 0),
      status: calcDueStatus(sale.dueDate),
    }));
  },
};
