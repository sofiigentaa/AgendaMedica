import React, { useState } from 'react';
import {
  MessageCircle,
  Send,
  CheckCircle2,
  Copy,
  Calendar,
  Clock,
  User,
  Sparkles,
  Search,
  ExternalLink,
  Mail,
  XCircle,
  Check,
  Bot,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  PhoneCall,
  Undo2,
  AlertTriangle
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '../types';
import { generateAppointmentReminder } from '../utils/whatsapp';
import { formatDatePretty } from '../utils/storage';
import { getTreatmentById } from '../data/treatments';

interface ReminderManagerProps {
  currentDate: string;
  appointments: Appointment[];
  onMarkReminderSent: (appointmentId: string) => void;
  onMarkAllRemindersSent: (appointmentIds: string[]) => void;
  onUpdateStatus?: (appointmentId: string, status: AppointmentStatus) => void;
}

export default function ReminderManager({
  currentDate,
  appointments,
  onMarkReminderSent,
  onMarkAllRemindersSent,
  onUpdateStatus
}: ReminderManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSent, setFilterSent] = useState<'all' | 'pending' | 'sent' | 'cancelled'>('all');
  const [simulationNotification, setSimulationNotification] = useState<{
    message: string;
    type: 'success' | 'danger' | 'info';
    apptId?: string;
  } | null>(null);

  // Next day date calculation for reminders
  const [y, m, d] = currentDate.split('-').map(Number);
  const nextDateObj = new Date(y, m - 1, d);
  nextDateObj.setDate(nextDateObj.getDate() + 1);
  const nextDateStr = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;

  const [targetDate, setTargetDate] = useState<string>(currentDate);

  const targetAppointments = appointments
    .filter((a) => a.fecha === targetDate && !a.esBloqueo && a.tratamientoId !== 'no_dar')
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const activeTargetAppointments = targetAppointments.filter((a) => a.estado !== 'cancelado');
  const cancelledAppointments = targetAppointments.filter((a) => a.estado === 'cancelado');

  const filteredAppointments = targetAppointments.filter((a) => {
    const matchesSearch =
      `${a.pacienteNombre} ${a.pacienteDni} ${a.pacienteTelefono} ${a.tratamientoNombre}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesSent =
      filterSent === 'all'
        ? true
        : filterSent === 'pending'
        ? !a.recordatorioEnviado && a.estado !== 'cancelado'
        : filterSent === 'sent'
        ? a.recordatorioEnviado && a.estado !== 'cancelado'
        : a.estado === 'cancelado';

    return matchesSearch && matchesSent;
  });

  const pendingCount = activeTargetAppointments.filter((a) => !a.recordatorioEnviado).length;

  const handleBatchSendPending = () => {
    const pendingIds = targetAppointments
      .filter((a) => !a.recordatorioEnviado && a.estado !== 'cancelado')
      .map((a) => a.id);

    if (pendingIds.length === 0) {
      setSimulationNotification({
        message: 'No hay recordatorios pendientes para esta fecha.',
        type: 'info'
      });
      return;
    }
    onMarkAllRemindersSent(pendingIds);
    setSimulationNotification({
      message: `✓ Se marcaron ${pendingIds.length} recordatorios como enviados.`,
      type: 'success'
    });
  };

  const handleSimulateReply = (apptId: string, replyType: 'confirm' | 'cancel') => {
    if (!onUpdateStatus) return;

    const targetAppt = appointments.find((a) => a.id === apptId);
    if (!targetAppt) return;

    if (replyType === 'confirm') {
      onUpdateStatus(apptId, 'confirmado');
      onMarkReminderSent(apptId);
    } else if (replyType === 'cancel') {
      onUpdateStatus(apptId, 'cancelado');
    }
  };

  const handleReactivateTurno = (apptId: string) => {
    if (!onUpdateStatus) return;
    onUpdateStatus(apptId, 'confirmado');
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner with Undo Action */}
      {simulationNotification && (
        <div
          className={`p-4 rounded-2xl shadow-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 text-white ${
            simulationNotification.type === 'danger'
              ? 'bg-rose-700 border-rose-600'
              : simulationNotification.type === 'info'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-emerald-600 border-emerald-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 text-white shrink-0">
              {simulationNotification.type === 'danger' ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div className="text-sm font-bold">{simulationNotification.message}</div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {simulationNotification.type === 'danger' && simulationNotification.apptId && (
              <button
                type="button"
                onClick={() => handleReactivateTurno(simulationNotification.apptId!)}
                className="text-xs bg-white text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-xl font-black transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Deshacer Cancelación</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSimulationNotification(null)}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Centro de WhatsApp y Recordatorios
              </h2>
              <p className="text-xs text-slate-500">
                Envío de turnos con indicaciones pre-tratamiento y gestión rápida de respuestas
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector for Reminders & Batch Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTargetDate(currentDate)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                targetDate === currentDate
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Turnos de Hoy ({formatDatePretty(currentDate).split(',')[0]})
            </button>
            <button
              onClick={() => setTargetDate(nextDateStr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                targetDate === nextDateStr
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Turnos de Mañana
            </button>
          </div>

          {pendingCount > 0 && (
            <button
              onClick={handleBatchSendPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Marcar {pendingCount} como enviados</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Interactive WhatsApp Guide Box */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-2">
              <span>Gestión de Respuestas de WhatsApp</span>
              <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                1-Clic
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
              Si el paciente te avisa por WhatsApp que asiste o que no puede venir, presioná <strong>"Confirmó"</strong> o <strong>"Canceló"</strong> en su tarjeta para actualizar la agenda al instante y liberar el horario en caso de cancelación.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and search */}
      <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar paciente por nombre, DNI o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <select
              value={filterSent}
              onChange={(e) => setFilterSent(e.target.value as any)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los turnos ({targetAppointments.length})</option>
              <option value="pending">Pendientes de Envío ({pendingCount})</option>
              <option value="sent">Ya Enviados ({activeTargetAppointments.length - pendingCount})</option>
              <option value="cancelled">Cancelados ({cancelledAppointments.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No hay turnos con el filtro seleccionado para esta fecha
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Seleccioná otra fecha o cambiá el filtro para ver los turnos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((appt) => {
            const treatment = getTreatmentById(appt.tratamientoId);
            const reminder = generateAppointmentReminder(appt);
            const isCancelled = appt.estado === 'cancelado';
            const isConfirmed = appt.estado === 'confirmado';

            return (
              <div
                key={appt.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all space-y-3.5 flex flex-col justify-between ${
                  isCancelled
                    ? 'border-rose-300 bg-rose-50/20'
                    : isConfirmed
                    ? 'border-emerald-200/80 bg-emerald-50/15'
                    : appt.recordatorioEnviado
                    ? 'border-teal-200 bg-teal-50/10'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top: Patient & Time info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-bold ${isCancelled ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                          {appt.pacienteNombre}
                        </h3>
                        {isCancelled ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Canceló Turno</span>
                          </span>
                        ) : isConfirmed ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Confirmó Asistencia</span>
                          </span>
                        ) : appt.recordatorioEnviado ? (
                          <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                            ✓ Enviado (Esperando rta)
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            Pendiente de envío
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Cel: <strong className="text-slate-800">{appt.pacienteTelefono}</strong> • DNI: {appt.pacienteDni}
                      </div>
                    </div>

                    {/* Time pill */}
                    <div className={`px-2.5 py-1 rounded-lg text-right text-xs font-black shrink-0 ${
                      isCancelled ? 'bg-slate-300 text-slate-700' : 'bg-slate-900 text-white'
                    }`}>
                      {appt.horaInicio} - {appt.horaFin} hs
                    </div>
                  </div>

                  {/* Treatment and prep requirements */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        {appt.tratamientoNombre} ({appt.duracionMinutos} min)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">{appt.obraSocial}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                      <strong>Preparación:</strong> {treatment.prepInstructions}
                    </div>
                  </div>

                  {/* Message Preview Box */}
                  <div className="bg-emerald-950/5 border border-emerald-200/60 p-3 rounded-xl text-xs text-slate-700 font-mono whitespace-pre-line text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                    {reminder.messageText}
                  </div>

                  {/* Quick Action Bar for WhatsApp responses */}
                  {onUpdateStatus && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Respuesta del paciente:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isCancelled ? (
                          <button
                            type="button"
                            onClick={() => handleReactivateTurno(appt.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Reactivar y confirmar este turno cancelado"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Reactivar / Confirmar Turno</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSimulateReply(appt.id, 'confirm')}
                              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                                isConfirmed
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}
                              title="Marcar como Confirmado por WhatsApp"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isConfirmed ? 'Confirmado' : 'Confirmó'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSimulateReply(appt.id, 'cancel')}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Marcar como Cancelado por el paciente"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Canceló</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onMarkReminderSent(appt.id)}
                    className="text-xs text-slate-500 hover:text-slate-800 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                    title="Marcar o desmarcar estado enviado"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${appt.recordatorioEnviado ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </button>

                  <a
                    href={reminder.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onMarkReminderSent(appt.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all min-h-[40px]"
                  >
                    <MessageCircle className="w-4 h-4 text-white shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
