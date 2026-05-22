import { formatPnL, pnlClass } from '../utils/pnl.js';

export default function PnlValue({
  value,
  asPercent = false,
  showSign = true,
  className = '',
  size = 'sm',
}) {
  const sizeClass =
    size === 'lg' ? 'text-lg font-semibold' : size === 'md' ? 'text-base font-medium' : 'text-sm';

  return (
    <span className={`font-mono tabular-nums transition-colors duration-300 ${sizeClass} ${pnlClass(value)} ${className}`}>
      {formatPnL(value, { showSign, asPercent })}
    </span>
  );
}
