export default function Hero({ offset, ocrStatus, ocrProgress, onUploadClick, fileInputRef, onFileChange, onShowSample, children }) {
  return (
    <section className="relative pt-16 sm:pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4 md:space-y-6">
            <h2
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-300"
              style={{ transform: `translateY(${offset * 0.12}px)` }}
            >
              Compute your General Weighted Average fast.
            </h2>
            <p className="text-slate-300/80 text-base sm:text-lg max-w-prose">
              Add your subjects, pick grades and units then get your GWA instantly.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#calc" className="inline-flex items-center gap-2 rounded-lg btn-primary transition px-4 py-2 shadow-lg focus-ring clickable" style={{ boxShadow: '0 10px 20px -10px var(--primary)' }}>
                Start calculating
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.75 6a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0V8.56l-7.22 7.22a.75.75 0 1 1-1.06-1.06l7.22-7.22h-5.69a.75.75 0 0 1 0-1.5h7.5Z" clipRule="evenodd" /></svg>
              </a>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              <button onClick={onUploadClick} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-4 py-2 transition focus-ring clickable">
                Upload picture
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path fillRule="evenodd" d="M2.25 6.75A3.75 3.75 0 0 1 6 3h12a3.75 3.75 0 0 1 3.75 3.75v10.5A3.75 3.75 0 0 1 18 21H6a3.75 3.75 0 0 1-3.75-3.75V6.75Zm12 3.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd"/></svg>
              </button>
              <button onClick={onShowSample} className="text-xs text-slate-300/80 hover:text-slate-200 underline focus-ring clickable">View sample</button>
              {ocrStatus && (
                <span className="text-xs text-slate-300/80">
                  {ocrStatus} {ocrProgress ? `· ${ocrProgress}%` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="relative h-56 sm:h-72 md:h-96">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[color:var(--c1)]/30 via-[color:var(--c2)]/20 to-[color:var(--c3)]/30 backdrop-blur-sm border border-slate-800/60 shadow-2xl" />
            <div className="absolute inset-3 rounded-2xl bg-black/40 border border-slate-800/60 p-6 overflow-hidden">
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full" style={{ background: 'color-mix(in oklab, var(--c1) 30%, transparent)' }} />
              <div className="absolute -left-6 bottom-6 h-32 w-32 rounded-full" style={{ background: 'color-mix(in oklab, var(--c2) 30%, transparent)' }} />
              <div className="relative">
                <p className="text-sm text-slate-300/80">Live preview</p>
                <div className="mt-3 max-h-48 overflow-auto no-scrollbar">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
