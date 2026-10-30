import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), channel: vi.fn(), isAdmin: true }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  user: { id: '97109920-d00e-4242-8374-6d774914bd26', email: 'lukacaldass@gmail.com' },
  isAdmin: mocks.isAdmin, loading: false, signIn: vi.fn(), signOut: vi.fn(),
}) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: mocks.from, channel: mocks.channel,
} }));

import Admin from './Admin';

describe('fresh notebook administrator entry', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); mocks.isAdmin = true; });

  it('lets the existing administrator enter the PIN without waiting for dashboard queries', () => {
    render(<MemoryRouter initialEntries={['/admin']}><Admin /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Admin password' })).toBeDefined();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.channel).not.toHaveBeenCalled();
  });

  it('does not admit an account without a verified administrator role', () => {
    mocks.isAdmin = false;
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Admin access unavailable' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Admin password' })).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});