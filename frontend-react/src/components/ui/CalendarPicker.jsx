import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * CalendarPicker — Airbnb-style inline calendar.
 * @param {string} value       - ISO date string "YYYY-MM-DD" (selected date)
 * @param {Function} onChange  - called with "YYYY-MM-DD" when a day is clicked
 * @param {boolean} disablePast - if true, past dates cannot be selected (default false)
 */
export function CalendarPicker({ value, onChange, disablePast = false }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse the currently selected date, or default to today
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // Viewer starts at selected month, or current month
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build the days grid
  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) cells.push(null);

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    return cells;
  }, [viewYear, viewMonth]);

  const isoStr = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isSelected = (date) => date && isoStr(date) === value;
  const isToday = (date) => date && isoStr(date) === isoStr(today);
  const isPast = (date) => disablePast && date && date < today;

  const handleDayClick = (date) => {
    if (!date) return;
    if (isPast(date)) return;
    onChange(isoStr(date));
  };

  // Can go back only if not at current month (when disablePast is on)
  const canGoPrev = !disablePast || viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  return (
    <div className="select-none w-full">
      {/* Month / Year Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
            canGoPrev
              ? 'text-stone-700 hover:bg-stone-100 cursor-pointer'
              : 'text-stone-300 cursor-not-allowed'
          }`}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <span className="text-base font-bold text-stone-950">
            {MONTHS[viewMonth]} {viewYear}
          </span>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day Names Row */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-stone-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((date, idx) => {
          const selected = isSelected(date);
          const todayCell = isToday(date);
          const past = isPast(date);

          return (
            <div key={idx} className="flex items-center justify-center py-0.5">
              {date ? (
                <button
                  type="button"
                  onClick={() => handleDayClick(date)}
                  disabled={past}
                  className={`relative w-10 h-10 flex flex-col items-center justify-center rounded-full text-sm font-semibold transition-all duration-150 ${
                    selected
                      ? 'bg-[#0D5C3A] text-white shadow-sm scale-105'
                      : past
                      ? 'text-stone-300 cursor-not-allowed'
                      : 'text-stone-800 hover:bg-[#EAF5EF] hover:text-[#0D5C3A] cursor-pointer'
                  }`}
                  aria-label={`Select ${MONTHS[date.getMonth()]} ${date.getDate()}`}
                  aria-pressed={selected}
                >
                  {date.getDate()}
                  {/* Today indicator dot */}
                  {todayCell && !selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#0D5C3A]" />
                  )}
                  {todayCell && selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-200" />
                  )}
                </button>
              ) : (
                <div className="w-10 h-10" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarPicker;
