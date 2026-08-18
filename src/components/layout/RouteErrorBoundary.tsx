import { AlertTriangle, BookOpen, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type RouteErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
  message: string;
  retryLabel: string;
  returnLabel: string;
  onRetry: () => void;
  onReturnToCourses: () => void;
};

type RouteErrorBoundaryState = { hasError: boolean };

/**
 * The reset key follows React Router's path and query string. A bad lazy
 * route, stale browser state, or a component exception therefore cannot trap
 * a visitor on a blank page: moving to another route immediately retries its
 * subtree, while the two explicit actions remain available on the failing one.
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  declare readonly props: RouteErrorBoundaryProps;
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('StudyAI route failed to render', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <main data-testid="route-error-boundary" role="alert" className="mx-auto flex min-h-[58vh] max-w-xl items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm sm:p-8">
        <AlertTriangle className="h-7 w-7 text-amber-700" aria-hidden="true" />
        <p className="mt-4 text-lg font-bold">{this.props.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button data-testid="route-error-retry" type="button" onClick={this.props.onRetry} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" />
            {this.props.retryLabel}
          </button>
          <button data-testid="route-error-return-courses" type="button" onClick={this.props.onReturnToCourses} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
            <BookOpen className="h-4 w-4" />
            {this.props.returnLabel}
          </button>
        </div>
      </section>
    </main>;
  }
}
