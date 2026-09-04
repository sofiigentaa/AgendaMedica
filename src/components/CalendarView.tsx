import { useState } from 'react';
import {
  Clock,
  User,
  Phone,
  DollarSign,
  CheckCircle,
  MessageCircle,
  Edit2,
  Trash2,
  Plus,
  Search,
  Filter,
  CreditCard,
  Send,
  Calendar,
  AlertCircle,
  Download,
  Printer,
  CalendarOff,
  Ban,
  Grid,
  ListFilter,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Appointment, TreatmentType, AppointmentStatus, PaymentStatus, PaymentMethod, HolidayOrNonWorkingDay } from '../types';
import { TREATMENTS, formatCurrency, getTreatmentById, STATUS_LABELS } from '../data/treatments';
import {
  formatDatePretty,
  isClinicWorkingDay,
  getHolidayInfo,
  getDayOfWeekName,
  CLINIC_WORKING_HOURS
} from '../utils/storage';
import { generateAppointmentReminder } from '../utils/whatsapp';
import { generateAppointmentsCSV, triggerFileDownload } from '../utils/export';
import MonthCalendarView from './MonthCalendarView';
import ConfirmModal from './ConfirmModal';

interface CalendarViewProps {
  currentDate: string;
  onSelectDate: (date: string) => void;
  appointments: Appointment[];
  holidays: HolidayOrNonWorkingDay[];
  onToggleHoliday: (date: string, reason?: string) => void;
  onOpenNewAppointment: (suggestedTime?: string) => void;
  onOpenBlockSlot?: (suggestedTime?: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  onUpdatePayment: (id: string, estadoPago: PaymentStatus, metodoPago?: PaymentMethod) => void;
  onSendReminder: (appointment: Appointment) => void;
  onOpenPrintModal?: () => void;
}

export default function CalendarView({
  currentDate,
  onSelectDate,
  appointments,
  holidays,
  onToggleHoliday,
  onOpenNewAppointment,
  onOpenBlockSlot,
  onEditAppointment,
  onDeleteAppointment,
  onUpdateStatus,
  onUpdatePayment,
  onSendReminder,
  onOpenPrintModal
}: CalendarViewProps) {
  const [calendarMode, setCalendarMode] = useState<'dia' | 'mes'>('dia');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatmentFilter, setSelectedTreatmentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Holiday Modal State for Daily View
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayModalReason, setHolidayModalReason] = useState('');
  const [holidayModalType, setHolidayModalType] = useState<'feriado' | 'no_laborable' | 'vacaciones'>('feriado');

