import { supabase } from './supabase';
import { Tables, TablesInsert } from '../types/database.types';

export type Sale = Tables<'sales'>;
export type SaleItem = Tables<'sale_items'>;

export interface SaleFilters {
  clientId?: string;
  dateStart?: string;
  dateEnd?: string;
  dueStart?: string;
  dueEnd?: string;
}

export const salesService = {
  async getSales(filters: SaleFilters) {
    let query = supabase
      .from('sales')
      .select(`
        *,
        clients (*),
        sale_items (*, products (*))
      `)
      .order('created_at', { ascending: false });

    if (filters.clientId) {
      query = query.eq('clientId', filters.clientId);
    }
    if (filters.dateStart) {
      query = query.gte('created_at', filters.dateStart);
    }
    if (filters.dateEnd) {
      query = query.lte('created_at', filters.dateEnd);
    }
    if (filters.dueStart) {
      query = query.gte('dueDate', filters.dueStart);
    }
    if (filters.dueEnd) {
      query = query.lte('dueDate', filters.dueEnd);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(sale: TablesInsert<'sales'>, items: Omit<TablesInsert<'sale_items'>, 'sale_id'>[]) {
    // 1. Create Sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert(sale)
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Create Items
    const itemsToInsert = items.map(item => ({ ...item, sale_id: saleData.id }));
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsToInsert as TablesInsert<'sale_items'>[]);

    if (itemsError) throw itemsError;

    // 3. Generate installment records for parcelated sales
    if (sale.payment === 'installments' && sale.installments && sale.installments > 1) {
      const total = items.reduce((a, i) => a + (i.price as number) * (i.quantity as number), 0);
      const installmentAmount = Math.round((total / sale.installments) * 100) / 100;
      const firstDue = new Date(sale.dueDate as string);

      const installmentRecords = Array.from({ length: sale.installments }, (_, idx) => {
        const due = new Date(firstDue);
        due.setMonth(due.getMonth() + idx);
        return {
          sale_id: saleData.id,
          installment_number: idx + 1,
          due_date: due.toISOString(),
          amount: installmentAmount,
          user_id: sale.user_id as string,
        };
      });

      const { error: installError } = await supabase
        .from('sale_installments')
        .insert(installmentRecords);

      if (installError) throw installError;
    }

    return saleData;
  },

  async delete(saleId: string) {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (error) throw error;
  }
};
