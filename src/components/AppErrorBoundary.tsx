import { Component, type ReactNode } from 'react';
import { reportError } from '@/lib/errorReporting';

/** Catches a crash anywhere in the app: reports it and offers a reload instead of a blank page. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error: Error, info: { componentStack?: string | null }) {
		reportError(error, { componentStack: info.componentStack || undefined });
	}

	render() {
		if (!this.state.failed) return this.props.children;
		return (
			<div className="min-h-screen flex items-center justify-center bg-background p-6">
				<div className="max-w-sm text-center space-y-3">
					<h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
					<p className="text-sm text-muted-foreground">We've been told about it. Reloading the page usually fixes it.</p>
					<button
						className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
						onClick={() => window.location.reload()}
					>
						Reload
					</button>
				</div>
			</div>
		);
	}
}
