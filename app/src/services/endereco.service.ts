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

  async getMunicipioById(id: number) {
    const { data, error } = await supabase
      .from('municipio')
      .select('*, estado(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getEstadoById(id: number) {
    const { data, error } = await supabase
      .from('estado')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createMunicipio(nome: string, estadoId: number, uf: string): Promise<Municipio> {
    const { data: maxRow } = await supabase
      .from('municipio')
      .select('codigo')
      .lt('codigo', 0)
      .order('codigo', { ascending: true })
      .limit(1)
      .single();
    const nextCodigo = maxRow ? maxRow.codigo - 1 : -1;

    const { data, error } = await supabase
      .from('municipio')
      .insert({ nome, uf, codigo: nextCodigo, estado_id: estadoId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteMunicipio(id: number): Promise<void> {
    const { error } = await supabase.from('municipio').delete().eq('id', id);
    if (error) throw error;
  },
};
