import { supabase } from './supabase';
import { storageService, STORAGE_KEYS } from './storage.service';

export interface SaleInstallment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  received_at: string | null;
}

export interface PendingSale {
  id: string;
  dueDate: string;
  created_at: string;
  payment: string;
  installments: number | null;
  received_at: string | null;
  clients: {
    id: string;
    name: string;
    address: string;
    cep: string | null;
    latitude: number | null;
    longitude: number | null;
    municipio: { nome: string; uf: string } | null;
  } | null;
  sale_items: Array<{
    id: string;
    quantity: number;
    price: number;
    products: { name: string } | null;
  }>;
  sale_installments: SaleInstallment[];
}

const QUERY = `
  id,
  dueDate,
  created_at,
  payment,
  installments,
  received_at,
  clients (id, name, address, cep, latitude, longitude, municipio (nome, uf)),
  sale_items (id, quantity, price, products (name)),
  sale_installments (id, installment_number, due_date, amount, received_at)
`;

function filterPending(data: PendingSale[]): PendingSale[] {
  return data.filter(sale => {
    if (sale.payment === 'cash') return !sale.received_at;
    return sale.sale_installments.some(i => !i.received_at);
  });
}

export const recebimentosService = {
  async getPending(): Promise<PendingSale[]> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(QUERY)
        .order('dueDate', { ascending: true });
      if (error) throw error;
      const result = filterPending((data || []) as PendingSale[]);
      await storageService.setItem(STORAGE_KEYS.PENDING_SALES, result);
      return result;
    } catch {
      const cached = await storageService.getItem<PendingSale[]>(STORAGE_KEYS.PENDING_SALES);
      return cached ?? [];
    }
  },

  async markReceived(saleId: string, amount: number): Promise<void> {
    const now = new Date().toISOString();
    let queued = false;
    try {
      const { error } = await supabase
        .from('sales')
        .update({ received_at: now, received_amount: amount })
        .eq('id', saleId);
      if (error) throw error;
    } catch {
      await storageService.enqueue({ type: 'mark_received', payload: { saleId, amount } });
      queued = true;
    }
    // Optimistic cache update
    const cached = await storageService.getItem<PendingSale[]>(STORAGE_KEYS.PENDING_SALES);
    if (cached) {
      await storageService.setItem(
        STORAGE_KEYS.PENDING_SALES,
        cached.map(s => s.id === saleId ? { ...s, received_at: now } : s),
      );
    }
    if (queued) throw new Error('Sem conexão — operação salva para sincronizar depois.');
  },

  async markInstallmentsReceived(installmentIds: string[]): Promise<void> {
    const now = new Date().toISOString();
    let queued = false;
    try {
      const { error } = await supabase
        .from('sale_installments')
        .update({ received_at: now })
        .in('id', installmentIds);
      if (error) throw error;
    } catch {
      await storageService.enqueue({
        type: 'mark_installments_received',
        payload: { installmentIds },
      });
      queued = true;
    }
    // Optimistic cache update
    const cached = await storageService.getItem<PendingSale[]>(STORAGE_KEYS.PENDING_SALES);
    if (cached) {
      await storageService.setItem(
        STORAGE_KEYS.PENDING_SALES,
        cached.map(s => ({
          ...s,
          sale_installments: s.sale_installments.map(i =>
            installmentIds.includes(i.id) ? { ...i, received_at: now } : i,
          ),
        })),
      );
    }
    if (queued) throw new Error('Sem conexão — operação salva para sincronizar depois.');
  },

  async updateReceived(saleId: string, receivedAt: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .update({ received_at: receivedAt, received_amount: amount })
      .eq('id', saleId);
    if (error) throw error;
  },

  async removeReceived(saleId: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .update({ received_at: null, received_amount: null })
      .eq('id', saleId);
    if (error) throw error;
  },

  async getQueueLength(): Promise<number> {
    return (await storageService.getQueue()).length;
  },
};
