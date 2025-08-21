export function OcrWarningModal({ open, onCancel, onContinue }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <h3 className="text-lg font-semibold mb-2">Heads up</h3>
        <p className="text-slate-300/90 text-sm">OCR isn’t 100% accurate. Please double‑check extracted Units and Equivalent Grade before relying on the result.</p>
        <ul className="list-disc pl-5 mt-3 text-slate-300/80 text-sm">
          <li>Crop tightly to the table area.</li>
          <li>Ensure “Units” and “Equivalent Grade” headers are visible.</li>
          <li>Two-decimal grades like 1.00/1.25 help accuracy.</li>
        </ul>
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onCancel} className="rounded-md border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-3 py-2">Cancel</button>
          <button onClick={onContinue} className="rounded-md btn-primary px-3 py-2">Continue</button>
        </div>
      </div>
    </div>
  )
}

export function SampleGuideModal({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-5xl w-full rounded-xl border border-slate-800 bg-slate-950 p-4 md:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Sample screenshot guide</h3>
          <button onClick={onClose} className="rounded-md border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-2 py-1 text-sm">Close</button>
        </div>
        <div className="rounded-lg overflow-auto max-h-[70vh]">
          <img src="/sample-ocr-guide.svg" alt="OCR screenshot guide" className="w-full h-auto" />
        </div>
      </div>
    </div>
  )
}
