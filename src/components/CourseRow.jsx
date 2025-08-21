export default function CourseRow({ row, onChange, onRemove }) {
  return (
  <div className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
      <input
        type="number"
        step="0.25"
        min="0"
        placeholder="Units"
        value={row.units}
        onChange={(e) => onChange({ ...row, units: e.target.value })}
    className="col-span-6 sm:col-span-6 w-full min-w-0 rounded-md bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--c1)]/60"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        max="5"
        placeholder="Grade (0.00 - 5.00)"
        value={row.grade}
        onChange={(e) => onChange({ ...row, grade: e.target.value })}
    className="col-span-6 sm:col-span-5 w-full min-w-0 rounded-md bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--c1)]/60"
      />
      <button
        type="button"
        onClick={onRemove}
    className="col-span-12 sm:col-span-1 justify-self-end sm:justify-self-auto inline-flex justify-center items-center h-10 w-10 shrink-0 rounded-md bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 transition"
        aria-label="Remove row"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M16.5 4.478v.773a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.036-1.005 12.06A3.75 3.75 0 0 1 15.173 23H8.827a3.75 3.75 0 0 1-3.735-3.735L4.087 7.205l-.209.036a.75.75 0 0 1-.256-1.478 48.709 48.709 0 0 1 3.878-.512v-.773A2.25 2.25 0 0 1 9.75 2.25h4.5a2.25 2.25 0 0 1 2.25 2.228ZM9.75 3.75a.75.75 0 0 0-.75.75v.648a49.488 49.488 0 0 1 6 0V4.5a.75.75 0 0 0-.75-.75h-4.5Zm-.43 5.47a.75.75 0 0 1 1.06 0L12 10.94l1.62-1.72a.75.75 0 1 1 1.08 1.04L13.06 12l1.62 1.62a.75.75 0 1 1-1.06 1.06L12 13.06l-1.62 1.62a.75.75 0 0 1-1.06-1.06L10.94 12 9.32 10.38a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
