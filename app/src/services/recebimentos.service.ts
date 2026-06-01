import { supabase } from './supabase';

export interface PendingSale {
  id: string;
  dueDate: string;
  payment: string;
  installments: number | null;
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
}

export const recebimentosService = {
  async getPending(): Promise<PendingSale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        dueDate,
        payment,
        installments,
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
        )
      `)
      .is('received_at', null)
      .order('dueDate', { ascending: true });

    if (error) throw error;
    return (data || []) as PendingSale[];
  },

  async markReceived(saleId: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .update({
        received_at: new Date().toISOString(),
        received_amount: amount,
      })
      .eq('id', saleId);

    if (error) throw error;
  },
};
