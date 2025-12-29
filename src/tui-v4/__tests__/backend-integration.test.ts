/**
 * Backend Integration Tests
 *
 * Tests the full backend stack:
 * - WebSocket server startup and connections
 * - State manager event broadcasting
 * - Client auto-reconnect
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { BackendServer } from '../backend/server.js';
import { ApiClient } from '../client/api-client.js';
import { useAppStore, stateEvents } from '../backend/state-manager.js';
import WebSocket from 'ws';

// Test configuration
const TEST_PORT = 3458;
const TEST_HOST = 'localhost';
const TEST_HEARTBEAT = 5000; // 5s heartbeat for tests

describe('Backend Integration Tests', () => {
  let server: BackendServer;

  beforeAll(async () => {
    // Start server once for all tests
    server = new BackendServer(TEST_HOST, TEST_PORT, TEST_HEARTBEAT);
    await server.start();
  }, 10000);

  afterAll(async () => {
    // Stop server after all tests
    if (server) {
      await server.stop();
    }
  }, 10000);

  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      tasks: [],
      specs: [],
      activeSpec: null,
      activeTask: null,
      git: {
        branch: null,
        modified: 0,
        added: 0,
        deleted: 0,
        ahead: 0,
        behind: 0,
      },
      mcp: {
        serverCount: 0,
        connected: false,
      },
      memory: {
        blockCount: 0,
        lastUpdated: null,
      },
    });
  });

  describe('Server Connectivity', () => {
    it('should accept WebSocket connections', async () => {
      const ws = new WebSocket(`ws://${TEST_HOST}:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          resolve();
        });
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 3000);
      });
    });

    it('should send initial state on connection', async () => {
      const ws = new WebSocket(`ws://${TEST_HOST}:${TEST_PORT}`);

      const initMessage = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'init') {
            resolve(message);
          }
        });
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Init timeout')), 3000);
      });

      expect(initMessage.type).toBe('init');
      expect(initMessage.payload).toBeDefined();
      expect(initMessage.payload.tasks).toBeDefined();
      expect(initMessage.payload.specs).toBeDefined();

      ws.close();
    });
  });

  describe('State Broadcasting', () => {
    it('should broadcast task updates to connected clients', async () => {
      const ws = new WebSocket(`ws://${TEST_HOST}:${TEST_PORT}`);
      await new Promise<void>((resolve) => ws.on('open', resolve));

      const messagePromise = new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'task_updated') {
            resolve(message);
          }
        });
        setTimeout(() => reject(new Error('Message timeout')), 3000);
      });

      // Trigger task update
      const testTasks = [{ id: 1, title: 'Test Task', status: 'pending' }];
      useAppStore.getState().setTasks(testTasks as any);

      const message = await messagePromise;
      expect(message.type).toBe('task_updated');
      expect(message.payload.tasks).toEqual(testTasks);

      ws.close();
    });

    it('should broadcast spec updates to connected clients', async () => {
      const ws = new WebSocket(`ws://${TEST_HOST}:${TEST_PORT}`);
      await new Promise<void>((resolve) => ws.on('open', resolve));

      const messagePromise = new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'spec_changed') {
            resolve(message);
          }
        });
        setTimeout(() => reject(new Error('Message timeout')), 3000);
      });

      // Trigger spec update
      const testSpecs = [{ id: 'spec-1', title: 'Test Spec' }];
      useAppStore.getState().setSpecs(testSpecs as any);

      const message = await messagePromise;
      expect(message.type).toBe('spec_changed');
      expect(message.payload.specs).toEqual(testSpecs);

      ws.close();
    });
  });

  describe('ApiClient', () => {
    it('should connect and receive messages', async () => {
      const client = new ApiClient({
        host: TEST_HOST,
        port: TEST_PORT,
      });

      client.connect();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        client.on('connected', resolve);
        client.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 3000);
      });

      expect(client.isConnected()).toBe(true);

      client.disconnect();
    });

    it('should receive state updates', async () => {
      const client = new ApiClient({
        host: TEST_HOST,
        port: TEST_PORT,
      });

      client.connect();
      await new Promise<void>((resolve) => client.on('connected', resolve));

      const updatePromise = new Promise<any>((resolve, reject) => {
        client.on('task_updated', resolve);
        setTimeout(() => reject(new Error('Update timeout')), 3000);
      });

      // Trigger update
      const testTasks = [{ id: 2, title: 'Client Test' }];
      useAppStore.getState().setTasks(testTasks as any);

      const update = await updatePromise;
      expect(update.tasks).toEqual(testTasks);

      client.disconnect();
    });
  });

  describe('State Events', () => {
    it('should emit events when state changes', () => {
      const taskHandler = vi.fn();
      const specHandler = vi.fn();

      stateEvents.on('task_updated', taskHandler);
      stateEvents.on('spec_changed', specHandler);

      // Trigger updates
      useAppStore.getState().setTasks([{ id: 3 } as any]);
      useAppStore.getState().setSpecs([{ id: 'spec-2' } as any]);

      expect(taskHandler).toHaveBeenCalledTimes(1);
      expect(specHandler).toHaveBeenCalledTimes(1);

      stateEvents.off('task_updated', taskHandler);
      stateEvents.off('spec_changed', specHandler);
    });
  });
});
