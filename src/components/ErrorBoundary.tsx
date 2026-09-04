import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h1 className="text-lg font-bold text-slate-100">
              Ocurrió un inconveniente al cargar la vista
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed">
              No te preocupes, tus datos de pacientes y turnos están guardados en tu dispositivo. Hacé clic abajo para restablecer la vista.
            </p>

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restablecer y Recargar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


