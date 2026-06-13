const BASE = 'https://nominatim.openstreetmap.org/search';
const HEADERS = { 'User-Agent': 'SalesPro/1.0' };

export type GeoSource = 'address' | 'city';

export interface GeoCoord {
  lat: number;
  lon: number;
  source: GeoSource;
}

export interface AddressSuggestion {
  displayName: string;
  addressText: string;   // street + number + suburb — fills the address input
  city: string;
  stateUF: string;       // "SP", "RJ", etc.
  stateName: string;
  postcode: string;
  lat: number;
  lon: number;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city?: string;
    town?: string;
    municipality?: string;
    village?: string;
    state?: string;
    postcode?: string;
    'ISO3166-2-lvl4'?: string;
  };
}

async function nominatim(params: Record<string, string>): Promise<{ lat: string; lon: string } | null> {
  const qs = new URLSearchParams({ ...params, format: 'json', limit: '1', countrycodes: 'br' });
  try {
    const res = await fetch(`${BASE}?${qs}`, { headers: HEADERS });
    const data: Array<{ lat: string; lon: string }> = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

async function nominatimMany(params: Record<string, string>): Promise<NominatimItem[]> {
  const qs = new URLSearchParams({ ...params, format: 'json', countrycodes: 'br', addressdetails: '1' });
  try {
    const res = await fetch(`${BASE}?${qs}`, { headers: HEADERS });
    return await res.json();
  } catch {
    return [];
  }
}

function parseSuggestion(item: NominatimItem): AddressSuggestion {
  const a = item.address;

  const road     = a.road || a.pedestrian || '';
  const number   = a.house_number || '';
  const suburb   = a.suburb || a.neighbourhood || a.quarter || '';
  const city     = a.city || a.town || a.municipality || a.village || '';
  const stateUF  = (a['ISO3166-2-lvl4'] ?? '').replace('BR-', '');
  const stateName = a.state || '';

  const parts = [road, number].filter(Boolean).join(', ');
  const addressText = [parts, suburb].filter(Boolean).join(', ');

  // displayName: remove country suffix for brevity
  const displayName = item.display_name.replace(/, Brasil$/, '').replace(/, Brazil$/, '');

  return {
    displayName,
    addressText,
    city,
    stateUF,
    stateName,
    postcode: a.postcode || '',
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  };
}

export const geocodingService = {
  async byAddress(address: string, city: string, uf: string): Promise<GeoCoord | null> {
    let raw = await nominatim({ street: address, city, state: uf, country: 'Brasil' });
    if (!raw) raw = await nominatim({ q: `${address}, ${city}, ${uf}, Brasil` });
    if (!raw) return null;
    return { lat: parseFloat(raw.lat), lon: parseFloat(raw.lon), source: 'address' };
  },

  async byCity(city: string, uf: string): Promise<GeoCoord | null> {
    const raw = await nominatim({ city, state: uf, country: 'Brasil' });
    if (!raw) return null;
    return { lat: parseFloat(raw.lat), lon: parseFloat(raw.lon), source: 'city' };
  },

  async suggestions(query: string, city?: string, uf?: string): Promise<AddressSuggestion[]> {
    if (query.trim().length < 4) return [];
    const q = city && uf ? `${query}, ${city}, ${uf}` : query;
    const items = await nominatimMany({ q, limit: '5' });
    return items.map(parseSuggestion);
  },
};
