import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Pencil, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { z } from 'zod'
import { submit, SubmissionError, type SubmissionResult } from '../../services/submissions'
import type { Service } from '../../types/content'
import { cn } from '../../utils/format'
import { Button } from '../ui/Button'
import { dialogue } from '../ui/Dialogue'
import { DemoFormNotice, Field, Honeypot, SubmissionSuccess } from './Field'

const PROJECT_TYPES = ['New independent house', 'Apartment interior', 'Old house renovation', 'Commercial fit-out', 'Hospitality', 'Other'] as const
const BUDGETS = ['Under ₹10 lakh', '₹10 – 25 lakh', '₹25 – 60 lakh', '₹60 lakh – ₹1.5 crore', 'Above ₹1.5 crore', 'Not sure yet'] as const
const TIMELINES = ['As soon as possible', 'Within 3 months', '3 – 6 months', '6 – 12 months', 'More than a year', 'Flexible'] as const
const SLOTS = ['Morning (09:00 – 12:00)', 'Midday (12:00 – 14:00)', 'Afternoon (14:00 – 17:00)'] as const
const MODES = ['Video call', 'At the studio', 'On site'] as const

const MAX_FILES = 5
const MAX_BYTES = 8 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

/** YYYY-MM-DD in local time (toISOString would shift the day near midnight). */
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return isoDate(d)
}
const inSixMonths = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return isoDate(d)
}

const schema = z.object({
  service: z.string().min(1, 'Choose the kind of help you need.'),
  projectType: z.enum(PROJECT_TYPES, { error: 'Select a project type.' }),
  location: z.string().trim().min(2, 'Tell us roughly where the project is.').max(120),
  budget: z.enum(BUDGETS, { error: 'Select an estimated budget range.' }),
  timeline: z.enum(TIMELINES, { error: 'Select an expected timeline.' }),
  description: z
    .string()
    .trim()
    .min(40, 'Please describe the project in at least 40 characters.')
    .max(2000, 'Please keep the description under 2,000 characters.'),
  mode: z.enum(MODES, { error: 'Choose how you would like to meet.' }),
  date: z
    .string()
    .min(1, 'Choose a preferred date.')
    .refine((v) => v >= tomorrow(), 'Choose a date from tomorrow onwards.')
    .refine((v) => v <= inSixMonths(), 'Choose a date within the next six months.')
    .refine((v) => new Date(`${v}T12:00:00`).getDay() !== 0, 'The studio is closed on Sundays — please pick another day.'),
  slot: z.enum(SLOTS, { error: 'Choose a preferred time.' }),
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .regex(/^$|^[+()\d\s-]{7,20}$/, 'Enter a valid phone number or leave it blank.')
    .optional(),
  consent: z.boolean().refine((v) => v, 'Please confirm so we can reply to your request.'),
  website: z.string().max(0).optional(),
})
type Values = z.infer<typeof schema>

const STEPS: { title: string; fields: FieldPath<Values>[] }[] = [
  { title: 'Project', fields: ['service', 'projectType', 'location'] },
  { title: 'Scope', fields: ['budget', 'timeline', 'description'] },
  { title: 'Schedule', fields: ['mode', 'date', 'slot'] },
  { title: 'Contact', fields: ['name', 'email', 'phone', 'consent'] },
  { title: 'Review', fields: [] },
]

const ease = [0.22, 1, 0.36, 1] as const

