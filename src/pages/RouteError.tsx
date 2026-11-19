import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

/** Last-resort boundary for errors thrown while rendering a route (outside the layout). */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : 'Unknown error'
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <p className="eyebrow text-error">Something went wrong</p>
      <h1 className="font-serif text-headline">The page could not be displayed.</h1>
      <p className="text-charcoal/70">
        Please refresh, or return to the home page. If you were loading the site after an update, a hard refresh usually
        fixes it.
      </p>
      <pre className="overflow-x-auto bg-ivory-deep p-4 text-xs text-charcoal/70">{message}</pre>
      <Link to="/" className="link-underline eyebrow">
        Return home
      </Link>
    </main>
  )
}
