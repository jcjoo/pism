import { describe, it, expect, beforeEach, mock } from 'bun:test';

const fromMock = mock();
const setItemMock = mock();
const getItemMock = mock();

mock.module('../supabase', () => ({
  supabase: { from: fromMock },
}));

mock.module('../storage.service', () => ({
  storageService: { setItem: setItemMock, getItem: getItemMock },
  STORAGE_KEYS: { PRODUCTS: '@pism/cache/products' },
}));

const { productsService } = await import('../products.service');

describe('productsService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    setItemMock.mockReset();
    getItemMock.mockReset();
  });

  describe('getAll', () => {
    it('filters out archived products by default and caches the result', async () => {
      const products = [{ id: '1', name: 'A', is_archived: false }];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ data: products, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await productsService.getAll();

      expect(mockQuery.eq).toHaveBeenCalledWith('is_archived', false);
      expect(setItemMock).toHaveBeenCalledWith('@pism/cache/products', products);
      expect(result).toEqual(products);
    });

    it('includes archived products and skips caching when includeArchived is true', async () => {
      const products = [{ id: '1', is_archived: true }];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => Promise.resolve({ data: products, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await productsService.getAll(true);

      expect(mockQuery.eq).toBeUndefined();
      expect(setItemMock).not.toHaveBeenCalled();
      expect(result).toEqual(products);
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

      const result = await productsService.getAll();

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

      await expect(productsService.getAll()).rejects.toThrow('Sem conexão e sem dados em cache');
    });
  });

  describe('hasSales', () => {
    it('returns true when there are linked sale items', async () => {
      const mockQuery: any = {
        select: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ count: 3, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await productsService.hasSales('p1');

      expect(fromMock).toHaveBeenCalledWith('sale_items');
      expect(result).toBe(true);
    });

    it('returns false when there are no linked sale items', async () => {
      const mockQuery: any = {
        select: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ count: 0, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await productsService.hasSales('p1');

      expect(result).toBe(false);
    });
  });

  describe('archive / unarchive / delete', () => {
    it('archive sets is_archived to true', async () => {
      const mockQuery: any = {
        update: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      await productsService.archive('p1');

      expect(mockQuery.update).toHaveBeenCalledWith({ is_archived: true });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'p1');
    });

    it('unarchive sets is_archived to false', async () => {
      const mockQuery: any = {
        update: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      await productsService.unarchive('p1');

      expect(mockQuery.update).toHaveBeenCalledWith({ is_archived: false });
    });

    it('delete removes the product by id', async () => {
      const mockQuery: any = {
        delete: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      await productsService.delete('p1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'p1');
    });
  });

  describe('updated', () => {
    it('throws when no id is provided', async () => {
      await expect(productsService.updated({ name: 'x' } as any)).rejects.toThrow(
        'Product ID is required for updates'
      );
    });
  });
});
