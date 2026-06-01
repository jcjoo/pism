import { supabase } from './supabase';

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
    municipio: {
      nome: string;
      uf: string;
    } | null;
  } | null;
  sale_items: Array<{
    id: string;
    quantity: number;
    price: number;
    products: { name: string } | null;
  }>;
  sale_installments: SaleInstallment[];
}

export const recebimentosService = {
  async getPending(): Promise<PendingSale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        dueDate,
        created_at,
        payment,
        installments,
        received_at,
        clients (
          id,
          name,
          address,
          cep,
          municipio (
            nome,
            uf
          )
        ),
        sale_items (
          id,
          quantity,
          price,
          products (name)
        ),
        sale_installments (
          id,
          installment_number,
          due_date,
          amount,
          received_at
        )
      `)
      .order('dueDate', { ascending: true });

    if (error) throw error;

    return ((data || []) as PendingSale[]).filter(sale => {
      if (sale.payment === 'cash') return !sale.received_at;
      return sale.sale_installments.some(i => !i.received_at);
    });
  },

  async markReceived(saleId: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .update({ received_at: new Date().toISOString(), received_amount: amount })
      .eq('id', saleId);
    if (error) throw error;
  },

  async markInstallmentsReceived(installmentIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('sale_installments')
      .update({ received_at: new Date().toISOString() })
      .in('id', installmentIds);
    if (error) throw error;
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
};
