import { describe, it, expect, beforeEach } from 'bun:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService, STORAGE_KEYS } from '../storage.service';

describe('storageService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('getItem / setItem', () => {
    it('returns null when the key does not exist', async () => {
      const result = await storageService.getItem(STORAGE_KEYS.CLIENTS);
      expect(result).toBeNull();
    });

    it('round-trips a JSON value through set/get', async () => {
      const value = [{ id: '1', name: 'Cliente' }];
      await storageService.setItem(STORAGE_KEYS.CLIENTS, value);
      const result = await storageService.getItem(STORAGE_KEYS.CLIENTS);
      expect(result).toEqual(value);
    });

    it('returns null when the stored value is not valid JSON', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, 'not-json{');
      const result = await storageService.getItem(STORAGE_KEYS.CLIENTS);
      expect(result).toBeNull();
    });
  });

  describe('sync queue', () => {
    it('starts empty', async () => {
      const queue = await storageService.getQueue();
      expect(queue).toEqual([]);
    });

    it('enqueue appends an operation with id and createdAt', async () => {
      await storageService.enqueue({ type: 'create_sale', payload: { id: 'x' } });
      const queue = await storageService.getQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('create_sale');
      expect(queue[0].payload).toEqual({ id: 'x' });
      expect(typeof queue[0].id).toBe('string');
      expect(typeof queue[0].createdAt).toBe('string');
    });

    it('enqueue appends multiple operations in order', async () => {
      await storageService.enqueue({ type: 'a', payload: 1 });
      await storageService.enqueue({ type: 'b', payload: 2 });
      const queue = await storageService.getQueue();

      expect(queue.map(o => o.type)).toEqual(['a', 'b']);
    });

    it('dequeue removes only the operations with matching ids', async () => {
      await storageService.enqueue({ type: 'a', payload: 1 });
      await storageService.enqueue({ type: 'b', payload: 2 });
      const [first, second] = await storageService.getQueue();

      await storageService.dequeue([first.id]);
      const remaining = await storageService.getQueue();

      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(second.id);
    });

    it('dequeue is a no-op when no ids match', async () => {
      await storageService.enqueue({ type: 'a', payload: 1 });
      await storageService.dequeue(['unknown-id']);
      const queue = await storageService.getQueue();

      expect(queue).toHaveLength(1);
    });
  });
});
