import { supabase } from './supabase';
import { Tables } from '../types/database.types';

export type Estado = Tables<'estado'>;
export type Municipio = Tables<'municipio'>;

export const enderecoService = {
  async getAllEstado() {
    const { data, error } = await supabase
      .from('estado')
      .select('*')
      .order('nome');

    if (error) throw error;
    return data;
  },

  async getAllMunicipios() {
    const { data, error } = await supabase
      .from('municipio')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data;
  },

  async getMunicipiosByUF(uf: string) {
    const { data, error } = await supabase
      .from('municipio')
      .select('*')
      .eq('uf', uf)
      .order('nome');
    
    if (error) throw error;
    return data;
  },
};
