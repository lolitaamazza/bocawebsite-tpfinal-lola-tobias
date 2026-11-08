const paths = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.35-4.35',
  close: 'M6 6l12 12M18 6 6 18',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  share: 'M12 3v12m0-12L7.5 7.5M12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  prev: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 21h.01M17 21h.01',
  soundOn: 'M4 9v6h4l5 4V5L8 9H4Zm12.5-1a5 5 0 0 1 0 8m2.5-11a9 9 0 0 1 0 14',
  soundOff: 'M4 9v6h4l5 4V5L8 9H4Zm13 1 5 5m0-5-5 5',
  more: 'M6 9l6 6 6-6',
}
/** Íconos de trazo, 24×24, heredan el color del texto */
export function Icon({ name, className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
