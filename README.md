# GWA Calculator (React + Vite)

A fast, on-device General Weighted Average calculator with optional offline-friendly OCR to extract Units and Equivalent Grades from a screenshot or photo. Built with React, Vite, and Tailwind CSS.

## Features

- GWA calculation by entering Units and Equivalent Grade per subject
- Local OCR (no cloud):
  - Default: RapidOCR/PP-OCR (ONNX in-browser via client-side-ocr)
  - Fallback: Tesseract.js
- Focused extraction of Units and Equivalent Grade only (no Section/Final columns)
- Accepts two-decimal grades like 1.00, 1.25, etc. (preserves trailing zeros)
- Themed UI with subtle parallax; presets for PSU and HAU (logo + colors)
- PDF export that matches the app styling:
  - Header with school logo and timestamp
  - Two-column table: Units | Equivalent Grade
  - Name and School subtitle, totals, and watermark
- “View sample” guide and an OCR accuracy warning popup
- Privacy-first: images are processed in the browser; only the selected school is saved to localStorage

## Getting started

Prerequisites: Node.js 18+ and npm.

Install dependencies and start the dev server:

```powershell
npm install
npm run dev
```

Open http://localhost:5173

For a production build and preview:

```powershell
npm run build
npm run preview
```

## Usage

1. Select your school (PSU, HAU, or Other). Optionally enter your name.
2. Add subjects and type Units and Equivalent Grade, or click “Upload picture” to run OCR.
3. Review and adjust extracted values if needed.
4. Click “Download PDF” to export a report with your totals.

Notes for OCR accuracy:
- Crop tightly to the table area and keep the headers “Units” and “Equivalent Grade” visible.
- Two-decimal grades (e.g., 1.00, 1.25) work best.
- Models are downloaded from a CDN on first use but your image stays in the browser.

## Tech stack

- React + Vite
- Tailwind CSS
- client-side-ocr (RapidOCR/PP-OCRv4 ONNX) and Tesseract.js
- jsPDF for PDF export

## Scripts

- `npm run dev` – start the dev server
- `npm run build` – production build
- `npm run preview` – preview the production build
- `npm run lint` – run ESLint

## Privacy

All OCR runs locally in your browser. The app stores only the selected school in `localStorage`. No images or grades are uploaded to a server.

## Acknowledgements

- RapidOCR/PP-OCR (via `client-side-ocr`)
- Tesseract.js
- jsPDF
- Vite, React, Tailwind CSS
