import { forwardRef } from 'react';

const variants = {
  primary: 'bg-signal text-chalk hover:bg-signal-dark active:scale-[0.97] shadow-sm',
  dark:    'bg-asphalt text-chalk hover:bg-asphalt-700 active:scale-[0.97] shadow-sm',
  outline: 'border border-asphalt/20 text-ink hover:border-signal hover:text-signal-dark active:scale-[0.97]',
  ghost:   'text-ink/70 hover:text-signal hover:bg-signal/8 active:scale-[0.97]',
  danger:  'bg-cone text-chalk hover:bg-cone-dark active:scale-[0.97] shadow-sm',
  meter:   'bg-meter text-white hover:bg-meter/90 active:scale-[0.97] shadow-sm',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

function Spinner() {
  return (
    <svg
      className="mr-2 h-4 w-4 animate-spin-slow"
      viewBox="0 0 24 24" fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, as: Tag = 'button', className = '', children, ...props },
  ref
) {
  const base = [
    'inline-flex items-center justify-center rounded-full font-display font-semibold',
    'transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    className,
  ].join(' ');

  const isDisabled = disabled || loading;

  if (Tag === 'button') {
    return (
      <button ref={ref} className={base} disabled={isDisabled} {...props}>
        {loading && <Spinner />}
        {children}
      </button>
    );
  }

  return (
    <Tag ref={ref} className={base} {...props}>
      {loading && <Spinner />}
      {children}
    </Tag>
  );
});

export default Button;
