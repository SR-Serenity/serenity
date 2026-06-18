'use client'

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1>Something went wrong.</h1>
          <p>Please try again. If the problem persists, refresh the page.</p>

          {error?.digest ? (
            <p style={{ fontSize: 12 }}>Error ID: {error.digest}</p>
          ) : null}

          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}