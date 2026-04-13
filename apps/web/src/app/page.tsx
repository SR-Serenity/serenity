'use client';

import { FormEvent, useMemo, useState } from 'react';
import styles from './page.module.scss';

type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type AuthResult = {
  accessToken?: string;
  organization?: OrgSummary;
  organizations?: OrgSummary[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:2991';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}/api/${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      payload.message ??
      payload.error ??
      `Request failed with status ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return payload as T;
}

export default function Index() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [createOrgName, setCreateOrgName] = useState('');
  const [createOrgSlug, setCreateOrgSlug] = useState('');
  const [switchOrgSlug, setSwitchOrgSlug] = useState('');
  const [token, setToken] = useState('');
  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isAuthenticated = useMemo(() => token.length > 0, [token]);

  const authorizationHeader = useMemo<Record<string, string> | undefined>(() => {
    if (!token) {
      return undefined;
    }
    return { authorization: `Bearer ${token}` };
  }, [token]);

  async function syncOrganizations(currentToken: string) {
    const result = await request<{ organizations: OrgSummary[] }>('auth/organizations', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${currentToken}`,
      },
    });
    setOrganizations(result.organizations);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const endpoint = mode === 'login' ? 'auth/login' : 'auth/register';
      const payload =
        mode === 'login'
          ? { email, password, orgSlug: orgSlug || undefined }
          : { email, password, displayName, orgName, orgSlug };

      const result = await request<AuthResult>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!result.accessToken) {
        throw new Error('Missing access token');
      }

      setToken(result.accessToken);
      if (result.organization) {
        setCurrentOrg(result.organization);
      }
      if (result.organizations) {
        setOrganizations(result.organizations);
      } else {
        await syncOrganizations(result.accessToken);
      }
      setMessage('Authenticated successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await request<AuthResult>('auth/organizations', {
        method: 'POST',
        headers: authorizationHeader,
        body: JSON.stringify({
          name: createOrgName,
          slug: createOrgSlug,
        }),
      });

      if (result.organization) {
        setCurrentOrg(result.organization);
      }
      if (result.accessToken) {
        setToken(result.accessToken);
        await syncOrganizations(result.accessToken);
      }
      setMessage('Organization created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create org failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await request<AuthResult>('auth/switch-org', {
        method: 'POST',
        headers: authorizationHeader,
        body: JSON.stringify({
          orgSlug: switchOrgSlug,
        }),
      });

      if (!result.accessToken || !result.organization) {
        throw new Error('Invalid switch organization response');
      }

      setToken(result.accessToken);
      setCurrentOrg(result.organization);
      await syncOrganizations(result.accessToken);
      setMessage('Organization switched.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Switch org failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Lark Suite MVP</h1>
        <p>Auth + multi-tenant organization bootstrap.</p>

        <div className={styles.modeRow}>
          <button
            type="button"
            className={mode === 'register' ? styles.active : ''}
            onClick={() => setMode('register')}
          >
            Register
          </button>
          <button
            type="button"
            className={mode === 'login' ? styles.active : ''}
            onClick={() => setMode('login')}
          >
            Login
          </button>
        </div>

        <form onSubmit={handleAuth} className={styles.form}>
          <input
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === 'register' ? (
            <>
              <input
                placeholder="Display name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <input
                placeholder="Organization name"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
              />
            </>
          ) : null}
          <input
            placeholder={
              mode === 'register'
                ? 'Organization slug (e.g. acme)'
                : 'Organization slug (required if in multiple orgs)'
            }
            value={orgSlug}
            onChange={(event) => setOrgSlug(event.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : mode === 'register' ? 'Register' : 'Login'}
          </button>
        </form>
      </section>

      {isAuthenticated ? (
        <section className={styles.card}>
          <h2>Organization Workspace</h2>
          <p>
            Current org: <strong>{currentOrg?.name ?? 'N/A'}</strong>
          </p>

          <form onSubmit={handleCreateOrganization} className={styles.form}>
            <h3>Create organization</h3>
            <input
              placeholder="Org name"
              value={createOrgName}
              onChange={(event) => setCreateOrgName(event.target.value)}
            />
            <input
              placeholder="Org slug"
              value={createOrgSlug}
              onChange={(event) => setCreateOrgSlug(event.target.value)}
            />
            <button type="submit" disabled={loading}>
              Create org
            </button>
          </form>

          <form onSubmit={handleSwitchOrganization} className={styles.form}>
            <h3>Switch organization</h3>
            <input
              placeholder="Target org slug"
              value={switchOrgSlug}
              onChange={(event) => setSwitchOrgSlug(event.target.value)}
            />
            <button type="submit" disabled={loading}>
              Switch org
            </button>
          </form>

          <div className={styles.orgList}>
            <h3>Your organizations</h3>
            {organizations.map((org) => (
              <div key={org.id} className={styles.orgItem}>
                <span>
                  {org.name} ({org.slug})
                </span>
                <span>{org.role}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {message ? <p className={styles.message}>{message}</p> : null}
    </main>
  );
}
