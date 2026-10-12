import type { Range } from '../lib/api';
import { rangeLabel } from '../lib/api';

const RANGES: Range[] = ['24h', '3d', '7d', '30d'];

export function RangePicker({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="a-seg">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          className={value === r ? 'on' : undefined}
          onClick={() => onChange(r)}
        >
          {rangeLabel(r)}
        </button>
      ))}
    </div>
  );
}
