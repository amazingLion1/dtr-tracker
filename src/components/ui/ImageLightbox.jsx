import { useEffect, useState } from 'react'
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Full-screen image lightbox with zoom, pan, and gallery navigation.
 *
 * Props:
 *  - images: Array of { src, name } objects
 *  - startIndex: initial image index to show
 *  - onClose: close callback
 */
export default function ImageLightbox({ images = [], startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex)
  const [zoom, setZoom] = useState(1)

  const img = images[index]
  const hasMultiple = images.length > 1

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasMultiple) setIndex(i => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight' && hasMultiple) setIndex(i => (i + 1) % images.length)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4))
      if (e.key === '-') setZoom(z => Math.max(z - 0.5, 0.5))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, hasMultiple, images.length])

  // Reset zoom on image change
  useEffect(() => { setZoom(1) }, [index])

  if (!img) return null

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/40 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {hasMultiple && (
            <span className="text-white/60 text-xs font-medium tabular-nums">
              {index + 1} / {images.length}
            </span>
          )}
          <span className="text-white/40 text-xs truncate max-w-[200px]">{img.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-white/50 text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close lightbox"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4 relative" onClick={e => e.stopPropagation()}>
        {/* Prev/Next arrows */}
        {hasMultiple && (
          <>
            <button
              onClick={() => setIndex(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setIndex(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <img
          src={img.src}
          alt={img.name}
          className="max-w-full max-h-full object-contain transition-transform duration-200 rounded-lg shadow-2xl"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 bg-black/40 overflow-x-auto shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {images.map((im, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0
                ${i === index ? 'border-white/80 scale-105' : 'border-white/10 opacity-50 hover:opacity-80'}`}
            >
              <img src={im.src} alt={im.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
