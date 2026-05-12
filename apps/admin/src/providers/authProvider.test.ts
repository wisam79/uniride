import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authProvider } from './authProvider';

// ─── Mock supabaseClient ───────────────────────────────────────────────────────
vi.mock('./supabaseClient', () => ({
  supabaseClient: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

import { supabaseClient } from './supabaseClient';

const mockSignIn = vi.mocked(supabaseClient.auth.signInWithPassword);
const mockSignOut = vi.mocked(supabaseClient.auth.signOut);
const mockGetSession = vi.mocked(supabaseClient.auth.getSession);
const mockGetUser = vi.mocked(supabaseClient.auth.getUser);

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('authProvider.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('succeeds for admin users', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'u1', app_metadata: { role: 'admin' } },
        session: { access_token: 'tok' },
      },
      error: null,
    } as any);

    const result = await authProvider.login({ email: 'admin@test.com', password: 'pass' });

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('/');
  });

  it('rejects student users', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'u2', app_metadata: { role: 'student' } },
        session: { access_token: 'tok' },
      },
      error: null,
    } as any);
    mockSignOut.mockResolvedValue({ error: null } as any);

    const result = await authProvider.login({ email: 'student@test.com', password: 'pass' });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Admin access only');
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('rejects driver users', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'u3', app_metadata: { role: 'driver' } },
        session: { access_token: 'tok' },
      },
      error: null,
    } as any);
    mockSignOut.mockResolvedValue({ error: null } as any);

    const result = await authProvider.login({ email: 'driver@test.com', password: 'pass' });

    expect(result.success).toBe(false);
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('returns error on supabase auth failure', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials', name: 'AuthError' },
    } as any);

    const result = await authProvider.login({ email: 'x@x.com', password: 'wrong' });

    expect(result.success).toBe(false);
  });

  it('rejects user with no role in app_metadata', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'u4', app_metadata: {} },
        session: { access_token: 'tok' },
      },
      error: null,
    } as any);
    mockSignOut.mockResolvedValue({ error: null } as any);

    const result = await authProvider.login({ email: 'norole@test.com', password: 'pass' });

    expect(result.success).toBe(false);
  });
});

describe('authProvider.check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns authenticated for valid admin session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'u1', app_metadata: { role: 'admin' } },
          access_token: 'tok',
        },
      },
      error: null,
    } as any);

    const result = await authProvider.check({});

    expect(result.authenticated).toBe(true);
  });

  it('returns unauthenticated when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    const result = await authProvider.check({});

    expect(result.authenticated).toBe(false);
    expect(result.redirectTo).toBe('/login');
  });

  it('returns unauthenticated for non-admin session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'u2', app_metadata: { role: 'student' } },
          access_token: 'tok',
        },
      },
      error: null,
    } as any);

    const result = await authProvider.check({});

    expect(result.authenticated).toBe(false);
    expect(result.logout).toBe(true);
  });
});

describe('authProvider.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs out and redirects to /login', async () => {
    mockSignOut.mockResolvedValue({ error: null } as any);

    const result = await authProvider.logout({});

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('/login');
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('returns error if signOut fails', async () => {
    mockSignOut.mockResolvedValue({
      error: { message: 'Network error', name: 'Error' },
    } as any);

    const result = await authProvider.logout({});

    expect(result.success).toBe(false);
  });
});

describe('authProvider.getPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns role from app_metadata', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', app_metadata: { role: 'admin' } } },
      error: null,
    } as any);

    const role = await authProvider.getPermissions?.({});
    expect(role).toBe('admin');
  });

  it('returns null when no user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const role = await authProvider.getPermissions?.({});
    expect(role).toBeNull();
  });
});
