/**
 * StarRating — interactive star input or read-only display.
 *
 * Props:
 *   value      – current rating (1–5)
 *   onChange   – called with new rating when user clicks; omit for read-only
 *   max        – max stars (default 5)
 *   size       – 'sm' | 'md' | 'lg'
 */
export default function StarRating({ value = 0, onChange, max = 5, size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  const gap   = { sm: 'gap-0.5', md: 'gap-1', lg: 'gap-1.5' };
  const readOnly = !onChange;

  return (
    <span
      className={`inline-flex items-center ${gap[size]} ${className}`}
      role={readOnly ? 'img' : 'group'}
      aria-label={readOnly ? `Rating: ${value} out of ${max} stars` : 'Select a star rating'}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(i + 1)}
            aria-label={`${i + 1} star${i === 0 ? '' : 's'}`}
            className={[
              'transition-transform',
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-125 active:scale-110',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 rounded-sm',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 24 24"
              fill={filled ? '#F2A93B' : 'none'}
              stroke={filled ? '#F2A93B' : '#C8CDD5'}
              strokeWidth="1.5"
              className={sizes[size]}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
              />
            </svg>
          </button>
        );
      })}
    </span>
  );
}
