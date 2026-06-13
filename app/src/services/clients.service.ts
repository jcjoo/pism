import { supabase } from './supabase';
import { storageService, STORAGE_KEYS } from './storage.service';
import { Tables, TablesInsert, TablesUpdate } from '../types/database.types';

export type Client = Tables<'clients'>;

export const clientsService = {
  async getAll(includeArchived = false) {
    try {
      let query = supabase
        .from('clients')
        .select('*, municipio(*, estado(*))')
        .order('name');
      if (!includeArchived) query = query.eq('is_archived', false);
      const { data, error } = await query;
      if (error) throw error;
      if (!includeArchived) {
        await storageService.setItem(STORAGE_KEYS.CLIENTS, data);
      }
      return data;
    } catch {
      if (!includeArchived) {
        const cached = await storageService.getItem(STORAGE_KEYS.CLIENTS);
        if (cached) return cached as any;
      }
      throw new Error('Sem conexão e sem dados em cache');
    }
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*, municipio(*, estado(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async hasSales(id: string) {
    const { count, error } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('clientId', id);
    if (error) throw error;
    return (count || 0) > 0;
  },

  async archive(id: string) {
    const { error } = await supabase
      .from('clients')
      .update({ is_archived: true })
      .eq('id', id);
    if (error) throw error;
    return 'Sucesso';
  },

  async unarchive(id: string) {
    const { error } = await supabase
      .from('clients')
      .update({ is_archived: false })
      .eq('id', id);
    if (error) throw error;
    return 'Sucesso';
  },

  async create(client: TablesInsert<'clients'>) {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updated(client: TablesUpdate<'clients'>) {
    if (!client.id) throw new Error('Client ID is required for updates');
    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', client.id as string);
    if (error) throw error;
    return 'Sucesso';
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return 'Sucesso';
  },
};
