import { login } from "./actions"

export default async function LoginPage(props: { searchParams: Promise<{ message?: string }> }) {
    const searchParams = await props.searchParams;

    return (
        <main
            className="app-shell"
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}
        >
            <div className="panel" style={{ width: '100%', maxWidth: '420px', padding: '48px 32px' }}>
                <form action={login} className="stack" style={{ gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'var(--accent-soft)',
                            color: 'var(--accent-strong)',
                            marginBottom: '20px'
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                            </svg>
                        </div>
                        <h1 className="title" style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Welcome back</h1>
                        <p className="subtitle" style={{ fontSize: '0.95rem' }}>
                            Sign in to your Event Tracker dashboard.
                        </p>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                        <label className="label" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            className="input"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            style={{ padding: '14px 16px', fontSize: '1rem' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="button accent"
                        style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
                    >
                        Send Magic Link
                    </button>

                    {searchParams?.message && (
                        <p style={{
                            marginTop: '4px',
                            padding: '14px',
                            background: 'var(--surface-strong)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--card-border)',
                            textAlign: 'center',
                            fontSize: '0.9rem',
                            color: 'var(--ink)'
                        }}>
                            {searchParams.message}
                        </p>
                    )}
                </form>
            </div>
        </main>
    )
}
