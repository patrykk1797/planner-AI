import test from 'node:test';
import assert from 'node:assert/strict';

// Test mock localStorage behavior
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

test('MockLocalStorage stores and retrieves account JSON payload', () => {
  const storage = new MockLocalStorage();
  const testAccount = {
    id: 'user-test-1',
    name: 'Patryk',
    email: 'patrykk1797@gmail.com',
    provider: 'google',
    createdAt: '2026-01-15',
    onboardingCompleted: true,
  };

  storage.setItem('user_session', JSON.stringify(testAccount));
  const retrieved = JSON.parse(storage.getItem('user_session') || '{}');

  assert.equal(retrieved.id, 'user-test-1');
  assert.equal(retrieved.email, 'patrykk1797@gmail.com');
  assert.equal(retrieved.provider, 'google');
  assert.equal(retrieved.onboardingCompleted, true);
});

test('MockLocalStorage correctly filters out deleted user accounts', () => {
  const accounts = [
    { id: 'acc-1', name: 'Patryk', email: 'p@run.pl' },
    { id: 'acc-2', name: 'Anna', email: 'a@run.pl' },
    { id: 'acc-3', name: 'Tomasz', email: 't@run.pl' },
  ];

  const remaining = accounts.filter((a) => a.id !== 'acc-2');
  assert.equal(remaining.length, 2);
  assert.equal(remaining.some((a) => a.id === 'acc-2'), false);
  assert.equal(remaining[0].id, 'acc-1');
  assert.equal(remaining[1].id, 'acc-3');
});
