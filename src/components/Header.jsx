import { SCHOOLS } from '../constants'

export default function Header({ school }) {
  const logo = school === 'psu' ? '/PampangaStateU.png' : school === 'hau' ? '/HolyAngelU.png' : '/GWA-logo.png'
  const alt = school === 'psu' ? 'Pampanga State University' : school === 'hau' ? 'Holy Angel University' : 'GWA Logo'
  return (
    <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/50 border-b border-slate-800/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--c1)] to-[var(--c2)] blur-[2px] opacity-80" />
            <img src={logo} alt={alt} className="relative h-9 w-9 rounded-lg object-contain bg-black/30 border border-white/10" />
          </div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">GWA Calculator</h1>
        </div>
      </div>
    </header>
  )
}
