import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, UserRound } from 'lucide-react';
import EsteticaLaserLogo from './EsteticaLaserLogo';
import { loginRequest } from '../utils/authClient';

interface LoginScreenProps {
  onSuccess: (username: string) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await loginRequest(username, password);
    setSubmitting(false);
    if (result.ok === false) {
      setError(result.error);
      return;
    }
    onSuccess(result.user.username);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(2,132,199,0.16),_transparent_50%)]" />
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
            <div className="bg-white px-3 py-1.5 rounded-xl">
              <EsteticaLaserLogo size="md" theme="light" />
            </div>
            <div className="flex items-center gap-1.5 text-teal-300 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Acceso privado
            </div>
          </div>

          <form id="login-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5" autoComplete="on">
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900">Ingreso al consultorio</h1>
              <p className="text-sm text-slate-500">
                Agenda Médica de Estética Láser Rosario. Solo personal autorizado.
              </p>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Usuario</span>
              <div className="relative">
                <UserRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Usuario del consultorio"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Contraseña</span>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div
                id="login-error"
                role="alert"
                className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-4 py-3 rounded-2xl"
              >
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-3.5 rounded-2xl shadow-md shadow-teal-500/20 transition-all"
            >
              {submitting ? 'Verificando…' : 'Ingresar de forma segura'}
            </button>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              La sesión usa una cookie HttpOnly, expira a las 8 horas y los intentos fallidos se
              bloquean para proteger los datos de pacientes.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
