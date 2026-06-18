'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center font-sans text-gray-900">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">Something went wrong!</h2>
          <p className="mt-2 text-sm text-gray-500">
            An unexpected error occurred in the application workspace.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Go to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
