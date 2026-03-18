import { RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("View error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      return (
        <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-4 border border-dashed border-border bg-muted/20 p-6 text-center">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Something went wrong</h2>
            <p className="mb-4 max-w-md text-xs text-muted-foreground">
              {this.state.error.message ||
                "An unexpected error occurred. Try refreshing or selecting another view."}
            </p>
          </div>
          <Button className="gap-2" onClick={this.retry} size="sm" variant="outline">
            <RotateCcw className="size-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
