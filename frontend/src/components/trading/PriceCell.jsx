import { usePriceFlash } from '@/hooks/usePriceFlash';
import { cn } from '@/lib/utils';

/**
 * Wraps numeric price displays with a 500ms green/red tick flash on change.
 */
export default function PriceCell({ value, children, className, as: Component = 'span' }) {
  const flash = usePriceFlash(value);

  return (
    <Component
      className={cn(
        'inline-block rounded-sm px-1 tabular-nums transition-colors duration-500',
        flash === 'up' && 'flash-up',
        flash === 'down' && 'flash-down',
        className,
      )}
    >
      {children}
    </Component>
  );
}
