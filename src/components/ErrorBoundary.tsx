import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
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
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="p-3 border-2 border-dashed border-red-200 bg-red-50 text-red-600 text-[11px] rounded-xl flex flex-col gap-1">
                    <p className="font-bold">Erro de renderização</p>
                    <p className="opacity-70 truncate">{this.state.error?.message}</p>
                </div>
            );
        }

        return this.props.children;
    }
}
