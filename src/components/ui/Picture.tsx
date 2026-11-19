import type { ImgHTMLAttributes } from 'react'
import type { ImageRef } from '../../types/content'
import { cn } from '../../utils/format'

interface PictureProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  image: ImageRef
  /** Above-the-fold images load eagerly with high fetch priority. */
  priority?: boolean
  /** Fill the parent box with object-cover instead of reserving an aspect ratio. */
  fill?: boolean
  sizes?: string
}

/**
 * Responsive WebP image. Each render ships as `name.webp` plus a half-width
 * `name-sm.webp` produced by the Blender script, wired into `srcset`.
 */
export function Picture({ image, priority, fill, sizes = '100vw', className, style, ...rest }: PictureProps) {
  const portrait = (image.ratio ?? 1.6) < 1
  const full = portrait ? 1000 : 1600
  return (
    <img
      src={`${image.src}.webp`}
      srcSet={`${image.src}-sm.webp ${full / 2}w, ${image.src}.webp ${full}w`}
      sizes={sizes}
      alt={image.alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(fill ? 'absolute inset-0 h-full w-full object-cover' : 'block h-auto w-full', className)}
      style={fill ? style : { aspectRatio: image.ratio ?? 1.6, ...style }}
      {...rest}
    />
  )
}
