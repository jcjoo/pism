import { describe, it, expect, beforeEach, mock } from 'bun:test';

const fromMock = mock();

mock.module('../supabase', () => ({
  supabase: { from: fromMock },
}));

const { relatoriosService } = await import('../relatorios.service');

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('relatoriosService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe('getProdutosMaisVendidos', () => {
    it('aggregates quantity and revenue per product, sorted by quantity desc', async () => {
      const rows = [
        { product_id: 'p1', quantity: 2, price: 10, products: { name: 'Caneta', description: null } },
        { product_id: 'p2', quantity: 6, price: 4, products: { name: 'Caderno', description: 'liso' } },
        { product_id: 'p1', quantity: 3, price: 10, products: { name: 'Caneta', description: null } },
      ];
      const mockQuery: any = {
        select: mock(() => Promise.resolve({ data: rows, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await relatoriosService.getProdutosMaisVendidos('all');

      expect(result).toEqual([
        { product_id: 'p2', name: 'Caderno', description: 'liso', total_qty: 6, total_revenue: 24 },
        { product_id: 'p1', name: 'Caneta', description: null, total_qty: 5, total_revenue: 50 },
      ]);
    });

    it('falls back to a placeholder name when the product was removed', async () => {
      const rows = [{ product_id: 'p1', quantity: 1, price: 10, products: null }];
      const mockQuery: any = { select: mock(() => Promise.resolve({ data: rows, error: null })) };
      fromMock.mockReturnValue(mockQuery);

      const result = await relatoriosService.getProdutosMaisVendidos('all');

      expect(result[0].name).toBe('Produto removido');
    });

    it('applies a date filter when period is not "all"', async () => {
      const mockQuery: any = {
        select: mock(() => mockQuery),
        gte: mock(() => Promise.resolve({ data: [], error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      await relatoriosService.getProdutosMaisVendidos('7d');

      expect(mockQuery.gte).toHaveBeenCalledTimes(1);
      expect(mockQuery.gte.mock.calls[0][0]).toBe('sales.created_at');
    });

    it('throws when supabase returns an error', async () => {
      const mockQuery: any = { select: mock(() => Promise.resolve({ data: null, error: new Error('boom') })) };
      fromMock.mockReturnValue(mockQuery);

      await expect(relatoriosService.getProdutosMaisVendidos('all')).rejects.toThrow('boom');
    });
  });

  describe('getClientesMaisCompradores', () => {
    it('aggregates orders and revenue per client, sorted by spent desc, dropping unknown clients', async () => {
      const rows = [
        { id: 's1', clientId: 'c1', clients: { name: 'Ana' }, sale_items: [{ quantity: 1, price: 100 }] },
        { id: 's2', clientId: 'c2', clients: { name: 'Beto' }, sale_items: [{ quantity: 2, price: 10 }] },
        { id: 's3', clientId: null, clients: null, sale_items: [{ quantity: 1, price: 999 }] },
        { id: 's4', clientId: 'c2', clients: { name: 'Beto' }, sale_items: [{ quantity: 1, price: 5 }] },
      ];
      const mockQuery: any = { select: mock(() => Promise.resolve({ data: rows, error: null })) };
      fromMock.mockReturnValue(mockQuery);

      const result = await relatoriosService.getClientesMaisCompradores('all');

      expect(result).toEqual([
        { client_id: 'c1', name: 'Ana', total_orders: 1, total_spent: 100 },
        { client_id: 'c2', name: 'Beto', total_orders: 2, total_spent: 25 },
      ]);
    });
  });

  describe('getFaturamentoMensal', () => {
    it('builds a skeleton for the requested number of months and fills in totals', async () => {
      const now = new Date();
      const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const rows = [
        { created_at: now.toISOString(), sale_items: [{ quantity: 2, price: 10 }] },
      ];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        gte: mock(() => mockQuery),
        order: mock(() => Promise.resolve({ data: rows, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await relatoriosService.getFaturamentoMensal(3);

      expect(result).toHaveLength(3);
      const thisMonth = result.find(m => m.month_key === thisMonthKey);
      expect(thisMonth?.total).toBe(20);
      expect(thisMonth?.orders).toBe(1);
    });

    it('ignores sales outside the skeleton range', async () => {
      const rows = [
        { created_at: daysAgo(400), sale_items: [{ quantity: 1, price: 50 }] },
      ];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        gte: mock(() => mockQuery),
        order: mock(() => Promise.resolve({ data: rows, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await relatoriosService.getFaturamentoMensal(2);

      expect(result.every(m => m.total === 0 && m.orders === 0)).toBe(true);
    });
  });

  describe('getVendasEmAberto', () => {
    it('maps sales to totals and computes the due status', async () => {
      const rows = [
        { id: 's1', clientId: 'c1', dueDate: daysAgo(-30), clients: { name: 'Ana' }, sale_items: [{ quantity: 1, price: 10 }] },
        { id: 's2', clientId: 'c2', dueDate: daysAgo(5), clients: null, sale_items: [{ quantity: 2, price: 5 }] },
      ];
      const mockQuery: any = {
        select: mock(() => mockQuery),
        is: mock(() => mockQuery),
        order: mock(() => Promise.resolve({ data: rows, error: null })),
      };
      fromMock.mockReturnValue(mockQuery);

      const result = await relatoriosService.getVendasEmAberto();

      expect(result).toEqual([
        { id: 's1', client_name: 'Ana', due_date: rows[0].dueDate, total: 10, status: 'future' },
        { id: 's2', client_name: 'Cliente removido', due_date: rows[1].dueDate, total: 10, status: 'overdue' },
      ]);
    });
  });
});
