import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { INTRO } from '@/lib/intro'

gsap.registerPlugin(useGSAP)

const WORD = 'STACKHUNT'

export function Wordmark() {
  const root = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLParagraphElement>(null)

  useGSAP(
    () => {
      const el = label.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.fromTo(
        el,
        {
          clipPath: 'inset(0 108% 0 -8%)',
          letterSpacing: '0.38em',
          textIndent: '0.38em',
          filter: 'blur(8px)',
          opacity: 0,
        },
        {
          clipPath: 'inset(0 -8% 0 -8%)',
          letterSpacing: '0.12em',
          textIndent: '0.12em',
          filter: 'blur(0px)',
          opacity: 1,
          duration: INTRO.wordmark,
          ease: 'power3.out',
        },
      )
    },
    { scope: root },
  )

  return (
    <div
      ref={root}
      aria-hidden
      className="wordmark-mask relative z-10 w-full overflow-hidden select-none px-2 pt-4 sm:pt-6"
    >
      <p
        ref={label}
        className="wordmark-text w-full text-center font-extrabold uppercase leading-none tracking-[0.12em] indent-[0.12em]"
      >
        {WORD}
      </p>
    </div>
  )
}
