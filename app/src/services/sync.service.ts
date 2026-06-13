import { supabase } from './supabase';
import { storageService, STORAGE_KEYS } from './storage.service';

async function flushQueue(): Promise<number> {
  const queue = await storageService.getQueue();
  if (queue.length === 0) return 0;

  const done: string[] = [];

  for (const op of queue) {
    try {
      if (op.type === 'mark_received') {
        const { saleId, amount } = op.payload as { saleId: string; amount: number };
        const { error } = await supabase
          .from('sales')
          .update({ received_at: new Date().toISOString(), received_amount: amount })
          .eq('id', saleId);
        if (!error) done.push(op.id);
      } else if (op.type === 'mark_installments_received') {
        const { installmentIds } = op.payload as { installmentIds: string[] };
        const { error } = await supabase
          .from('sale_installments')
          .update({ received_at: new Date().toISOString() })
          .in('id', installmentIds);
        if (!error) done.push(op.id);
      }
    } catch {}
  }

  if (done.length > 0) await storageService.dequeue(done);
  return done.length;
}

async function refreshCaches(): Promise<void> {
  const { recebimentosService } = await import('./recebimentos.service');
  const { clientsService }      = await import('./clients.service');
  const { productsService }     = await import('./products.service');

  await Promise.allSettled([
    recebimentosService.getPending(),
    clientsService.getAll(),
    productsService.getAll(),
  ]);
}

async function getQueueLength(): Promise<number> {
  return (await storageService.getQueue()).length;
}

export const syncService = { flushQueue, refreshCaches, getQueueLength };
