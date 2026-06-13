import { supabase } from './supabase';
import { storageService, STORAGE_KEYS } from './storage.service';
import { Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export type Product = Tables<'products'>;

export const productsService = {
  async getAll(includeArchived = false) {
    try {
      let query = supabase.from('products').select('*').order('name');
      if (!includeArchived) query = query.eq('is_archived', false);
      const { data, error } = await query;
      if (error) throw error;
      if (!includeArchived) {
        await storageService.setItem(STORAGE_KEYS.PRODUCTS, data);
      }
      return data;
    } catch {
      if (!includeArchived) {
        const cached = await storageService.getItem(STORAGE_KEYS.PRODUCTS);
        if (cached) return cached as Product[];
      }
      throw new Error('Sem conexão e sem dados em cache');
    }
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async hasSales(id: string) {
    const { count, error } = await supabase
      .from('sale_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id);
    if (error) throw error;
    return (count || 0) > 0;
  },

  async archive(id: string) {
    const { error } = await supabase
      .from('products')
      .update({ is_archived: true })
      .eq('id', id);
    if (error) throw error;
    return 'Sucesso';
  },

  async unarchive(id: string) {
    const { error } = await supabase
      .from('products')
      .update({ is_archived: false })
      .eq('id', id);
    if (error) throw error;
    return 'Sucesso';
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return 'Sucesso';
  },

  async create(product: TablesInsert<'products'>) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updated(product: TablesUpdate<'products'>) {
    if (!product.id) throw new Error('Product ID is required for updates');
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', product.id as string);
    if (error) throw error;
    return 'Sucesso';
  },
};
