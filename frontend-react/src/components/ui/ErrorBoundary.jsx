import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';

/**
 * Last line of defence: if any screen crashes while drawing, show a calm
 * "something went wrong" page with a Reload button instead of a blank white
 * screen. Records are never touched, and entries waiting to send stay saved on
 * the device (IndexedDB), so reloading is always safe.
 *
 * Has to be a class: React only lets class components catch render errors.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Screen crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center" aria-hidden="true">
            <TriangleAlert size={26} strokeWidth={1.75} className="text-[#17191A]" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-[#142033] font-heading">Something went wrong on this screen</h1>
          <p className="mt-2 text-sm text-[#70829B]">
            Your records are safe. Reloading usually fixes it.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] text-sm font-semibold transition-colors cursor-pointer"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/dashboard')}
              className="px-5 py-2.5 rounded-lg border border-[#E1E8EF] text-[#142033] text-sm font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Go to dashboard
            </button>
          </div>
          {/* The error itself, small, so it can be screenshotted and reported. */}
          <p className="mt-6 text-[11px] text-[#70829B]/80 break-words font-mono">{String(error?.message || error)}</p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
