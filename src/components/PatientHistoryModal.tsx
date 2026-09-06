import { X, History, CalendarClock, Clock, Stethoscope, DollarSign } from 'lucide-react';
import { Patient, Appointment } from '../types';
import { STATUS_LABELS, formatCurrency } from '../data/treatments';
import { formatDatePretty } from '../utils/storage';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  appointments: Appointment[];
}

export default function PatientHistoryModal({
  isOpen,
  onClose,
  patient,
  appointments
}: PatientHistoryModalProps) {
  if (!isOpen || !patient) return null;

  // Todos los turnos del paciente (con su motivo/tratamiento), del más
  // reciente al más antiguo.
  const patientAppointments = appointments
    .filter((a) => a.pacienteId === patient.id)
    .sort((a, b) => {
      const dateCompare = b.fecha.localeCompare(a.fecha);
      if (dateCompare !== 0) return dateCompare;
      return b.horaInicio.localeCompare(a.horaInicio);
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Cabecera fija: no se mueve mientras se scrolea la lista de turnos */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg border bg-teal-500/20 text-teal-400 border-teal-500/30 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">
                Historial de Turnos
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {patient.apellido}, {patient.nombre} • DNI: {patient.dni}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-cabecera fija con el conteo total, también fuera del área con scroll */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-2 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-700">
            {patientAppointments.length} turno{patientAppointments.length === 1 ? '' : 's'} registrado
            {patientAppointments.length === 1 ? '' : 's'}
          </span>
          <span className="text-[11px] text-slate-400">Del más reciente al más antiguo</span>
        </div>

        {/* Cuerpo con scroll: solo esta parte se desplaza, la cabecera queda fija arriba */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {patientAppointments.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarClock className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                Este paciente todavía no tiene turnos registrados
              </p>
              <p className="text-xs text-slate-400">
                Los turnos y motivos que se le asignen van a aparecer acá.
              </p>
            </div>
          ) : (
            patientAppointments.map((appt) => {
              const statusInfo = STATUS_LABELS[appt.estado] || STATUS_LABELS['confirmado'];
              return (
                <div
                  key={appt.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <CalendarClock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{formatDatePretty(appt.fecha)}</span>
                      <span className="text-slate-400 font-medium">•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-600">{appt.horaInicio} hs</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="font-semibold">Motivo:</span>
                    <span>{appt.tratamientoNombre || 'Sin especificar'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {formatCurrency(appt.honorarios || 0)}
                    </span>
                    {appt.observaciones && (
                      <span className="truncate max-w-[60%] italic">{appt.observaciones}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
