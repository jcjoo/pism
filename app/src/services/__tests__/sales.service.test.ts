import { describe, it, expect, beforeEach, mock } from 'bun:test';

const fromMock = mock();

mock.module('../supabase', () => ({
  supabase: { from: fromMock },
}));

const { salesService } = await import('../sales.service');

describe('salesService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe('getSales', () => {
    it('should call supabase with correct query when no filters are provided', async () => {
      const mockData = [{ id: '1', clientId: '1' }];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => mockQuery),
        then: (resolve: any) => resolve({ data: mockData, error: null }),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await salesService.getSales({});

      expect(fromMock).toHaveBeenCalledWith('sales');
      expect(result).toEqual(mockData);
    });

    it('should apply clientId filter when provided', async () => {
      const filters = { clientId: 'client-123' };
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => mockQuery),
        eq: mock(() => mockQuery),
        then: (resolve: any) => resolve({ data: [], error: null }),
      };
      fromMock.mockReturnValue(mockQuery);

      await salesService.getSales(filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('clientId', 'client-123');
    });

    it('should throw error when supabase returns error', async () => {
      const mockError = new Error('Supabase error');
      const mockQuery: any = {
        select: mock(() => mockQuery),
        order: mock(() => mockQuery),
        then: (resolve: any) => resolve({ data: null, error: mockError }),
      };
      fromMock.mockReturnValue(mockQuery);

      await expect(salesService.getSales({})).rejects.toThrow('Supabase error');
    });
  });

  describe('create', () => {
    it('should create a sale and its items', async () => {
      const sale = { clientId: '1', dueDate: '2023-01-01' } as any;
      const items = [{ product_id: 'p1', quantity: 1, price: 100 }];
      const saleData = { id: 'sale-123', ...sale };

      const mockQuerySale: any = {
        insert: mock(() => mockQuerySale),
        select: mock(() => mockQuerySale),
        single: mock(() => Promise.resolve({ data: saleData, error: null })),
      };

      const mockQueryItems: any = {
        insert: mock(() => Promise.resolve({ error: null })),
      };

      fromMock.mockImplementation((table: string) => {
        if (table === 'sales') return mockQuerySale;
        if (table === 'sale_items') return mockQueryItems;
        return undefined;
      });

      const result = await salesService.create(sale, items);

      expect(fromMock).toHaveBeenCalledWith('sales');
      expect(mockQuerySale.insert).toHaveBeenCalledWith(sale);
      expect(fromMock).toHaveBeenCalledWith('sale_items');
      expect(mockQueryItems.insert).toHaveBeenCalledWith([
        { ...items[0], sale_id: 'sale-123' },
      ]);
      expect(result).toEqual(saleData);
    });
  });

  describe('delete', () => {
    it('should delete a sale by id', async () => {
      const mockQuery: any = {
        delete: mock(() => mockQuery),
        eq: mock(() => Promise.resolve({ error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      await salesService.delete('sale-123');

      expect(fromMock).toHaveBeenCalledWith('sales');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'sale-123');
    });
  });
});
