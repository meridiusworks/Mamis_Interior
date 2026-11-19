import { CircleCheck, FlaskConical } from 'lucide-react'
import { useId, type ReactElement, type ReactNode } from 'react'
import { cloneElement } from 'react'
import { isDemoForms } from '../../config/site'
import { cn } from '../../utils/format'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  /** A single input/select/textarea; id and aria attributes are injected. */
  children: ReactElement<Record<string, unknown>>
}

export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={id} className="eyebrow text-charcoal/70">
        {label}
        {optional && <span className="ml-2 normal-case tracking-normal text-charcoal/45">(optional)</span>}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-2 text-[0.78rem] text-charcoal/55">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-[0.8rem] text-error">
          {error}
        </p>
      )}
    </div>
  )
}

/** Hidden field bots tend to fill; submissions with a value are rejected. */
export function Honeypot({ register }: { register: Record<string, unknown> }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" tabIndex={-1} autoComplete="off" {...register} />
      </label>
    </div>
  )
}

export function DemoFormNotice({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  if (!isDemoForms) return null
  return (
    <p
      className={cn(
        'flex items-start gap-2.5 rounded-sm border px-4 py-3 text-[0.8rem] leading-relaxed',
        tone === 'dark' ? 'border-ivory/20 text-ivory/70' : 'border-charcoal/15 bg-white/50 text-charcoal/70',
      )}
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <strong className="font-medium">Demo mode.</strong> This form validates your input in the browser but does not
        send or store it. No backend is connected to this portfolio build.
      </span>
    </p>
  )
}

export function SubmissionSuccess({
  mode,
  reference,
  title,
  children,
}: {
  mode: 'demo' | 'live'
  reference: string
  title: string
  children?: ReactNode
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <CircleCheck aria-hidden className="size-8 text-olive" />
      <h3 className="font-serif text-title">{title}</h3>
      {mode === 'demo' ? (
        <p className="max-w-lg text-charcoal/75">
          Your details passed validation. <strong className="font-medium">Because this site is running in demo mode, nothing
          was sent or saved</strong> — no one at the studio has received this request. Connect a forms endpoint (see the
          README) to deliver real submissions.
        </p>
      ) : (
        <p className="max-w-lg text-charcoal/75">Thank you — your submission was received by the studio.</p>
      )}
      <p className="text-[0.78rem] text-charcoal/55">
        {mode === 'demo' ? 'Demo reference' : 'Reference'}: <span className="tabular-nums">{reference}</span>
      </p>
      {children}
    </div>
  )
}
