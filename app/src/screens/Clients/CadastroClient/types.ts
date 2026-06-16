import { Tables } from '@/types/database.types';
import { colors } from '@/theme/color';

export type ClientData = Partial<Tables<'clients'>> & {
  state?:     string;
  city_name?: string;
  municipio?: any;
};

export type GeoStatus = 'idle' | 'loading' | 'address' | 'city' | 'none';

export const GEO_CFG = {
  loading: { icon: null,       color: colors.primary.main, bg: '#F0EBF8', label: 'Buscando coordenadas...' },
  address: { icon: 'map-pin',  color: colors.success.main, bg: colors.success.light, label: 'Endereço localizado' },
  city:    { icon: 'map-pin',  color: colors.warning.main, bg: '#FFF4E5', label: 'Coordenada da cidade (aproximada)' },
  none:    { icon: 'x-circle', color: '#9E9E9E', bg: '#F5F5F5', label: 'Coordenada não encontrada' },
  idle:    { icon: null,       color: '',        bg: '',        label: '' },
} as const;
