import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { submit, SubmissionError, type SubmissionResult } from '../../services/submissions'
import { Button } from '../ui/Button'
import { DemoFormNotice, Field, Honeypot, SubmissionSuccess } from './Field'

export const CONTACT_SUBJECTS = ['New project', 'Existing project', 'Press', 'Careers', 'Collaboration', 'Other'] as const

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.email('Enter a valid email address.'),
  subject: z.enum(CONTACT_SUBJECTS, { error: 'Choose a subject.' }),
  message: z.string().trim().min(20, 'Please write at least 20 characters.').max(3000, 'Please keep your message under 3,000 characters.'),
  company: z.string().max(0).optional(),
})
type Values = z.infer<typeof schema>

export function ContactForm({ initialSubject }: { initialSubject?: string }) {
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const subject = CONTACT_SUBJECTS.find((s) => s === initialSubject)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { subject } })

  const onSubmit = async ({ company, ...values }: Values) => {
    void company
    setServerError(null)
    try {
      setResult(await submit('contact', values))
    } catch (e) {
      setServerError(e instanceof SubmissionError ? e.message : 'Something went wrong. Please try again.')
    }
  }

  if (result) {
    return (
      <SubmissionSuccess mode={result.mode} reference={result.reference} title="Message validated">
        <button type="button" className="eyebrow link-underline" onClick={() => (reset(), setResult(null))}>
          Write another message
        </button>
      </SubmissionSuccess>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message}>
          <input className="field-input" autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" className="field-input" autoComplete="email" {...register('email')} />
        </Field>
      </div>
      <Field label="Subject" error={errors.subject?.message}>
        <select className="field-input" defaultValue={subject ?? ''} {...register('subject')}>
          <option value="" disabled>
            Select…
          </option>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Message" error={errors.message?.message} hint={`${(watch('message') ?? '').trim().length} / 3000`}>
        <textarea rows={6} className="field-input resize-y" {...register('message')} />
      </Field>
      <Honeypot register={register('company')} />
      {serverError && (
        <p role="alert" className="text-[0.88rem] text-error">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} arrow={!isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle aria-hidden className="size-4 animate-spin" /> Sending
          </>
        ) : (
          'Send message'
        )}
      </Button>
      <DemoFormNotice />
    </form>
  )
}