  // Deletion Confirm Modal State
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    title: string;
    message: string;
    subMessage?: string;
    isBlock?: boolean;
  } | null>(null);

  const isWorkingDay = isClinicWorkingDay(currentDate);
  const holidayInfo = getHolidayInfo(currentDate, holidays);
  const dayName = getDayOfWeekName(currentDate);

  const handleOpenHolidayModal = () => {
    if (holidayInfo) {
      setHolidayModalReason(holidayInfo.reason || 'Feriado / Día no laborable');
    } else {
      setHolidayModalReason('Feriado / Día no laborable');
    }
    setHolidayModalType('feriado');
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = () => {
    onToggleHoliday(currentDate, holidayModalReason.trim() || 'Feriado / Día no laborable');
    setIsHolidayModalOpen(false);
  };

  const handleRemoveHoliday = () => {
    onToggleHoliday(currentDate, '');
    setIsHolidayModalOpen(false);
  };

  // If in month mode, render the monthly calendar component
  if (calendarMode === 'mes') {
    return (
      <div className="space-y-4">
        {/* Toggle Mode Header */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Calendario Mensual de Turnos
            </h2>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCalendarMode('dia')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              Vista Día
            </button>
            <button
              onClick={() => setCalendarMode('mes')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white shadow-2xs transition-colors"
            >
              Vista Mes
            </button>
          </div>
        </div>

        <MonthCalendarView
          currentDate={currentDate}
          onSelectDate={onSelectDate}
          appointments={appointments}
          holidays={holidays}
          onToggleHoliday={onToggleHoliday}
          onOpenNewAppointment={(date, time) => {
            if (date) onSelectDate(date);
            onOpenNewAppointment(time || '14:30');
          }}
          onGoToDailyView={(date) => {
            onSelectDate(date);
            setCalendarMode('dia');
          }}
          onEditAppointment={onEditAppointment}
        />
      </div>
    );
  }

  // Filter appointments for current date
  const dayAppointments = appointments
    .filter((a) => a.fecha === currentDate)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const filteredAppointments = dayAppointments.filter((a) => {
    const matchesSearch =
      `${a.pacienteNombre} ${a.pacienteDni} ${a.pacienteTelefono} ${a.obraSocial} ${a.tratamientoNombre}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesTreatment =
      selectedTreatmentFilter === 'all' || a.tratamientoId === selectedTreatmentFilter;

    const matchesStatus =
      selectedStatusFilter === 'all' || a.estado === selectedStatusFilter;

    return matchesSearch && matchesTreatment && matchesStatus;
  });

  // Calculate day metrics (excluding blocked slots)
  const patientAppointments = dayAppointments.filter((a) => !a.esBloqueo && a.tratamientoId !== 'no_dar');

  const totalHonorariosCobrados = patientAppointments
    .filter((a) => a.estadoPago === 'pagado' || (a.estado === 'atendido' && a.estadoPago !== 'bonificado'))
    .reduce((sum, a) => sum + (Number(a.honorarios) || 0), 0);

  const atendidosCount = patientAppointments.filter((a) => a.estado === 'atendido').length;
  const confirmadosCount = patientAppointments.filter((a) => a.estado === 'confirmado').length;
  const pendientesCobroCount = patientAppointments.filter(
    (a) => a.estadoPago === 'pendiente' && a.estado !== 'cancelado'
  ).length;
  const bloqueadosCount = dayAppointments.filter((a) => a.esBloqueo || a.tratamientoId === 'no_dar').length;

  const standardClinicSlots = [
    '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Banner: Day Stats, View Mode Switcher, & Clinic Hours Notice */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 capitalize">
                {formatDatePretty(currentDate)}
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                {dayAppointments.length} {dayAppointments.length === 1 ? 'turno' : 'turnos'}
              </span>

              {/* Working Day Badge */}
              {isWorkingDay && !holidayInfo ? (
                <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  ✓ Día de Atención (14:30 a 20:00 hs)
                </span>
              ) : holidayInfo ? (
                <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Ban className="w-3 h-3 text-rose-600" />
                  {holidayInfo.reason}
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Día no habitual ({dayName})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Estética Láser Rosario • Lunes, Martes y Viernes (14:30 - 20:00 hs)
            </p>
          </div>

          {/* Right Controls: Mode Toggle + Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="btn-switch-day-view"
                onClick={() => setCalendarMode('dia')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-teal-900 shadow-2xs transition-colors"
              >
                Vista Día
              </button>
              <button
                id="btn-switch-month-view"
                onClick={() => setCalendarMode('mes')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              >
                Vista Mes
              </button>
            </div>

            {/* Block Slot Button */}
            <button
              id="btn-block-slot-nodar"
              onClick={() => {
                if (onOpenBlockSlot) {
                  onOpenBlockSlot('14:30');
                } else {
                  onOpenNewAppointment('14:30');
                }
              }}
              title="Bloquear un horario específico para no dar turnos"
              className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs transition-all"
            >
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              <span>⛔ Bloquear Horario (NO DAR)</span>
            </button>

            {/* Holiday Toggle Button */}
            <button
              id="btn-holiday-toggle"
              onClick={handleOpenHolidayModal}
              title="Marcar o gestionar este día como Feriado / No Laborable"
              className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors flex items-center gap-1.5 shadow-2xs ${
                holidayInfo
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {holidayInfo ? (
                <>
                  <CalendarOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Quitar / Editar Feriado</span>
                </>
              ) : (
                <>
                  <CalendarOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Marcar Feriado</span>
                </>
              )}
            </button>

            {/* Print Agenda Button */}
            {onOpenPrintModal && (
              <button
                id="btn-print-daily-agenda"
                onClick={onOpenPrintModal}
                title="Imprimir la hoja de agenda de turnos del día en papel o PDF"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-teal-400" />
                <span>Imprimir Agenda del Día</span>
              </button>
            )}
          </div>
        </div>

        {/* Holiday Banner Alert */}
        {holidayInfo && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 text-rose-900 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-black text-rose-950 text-sm">
                  ⛔ DÍA FERIADO / NO LABORABLE: {holidayInfo.reason}
                </span>
                <p className="mt-0.5 text-rose-800">
                  La clínica permanece cerrada para atención rutinaria en esta fecha.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenHolidayModal}
              className="text-xs font-bold bg-white hover:bg-rose-100 text-rose-900 px-3 py-1.5 rounded-xl border border-rose-300 transition-colors shrink-0 shadow-2xs"
            >
              Gestionar / Quitar
            </button>
          </div>
        )}

        {/* Non-working Day Banner Alert (e.g. Miércoles, Jueves, Sábado, Domingo) */}
        {!isWorkingDay && !holidayInfo && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 text-amber-900 flex items-start gap-3 shadow-xs">
            <CalendarOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-black text-amber-950 text-sm">
                NO ES DÍA DE ATENCIÓN ({dayName})
              </span>
              <p className="mt-0.5 text-amber-800">
                El consultorio atiende Lunes, Martes y Viernes de 14:30 a 20:00 hs. Podés seguir cargando o consultando turnos igual, pero tené en cuenta que este día no hay atención habitual.
              </p>
            </div>
          </div>
        )}

        {/* Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Atendidos / Listos
            </span>
            <div className="text-sm sm:text-base font-extrabold text-slate-800">
              {atendidosCount} <span className="text-xs font-normal text-slate-400">/ {patientAppointments.length} turnos</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Cobrado Hoy
            </span>
            <div className="text-sm sm:text-base font-black text-emerald-800">
              {formatCurrency(totalHonorariosCobrados)}
            </div>
          </div>

          <div className="bg-sky-50/70 border border-sky-200 p-2.5 rounded-xl">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
              Confirmados
            </span>
            <div className="text-sm sm:text-base font-extrabold text-sky-800">
              {confirmadosCount} {confirmadosCount === 1 ? 'turno' : 'turnos'}
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              {bloqueadosCount > 0 ? 'Bloqueos (NO DAR)' : 'Pend. Cobro'}
            </span>
            <div className="text-sm sm:text-base font-extrabold text-amber-800">
              {bloqueadosCount > 0
                ? `${bloqueadosCount} bloqueado${bloqueadosCount > 1 ? 's' : ''}`
                : `${pendientesCobroCount} turnos`}
            </div>
          </div>
        </div>

        {/* Quick Time Slots Strip (14:30 to 20:00 hs) - only shown on clinic working days,
            or on non-working days that already have appointments loaded */}
        {(isWorkingDay || dayAppointments.length > 0) && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 text-xs text-slate-600 gap-1">
              <span className="font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Horarios de Consulta (14:30 a 20:00 hs):
              </span>
              <span className="text-[11px] text-slate-400">Tocá un casillero para agendar o ver ocupación</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-11 gap-1.5">
              {standardClinicSlots.map((slot) => {
                const occupiedApt = dayAppointments.find(
                  (a) => a.horaInicio <= slot && a.horaFin > slot && (a.estado !== 'cancelado' || a.esBloqueo || a.tratamientoId === 'no_dar')
                );
                const isBlocked = occupiedApt && (occupiedApt.esBloqueo || occupiedApt.tratamientoId === 'no_dar');

                return (
                  <button
                    key={slot}
                    onClick={() => {
                      if (occupiedApt) {
                        onEditAppointment(occupiedApt);
                      } else {
                        onOpenNewAppointment(slot);
                      }
                    }}
                    title={
                      isBlocked
                        ? `⛔ BLOQUEADO (NO DAR): ${occupiedApt?.observaciones || 'No disponible'}`
                        : occupiedApt
                        ? `Ocupado: ${occupiedApt.pacienteNombre || 'Paciente'} (${occupiedApt.tratamientoNombre || 'Consulta'})`
                        : `Libre: Agendar turno a las ${slot} hs`
                    }
                    className={`py-2 px-1 rounded-xl text-center font-mono text-[11px] transition-all border min-h-[46px] flex flex-col items-center justify-center ${
                      isBlocked
                        ? 'bg-slate-900 border-slate-700 text-amber-300 font-bold hover:bg-slate-800 shadow-xs'
                        : occupiedApt
                        ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold hover:bg-rose-100'
                        : 'bg-teal-50/60 border-teal-200 text-teal-900 font-semibold hover:bg-teal-600 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{slot}</div>
                    <div className="text-[9px] truncate max-w-full px-0.5">
                      {isBlocked ? '⛔ NO DAR' : occupiedApt ? (occupiedApt.pacienteNombre || 'Ocupado').split(' ')[0] : 'Libre'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por paciente, DNI, celular, obra social..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Treatment Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTreatmentFilter}
              onChange={(e) => setSelectedTreatmentFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los Tratamientos</option>
              {TREATMENTS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="confirmado">Confirmados</option>
              <option value="atendido">Atendidos / Listos</option>
              <option value="cancelado">Cancelados</option>
              <option value="no_asistio">No Asistió</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointment Cards List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {isWorkingDay || holidayInfo
              ? 'No hay turnos o bloqueos registrados para esta fecha o filtro'
              : `No hay atención este día (${dayName})`}
          </h3>
          {isWorkingDay && !holidayInfo && (
            <>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Podés agendar un nuevo turno médico o bloquear un horario seleccionado.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => onOpenNewAppointment('14:30')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agendar Turno</span>
                </button>
                <button
                  onClick={() => {
                    if (onOpenBlockSlot) onOpenBlockSlot('14:30');
                    else onOpenNewAppointment('14:30');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>⛔ Bloquear Horario (NO DAR)</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isBlocked = appt.esBloqueo || appt.tratamientoId === 'no_dar';


            if (isBlocked) {
              return (
                <div
                  key={appt.id}
                  className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 text-white shadow-sm transition-all hover:border-amber-400/50"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="bg-slate-950 text-amber-300 px-3 py-2 rounded-xl text-center shrink-0 min-w-[80px] border border-slate-800 shadow-inner">
                        <div className="text-sm font-black tracking-tight">{appt.horaInicio} hs</div>
                        <div className="text-[10px] text-slate-400 font-medium">a {appt.horaFin} hs</div>
                        <div className="text-[9px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-sm mt-1 border border-amber-400/30">
                          {appt.duracionMinutos} min
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5">
                            <Ban className="w-4 h-4 text-rose-500" />
                            <span>⛔ NO DAR (Horario Bloqueado)</span>
                          </h4>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                            Franja No Disponible
                          </span>
                        </div>

                        <p className="text-xs text-slate-300">
                          Motivo / Razón: <strong className="text-white">{appt.observaciones || 'No dar turnos en este horario'}</strong>
                        </p>

                        <p className="text-[11px] text-slate-400">
                          Este espacio queda reservado y bloqueado en la agenda médica.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 justify-end">
                      <button
                        onClick={() => onEditAppointment(appt)}
                        title="Modificar motivo u horario del bloqueo"
                        className="text-xs font-semibold px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setItemToDelete({
                            id: appt.id,
                            title: 'Desbloquear Horario',
                            message: `¿Deseas desbloquear el horario de ${appt.horaInicio} a ${appt.horaFin} hs?`,
                            subMessage: 'El horario volverá a estar disponible para asignar turnos a pacientes.',
                            isBlock: true
                          });
                        }}
                        title="Desbloquear este horario para dejarlo libre"
                        className="text-xs font-bold px-3 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Desbloquear Horario</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const treatment = getTreatmentById(appt.tratamientoId);
            const reminderPayload = generateAppointmentReminder(appt);
            const statusConfig = STATUS_LABELS[appt.estado] || {
              label: appt.estado,
              bg: 'bg-slate-50',
              text: 'text-slate-800',
              border: 'border-slate-300'
            };

            return (
              <div
                key={appt.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs hover:shadow-md ${
                  appt.estado === 'atendido'
                    ? 'border-emerald-200/80 bg-emerald-50/20'
                    : appt.estado === 'cancelado'
                    ? 'border-rose-200/60 bg-rose-50/20 opacity-75'
                    : appt.estado === 'no_asistio'
                    ? 'border-amber-200 bg-amber-50/20 opacity-80'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Time block, Patient & Treatment info */}
                  <div className="flex items-start gap-3.5">
                    {/* Time block */}
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-center shrink-0 min-w-[80px] shadow-xs">
                      <div className="text-sm font-black tracking-tight">{appt.horaInicio} hs</div>
                      <div className="text-[10px] text-slate-400 font-medium">a {appt.horaFin} hs</div>
                      <div className="text-[9px] bg-slate-800 text-teal-300 font-bold px-1.5 py-0.5 rounded-sm mt-1 border border-slate-700">
                        {appt.duracionMinutos} min
                      </div>
                    </div>

                    {/* Patient and details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          {appt.pacienteNombre}
                        </h4>
                        
                        {/* Treatment Badge */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${treatment.badgeBg}`}
                        >
                          {appt.tratamientoNombre}
                        </span>

                        {/* Insurance Badge */}
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          🏥 {appt.obraSocial}
                        </span>

                        {appt.estado === 'cancelado' && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            ✕ CANCELADO
                          </span>
                        )}
                      </div>

                      {/* Patient metadata with Cel */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          DNI: <strong className="text-slate-700">{appt.pacienteDni}</strong>
                        </span>

                        <span className="flex items-center gap-1 font-medium">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          Cel: <strong className="text-slate-800">{appt.pacienteTelefono}</strong>
                        </span>

                        {appt.numeroAfiliado && (
                          <span className="text-[11px] text-slate-500">
                            Afiliado: {appt.numeroAfiliado}
                          </span>
                        )}
                      </div>

                      {/* Observations / Notes */}
                      {appt.observaciones && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block mt-1">
                          📝 {appt.observaciones}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Fees, Payment, Status & Quick WhatsApp */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 sm:gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto">
                    {/* Honorarios Fee Box */}
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-500 font-medium">Honorarios</div>
                      <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        {formatCurrency(appt.honorarios)}
                      </div>
                      {appt.estado !== 'cancelado' && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            onClick={() => {
                              const nextPayment: PaymentStatus =
                                appt.estadoPago === 'pagado' ? 'pendiente' : 'pagado';
                              onUpdatePayment(
                                appt.id,
                                nextPayment,
                                nextPayment === 'pagado' ? 'efectivo' : 'pendiente'
                              );
                            }}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                              appt.estadoPago === 'pagado'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : appt.estadoPago === 'facturado'
                                ? 'bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                            }`}
                          >
                            {appt.estadoPago === 'pagado'
                              ? `✓ Cobrado (${appt.metodoPago || 'efectivo'})`
                              : appt.estadoPago === 'facturado'
                              ? 'Facturado a OS'
                              : 'Pendiente de cobro'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status Dropdown - Strict 4 Statuses */}
                    <div className="shrink-0">
                      <select
                        value={appt.estado}
                        onChange={(e) => onUpdateStatus(appt.id, e.target.value as AppointmentStatus)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl border focus:outline-none cursor-pointer min-h-[40px] shadow-2xs ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        <option value="confirmado">Confirmado</option>
                        <option value="atendido">Atendido / Listo</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="no_asistio">No Asistió</option>
                      </select>
                    </div>

                    {/* Quick Action buttons */}
                    <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
                      {appt.estado === 'cancelado' ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(appt.id, 'confirmado')}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all min-h-[40px] shadow-2xs cursor-pointer flex items-center gap-1"
                          title="Reactivar y confirmar este turno cancelado"
                        >
                          ✓ Reactivar Turno
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(appt.id, 'cancelado')}
                          className="px-2.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1 transition-all min-h-[40px] shadow-2xs cursor-pointer"
                          title="Marcar turno como cancelado por el paciente (libera el horario)"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Canceló</span>
                        </button>
                      )}

                      {/* WhatsApp Reminder Button */}
                      <a
                        href={reminderPayload.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onSendReminder(appt)}
                        title="Enviar recordatorio por WhatsApp con indicaciones pre-tratamiento"
                        className="px-3 py-2 rounded-xl border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all min-h-[40px] shadow-2xs"
                      >
                        <MessageCircle className="w-4 h-4 text-white shrink-0" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => onEditAppointment(appt)}
                        title="Editar turno"
                        className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setItemToDelete({
                            id: appt.id,
                            title: 'Eliminar Turno',
                            message: `¿Estás seguro de que deseas eliminar el turno de ${appt.pacienteNombre}?`,
                            subMessage: `Horario: ${appt.horaInicio} a ${appt.horaFin} hs • Tratamiento: ${appt.tratamientoNombre}`,
                            isBlock: false
                          });
                        }}
                        title="Eliminar turno"
                        className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Holiday / Non-Working Day Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Designar Feriado / No Laborable</h3>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 font-medium">Fecha seleccionada:</span>
                <div className="text-sm font-extrabold text-slate-900 capitalize">
                  {formatDatePretty(currentDate)}
                </div>
                <div className="text-[11px] text-slate-600">
                  Al designar este día como Feriado o No Laborable, no se programarán turnos de rutina y quedará indicado en el calendario.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motivo / Nombre del Feriado
                </label>
                <input
                  type="text"
                  value={holidayModalReason}
                  onChange={(e) => setHolidayModalReason(e.target.value)}
                  placeholder="Ej. Feriado Nacional, Día no laborable, Vacaciones..."
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tipo de Bloqueo
                </label>
                <select
                  value={holidayModalType}
                  onChange={(e) => setHolidayModalType(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                >
                  <option value="feriado">Feriado Oficial</option>
                  <option value="no_laborable">Día No Laborable / Clínico</option>
                  <option value="vacaciones">Vacaciones / Receso Profesional</option>
                </select>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-bold block">Sugerencias rápidas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Feriado Nacional',
                    'Día No Laborable',
                    'Congreso Médico',
                    'Vacaciones Médicas',
                    'Mantenimiento de Equipos'
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setHolidayModalReason(sug)}
                      className="text-[10px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {holidayInfo ? (
                  <button
                    type="button"
                    onClick={handleRemoveHoliday}
                    className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-200 transition-colors"
                  >
                    Quitar Feriado (Habilitar)
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHolidayModalOpen(false)}
                    className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHoliday}
                    className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl shadow-xs transition-colors"
                  >
                    Guardar Feriado
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion / Unblocking */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title={itemToDelete?.title || 'Confirmar acción'}
        message={itemToDelete?.message || ''}
        subMessage={itemToDelete?.subMessage}
        confirmText={itemToDelete?.isBlock ? 'Desbloquear' : 'Eliminar Turno'}
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteAppointment(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
