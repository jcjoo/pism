import { supabase } from './supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export type Product = Tables<'products'>;

export const productsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
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

  async create(product: TablesInsert<'products'>) {
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert(product)
      .select().single()

    if (productError) throw productError
    return productData
  },

  async updated(product: TablesUpdate<'products'>) {
    if (!product.id) throw new Error('Product ID is required for updates');

    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', product.id as string)

    if (error) throw error;
    return 'Sucesso'
  }
}

/*
const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert(sale)
      .select()
      .single();
*/