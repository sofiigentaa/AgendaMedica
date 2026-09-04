import React, { useState } from 'react';
import {
  Trash2,
  CalendarX2,
  Database,
  Sparkles,
  AlertTriangle,
  X,
  CheckCircle2,
  ShieldAlert,
  HardDriveDownload,
  RotateCcw
} from 'lucide-react';

interface ResetAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllData: () => void;
  onClearAppointmentsOnly: () => void;
  onLoadDemoData: () => void;
  totalAppointments: number;
  totalPatients: number;
}

export default function ResetAgendaModal({
  isOpen,
  onClose,
  onClearAllData,
  onClearAppointmentsOnly,
  onLoadDemoData,
  totalAppointments,
  totalPatients
}: ResetAgendaModalProps) {
  const [confirmStep, setConfirmStep] = useState<null | 'all' | 'appointments' | 'demo'>(null);
  const [confirmationInput, setConfirmationInput] = useState('');

  if (!isOpen) return null;

  const handleAction = (type: 'all' | 'appointments' | 'demo') => {
    setConfirmStep(type);
    setConfirmationInput('');
  };

  const handleExecuteConfirmed = () => {
    if (confirmStep === 'all') {
      onClearAllData();
    } else if (confirmStep === 'appointments') {
      onClearAppointmentsOnly();
    } else if (confirmStep === 'demo') {
      onLoadDemoData();
    }
    setConfirmStep(null);
    onClose();
  };

  // Header content changes depending on whether we're on the main menu
  // or on one of the confirmation screens.
  const headerConfig = {
    null: {
      icon: <Database className="w-5 h-5" />,
      iconClasses: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      title: 'Gestionar y Restablecer Agenda',
      subtitle: 'Opciones de limpieza de calendario, vaciado de datos o carga de demostración'
    },
    appointments: {
      icon: <CalendarX2 className="w-5 h-5" />,
      iconClasses: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      title: 'VACIAR TURNOS',
      subtitle: 'Confirmá si querés borrar todos los turnos del calendario'
    },
    all: {
      icon: <Trash2 className="w-5 h-5" />,
      iconClasses: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      title: 'VACIAR TODO',
      subtitle: 'Confirmá si querés eliminar todos los datos de la agenda'
    },
    demo: {
      icon: <RotateCcw className="w-5 h-5" />,
      iconClasses: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      title: 'DATOS DE DEMOSTRACIÓN',
      subtitle: 'Seleccioná qué información desea vaciar o reiniciar'
    }
  } as const;

  const currentHeader = headerConfig[confirmStep === null ? 'null' : confirmStep];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${currentHeader.iconClasses}`}>
              {currentHeader.icon}
            </div>
            <div>
              <h3 className="font-bold text-base">{currentHeader.title}</h3>
              <p className="text-xs text-slate-400">{currentHeader.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {confirmStep === null ? (
            <>
              {/* Current Status Overview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-around text-center text-xs">
                <div>
                  <div className="text-slate-500 font-medium">Turnos Agendados</div>
                  <div className="text-base font-extrabold text-slate-900">{totalAppointments} turnos</div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <div className="text-slate-500 font-medium">Pacientes en Padrón</div>
                  <div className="text-base font-extrabold text-slate-900">{totalPatients} pacientes</div>
                </div>
              </div>

              {/* Action 1: Vaciar Únicamente Turnos del Calendario */}
              <div className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <CalendarX2 className="w-4 h-4 text-amber-600" />
                    Vaciar únicamente los turnos del calendario
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Borra todos los turnos y bloqueos de horarios, pero <strong>conserva intacto el padrón de pacientes</strong> para que puedas seguir agendándolos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAction('appointments')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs shrink-0 self-start sm:self-auto transition-colors"
                >
                  Vaciar Turnos
                </button>
              </div>

              {/* Action 2: Vaciar Todo (Reset a Cero) */}
              <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    Vaciar todo (Base de datos a cero)
                  </div>
                  <p className="text-[11px] text-rose-800 leading-snug">
                    Elimina todos los turnos, pacientes, historias y pagos. La agenda quedará completamente en blanco lista para comenzar desde cero.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAction('all')}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs shrink-0 self-start sm:self-auto transition-colors"
                >
                  Vaciar Todo
                </button>
              </div>

              {/* Action 3: Cargar Datos de Prueba / Demostración */}
              <div className="p-4 rounded-2xl border-2 border-teal-200 bg-teal-50/50 hover:bg-teal-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Cargar datos de prueba / demostración
                  </div>
                  <p className="text-[11px] text-teal-800 leading-snug">
                    Carga pacientes de ejemplo de Rosario (Swiss Medical, La Segunda, OSDE) y turnos para mostrar la funcionalidad completa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAction('demo')}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs shrink-0 self-start sm:self-auto transition-colors"
                >
                  Cargar Demo
                </button>
              </div>
            </>
          ) : (
            /* Confirmation Step */
            <div className="space-y-5 py-2">
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  confirmStep === 'demo'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    confirmStep === 'demo'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {confirmStep === 'demo' ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {confirmStep === 'demo' && '¿Confirmar carga de datos de muestra?'}
                    {confirmStep === 'appointments' && '¿Confirmar vaciado de turnos?'}
                    {confirmStep === 'all' && '¿Confirmar vaciado total?'}
                  </div>
                  <p className="text-xs leading-relaxed">
                    {confirmStep === 'all' && (
                      <>Estás a punto de <strong>eliminar TODOS los datos</strong> (pacientes y turnos). Esta acción es irreversible si no has descargado un backup previo.</>
                    )}
                    {confirmStep === 'appointments' && (
                      <>Estás a punto de <strong>eliminar TODOS los turnos agendados</strong> del calendario. Los pacientes registrados se mantendrán.</>
                    )}
                    {confirmStep === 'demo' && (
                      <>Se reemplazarán los datos actuales por los pacientes y turnos de demostración. Esta acción no se puede deshacer.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmStep(null)}
                  className="text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-colors"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmed}
                  className={`flex items-center gap-1.5 text-xs font-bold text-white px-5 py-2.5 rounded-xl shadow-xs transition-colors ${
                    confirmStep === 'demo'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {confirmStep === 'demo' && (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Sí, Cargar Datos de Muestra
                    </>
                  )}
                  {confirmStep === 'appointments' && 'Sí, Vaciar Turnos'}
                  {confirmStep === 'all' && 'Sí, Vaciar Todo'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
