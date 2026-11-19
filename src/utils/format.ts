export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', opts)
}

export function cn(...classes: (string | false | 0 | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
