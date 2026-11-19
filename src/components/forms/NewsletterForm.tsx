import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { isDemoForms } from '../../config/site'
import { submit, SubmissionError, type SubmissionResult } from '../../services/submissions'
import { cn } from '../../utils/format'
import { Honeypot } from './Field'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  company: z.string().max(0).optional(),
})
type Values = z.infer<typeof schema>

export function NewsletterForm({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  const id = useId()
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: Values) => {
    setServerError(null)
    try {
      setResult(await submit('newsletter', { email: values.email }))
    } catch (e) {
      setServerError(e instanceof SubmissionError ? e.message : 'Something went wrong. Please try again.')
    }
  }

  const dark = tone === 'dark'
  if (result) {
    return (
      <p role="status" className={cn('text-sm leading-relaxed', dark ? 'text-ivory/80' : 'text-charcoal/80')}>
        {result.mode === 'demo'
          ? 'Address validated. Demo mode: it was not sent or stored, so no newsletter will arrive.'
          : 'Thank you — you are subscribed to the journal.'}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative">
      <label htmlFor={id} className={cn('eyebrow mb-3 block', dark ? 'text-ivory/60' : 'text-charcoal/60')}>
        Journal newsletter
      </label>
      <div className={cn('flex items-center border-b', dark ? 'border-ivory/30 focus-within:border-ivory' : 'border-charcoal/30 focus-within:border-charcoal')}>
        <input
          id={id}
          type="email"
          autoComplete="email"
          placeholder="Email address"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${id}-err` : `${id}-note`}
          className={cn(
            'min-w-0 flex-1 bg-transparent py-3 text-base outline-none',
            dark ? 'text-ivory placeholder:text-ivory/40' : 'text-charcoal placeholder:text-charcoal/40',
          )}
          {...register('email')}
        />
        <button type="submit" disabled={isSubmitting} aria-label="Subscribe" className="p-2">
          {isSubmitting ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <ArrowRight aria-hidden className="size-5" />}
        </button>
      </div>
      <Honeypot register={register('company')} />
      {errors.email && (
        <p id={`${id}-err`} role="alert" className="mt-2 text-[0.8rem] text-[#e0a093]">
          {errors.email.message}
        </p>
      )}
      {serverError && (
        <p role="alert" className="mt-2 text-[0.8rem] text-[#e0a093]">
          {serverError}
        </p>
      )}
      {!errors.email && (
        <p id={`${id}-note`} className={cn('mt-2 text-[0.72rem]', dark ? 'text-ivory/45' : 'text-charcoal/50')}>
          {isDemoForms ? 'Demo mode — addresses are validated, not stored.' : 'Occasional essays. Unsubscribe at any time.'}
        </p>
      )}
    </form>
  )
}
