/**
 * Form submission service.
 *
 * With `VITE_FORMS_ENDPOINT` unset (the default) the site is in demo mode:
 * submissions are validated in the browser and then discarded — nothing is
 * transmitted or stored, and the UI says so. Set the variable to an endpoint
 * that accepts multipart POSTs at `/consultations`, `/contact` and
 * `/newsletter` to deliver real submissions.
 */
import { site } from '../config/site'

export type SubmissionKind = 'consultations' | 'contact' | 'newsletter'

export type SubmissionResult =
  | { mode: 'demo'; reference: string }
  | { mode: 'live'; reference: string }

export class SubmissionError extends Error {}

function reference(kind: SubmissionKind) {
  const prefix = { consultations: 'CR', contact: 'CI', newsletter: 'NL' }[kind]
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

export async function submit(
  kind: SubmissionKind,
  data: Record<string, unknown>,
  files: File[] = [],
): Promise<SubmissionResult> {
  const endpoint = site.forms.endpoint
  if (!endpoint) {
    // Small delay so the pending state is visible; nothing leaves the browser.
    await new Promise((r) => setTimeout(r, 700))
    return { mode: 'demo', reference: reference(kind) }
  }

  const body = new FormData()
  body.append('payload', JSON.stringify(data))
  files.forEach((f) => body.append('files', f, f.name))

  let res: Response
  try {
    res = await fetch(`${endpoint.replace(/\/$/, '')}/${kind}`, { method: 'POST', body })
  } catch {
    throw new SubmissionError('We could not reach the server. Please check your connection and try again.')
  }
  if (!res.ok) {
    throw new SubmissionError(
      res.status === 429
        ? 'Too many requests — please wait a minute and try again.'
        : 'The server could not accept the submission. Please try again or email us directly.',
    )
  }
  const json = (await res.json().catch(() => ({}))) as { reference?: string }
  return { mode: 'live', reference: json.reference ?? reference(kind) }
}
