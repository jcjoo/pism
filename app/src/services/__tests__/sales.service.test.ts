import { salesService } from '../sales.service';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('salesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSales', () => {
    it('should call supabase with correct query when no filters are provided', async () => {
      const mockData = [{ id: '1', clientId: '1' }];
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: mockData, error: null })),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await salesService.getSales({});

      expect(supabase.from).toHaveBeenCalledWith('sales');
      expect(result).toEqual(mockData);
    });

    it('should apply clientId filter when provided', async () => {
      const filters = { clientId: 'client-123' };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await salesService.getSales(filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('clientId', 'client-123');
    });

    it('should throw error when supabase returns error', async () => {
      const mockError = new Error('Supabase error');
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: null, error: mockError })),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(salesService.getSales({})).rejects.toThrow('Supabase error');
    });
  });

  describe('create', () => {
    it('should create a sale and its items', async () => {
      const sale = { clientId: '1', dueDate: '2023-01-01' } as any;
      const items = [{ product_id: 'p1', quantity: 1, price: 100 }];
      const saleData = { id: 'sale-123', ...sale };

      const mockQuerySale = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: saleData, error: null }),
      };

      const mockQueryItems = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'sales') return mockQuerySale;
        if (table === 'sale_items') return mockQueryItems;
      });

      const result = await salesService.create(sale, items);

      expect(supabase.from).toHaveBeenCalledWith('sales');
      expect(mockQuerySale.insert).toHaveBeenCalledWith(sale);
      expect(supabase.from).toHaveBeenCalledWith('sale_items');
      expect(mockQueryItems.insert).toHaveBeenCalledWith([
        { ...items[0], sale_id: 'sale-123' },
      ]);
      expect(result).toEqual(saleData);
    });
  });

  describe('delete', () => {
    it('should delete a sale by id', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await salesService.delete('sale-123');

      expect(supabase.from).toHaveBeenCalledWith('sales');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'sale-123');
    });
  });
});
