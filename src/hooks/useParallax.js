import { useEffect, useState } from 'react'

export default function useParallax(multiplier = 0.3) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY * multiplier)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [multiplier])
  return offset
}
