import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { INTRO } from '@/lib/intro'

gsap.registerPlugin(useGSAP)

export function HeroCopy() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const lines = root.current?.querySelectorAll('.hero-line')
      const copy = root.current?.querySelector('.hero-sub')
      if (!lines?.length) return

      gsap.fromTo(
        lines,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          delay: INTRO.heroDelay,
        },
      )
      if (copy) {
        gsap.fromTo(
          copy,
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            delay: INTRO.heroDelay + 0.28,
            ease: 'power3.out',
          },
        )
      }
    },
    { scope: root },
  )

  return (
    <header ref={root} className="text-center">
      <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        <span className="hero-line block">Jobs for the work</span>
        <span className="hero-line mt-1 block text-muted-foreground">you already ship</span>
      </h1>
      <p className="hero-sub mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
        Drop in your repos and Stackhunt reads the stack you actually work in, then
        pulls matching roles from public job boards with commute times included.
      </p>
    </header>
  )
}
