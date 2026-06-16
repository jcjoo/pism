import { describe, it, expect, beforeEach, mock } from 'bun:test';

const fromMock = mock();
const setItemMock = mock();
const getItemMock = mock();

mock.module('../supabase', () => ({
  supabase: { from: fromMock },
}));

mock.module('../storage.service', () => ({
  storageService: { setItem: setItemMock, getItem: getItemMock },
  STORAGE_KEYS: { CLIENTS: '@pism/cache/clients' },
}));

const { clientsService } = await import('../clients.service');

describe('clientsService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    setItemMock.mockReset();
    getItemMock.mockReset();
  });

  describe('getAll', () => {
    it('filters out archived clients by default and caches the result', async () => {
      const clients = [{ id: '1', name: 'A', is_archived: false }];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ data: clients, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await clientsService.getAll();

      expect(mockQuery.eq).toHaveBeenCalledWith('is_archived', false);
      expect(setItemMock).toHaveBeenCalledWith('@pism/cache/clients', clients);
      expect(result).toEqual(clients);
    });

    it('falls back to cached data when the request fails', async () => {
      const cached = [{ id: 'cached' }];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => mockQuery),
        eq: mock(() => Promise.reject(new Error('network down'))),
      };
      fromMock.mockReturnValue(mockQuery);
      getItemMock.mockResolvedValue(cached);

      const result = await clientsService.getAll();

      expect(result).toEqual(cached);
    });

    it('throws when the request fails and there is no cache', async () => {
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => mockQuery),
        eq: mock(() => Promise.reject(new Error('network down'))),
      };
      fromMock.mockReturnValue(mockQuery);
      getItemMock.mockResolvedValue(null);

      await expect(clientsService.getAll()).rejects.toThrow('Sem conexão e sem dados em cache');
    });
  });

  describe('hasSales', () => {
    it('returns true when the client has sales', async () => {
      const mockQuery: any = {
        select: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ count: 2, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await clientsService.hasSales('c1');

      expect(fromMock).toHaveBeenCalledWith('sales');
      expect(mockQuery.eq).toHaveBeenCalledWith('clientId', 'c1');
      expect(result).toBe(true);
    });
  });

  describe('archive / unarchive / delete', () => {
    it('archive sets is_archived to true', async () => {
      const mockQuery: any = {
        update: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      await clientsService.archive('c1');

      expect(mockQuery.update).toHaveBeenCalledWith({ is_archived: true });
    });

    it('delete removes the client by id', async () => {
      const mockQuery: any = {
        delete: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      await clientsService.delete('c1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'c1');
    });
  });

  describe('updated', () => {
    it('throws when no id is provided', async () => {
      await expect(clientsService.updated({ name: 'x' } as any)).rejects.toThrow(
        'Client ID is required for updates'
      );
    });

    it('updates the client by id when id is provided', async () => {
      const mockQuery: any = {
        update: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await clientsService.updated({ id: 'c1', name: 'New name' } as any);

      expect(mockQuery.update).toHaveBeenCalledWith({ id: 'c1', name: 'New name' });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'c1');
      expect(result).toBe('Sucesso');
    });
  });
});