export function ConsultationForm({ services, initialService }: { services: Service[]; initialService?: string }) {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(0)

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { service: initialService && services.some((s) => s.slug === initialService) ? initialService : '', consent: false, phone: '' },
  })

  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files])
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])

  // Move focus to the step heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    heading.current?.focus()
  }, [step])

  const next = async () => {
    if (await trigger(STEPS[step].fields, { shouldFocus: true })) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => setStep((s) => Math.max(0, s - 1))

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setFileError(null)
    const incoming = [...list]
    const bad = incoming.find((f) => !ACCEPT.includes(f.type))
    if (bad) return setFileError(`“${bad.name}” is not a JPG, PNG or WebP image.`)
    const big = incoming.find((f) => f.size > MAX_BYTES)
    if (big) return setFileError(`“${big.name}” is larger than 8 MB.`)
    const merged = [...files, ...incoming.filter((f) => !files.some((x) => x.name === f.name && x.size === f.size))]
    if (merged.length > MAX_FILES) return setFileError(`You can attach up to ${MAX_FILES} images.`)
    setFiles(merged)
  }

  const onSubmit = async (values: Values) => {
    setServerError(null)
    const { website, ...payload } = values
    void website
    try {
      setResult(await submit('consultations', payload, files))
    } catch (e) {
      setServerError(e instanceof SubmissionError ? e.message : 'Something went wrong. Please try again.')
    }
  }

  if (result) {
    const v = getValues()
    return (
      <SubmissionSuccess mode={result.mode} reference={result.reference} title={result.mode === 'demo' ? dialogue('formSuccess').ta : 'Request received'}>
        <p className="max-w-lg text-[0.92rem] text-charcoal/70">
          This is a <strong className="font-medium">request</strong>, not a confirmed booking. When the form is connected,
          the studio replies by email to {v.email} to confirm a time — your preferred slot was {new Date(`${v.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, {v.slot.toLowerCase()}.
        </p>
        <button
          type="button"
          className="eyebrow link-underline"
          onClick={() => {
            reset()
            setFiles([])
            setResult(null)
            setStep(0)
          }}
        >
          Start a new request
        </button>
      </SubmissionSuccess>
    )
  }

  const v = watch()
  const serviceTitle = (slug: string) => (slug === 'not-sure' ? 'Not sure yet' : services.find((s) => s.slug === slug)?.title ?? slug)

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative">
      {/* Progress */}
      <ol className="mb-12 grid grid-cols-5 gap-2" aria-label="Form progress">
        {STEPS.map((s, i) => (
          <li key={s.title} aria-current={i === step ? 'step' : undefined}>
            <span className={cn('block h-0.5 transition-colors duration-500', i <= step ? 'bg-charcoal' : 'bg-charcoal/15')} />
            <span className={cn('mt-2 hidden text-[0.7rem] tracking-[0.14em] uppercase sm:block', i === step ? 'text-charcoal' : 'text-charcoal/45')}>
              {i + 1}. {s.title}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.fieldset
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.45, ease }}
          className="space-y-10"
        >
          <legend className="sr-only">
            Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          </legend>
          <h3 ref={heading} tabIndex={-1} className="font-serif text-title outline-none">
            <span className="mr-3 text-[0.9rem] text-olive tabular-nums">
              {step + 1}/{STEPS.length}
            </span>
            {['What can we help with?', 'Tell us about the scope.', 'When would suit you?', 'How can we reach you?', 'Review your request.'][step]}
          </h3>

          {step === 0 && (
            <>
              <div role="radiogroup" aria-labelledby="service-label" aria-describedby={errors.service ? 'service-error' : undefined}>
                <p id="service-label" className="eyebrow mb-4 text-charcoal/70">
                  Service
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[...services.map((s) => ({ slug: s.slug, title: s.title })), { slug: 'not-sure', title: 'Not sure yet' }].map((s) => (
                    <label
                      key={s.slug}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 border px-4 py-3 text-[0.9rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-olive',
                        v.service === s.slug ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 hover:border-charcoal',
                      )}
                    >
                      <input type="radio" value={s.slug} className="sr-only" {...register('service')} />
                      {s.title}
                    </label>
                  ))}
                </div>
                {errors.service && (
                  <p id="service-error" role="alert" className="mt-2 text-[0.8rem] text-error">
                    {errors.service.message}
                  </p>
                )}
              </div>
              <div className="grid gap-8 sm:grid-cols-2">
                <Field label="Project type" error={errors.projectType?.message}>
                  <select className="field-input" defaultValue="" {...register('projectType')}>
                    <option value="" disabled>
                      Select…
                    </option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Project location" error={errors.location?.message} hint="City and country is enough.">
                  <input className="field-input" autoComplete="address-level2" placeholder="e.g. Velachery, Chennai" {...register('location')} />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-8 sm:grid-cols-2">
                <Field label="Estimated budget" error={errors.budget?.message} hint={<span lang="ta-Latn">{dialogue('budget').ta} <span lang="en">({dialogue('budget').en})</span></span>}>
                  <select className="field-input" defaultValue="" {...register('budget')}>
                    <option value="" disabled>
                      Select…
                    </option>
                    {BUDGETS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Expected timeline" error={errors.timeline?.message}>
                  <select className="field-input" defaultValue="" {...register('timeline')}>
                    <option value="" disabled>
                      Select…
                    </option>
                    {TIMELINES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Project description" error={errors.description?.message} hint={`${(v.description ?? '').trim().length} / 2000 characters (minimum 40)`}>
                <textarea rows={6} className="field-input resize-y" placeholder="The plot or house, how many people will live there, what you would like to change — and whether paati insists on an east-facing pooja room." {...register('description')} />
              </Field>
              <div>
                <p className="eyebrow mb-3 text-charcoal/70">
                  Reference images <span className="ml-2 normal-case tracking-normal text-charcoal/45">(optional)</span>
                </p>
                <label className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-charcoal/30 px-6 py-8 text-center text-[0.88rem] text-charcoal/65 transition-colors hover:border-charcoal has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-olive">
                  <ImagePlus aria-hidden className="size-6" />
                  <span>Add photos, plans or inspiration — JPG, PNG or WebP, up to {MAX_FILES} files, 8 MB each.</span>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPT.join(',')}
                    className="sr-only"
                    aria-describedby={fileError ? 'file-error' : undefined}
                    onChange={(e) => {
                      addFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
                {fileError && (
                  <p id="file-error" role="alert" className="mt-2 text-[0.8rem] text-error">
                    {fileError}
                  </p>
                )}
                {previews.length > 0 && (
                  <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {previews.map(({ file, url }) => (
                      <li key={file.name + file.size} className="relative">
                        <img src={url} alt={`Reference: ${file.name}`} className="aspect-square w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((f) => f !== file))}
                          aria-label={`Remove ${file.name}`}
                          className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-charcoal/80 text-ivory"
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div role="radiogroup" aria-labelledby="mode-label">
                <p id="mode-label" className="eyebrow mb-4 text-charcoal/70">
                  Meeting format
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MODES.map((m) => (
                    <label key={m} className={cn('flex cursor-pointer items-center justify-center border px-4 py-3 text-[0.9rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-olive', v.mode === m ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 hover:border-charcoal')}>
                      <input type="radio" value={m} className="sr-only" {...register('mode')} />
                      {m}
                    </label>
                  ))}
                </div>
                {errors.mode && (
                  <p role="alert" className="mt-2 text-[0.8rem] text-error">
                    {errors.mode.message}
                  </p>
                )}
              </div>
              <div className="grid gap-8 sm:grid-cols-2">
                <Field label="Preferred date" error={errors.date?.message} hint="Monday to Saturday, within six months.">
                  <input type="date" min={tomorrow()} max={inSixMonths()} className="field-input" {...register('date')} />
                </Field>
                <Field label="Preferred time" error={errors.slot?.message}>
                  <select className="field-input" defaultValue="" {...register('slot')}>
                    <option value="" disabled>
                      Select…
                    </option>
                    {SLOTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="text-[0.82rem] text-charcoal/60">
                No calendar is connected to this site, so these are preferences — the studio confirms an actual time by
                email.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-8 sm:grid-cols-2">
                <Field label="Full name" error={errors.name?.message}>
                  <input className="field-input" autoComplete="name" {...register('name')} />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <input type="email" className="field-input" autoComplete="email" {...register('email')} />
                </Field>
                <Field label="Phone" optional error={errors.phone?.message}>
                  <input type="tel" className="field-input" autoComplete="tel" {...register('phone')} />
                </Field>
              </div>
              <div>
                <label className="flex items-start gap-3 text-[0.9rem]">
                  <input type="checkbox" className="mt-1 size-4 accent-charcoal" aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'consent-error' : undefined} {...register('consent')} />
                  <span>I agree that the studio may use these details to respond to my consultation request.</span>
                </label>
                {errors.consent && (
                  <p id="consent-error" role="alert" className="mt-2 text-[0.8rem] text-error">
                    {errors.consent.message}
                  </p>
                )}
              </div>
              <Honeypot register={register('website')} />
            </>
          )}

          {step === 4 && (
            <dl className="divide-y divide-charcoal/10 border-y border-charcoal/10">
              {[
                { step: 0, items: [['Service', serviceTitle(v.service)], ['Project type', v.projectType], ['Location', v.location]] },
                { step: 1, items: [['Budget', v.budget], ['Timeline', v.timeline], ['Description', v.description], ['References', files.length ? `${files.length} image${files.length > 1 ? 's' : ''}` : 'None']] },
                { step: 2, items: [['Format', v.mode], ['Preferred date', v.date ? new Date(`${v.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : ''], ['Preferred time', v.slot]] },
                { step: 3, items: [['Name', v.name], ['Email', v.email], ['Phone', v.phone || '—']] },
              ].map((group) => (
                <div key={group.step} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    {group.items.map(([k, val]) => (
                      <div key={k} className="grid grid-cols-[130px_1fr] gap-3 text-[0.9rem]">
                        <dt className="text-charcoal/55">{k}</dt>
                        <dd className="break-words whitespace-pre-line">{val}</dd>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setStep(group.step)} className="eyebrow inline-flex items-center gap-1.5 self-start text-charcoal/70 hover:text-charcoal">
                    <Pencil aria-hidden className="size-3" /> Edit
                  </button>
                </div>
              ))}
            </dl>
          )}
        </motion.fieldset>
      </AnimatePresence>

      {serverError && (
        <p role="alert" className="mt-8 text-[0.88rem] text-error">
          {serverError}
        </p>
      )}

      <div className="mt-12 flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {step > 0 && (
            <button type="button" onClick={back} className="eyebrow inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal">
              <ArrowLeft aria-hidden className="size-4" /> Back
            </button>
          )}
        </div>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Continue <ArrowRight aria-hidden className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderCircle aria-hidden className="size-4 animate-spin" /> Submitting
              </>
            ) : (
              'Submit request'
            )}
          </Button>
        )}
      </div>
      <div className="mt-8">
        <DemoFormNotice />
      </div>
    </form>
  )
}
