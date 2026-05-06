import React, { Component, ComponentType, PropsWithChildren, ReactNode } from "react";
import { ErrorFallback, type ErrorFallbackProps } from "./ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  fallback?: ReactNode;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = {
  error: Error | null;
  errorCount: number;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorCount: 0 };

  static defaultProps = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    const timestamp = new Date().toISOString();

    console.error(
      `[ErrorBoundary] ${timestamp} ${error.name}: ${error.message}\n${error.stack ?? ""}\nComponent Stack: ${info.componentStack}`
    );

    this.setState((prev) => ({ errorCount: prev.errorCount + 1 }));

    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  handleResetApp = async (): Promise<void> => {
    try {
      const { reloadAppAsync } = require("expo");
      await reloadAppAsync();
    } catch {
      this.resetError();
    }
  };

  render() {
    const { FallbackComponent, fallback, children } = this.props;
    const { error, errorCount } = this.state;

    if (error) {
      if (fallback) {
        return <>{fallback}</>;
      }

      if (FallbackComponent) {
        const Comp = FallbackComponent;
        return (
          <Comp
            error={error}
            resetError={this.resetError}
            errorCount={errorCount}
            onResetApp={this.handleResetApp}
          />
        );
      }
    }

    return children;
  }
}