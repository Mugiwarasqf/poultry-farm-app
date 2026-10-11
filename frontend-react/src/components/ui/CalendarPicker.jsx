import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { PillIcon } from './PillIcon';
import { EVENT_STYLES } from '../../lib/healthEvents';
import { toIso } from '../../lib/supplements';
import { VaccineIcon } from './VaccineIcon';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatLongDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Month calendar that shows the farm's appointments inside each date box.
 *
 * Used both as the date picker inside the vaccination / vitamin forms
 * (variant "compact") and as the full health calendar on Inventory (variant
 * "full"). On wider screens each box lists its appointments as small chips;
 * on phones, where a box is too small for text, they become coloured dots and
 * the list for the tapped day appears under the grid.
 *
 * @param {string}   value      selected date, "YYYY-MM-DD"
 * @param {Function} onChange   called with "YYYY-MM-DD"
 * @param {Array}    events     from buildHealthEvents()
 * @param {string}   minDate    earliest selectable date (optional)
 * @param {string}   maxDate    latest selectable date (optional)
 * @param {string}   variant    "compact" | "full"
 * @param {Function} agendaActions  (date) => node, shown with the day's list
 * @param {Function} onEventClick   (event) => void, optional
 */
export function CalendarPicker({
  value,
  onChange,
  events = [],
  minDate,
  maxDate,
  variant = 'compact',
  agendaActions,
  onEventClick,
}) {
  const todayIso = toIso(new Date());
  const start = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(start.getFullYear());
  const [viewMonth, setViewMonth] = useState(start.getMonth());

  const full = variant === 'full';
  const maxChips = full ? 3 : 2;

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });
    return map;
  }, [events]);

  // Whole weeks, including the tail of last month and the start of next, so
  // the grid is always a clean rectangle.
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return { iso: toIso(d), day: d.getDate(), inMonth: d.getMonth() === viewMonth };
    });
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const goToday = () => {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    if (isSelectable(todayIso)) onChange?.(todayIso);
  };

  const isSelectable = (iso) => (!minDate || iso >= minDate) && (!maxDate || iso <= maxDate);

  const monthCount = cells.filter((c) => c.inMonth).reduce((n, c) => n + (eventsByDate.get(c.iso)?.length || 0), 0);
  const agendaDate = value || todayIso;
  const agendaEvents = eventsByDate.get(agendaDate) || [];

  return (
    <div className="select-none w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-bold text-stone-950 font-heading ${full ? 'text-lg sm:text-xl' : 'text-base'}`}>
            {MONTHS[viewMonth]} {viewYear}
          </div>
          <div className="text-[11px] text-stone-500">
            {monthCount === 0 ? 'Nothing planned this month' : `${monthCount} appointment${monthCount === 1 ? '' : 's'} this month`}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={goToday}
            className="px-3 h-8 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:border-[#D2EC7A] hover:text-[#4D6600] transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-stone-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-200">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-wide">
              <span className="sm:hidden">{d.charAt(0)}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-stone-200">
          {cells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.iso) || [];
            const selectable = isSelectable(cell.iso);
            const selected = cell.iso === value;
            const isToday = cell.iso === todayIso;
            const hidden = dayEvents.length - maxChips;

            return (
              <button
                key={cell.iso}
                type="button"
                disabled={!selectable}
                onClick={() => onChange?.(cell.iso)}
                aria-label={`${formatLongDate(cell.iso)}${dayEvents.length ? `, ${dayEvents.length} appointment${dayEvents.length === 1 ? '' : 's'}` : ''}`}
                aria-pressed={selected}
                className={`relative flex flex-col items-stretch text-left p-1 sm:p-1.5 transition-colors ${
                  full ? 'min-h-14 sm:min-h-28' : 'min-h-12 sm:min-h-20'
                } ${
                  selected
                    ? 'bg-[#F7FFE0] ring-2 ring-inset ring-[#B7DA3E] z-10'
                    : !selectable
                    ? 'bg-stone-50 cursor-not-allowed'
                    : cell.inMonth
                    ? 'bg-white hover:bg-[#F7FFE0] cursor-pointer'
                    : 'bg-stone-50/80 hover:bg-[#F7FFE0] cursor-pointer'
                }`}
              >
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-full text-xs sm:text-[13px] font-semibold shrink-0 ${
                    isToday
                      ? 'bg-[#DFFF83] text-[#17191A]'
                      : !selectable
                      ? 'text-stone-300'
                      : cell.inMonth
                      ? 'text-stone-800'
                      : 'text-stone-400'
                  }`}
                >
                  {cell.day}
                </span>

                {/* Phones: dots */}
                {dayEvents.length > 0 && (
                  <span className="sm:hidden flex flex-wrap gap-0.5 mt-auto pt-0.5 justify-center">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${EVENT_STYLES[e.status].dot}`} />
                    ))}
                  </span>
                )}

                {/* Wider screens: chips inside the box */}
                {dayEvents.length > 0 && (
                  <span className="hidden sm:flex flex-col gap-0.5 mt-1 min-w-0">
                    {dayEvents.slice(0, maxChips).map((e) => (
                      <span
                        key={e.id}
                        title={`${e.title}${e.batchName ? ` — ${e.batchName}` : ''}`}
                        className={`block truncate rounded-[4px] border-l-2 px-1 py-px text-[10px] font-semibold leading-tight ${EVENT_STYLES[e.status].chip} ${
                          e.status === 'done' ? 'line-through decoration-stone-400/60' : ''
                        }`}
                      >
                        {e.title}
                      </span>
                    ))}
                    {hidden > 0 && (
                      <span className="text-[10px] font-semibold text-stone-500 px-1">+{hidden} more</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(EVENT_STYLES).map(([key, s]) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Agenda for the selected (or today's) date */}
      {(full || agendaEvents.length > 0) && (
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays size={15} className="text-[#4D6600] shrink-0" />
              <span className="text-xs font-bold text-stone-900 truncate">
                {agendaDate === todayIso ? 'Today' : formatLongDate(agendaDate)}
              </span>
              {agendaDate === todayIso && <span className="hidden sm:inline text-[11px] text-stone-400 truncate">{formatLongDate(agendaDate)}</span>}
            </div>
            {agendaActions && <div className="shrink-0 flex flex-wrap gap-1.5">{agendaActions(agendaDate)}</div>}
          </div>
          {agendaEvents.length === 0 ? (
            <div className="px-4 py-4 text-xs text-stone-400">Nothing planned for this day.</div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {agendaEvents.map((e) => {
                const Icon = e.kind === 'supplement' ? PillIcon : VaccineIcon;
                const clickable = Boolean(onEventClick);
                return (
                  <li key={e.id}>
                    <div
                      role={clickable ? 'button' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={clickable ? () => onEventClick(e) : undefined}
                      onKeyDown={clickable ? (ev) => { if (ev.key === 'Enter') onEventClick(e); } : undefined}
                      className={`flex items-center gap-3 px-4 py-2.5 ${clickable ? 'hover:bg-stone-50 cursor-pointer' : ''}`}
                    >
                      <span className={`w-1 self-stretch rounded-full ${EVENT_STYLES[e.status].dot}`} />
                      <Icon size={15} className="text-stone-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold text-stone-900 truncate ${e.status === 'done' ? 'line-through text-stone-500' : ''}`}>
                          {e.title}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate">
                          {[e.batchName, e.detail].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide text-stone-400 shrink-0">
                        {EVENT_STYLES[e.status].label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default CalendarPicker;
