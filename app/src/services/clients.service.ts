import { supabase } from './supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export type Client = Tables<'clients'>;

export const clientsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(client: TablesInsert<'clients'>) {
      const { data: productData, error: productError } = await supabase
        .from('clients')
        .insert(client)
        .select().single()
  
      if (productError) throw productError
      return productData
    },
  
    async updated(client: TablesUpdate<'clients'>) {
      if (!client.id) throw new Error('Product ID is required for updates');
  
      const { data, error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', client.id as string)
  
      if (error) throw error;
      return 'Sucesso'
    }
};
