import { Link } from 'react-router-dom'
import type { Project } from '../../types/content'
import { cn } from '../../utils/format'
import { Picture } from '../ui/Picture'

export function ProjectCard({
  project,
  className,
  imageClassName,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  index,
}: {
  project: Project
  className?: string
  imageClassName?: string
  sizes?: string
  index?: number
}) {
  return (
    <Link to={`/projects/${project.slug}`} data-cursor="View" className={cn('group block', className)}>
      <div className={cn('relative overflow-hidden bg-ivory-deep', imageClassName)}>
        <Picture
          image={project.cover}
          sizes={sizes}
          fill={!!imageClassName}
          className="transition-transform duration-[1.4s] ease-[var(--ease-architect)] group-hover:scale-[1.045]"
        />
        <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-700 group-hover:bg-charcoal/10" />
      </div>
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <h3 className="font-serif text-[1.85rem] leading-tight">
            {index !== undefined && <span className="mr-3 align-top text-[0.75rem] font-sans text-olive tabular-nums">{String(index + 1).padStart(2, '0')}</span>}
            {project.title}
          </h3>
          <p className="mt-1 text-[0.85rem] text-charcoal/60">
            {project.location} · {project.year}
          </p>
        </div>
        <p className="eyebrow mt-2 shrink-0 text-right text-charcoal/50">{project.categories[0]}</p>
      </div>
    </Link>
  )
}
