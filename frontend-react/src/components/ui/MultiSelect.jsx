import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

/**
 * Dropdown that allows several choices. The closed button shows the chosen
 * options as chips; the open panel is a checklist. Closes on an outside
 * click or Escape.
 *
 * @param {{ value: string, label: string }[]} options
 * @param {string[]} value       Chosen option values.
 * @param {(next: string[]) => void} onChange
 */
export function MultiSelect({ options, value, onChange, placeholder = 'Select…', disabled = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const labelOf = (v) => options.find((o) => o.value === v)?.label || v;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full min-h-[50px] px-3 py-2 bg-white dark:bg-[#1E2124] border border-neutral-300 dark:border-[#2B3238] rounded-xl text-left flex items-center gap-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all disabled:bg-stone-50 dark:disabled:bg-[#17191A] disabled:cursor-not-allowed"
      >
        <span className="flex-1 flex flex-wrap gap-1.5">
          {value.length === 0 ? (
            <span className="text-sm text-neutral-400 dark:text-[#64748B] px-1">{placeholder}</span>
          ) : (
            value.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-[#DFFF83] text-[#17191A] text-xs font-semibold"
              >
                {labelOf(v)}
                {!disabled && (
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${labelOf(v)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(v);
                    }}
                    className="p-0.5 rounded hover:bg-[#C5E95A]"
                  >
                    <X size={12} />
                  </span>
                )}
              </span>
            ))
          )}
        </span>
        <ChevronDown size={16} className={`text-neutral-400 dark:text-[#64748B] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-40 left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-white dark:bg-[#1E2124] border border-neutral-200 dark:border-[#2B3238] rounded-xl shadow-lg dark:shadow-black/30 p-1"
        >
          {options.map((o) => {
            const on = value.includes(o.value);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left cursor-pointer transition-colors ${
                    on
                      ? 'bg-[#F7FFE0] dark:bg-[#142312] text-[#17191A] dark:text-[#DFFF83] font-semibold'
                      : 'text-neutral-800 dark:text-[#F5F7F5] hover:bg-neutral-50 dark:hover:bg-[#2B3238]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      on
                        ? 'bg-[#DFFF83] border-[#B7DA3E]'
                        : 'bg-white dark:bg-[#17191A] border-neutral-300 dark:border-[#374151]'
                    }`}
                  >
                    {on && <Check size={13} strokeWidth={3} className="text-[#17191A]" />}
                  </span>
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MultiSelect;
