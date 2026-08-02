const VARIANTS = {
  primary: 'bg-signal text-chalk hover:bg-signal-dark',
  dark: 'bg-asphalt text-chalk hover:bg-asphalt-800',
  outline: 'border border-asphalt/20 text-ink hover:border-signal hover:text-signal',
  ghost: 'text-ink hover:text-signal',
};

export default function Button({ variant = 'primary', className = '', as: As = 'button', ...props }) {
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-sm font-semibold tracking-wide transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
