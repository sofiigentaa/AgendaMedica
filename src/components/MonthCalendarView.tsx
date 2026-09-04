import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  CalendarOff
} from 'lucide-react';
import { Appointment, HolidayOrNonWorkingDay } from '../types';
import { CLINIC_WORKING_DAYS, CLINIC_WORKING_HOURS, isClinicWorkingDay, getHolidayInfo, formatDatePretty } from '../utils/storage';
import { formatCurrency } from '../data/treatments';

interface MonthCalendarViewProps {
  currentDate: string;
  onSelectDate: (date: string) => void;
  appointments: Appointment[];
  holidays: HolidayOrNonWorkingDay[];
  onToggleHoliday: (date: string, reason?: string) => void;
  onOpenNewAppointment: (date?: string, time?: string) => void;
  onGoToDailyView: (date: string) => void;
  onEditAppointment?: (appointment: Appointment) => void;
}

export default function MonthCalendarView({
  currentDate,
  onSelectDate,
  appointments,
  holidays,
  onToggleHoliday,
  onOpenNewAppointment,
  onGoToDailyView,
  onEditAppointment
}: MonthCalendarViewProps) {
  // Parse year and month from currentDate
  const [initialY, initialM] = currentDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState<number>(initialY || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialM || new Date().getMonth() + 1); // 1-12

  // Modal for adding a custom holiday reason
  const [holidayModalDate, setHolidayModalDate] = useState<string | null>(null);
  const [holidayReason, setHolidayReason] = useState('Feriado / Día no laborable');
  const [holidayType, setHolidayType] = useState<'feriado' | 'no_laborable' | 'vacaciones'>('feriado');

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  };

  // Generate calendar grid
  // Days of week: Lunes (0), Martes (1), Miércoles (2), Jueves (3), Viernes (4), Sábado (5), Domingo (6)
  const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // JavaScript getDay(): 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  // Convert so that Lunes = 0, ..., Domingo = 6
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6; // Domingo

  const daysArray: (number | null)[] = [];
  // Leading empty days
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  // Helper to construct YYYY-MM-DD
  const getDateStr = (day: number) => {
    const mStr = String(viewMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${viewYear}-${mStr}-${dStr}`;
  };

  const openHolidayModalForDay = (dateStr: string) => {
    const existing = getHolidayInfo(dateStr, holidays);
    setHolidayModalDate(dateStr);
    if (existing) {
      setHolidayReason(existing.reason);
      setHolidayType(existing.type);
    } else {
      setHolidayReason('Feriado / Día no laborable');
      setHolidayType('feriado');
    }
  };

  const handleSaveHolidayModal = () => {
    if (!holidayModalDate) return;
    onToggleHoliday(holidayModalDate, holidayReason);
    setHolidayModalDate(null);
  };

  const handleRemoveHolidayModal = () => {
    if (!holidayModalDate) return;
    onToggleHoliday(holidayModalDate, ''); // triggers removal if exists
    setHolidayModalDate(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const monthPrefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  // Monthly stats
  const monthAppointments = appointments.filter(
    (a) => a.fecha.startsWith(monthPrefix) && a.estado !== 'cancelado'
  );
  const monthPatientTurnos = monthAppointments.filter(
    (a) => !a.esBloqueo && a.tratamientoId !== 'no_dar'
  );
  const monthConfirmed = monthPatientTurnos.filter((a) => a.estado === 'confirmado').length;
  const monthAttended = monthPatientTurnos.filter((a) => a.estado === 'atendido').length;
  const monthBlocked = monthAppointments.filter((a) => a.esBloqueo || a.tratamientoId === 'no_dar').length;

  return (
    <div className="space-y-4">
      {/* Month Navigation Header & Clinic Hours Notice */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                id="btn-prev-month"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-white rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs"
                title="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-1 text-base sm:text-lg font-black text-slate-900 min-w-44 text-center capitalize">
                {monthNames[viewMonth - 1]} {viewYear}
              </div>
              <button
                id="btn-next-month"
                onClick={handleNextMonth}
                className="p-2 hover:bg-white rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs"
                title="Mes siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              id="btn-today-month-view"
              onClick={handleCurrentMonth}
              className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2.5 rounded-xl transition-colors shadow-2xs"
            >
              Mes Actual (Hoy)
            </button>
          </div>

          {/* Schedule Banner: Official Clinic Hours */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-teal-50/90 border border-teal-200 text-teal-900 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-2xs">
              <Clock className="w-4 h-4 text-teal-600 shrink-0" />
              <div>
                <span className="font-extrabold text-teal-950">Atención:</span>{' '}
                <strong className="text-teal-900 font-bold">Lunes, Martes y Viernes</strong> de{' '}
                <span className="font-black text-teal-950">14:30 a 20:00 hs</span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Feriados / No laborables = Sin turnos</span>
            </div>
          </div>
        </div>

        {/* Monthly Key Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Turnos en el Mes
            </span>
            <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              {monthPatientTurnos.length} turnos
            </div>
          </div>

          <div className="bg-sky-50/80 p-2.5 rounded-xl border border-sky-200">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
              Confirmados
            </span>
            <div className="text-sm sm:text-base font-black text-sky-900 mt-0.5">
              {monthConfirmed} turnos
            </div>
          </div>

          <div className="bg-teal-50/80 p-2.5 rounded-xl border border-teal-200">
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
              Atendidos
            </span>
            <div className="text-sm sm:text-base font-black text-teal-900 mt-0.5">
              {monthAttended} turnos
            </div>
          </div>

          <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Bloqueos de Horario
            </span>
            <div className="text-sm sm:text-base font-black text-amber-900 mt-0.5">
              {monthBlocked} {monthBlocked === 1 ? 'bloqueo' : 'bloqueos'} (NO DAR)
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200">
        {/* Days of Week Header - Sticky when scrolling with dynamic navbar offset */}
        <div
          style={{ top: 'var(--nav-height, 104px)' }}
          className="sticky z-20 grid grid-cols-7 border-b-2 border-teal-500 bg-slate-900 text-white shadow-md rounded-t-2xl text-center text-xs font-bold"
        >
          <div className="py-2.5 sm:py-3 px-1 bg-slate-900 text-white border-r border-slate-800 rounded-tl-2xl">
            <div className="font-black tracking-wider text-xs sm:text-sm text-teal-300">
              <span className="hidden sm:inline">LUNES</span>
              <span className="sm:hidden">LUN</span>
            </div>
            <div className="hidden sm:block text-[10px] sm:text-[11px] font-bold text-teal-400 font-mono mt-0.5">
              14:30 - 20:00
            </div>
          </div>

          <div className="py-2.5 sm:py-3 px-1 bg-slate-900 text-white border-r border-slate-800">
            <div className="font-black tracking-wider text-xs sm:text-sm text-teal-300">
              <span className="hidden sm:inline">MARTES</span>
              <span className="sm:hidden">MAR</span>
            </div>
            <div className="hidden sm:block text-[10px] sm:text-[11px] font-bold text-teal-400 font-mono mt-0.5">
              14:30 - 20:00
            </div>
          </div>

          <div className="py-2.5 sm:py-3 px-1 bg-slate-950/70 text-slate-300 border-r border-slate-800">
            <div className="font-semibold text-xs text-slate-300">
              <span className="hidden sm:inline">MIÉRCOLES</span>
              <span className="sm:hidden">MIÉ</span>
            </div>
            <div className="hidden sm:block text-[10px] font-normal text-slate-500 mt-0.5">Sin atención</div>
          </div>

          <div className="py-2.5 sm:py-3 px-1 bg-slate-950/70 text-slate-300 border-r border-slate-800">
            <div className="font-semibold text-xs text-slate-300">
              <span className="hidden sm:inline">JUEVES</span>
              <span className="sm:hidden">JUE</span>
            </div>
            <div className="hidden sm:block text-[10px] font-normal text-slate-500 mt-0.5">Sin atención</div>
          </div>

          <div className="py-2.5 sm:py-3 px-1 bg-slate-900 text-white border-r border-slate-800">
            <div className="font-black tracking-wider text-xs sm:text-sm text-teal-300">
              <span className="hidden sm:inline">VIERNES</span>
              <span className="sm:hidden">VIE</span>
            </div>
            <div className="hidden sm:block text-[10px] sm:text-[11px] font-bold text-teal-400 font-mono mt-0.5">
              14:30 - 20:00
            </div>
          </div>

          <div className="py-2.5 sm:py-3 px-1 bg-slate-950/90 text-slate-400 border-r border-slate-800">
            <div className="font-medium text-xs text-slate-400">
              <span className="hidden sm:inline">SÁBADO</span>
              <span className="sm:hidden">SÁB</span>
            </div>
            <div className="hidden sm:block text-[10px] font-normal text-slate-600 mt-0.5">Cerrado</div>
          </div>

          <div className="py-2.5 sm:py-3 px-1 bg-slate-950/90 text-slate-400 rounded-tr-2xl">
            <div className="font-medium text-xs text-slate-400">
              <span className="hidden sm:inline">DOMINGO</span>
              <span className="sm:hidden">DOM</span>
            </div>
            <div className="hidden sm:block text-[10px] font-normal text-slate-600 mt-0.5">Cerrado</div>
          </div>
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 rounded-b-2xl overflow-hidden">
          {daysArray.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="bg-slate-50/30 min-h-[90px] sm:min-h-[140px] p-1.5 sm:p-2" />;
            }

            const dateStr = getDateStr(day);
            const isWorking = isClinicWorkingDay(dateStr);
            const holiday = getHolidayInfo(dateStr, holidays);
            const dayAppts = appointments
              .filter((a) => a.fecha === dateStr)
              .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
            const isSelected = dateStr === currentDate;
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-[95px] sm:min-h-[140px] p-1.5 sm:p-2.5 transition-colors relative flex flex-col justify-between group cursor-pointer ${
                  holiday
                    ? 'bg-rose-50/60 hover:bg-rose-50/90'
                    : isWorking
                    ? 'bg-white hover:bg-teal-50/20'
                    : 'bg-slate-50/50 hover:bg-slate-100/50'
                } ${isSelected ? 'ring-2 ring-teal-500 ring-inset z-10 bg-teal-50/10' : ''}`}
              >
                {/* Day Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs sm:text-sm font-black w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-teal-600 text-white shadow-xs'
                            : isSelected
                            ? 'bg-teal-200 text-teal-950 font-black'
                            : holiday
                            ? 'text-rose-700 bg-rose-100/90'
                            : isWorking
                            ? 'text-slate-900 bg-slate-100'
                            : 'text-slate-400'
                        }`}
                      >
                        {day}
                      </span>

                      {isWorking && !holiday && (
                        <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200 font-mono">
                          <Clock className="w-2.5 h-2.5 text-teal-600" />
                          14:30-20h
                        </span>
                      )}
                    </div>

                    {/* Quick Button to toggle/edit holiday */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openHolidayModalForDay(dateStr);
                      }}
                      title={holiday ? `Feriado: ${holiday.reason}. Click para editar/quitar` : 'Marcar como Feriado o Día No Laborable'}
                      className={`text-[10px] p-1 rounded-md transition-colors ${
                        holiday
                          ? 'text-rose-700 bg-rose-100 hover:bg-rose-200 font-bold'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {holiday ? <Ban className="w-3 h-3" /> : <CalendarOff className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Holiday Banner if present */}
                  {holiday && (
                    <div
                      onClick={() => openHolidayModalForDay(dateStr)}
                      className="bg-rose-100 border border-rose-300 text-rose-900 px-2 py-1 rounded-lg text-[10px] font-bold leading-tight flex items-center gap-1 cursor-pointer hover:bg-rose-200 transition-colors shadow-2xs"
                      title={holiday.reason}
                    >
                      <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                      <span className="truncate">{holiday.reason}</span>
                    </div>
                  )}

                  {/* Appointments count and rich slot list */}
                  {dayAppts.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-600 flex items-center justify-between">
                        <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded-md text-[9px] font-mono">
                          {dayAppts.length} {dayAppts.length === 1 ? 'turno/bloqueo' : 'turnos/bloqueos'}
                        </span>
                      </div>

                      {/* List of appointments and blocks */}
                      <div className="space-y-1 max-h-24 sm:max-h-28 overflow-y-auto pr-0.5 scrollbar-thin">
                        {dayAppts.map((apt) => {
                          const isBlocked = apt.esBloqueo || apt.tratamientoId === 'no_dar';

                          if (isBlocked) {
                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onEditAppointment) onEditAppointment(apt);
                                  else {
                                    onSelectDate(dateStr);
                                    onGoToDailyView(dateStr);
                                  }
                                }}
                                className="text-[10px] bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 px-1.5 py-1 rounded-lg truncate font-bold flex items-center justify-between cursor-pointer transition-all shadow-2xs"
                                title={`⛔ BLOQUEADO (NO DAR): ${apt.horaInicio} a ${apt.horaFin} hs - ${apt.observaciones || 'Sin turnos'}`}
                              >
                                <span className="font-mono text-[9px] mr-1 bg-slate-950 px-1 rounded text-amber-400">
                                  {apt.horaInicio}
                                </span>
                                <span className="truncate text-[9px]">⛔ NO DAR</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={apt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onEditAppointment) onEditAppointment(apt);
                                else {
                                  onSelectDate(dateStr);
                                  onGoToDailyView(dateStr);
                                }
                              }}
                              className={`text-[10px] border px-1.5 py-1 rounded-lg truncate font-medium flex items-center justify-between cursor-pointer transition-all shadow-2xs ${
                                apt.estado === 'atendido'
                                  ? 'bg-teal-50/90 border-teal-200 text-teal-950 hover:bg-teal-100'
                                  : apt.estado === 'confirmado'
                                  ? 'bg-sky-50/90 border-sky-200 text-sky-950 hover:bg-sky-100'
                                  : apt.estado === 'cancelado'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800 line-through opacity-75 hover:bg-rose-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                              }`}
                              title={`${apt.horaInicio || ''} hs - ${apt.pacienteNombre || 'Turno'} (${apt.tratamientoNombre || 'Consulta'}) - Estado: ${apt.estado || 'confirmado'}`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    apt.estado === 'atendido'
                                      ? 'bg-teal-600'
                                      : apt.estado === 'confirmado'
                                      ? 'bg-sky-600'
                                      : apt.estado === 'cancelado'
                                      ? 'bg-rose-600'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                <span className="font-bold text-slate-950 font-mono text-[9px]">
                                  {apt.horaInicio || ''}
                                </span>
                                <span className="truncate text-slate-800 text-[10px] font-semibold">
                                  {(apt.pacienteNombre || 'Turno').split(' ')[0]} {apt.estado === 'cancelado' ? '(Cancelado)' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : isWorking && !holiday ? (
                    <div className="text-[10px] text-slate-400 pt-1 italic hidden sm:block">
                      Sin turnos agendados
                    </div>
                  ) : null}
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDate(dateStr);
                      onGoToDailyView(dateStr);
                    }}
                    className="text-teal-700 hover:text-teal-900 font-bold hover:underline py-0.5"
                  >
                    Ver Día
                  </button>

                  {!holiday && isWorking && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDate(dateStr);
                        onOpenNewAppointment(dateStr, '14:30');
                      }}
                      className="text-teal-700 hover:text-white hover:bg-teal-600 p-1 rounded-md transition-colors font-bold flex items-center gap-0.5 bg-teal-50 border border-teal-200"
                      title="Agendar turno en este día"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden xl:inline text-[9px]">Turno</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for marking / editing a Holiday or Non-Working Day */}
      {holidayModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Designar Feriado / No Laborable</h3>
              </div>
              <button
                onClick={() => setHolidayModalDate(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Fecha seleccionada:</span>
                <div className="text-sm font-extrabold text-slate-900 capitalize mt-0.5">
                  {formatDatePretty(holidayModalDate)}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Al designar este día como Feriado o No Laborable, no se programarán turnos de rutina.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motivo / Nombre del Feriado
                </label>
                <input
                  type="text"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  placeholder="Ej. Feriado Nacional, Día no laborable, Vacaciones, Congreso..."
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tipo de Bloqueo
                </label>
                <select
                  value={holidayType}
                  onChange={(e) => setHolidayType(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="feriado">Feriado Oficial</option>
                  <option value="no_laborable">Día No Laborable / Clínico</option>
                  <option value="vacaciones">Vacaciones / Receso Profesional</option>
                </select>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-bold w-full">Sugerencias rápidas:</span>
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
                    onClick={() => setHolidayReason(sug)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {getHolidayInfo(holidayModalDate, holidays) ? (
                  <button
                    type="button"
                    onClick={handleRemoveHolidayModal}
                    className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 transition-colors"
                  >
                    Quitar Feriado (Habilitar Día)
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHolidayModalDate(null)}
                    className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHolidayModal}
                    className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl shadow-xs transition-colors"
                  >
                    Guardar Feriado / Bloqueo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
