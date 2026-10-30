import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callback: undefined as undefined | ((event: string, session: unknown) => void),
  roleQuery: vi.fn(),
  rpc: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'admin-user' } } } }),
      onAuthStateChange: vi.fn((callback) => {
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      }),
    },
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.roleQuery }) }) }) }),
    rpc: mocks.rpc,
  },
}));

import { useAuth } from './useAuth';

describe('admin session handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.roleQuery.mockResolvedValue({ data: { role: 'admin' }, error: null });
  });

  it('recognizes the existing admin on a fresh browser session', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.user?.id).toBe('admin-user');
  });

  it('defers authenticated queries until the auth callback releases its lock', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocks.roleQuery.mockClear();
    mocks.rpc.mockClear();
    act(() => mocks.callback?.('SIGNED_IN', { user: { id: 'admin-user' } }));
    expect(mocks.roleQuery).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.roleQuery).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('does not start another role request or supporter claim when a token refreshes', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocks.roleQuery.mockClear();
    mocks.rpc.mockClear();
    act(() => mocks.callback?.('TOKEN_REFRESHED', { user: { id: 'admin-user' } }));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mocks.roleQuery).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(result.current.isAdmin).toBe(true);
  });
});