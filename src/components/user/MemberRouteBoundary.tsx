import { AlertTriangle, BookOpen, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type MemberRouteBoundaryProps = {
  children: ReactNode;
  message: string;
  retryLabel: string;
  returnLabel: string;
  onReturnToCourses: () => void;
};

type MemberRouteBoundaryState = { hasError: boolean };

/**
 * A member-page exception must never leave the shared workspace shell empty.
 * The parent keys this boundary by pathname so a different sidebar destination
 * remains usable even if one feature page encounters malformed cached data.
 */
export class MemberRouteBoundary extends Component<MemberRouteBoundaryProps, MemberRouteBoundaryState> {
  declare readonly props: MemberRouteBoundaryProps;
  state: MemberRouteBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MemberRouteBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Member workspace page failed to render', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <section role="alert" className="mx-auto mt-8 max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <AlertTriangle className="h-6 w-6 text-amber-700" aria-hidden="true" />
      <p className="mt-3 font-semibold">{this.props.message}</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90">
        <RefreshCw className="h-4 w-4" />
        {this.props.retryLabel}
      </button>
      <button type="button" onClick={this.props.onReturnToCourses} className="mt-5 ml-3 inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
        <BookOpen className="h-4 w-4" />
        {this.props.returnLabel}
      </button>
    </section>;
  }
}
