interface BrandWordmarkProps {
  className?: string;
}

/**
 * The text counterpart to the StudyAI Now logo.
 * Individual word gradients keep the mark recognisable on light and dark surfaces.
 */
export function BrandWordmark({ className = '' }: BrandWordmarkProps) {
  return (
    <span className={`inline-flex items-baseline whitespace-nowrap font-black tracking-[-0.055em] ${className}`}>
      <span className="bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-700 bg-clip-text text-transparent">Study</span>
      <span className="ml-[0.18em] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 bg-clip-text text-transparent">AI</span>
      <span className="ml-[0.18em] bg-gradient-to-br from-rose-500 via-red-500 to-amber-500 bg-clip-text text-transparent">Now!</span>
    </span>
  );
}
