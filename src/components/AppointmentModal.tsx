import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, User, DollarSign, Shield, FileText, CheckCircle, Sparkles, AlertTriangle, Phone, Ban, Info, Check, Trash2 } from 'lucide-react';
import { Appointment, Patient, TreatmentType, PaymentStatus, PaymentMethod, AppointmentStatus, HolidayOrNonWorkingDay } from '../types';
import { TREATMENTS, INSURANCES, INSURANCE_SUGGESTIONS, calculateEndTime, calculateDurationMinutes, getTreatmentById, formatCurrency, STATUS_LABELS } from '../data/treatments';
import { isClinicWorkingDay, getHolidayInfo, getDayOfWeekName, formatDatePretty, getTodayDateString, CLINIC_WORKING_HOURS } from '../utils/storage';
import { findOverlappingAppointments, isOutsideClinicHours, isValidTimeHHmm } from '../utils/schedule';
import ConfirmModal from './ConfirmModal';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
  onDelete?: (id: string) => void;
  appointmentToEdit?: Appointment | null;
  selectedDate: string;
  suggestedTime?: string;
  initialIsBlocked?: boolean;
  preSelectedPatientId?: string | null;
  patients: Patient[];
  allAppointments?: Appointment[];
  holidays?: HolidayOrNonWorkingDay[];
  onOpenNewPatientModal: () => void;
}

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  appointmentToEdit,
  selectedDate,
  suggestedTime,
  initialIsBlocked = false,
  preSelectedPatientId = null,
  patients,
  allAppointments = [],
  holidays = [],
  onOpenNewPatientModal
}: AppointmentModalProps) {
  const [isBlockedMode, setIsBlockedMode] = useState(false);
  const [pacienteId, setPacienteId] = useState('');
  const [fecha, setFecha] = useState(selectedDate);
  const [horaInicio, setHoraInicio] = useState('');
  const [tratamientoId, setTratamientoId] = useState<TreatmentType | ''>('');
  const [duracionMinutos, setDuracionMinutos] = useState(0);
  const [horaFin, setHoraFin] = useState('');
  const [coberturaTipo, setCoberturaTipo] = useState<'obra_social' | 'particular'>('obra_social');
  const [coberturaPreset, setCoberturaPreset] = useState<'particular' | 'la_segunda' | 'otra'>('particular');
  const [obraSocial, setObraSocial] = useState('Particular');
  const [numeroAfiliado, setNumeroAfiliado] = useState('');
  const [honorarios, setHonorarios] = useState<number | ''>('');
  const [estado, setEstado] = useState<AppointmentStatus | ''>('');
  const [estadoPago, setEstadoPago] = useState<PaymentStatus | ''>('');
  const [metodoPago, setMetodoPago] = useState<PaymentMethod | ''>('');
  const [observaciones, setObservaciones] = useState('');

  // Search filter for patients
  const [patientSearch, setPatientSearch] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  // RF-11: cartel de "¿Está seguro?" cuando se crea un turno nuevo en un día
  // que ya tiene otros turnos cargados (no bloquea el guardado, solo avisa).
  const [showSameDayWarning, setShowSameDayWarning] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<Appointment | null>(null);
  const [showPatientRequiredError, setShowPatientRequiredError] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [horaInicioTouched, setHoraInicioTouched] = useState(false);
  const [horaFinTouched, setHoraFinTouched] = useState(false);
  const [fechaBlockedWarning, setFechaBlockedWarning] = useState<string | null>(null);

  const resolveNumeroAfiliado = (obraSocialValue: string, rawNumeroAfiliado?: string) => {
    const safeIns = (obraSocialValue || 'Particular').toLowerCase();
    if (safeIns.includes('particular') || safeIns.includes('sin cobertura')) return '';
    return rawNumeroAfiliado || '';
  };

  const applyCoverageFromValue = (insValue: string) => {
    const safeIns = insValue || 'Particular';
    setObraSocial(safeIns);
    if (safeIns.toLowerCase().includes('particular') || safeIns.toLowerCase().includes('sin cobertura')) {
      setCoberturaPreset('particular');
      setCoberturaTipo('particular');
      setNumeroAfiliado('');
    } else if (safeIns.toLowerCase().includes('segunda')) {
      setCoberturaPreset('la_segunda');
      setCoberturaTipo('obra_social');
    } else {
      setCoberturaPreset('otra');
      setCoberturaTipo('obra_social');
    }
  };

  const handleSelectPreset = (preset: 'particular' | 'la_segunda' | 'otra') => {
    setCoberturaPreset(preset);
    if (preset === 'particular') {
      setObraSocial('Particular');
      setCoberturaTipo('particular');
      setNumeroAfiliado('');
    } else if (preset === 'la_segunda') {
      setObraSocial('La Segunda');
      setCoberturaTipo('obra_social');
    } else {
      setCoberturaTipo('obra_social');
      if (obraSocial === 'Particular' || obraSocial === 'La Segunda' || !obraSocial) {
        setObraSocial('');
      }
    }
  };

  useEffect(() => {
    // El modal queda montado siempre (isOpen solo controla si se muestra),
    // así que sin este reset el aviso rojo de "campos faltantes" de un
    // intento de guardado anterior quedaba pegado y aparecía de nuevo apenas
    // se abría un turno nuevo, aunque todavía no se hubiera tocado nada.
    setAttemptedSubmit(false);

    if (appointmentToEdit) {
      const isBlocked = appointmentToEdit.esBloqueo || appointmentToEdit.tratamientoId === 'no_dar';
      setIsBlockedMode(Boolean(isBlocked));
      setHoraInicioTouched(false);
      setHoraFinTouched(false);
      setPacienteId(appointmentToEdit.pacienteId);
      setFecha(appointmentToEdit.fecha);
      setHoraInicio(appointmentToEdit.horaInicio);
      setTratamientoId(appointmentToEdit.tratamientoId);
      setDuracionMinutos(appointmentToEdit.duracionMinutos);
      setHoraFin(appointmentToEdit.horaFin);
      setCoberturaTipo(appointmentToEdit.coberturaTipo);
      applyCoverageFromValue(appointmentToEdit.obraSocial);
      setNumeroAfiliado(resolveNumeroAfiliado(appointmentToEdit.obraSocial, appointmentToEdit.numeroAfiliado));
      setHonorarios(appointmentToEdit.honorarios);
      setEstado(appointmentToEdit.estado || 'confirmado');
      setEstadoPago(appointmentToEdit.estadoPago);
      setMetodoPago(appointmentToEdit.metodoPago);
      setObservaciones(appointmentToEdit.observaciones || '');
      setPatientSearch('');
    } else {
      setIsBlockedMode(initialIsBlocked);
      setHoraInicioTouched(false);
      setHoraFinTouched(false);
      // BUG-19 / RF-04: si el turno se crea desde una fecha puntual de la
      // agenda (selectedDate), esa fecha se precarga en vez de dejarla vacía.
      // Excepción: cuando se abre desde "Dar Turno" (paciente preseleccionado
      // desde el Padrón), la fecha se deja vacía para que se elija a mano.
      setFecha(preSelectedPatientId ? '' : selectedDate || '');
      // RF-01: si el turno se crea tocando un horario libre de la grilla,
      // ese horario (suggestedTime) se precarga acá. Si se abre desde el
      // botón genérico "Nuevo Turno" (sin horario sugerido) o desde "Dar
      // Turno" con paciente preseleccionado, queda vacío para elegirlo a mano.
      setHoraInicio(!preSelectedPatientId && suggestedTime ? suggestedTime : '');

      if (initialIsBlocked) {
        setTratamientoId('no_dar');
        setDuracionMinutos(30);
        setHoraFin(calculateEndTime(suggestedTime || '', 30));
        setHonorarios(0);
        setEstado('confirmado');
        setEstadoPago('bonificado');
        setMetodoPago('pendiente');
        setObservaciones('No dar turno');
        setPacienteId('');
      } else {
        setTratamientoId('');
        setDuracionMinutos(0);
        setHoraFin('');
        setHonorarios('');
        // BUG-04: el estado del turno ya no se pide/asigna en la creación;
        // se guarda como "confirmado" en forma automática y silenciosa.
        // Sigue siendo editable después, desde un turno ya creado.
        setEstado('confirmado');
        setEstadoPago('');
        setMetodoPago('');
        setObservaciones('');

        if (preSelectedPatientId) {
          const preSelected = patients.find((p) => p.id === preSelectedPatientId);
          if (preSelected) {
            setPacienteId(preSelected.id);
            applyCoverageFromValue(preSelected.obraSocial);
            setNumeroAfiliado(resolveNumeroAfiliado(preSelected.obraSocial, preSelected.numeroAfiliado));
          } else {
            setPacienteId('');
            applyCoverageFromValue('Particular');
          }
        } else {
          // BUG-11: el campo paciente ya no se precompleta con el primer
          // paciente del padrón (antes siempre aparecía "Rossi Valentina").
          // Debe iniciar vacío y ser elegido explícitamente.
          setPacienteId('');
          applyCoverageFromValue('Particular');
        }
      }
    }
  }, [appointmentToEdit, selectedDate, suggestedTime, initialIsBlocked, isOpen, preSelectedPatientId]);

  // When patient selection changes, auto-fill coverage and affiliate
  const handlePatientChange = (pId: string) => {
    setPacienteId(pId);
    const selectedPat = patients.find((p) => p.id === pId);
    if (selectedPat) {
      applyCoverageFromValue(selectedPat.obraSocial);
      setNumeroAfiliado(resolveNumeroAfiliado(selectedPat.obraSocial, selectedPat.numeroAfiliado));
    }
  };

  // Keep the search box showing the selected patient's name whenever the
  // dropdown isn't actively being used to search (e.g. on open, when editing
  // an existing appointment, or after a pre-selected patient is set).
  useEffect(() => {
    if (!patientSearchOpen) {
      const selected = patients.find((p) => p.id === pacienteId);
      setPatientSearch(selected ? `${selected.apellido}, ${selected.nombre}` : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, patients, patientSearchOpen]);

  // Matches shown in the patient search dropdown as the person types a name,
  // surname, or DNI (or shows the first few patients when the box is empty).
  const patientDropdownMatches = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patients.slice(0, 8);
    // BUG-05: buscar en ambos órdenes ("Nombre Apellido" y "Apellido,
    // Nombre") para que el nombre completo tal como se muestra en pantalla
    // también encuentre al paciente.
    return patients
      .filter((p) =>
        `${p.nombre} ${p.apellido} ${p.apellido} ${p.nombre} ${p.apellido}, ${p.nombre} ${p.dni} ${p.obraSocial}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 8);
  }, [patients, patientSearch]);

  const handleSelectPatientFromDropdown = (p: Patient) => {
    handlePatientChange(p.id);
    setPatientSearch(`${p.apellido}, ${p.nombre}`);
    setPatientSearchOpen(false);
    setShowPatientRequiredError(false);
  };

  // When treatment changes, update duration, end time and recommended fee
  const handleTreatmentChange = (tId: TreatmentType) => {
    setTratamientoId(tId);
    const t = getTreatmentById(tId);
    setDuracionMinutos(t.durationMinutes);
    setHoraFin(calculateEndTime(horaInicio, t.durationMinutes));
    // Set recommended fee
    setHonorarios(t.defaultFee);
  };

  // Bloquea elegir directamente, desde el campo Fecha, un día feriado o un
  // día de la semana en que el consultorio no atiende. Si el día no es
  // válido, no se actualiza "fecha" (el campo vuelve al valor anterior) y se
  // muestra un aviso breve explicando el motivo.
  const handleFechaChange = (value: string) => {
    if (!value) {
      setFecha(value);
      return;
    }
    const candidateHoliday = getHolidayInfo(value, holidays);
    const candidateIsWorking = isClinicWorkingDay(value);
    if (candidateHoliday || !candidateIsWorking) {
      const candidateDayName = getDayOfWeekName(value);
      setFechaBlockedWarning(
        candidateHoliday
          ? `⛔ Día no laborable: ${candidateHoliday.reason}`
          : `⛔ ${candidateDayName ? candidateDayName.toUpperCase() : 'Ese día'}: el consultorio no atiende (Lunes, Martes y Viernes).`
      );
      window.setTimeout(() => setFechaBlockedWarning(null), 4500);
      return;
    }
    setFechaBlockedWarning(null);
    setFecha(value);
  };

  // When start time changes, re-calc end time.
  // En modo bloqueo, si ya hay una Hora Fin manual válida (rango horario),
  // se conserva ese horario de fin y se recalcula la duración a partir del
  // nuevo inicio, en vez de pisar la Hora Fin con la duración vieja.
  const handleStartTimeChange = (newStartTime: string) => {
    setHoraInicio(newStartTime);
    if (isBlockedMode && horaFin && calculateDurationMinutes(newStartTime, horaFin) > 0) {
      setDuracionMinutos(calculateDurationMinutes(newStartTime, horaFin));
    } else {
      setHoraFin(calculateEndTime(newStartTime, duracionMinutos));
    }
  };

  // Rango horario del bloqueo: permite elegir directamente la Hora Fin
  // ("desde-hasta") en vez de depender solo de una duración preseteada.
  const handleBlockedEndTimeChange = (newEndTime: string) => {
    setHoraFin(newEndTime);
    const computedDuration = calculateDurationMinutes(horaInicio, newEndTime);
    if (computedDuration > 0) {
      setDuracionMinutos(computedDuration);
    }
  };

  // Conflict / Overlap Detection - find all overlapping appointments
  const conflictingAppointments = findOverlappingAppointments(
    allAppointments,
    fecha,
    horaInicio,
    horaFin,
    appointmentToEdit?.id
  );

  const conflictingAppointment = conflictingAppointments[0] || null;

  // Validate that Hora Inicio has the HH:MM format (hours and minutes)
  const horaInicioFormatoInvalido = horaInicio.length > 0 && !isValidTimeHHmm(horaInicio);
  const horaInicioSoloHoraSinMinutos = horaInicio.length > 0 && /^([01]?\d|2[0-3])$/.test(horaInicio.trim());

  // Validación del rango horario del bloqueo (Hora Fin editable a mano).
  const horaFinFormatoInvalido =
    isBlockedMode && horaFin.length > 0 && !isValidTimeHHmm(horaFin);
  const horaFinNoPosteriorAInicio =
    isBlockedMode &&
    !horaFinFormatoInvalido &&
    !horaInicioFormatoInvalido &&
    Boolean(horaInicio) &&
    Boolean(horaFin) &&
    horaFin <= horaInicio;

  // El consultorio atiende de 14:30 a 20:00 hs. Si el horario elegido (o el
  // horario de fin calculado según la duración del tratamiento) cae fuera de
  // esa franja, se bloquea el guardado igual que con un día no laborable.
  const horarioFueraDeRango =
    !isBlockedMode &&
    horaInicio.length > 0 &&
    !horaInicioFormatoInvalido &&
    isOutsideClinicHours(horaInicio, horaFin, CLINIC_WORKING_HOURS.start, CLINIC_WORKING_HOURS.end);

  // List of missing/invalid required fields for the non-blocked appointment form,
  // used to show the person exactly what's stopping "Agendar Turno" from working.
  const missingFieldLabels: string[] = [];
  if (!fecha) missingFieldLabels.push('Fecha');
  if (!horaInicio) missingFieldLabels.push('Hora de Inicio');
  else if (horaInicioFormatoInvalido) missingFieldLabels.push('Hora de Inicio (formato HH:MM, ej: 15:00)');
  else if (horarioFueraDeRango) missingFieldLabels.push(`Hora de Inicio (debe ser entre ${CLINIC_WORKING_HOURS.label})`);
  if (!tratamientoId) missingFieldLabels.push('Tratamiento Médico');
  if (honorarios === '') missingFieldLabels.push('Honorarios');
  // BUG-04: "Estado del Turno" ya no es un campo obligatorio a elegir al
  // crear el turno (se autoasigna "confirmado"); solo se sigue validando
  // cuando se está editando un turno existente.
  if (appointmentToEdit && !estado) missingFieldLabels.push('Estado del Turno');
  if (!estadoPago) missingFieldLabels.push('Estado del Pago');
  if (!metodoPago) missingFieldLabels.push('Medio de Pago');

  // Holiday / Non-working day detection
  const holidayInfo = getHolidayInfo(fecha, holidays);
  const isWorkingDay = isClinicWorkingDay(fecha);
  const dayName = getDayOfWeekName(fecha);

  // BUG-16: no se puede elegir una fecha ya pasada.
  const todayStr = getTodayDateString();
  const isPastDate = Boolean(fecha) && fecha < todayStr;

  // BUG-12 / BUG-22: día feriado o día de la semana en que el consultorio no
  // atiende. Bloquea el guardado en vez de solo mostrar una advertencia.
  const isBlockedDay = Boolean(fecha) && (Boolean(holidayInfo) || !isWorkingDay);

  // BUG-14 / BUG-15: impedir guardar si el horario elegido se superpone con
  // otro turno ya existente (mismo día, mismo rango horario).
  const hasScheduleConflict = !isBlockedMode && conflictingAppointments.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (isBlockedMode) {
      setHoraInicioTouched(true);
      setHoraFinTouched(true);
      if (horaInicioFormatoInvalido || horaFinFormatoInvalido || horaFinNoPosteriorAInicio || !horaFin) return;

      // La Hora Fin ingresada por la persona es la fuente de verdad del
      // rango; la duración se deriva de ahí (en vez de al revés), para que
      // el bloqueo cubra exactamente el "desde-hasta" elegido.
      const finalDuracion = calculateDurationMinutes(horaInicio, horaFin);

      const blockedAppointment: Appointment = {
        id: appointmentToEdit ? appointmentToEdit.id : `blk-${Date.now()}`,
        pacienteId: 'bloqueo-agenda',
        pacienteNombre: '⛔ NO DAR - Horario Bloqueado',
        pacienteDni: '-',
        pacienteTelefono: '-',
        pacienteEmail: '',
        coberturaTipo: 'particular',
        obraSocial: 'NO DAR',
        numeroAfiliado: '',
        fecha,
        horaInicio,
        tratamientoId: 'no_dar',
        tratamientoNombre: '⛔ NO DAR (Horario Bloqueado)',
        duracionMinutos: finalDuracion,
        horaFin,
        honorarios: 0,
        estado: 'confirmado',
        estadoPago: 'bonificado',
        metodoPago: 'pendiente',
        recordatorioEnviado: false,
        esBloqueo: true,
        observaciones: observaciones || 'Horario reservado / NO DAR turnos',
        createdAt: appointmentToEdit ? appointmentToEdit.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSave(blockedAppointment);
      onClose();
      return;
    }

    if (missingFieldLabels.length > 0 || !duracionMinutos) {
      return;
    }

    // BUG-16: bloquear fechas pasadas.
    if (isPastDate) {
      return;
    }

    // BUG-12 / BUG-22: bloquear feriados y días en que el consultorio no
    // atiende (ej. jueves).
    if (isBlockedDay) {
      return;
    }

    // BUG-14 / BUG-15: bloquear turnos duplicados / superpuestos en el mismo
    // horario, sea del mismo paciente o de otro.
    if (hasScheduleConflict) {
      return;
    }

    const selectedPat = patients.find((p) => p.id === pacienteId);
    const isEditingSamePatientNoLongerInRoster =
      !selectedPat && appointmentToEdit && pacienteId === appointmentToEdit.pacienteId;

    if (!selectedPat && !isEditingSamePatientNoLongerInRoster) {
      // No matching patient (either none selected, or the selection is stale) —
      // show a clear, visible error instead of silently doing nothing on Save.
      setShowPatientRequiredError(true);
      const searchInput = document.getElementById('select-appointment-patient');
      if (searchInput) searchInput.focus();
      return;
    }
    setShowPatientRequiredError(false);

    const currentTreatment = getTreatmentById(tratamientoId);

    const finalObraSocial =
      coberturaPreset === 'particular'
        ? 'Particular'
        : coberturaPreset === 'la_segunda'
        ? 'La Segunda'
        : obraSocial.trim() || 'Particular';

    // If the original patient was removed from the roster after this appointment was
    // created, keep using the appointment's own cached snapshot (name, DNI, phone,
    // etc.) instead of blocking the edit entirely.
    const patientSnapshot = selectedPat
      ? {
          pacienteNombre: `${selectedPat.nombre} ${selectedPat.apellido}`,
          pacienteDni: selectedPat.dni,
          pacienteTelefono: selectedPat.telefono,
          pacienteEmail: selectedPat.email,
          pacienteFechaNacimiento: selectedPat.fechaNacimiento
        }
      : {
          pacienteNombre: appointmentToEdit!.pacienteNombre,
          pacienteDni: appointmentToEdit!.pacienteDni,
          pacienteTelefono: appointmentToEdit!.pacienteTelefono,
          pacienteEmail: appointmentToEdit!.pacienteEmail,
          pacienteFechaNacimiento: appointmentToEdit!.pacienteFechaNacimiento
        };

    const newAppointment: Appointment = {
      id: appointmentToEdit ? appointmentToEdit.id : `apt-${Date.now()}`,
      pacienteId: selectedPat ? selectedPat.id : pacienteId,
      ...patientSnapshot,
      coberturaTipo: finalObraSocial === 'Particular' ? 'particular' : 'obra_social',
      obraSocial: finalObraSocial,
      numeroAfiliado: resolveNumeroAfiliado(finalObraSocial, numeroAfiliado),
      fecha,
      horaInicio,
      tratamientoId: tratamientoId || 'consulta',
      tratamientoNombre: currentTreatment.name,
      duracionMinutos,
      horaFin: calculateEndTime(horaInicio, duracionMinutos),
      honorarios: Number(honorarios) || 0,
      estado: estado || 'confirmado',
      estadoPago: estadoPago || 'pendiente',
      metodoPago:
        estadoPago === 'pagado'
          ? metodoPago === 'pendiente' || !metodoPago
            ? 'efectivo'
            : metodoPago
          : metodoPago || 'pendiente',
      recordatorioEnviado: appointmentToEdit ? appointmentToEdit.recordatorioEnviado : false,
      ultimoRecordatorioAt: appointmentToEdit ? appointmentToEdit.ultimoRecordatorioAt : undefined,
      observaciones,
      esBloqueo: false,
      createdAt: appointmentToEdit ? appointmentToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // RF-11: al crear (no al editar) un turno en un día que ya tiene otros
    // turnos cargados (sin contar bloqueos de agenda), se avisa antes de
    // confirmar el guardado, por si fue sin querer.
    const sameDayOtherAppointments = allAppointments.filter(
      (a) => a.fecha === fecha && a.id !== newAppointment.id && !a.esBloqueo
    );

    if (!appointmentToEdit && sameDayOtherAppointments.length > 0) {
      setPendingAppointment(newAppointment);
      setShowSameDayWarning(true);
      return;
    }

    onSave(newAppointment);
    onClose();
  };

  const confirmSaveDespiteSameDay = () => {
    if (pendingAppointment) {
      onSave(pendingAppointment);
    }
    setShowSameDayWarning(false);
    setPendingAppointment(null);
    onClose();
  };

  const allTimeOptions = useMemo(() => {
    const list: string[] = [];
    for (let h = 7; h <= 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = h < 10 ? `0${h}` : `${h}`;
        const mm = m < 10 ? `0${m}` : `${m}`;
        list.push(`${hh}:${mm}`);
      }
    }
    list.push('22:00');
    if (horaInicio && !list.includes(horaInicio)) {
      list.push(horaInicio);
      list.sort();
    }
    return list;
  }, [horaInicio]);

  if (!isOpen) return null;

  const currentTreatment = tratamientoId ? getTreatmentById(tratamientoId) : null;

  const standardClinicSlots = [
    '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  const blockedDurationOptions = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '1 hora (60m)', minutes: 60 },
    { label: '1h 30m (90m)', minutes: 90 },
    { label: '2 horas (120m)', minutes: 120 },
    { label: 'Tarde completa (330m)', minutes: 330 }
  ];

  const quickBlockReasons = [
    'No dar turno',
    'Médico en quirófano / Cirugía',
    'Reunión médica',
    'Trámite / Personal',
    'Pausa médica',
    'Capacitación'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isBlockedMode
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-teal-500/20 text-teal-400 border-teal-500/30'
            }`}>
              {isBlockedMode ? <Ban className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isBlockedMode
                  ? '⛔ Bloquear Horario en Agenda (NO DAR)'
                  : appointmentToEdit
                  ? 'Editar Turno Médico'
                  : 'Crear Nuevo Turno'}
              </h2>
              <p className="text-xs text-slate-400">
                Estética Láser Rosario • Lunes, Martes y Viernes (14:30 a 20:00 hs)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Holiday or Non-Working Day Warning Banner */}
          {holidayInfo && (
            <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-3.5 flex items-start gap-3 text-rose-900 shadow-xs">
              <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-black text-rose-950 text-sm flex items-center gap-1.5">
                  ⛔ DÍA FERIADO / NO LABORABLE: {holidayInfo.reason}
                </div>
                <div className="mt-0.5 text-rose-800">
                  Esta fecha está designada como no laborable en la clínica. No se puede guardar un turno en este día.
                </div>
              </div>
            </div>
          )}

          {/* BUG-12 / BUG-22: día de la semana en que el consultorio no
              atiende (ej. jueves). Bloquea el guardado, no es solo un aviso. */}
          {!holidayInfo && !isWorkingDay && fecha && !isBlockedMode && (
            <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-3.5 flex items-start gap-3 text-rose-900 shadow-xs">
              <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-black text-rose-950 text-sm flex items-center gap-1.5">
                  ⛔ {dayName ? dayName.toUpperCase() : 'ESTE DÍA'}: el consultorio no atiende
                </div>
                <div className="mt-0.5 text-rose-800">
                  Se atiende Lunes, Martes y Viernes de 14:30 a 20:00 hs. Elegí otra fecha para poder guardar el turno.
                </div>
              </div>
            </div>
          )}

          {/* BUG-16: fecha ya pasada. */}
          {isPastDate && !isBlockedMode && (
            <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-3.5 flex items-start gap-3 text-rose-900 shadow-xs">
              <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-black text-rose-950 text-sm">⛔ FECHA ATRASADA</div>
                <div className="mt-0.5 text-rose-800">
                  No se pueden crear turnos con una fecha anterior a hoy. Elegí una fecha desde hoy en adelante.
                </div>
              </div>
            </div>
          )}

          {/* Horario fuera del rango de atención (14:30 a 20:00 hs). */}
          {horarioFueraDeRango && (
            <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-3.5 flex items-start gap-3 text-rose-900 shadow-xs">
              <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-black text-rose-950 text-sm">⛔ HORARIO FUERA DE ATENCIÓN</div>
                <div className="mt-0.5 text-rose-800">
                  El consultorio atiende de {CLINIC_WORKING_HOURS.label}. Elegí un horario de inicio dentro de esa franja para poder guardar el turno.
                </div>
              </div>
            </div>
          )}

          {/* DETAILED OCCUPIED / CONFLICT ALERT CARD */}
          {conflictingAppointments.length > 0 && (
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 text-red-950 shadow-md animate-pulse space-y-2.5">
              {!conflictingAppointments.every((c) => c.esBloqueo || c.tratamientoId === 'no_dar') && (
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-red-950 text-sm sm:text-base">
                      ⚠️ HORARIO OCUPADO: Se superpone con otro registro
                    </div>
                    <div className="text-xs text-red-800 mt-0.5">
                      Ya existe {conflictingAppointments.length === 1 ? 'un turno agendado' : `${conflictingAppointments.length} turnos agendados`} en este horario:
                    </div>
                  </div>
                </div>
              )}

              {/* Details of WHO occupied the slot */}
              <div className="space-y-2 mt-2">
                {conflictingAppointments.map((conflict, idx) => {
                  const isConflictBlocked = conflict.esBloqueo || conflict.tratamientoId === 'no_dar';

                  if (isConflictBlocked) {
                    return (
                      <div
                        key={conflict.id || idx}
                        className="bg-slate-900 text-white rounded-lg p-3 border border-slate-700 text-xs shadow-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-800 pb-1.5">
                          <div className="font-extrabold text-amber-300 text-sm flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 text-rose-400" />
                            <span>⛔ BLOQUEO ACTIVO (NO DAR)</span>
                          </div>
                          <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded font-mono">
                            {conflict.horaInicio} - {conflict.horaFin} hs
                          </span>
                        </div>
                        <div className="text-slate-300 text-xs">
                          <strong>Motivo:</strong> {conflict.observaciones || 'Franja bloqueada'}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={conflict.id || idx}
                      className="bg-white rounded-lg p-3 border border-red-300 text-xs text-slate-800 shadow-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-red-600" />
                          <span>{conflict.pacienteNombre}</span>
                        </div>
                        <span className="bg-red-100 text-red-800 text-[11px] font-black px-2 py-0.5 rounded font-mono">
                          {conflict.horaInicio} - {conflict.horaFin} hs
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 text-[11px]">
                        <div>
                          <strong>DNI:</strong> {conflict.pacienteDni || 'No registrado'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-teal-600" />
                          <strong>Cel:</strong> {conflict.pacienteTelefono}
                        </div>
                        <div>
                          <strong>Tratamiento:</strong> {conflict.tratamientoNombre} ({conflict.duracionMinutos} min)
                        </div>
                        <div>
                          <strong>Cobertura:</strong> {conflict.obraSocial}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BLOCKED MODE SPECIFIC UI */}
          {isBlockedMode ? (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-amber-400" />
                    {appointmentToEdit ? 'Horario Bloqueado en Agenda (NO DAR)' : 'Crear Bloqueo de Horario (NO DAR)'}
                  </span>
                  <div className="flex items-center gap-2">
                    {!appointmentToEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBlockedMode(false);
                          setTratamientoId('consulta');
                          setDuracionMinutos(15);
                          setHoraFin('');
                          setHonorarios(15000);
                          // BUG-11: no autoseleccionar el primer paciente del padrón.
                          setPacienteId('');
                        }}
                        className="text-[11px] font-bold text-teal-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-teal-500/40 transition-colors cursor-pointer"
                      >
                        Cambiar a Turno de Paciente
                      </button>
                    )}
                    <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                      Duración: {duracionMinutos} min
                    </span>
                  </div>
                </div>

                {/* Duration Picker for blocking (atajos rápidos, opcional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Duración rápida (opcional, también podés elegir "Hasta" abajo):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {blockedDurationOptions.map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => {
                          setDuracionMinutos(opt.minutes);
                          setHoraFin(calculateEndTime(horaInicio, opt.minutes));
                          setHoraFinTouched(false);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${
                          duracionMinutos === opt.minutes
                            ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Block Reason Badges */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Motivo habitual de bloqueo:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickBlockReasons.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setObservaciones(reason)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                          observaciones === reason
                            ? 'bg-teal-500 text-white font-bold border-teal-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom reason input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Motivo / Observaciones del Bloqueo
                  </label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej. Médico ausente, Quirófano, Reunión de equipo..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date & Start Time */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => handleFechaChange(e.target.value)}
                      required
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                    {fechaBlockedWarning && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{fechaBlockedWarning}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Hora Inicio (24 hs)</span>
                    </label>
                    <input
                      value={horaInicio}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      onBlur={() => setHoraInicioTouched(true)}
                      type="text"
                      placeholder="Ej. 14:30"
                      required
                      className={`w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border bg-white text-slate-900 focus:ring-1 focus:outline-none ${
                        horaInicioTouched && horaInicioFormatoInvalido
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-slate-300 focus:ring-amber-500'
                      }`}
                    />
                    {horaInicioTouched && horaInicioFormatoInvalido && (
                      <p className="mt-1 text-[10px] font-semibold text-rose-600">
                        {horaInicioSoloHoraSinMinutos
                          ? 'Faltan los minutos. Escribí la hora completa, ej: 15:00'
                          : 'Ingresá la hora con horas y minutos, ej: 15:00'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Hora Fin (Hasta)</span>
                      <span className="text-[10px] text-amber-700 font-normal">+{duracionMinutos} min</span>
                    </label>
                    <input
                      value={horaFin}
                      onChange={(e) => handleBlockedEndTimeChange(e.target.value)}
                      onBlur={() => setHoraFinTouched(true)}
                      type="text"
                      placeholder="Ej. 18:00"
                      required
                      className={`w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border bg-white text-slate-900 focus:ring-1 focus:outline-none ${
                        horaFinTouched && (horaFinFormatoInvalido || horaFinNoPosteriorAInicio)
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-amber-300 focus:ring-amber-500'
                      }`}
                    />
                    {horaFinTouched && horaFinFormatoInvalido && (
                      <p className="mt-1 text-[10px] font-semibold text-rose-600">
                        Ingresá la hora con horas y minutos, ej: 18:00
                      </p>
                    )}
                    {horaFinTouched && !horaFinFormatoInvalido && horaFinNoPosteriorAInicio && (
                      <p className="mt-1 text-[10px] font-semibold text-rose-600">
                        La Hora Fin debe ser posterior a la Hora Inicio
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Tip: escribí directamente el horario de fin para bloquear un rango (ej. de 14:30 a 18:00), o usá los atajos de duración de arriba.
                </p>
              </div>
            </div>
          ) : (
            /* PATIENT APPOINTMENT MODE UI */
            <>
              {/* Patient Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    Paciente
                  </label>
                  <button
                    type="button"
                    onClick={onOpenNewPatientModal}
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
                  >
                    + Crear Paciente Nuevo
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="select-appointment-patient"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setPatientSearchOpen(true);
                      if (pacienteId) setPacienteId('');
                      setShowPatientRequiredError(false);
                    }}
                    onFocus={() => setPatientSearchOpen(true)}
                    onBlur={() => setTimeout(() => setPatientSearchOpen(false), 150)}
                    placeholder="Escribí el nombre, apellido o DNI del paciente..."
                    autoComplete="off"
                    required={!isBlockedMode}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50 ${
                      showPatientRequiredError ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300'
                    }`}
                  />

                  {patientSearchOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {patientDropdownMatches.length === 0 ? (
                        <div className="px-3.5 py-3 text-xs text-slate-500 text-center">
                          Ningún paciente coincide con la búsqueda
                        </div>
                      ) : (
                        patientDropdownMatches.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectPatientFromDropdown(p)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50 flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 transition-colors"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {p.apellido}, {p.nombre}
                              </div>
                              <div className="text-[10px] text-slate-500">DNI: {p.dni}</div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                              {p.obraSocial || 'Particular'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {showPatientRequiredError && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tenés que seleccionar un paciente de la lista antes de guardar el turno.
                  </p>
                )}
              </div>

              {/* Treatment Selection - Medical Treatments */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    Tratamiento Médico & Duración
                  </span>
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                    Duración: {currentTreatment ? `${currentTreatment.durationMinutes} minutos` : '--'}
                  </span>
                </label>
                {attemptedSubmit && !tratamientoId && (
                  <p className="text-[10px] font-semibold text-rose-600">
                    Seleccioná un tratamiento para poder agendar el turno
                  </p>
                )}

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${
                  attemptedSubmit && !tratamientoId ? 'ring-2 ring-rose-300 rounded-xl p-1' : ''
                }`}>
                  {TREATMENTS.filter((t) => t.id !== 'no_dar').map((t) => {
                    const isSelected = tratamientoId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        data-testid={`treatment-${t.id}`}
                        onClick={() => handleTreatmentChange(t.id)}
                        className={`flex items-start justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/80 ring-2 ring-teal-500/30'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{t.description}</div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0 ml-1.5 shadow-2xs">
                          {t.durationMinutes} min
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date, Start Time, and Automatic End Time */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                    <input
                      id="input-appointment-date"
                      type="date"
                      value={fecha}
                      onChange={(e) => handleFechaChange(e.target.value)}
                      required
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                    {fechaBlockedWarning && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{fechaBlockedWarning}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Hora Inicio (24 hs)</span>
                    </label>
                    <input
                      id="input-appointment-time"
                      type="text"
                      value={horaInicio}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      onBlur={() => setHoraInicioTouched(true)}
                      placeholder="Ej. 14:30"
                      required
                      className={`w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border bg-white text-slate-900 focus:ring-1 focus:outline-none ${
                        horaInicioTouched && horaInicioFormatoInvalido
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-slate-300 focus:ring-teal-500'
                      }`}
                    />
                    {horaInicioTouched && horaInicioFormatoInvalido && (
                      <p className="mt-1 text-[10px] font-semibold text-rose-600">
                        {horaInicioSoloHoraSinMinutos
                          ? 'Faltan los minutos. Escribí la hora completa, ej: 15:00'
                          : 'Ingresá la hora con horas y minutos, ej: 15:00'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hora Fin <span className="text-[10px] text-teal-600 font-normal">(Auto-calculada)</span>
                    </label>
                    <div className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-teal-300 bg-teal-50/70 text-teal-900 flex items-center justify-between">
                      <span>{horaFin ? `${horaFin} hs` : '--'}</span>
                      <span className="text-[10px] text-teal-700 font-normal">+{duracionMinutos} min</span>
                    </div>
                  </div>
                </div>

                {(horarioFueraDeRango || hasScheduleConflict) && (
                  <div className="bg-rose-50 border border-rose-300 rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-rose-700">
                      {horarioFueraDeRango
                        ? `⛔ Fuera de atención: el consultorio atiende de ${CLINIC_WORKING_HOURS.label}.`
                        : `⛔ Horario ocupado por ${conflictingAppointments[0]?.esBloqueo || conflictingAppointments[0]?.tratamientoId === 'no_dar'
                            ? 'un bloqueo (NO DAR)'
                            : conflictingAppointments[0]?.pacienteNombre || 'otro turno'}. Elegí otro horario.`}
                    </p>
                  </div>
                )}
              </div>

              {/* Coverage & Insurance details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-600" />
                    Obra Social / Cobertura
                  </label>

                  {/* Selector de Presets: Particular, La Segunda, Otra / Escribir */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('particular')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        coberturaPreset === 'particular'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {coberturaPreset === 'particular' && <Check className="w-3 h-3" />}
                      <span>Particular</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('la_segunda')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        coberturaPreset === 'la_segunda'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {coberturaPreset === 'la_segunda' && <Check className="w-3 h-3" />}
                      <span>La Segunda</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('otra')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        coberturaPreset === 'otra'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {coberturaPreset === 'otra' && <Check className="w-3 h-3" />}
                      <span>Otra / Escribir</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {coberturaPreset === 'particular'
                        ? 'Tipo de Cobertura'
                        : coberturaPreset === 'la_segunda'
                        ? 'Prepaga Seleccionada'
                        : 'Escribir Obra Social o Prepaga'}
                    </label>
                    {coberturaPreset === 'particular' ? (
                      <div className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 font-medium">
                        Particular (Sin Cobertura)
                      </div>
                    ) : coberturaPreset === 'la_segunda' ? (
                      <div className="w-full text-xs px-3 py-2 rounded-lg border border-teal-200 bg-teal-50/50 text-teal-900 font-bold">
                        La Segunda (Seguros / Salud)
                      </div>
                    ) : (
                      <div>
                        <input
                          id="select-appointment-insurance"
                          type="text"
                          list="appointment-insurance-suggestions"
                          placeholder="Escribir prepaga (ej. Swiss Medical, OSDE, IAPOS...)"
                          value={obraSocial}
                          onChange={(e) => setObraSocial(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-teal-400 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-xs"
                          autoFocus={coberturaPreset === 'otra'}
                        />
                        <datalist id="appointment-insurance-suggestions">
                          {INSURANCE_SUGGESTIONS.filter((s) => s !== 'Particular' && s !== 'La Segunda').map((sugg) => (
                            <option key={sugg} value={sugg} />
                          ))}
                        </datalist>
                      </div>
                    )}
                  </div>

                  {coberturaPreset !== 'particular' && coberturaPreset !== 'la_segunda' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        N° de Afiliado / Credencial
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. SM-90238411 (opcional)"
                        value={numeroAfiliado}
                        onChange={(e) => setNumeroAfiliado(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Fees and Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Honorarios ($ ARS)
                  </label>
                  <input
                    id="input-appointment-fee"
                    type="number"
                    min="0"
                    step="500"
                    value={honorarios}
                    onChange={(e) => setHonorarios(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className={`w-full text-sm font-bold px-3 py-2 rounded-lg border bg-white text-emerald-900 focus:ring-2 focus:outline-none ${
                      attemptedSubmit && honorarios === ''
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-emerald-300 focus:ring-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado del Pago</label>
                  <select
                    id="select-payment-status"
                    value={estadoPago}
                    onChange={(e) => setEstadoPago(e.target.value as PaymentStatus)}
                    className={`w-full text-xs px-3 py-2 rounded-lg border bg-white focus:ring-1 focus:outline-none ${
                      attemptedSubmit && !estadoPago
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-teal-500'
                    }`}
                  >
                    <option value="">-- Seleccionar estado --</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado / Cobrado</option>
                    <option value="facturado">Facturado a Obra Social</option>
                    <option value="bonificado">Bonificado / Sin Cargo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medio de Pago</label>
                  <select
                    id="select-payment-method"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
                    className={`w-full text-xs px-3 py-2 rounded-lg border bg-white focus:ring-1 focus:outline-none ${
                      attemptedSubmit && !metodoPago
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-teal-500'
                    }`}
                  >
                    <option value="">-- Seleccionar medio --</option>
                    <option value="pendiente">A definir</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="debito">Tarjeta de Débito</option>
                    <option value="credito">Tarjeta de Crédito</option>
                    <option value="obra_social_directo">Obra Social Directo</option>
                  </select>
                </div>
              </div>

              {/* Appointment Status - solo se muestra al editar un turno existente,
                  no al crear uno nuevo (se autoasigna "confirmado" en silencio). */}
              <div className={`grid grid-cols-1 ${appointmentToEdit ? 'sm:grid-cols-2' : ''} gap-3`}>
                {appointmentToEdit && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                      Estado del Turno
                    </label>
                    <select
                      id="select-appointment-status"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value as AppointmentStatus)}
                      className={`w-full text-xs px-3 py-2 rounded-lg border bg-white focus:ring-1 focus:outline-none ${
                        attemptedSubmit && !estado
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-slate-300 focus:ring-teal-500'
                      }`}
                    >
                      <option value="">-- Seleccionar estado --</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="atendido">Atendido / Listo</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="no_asistio">No Asistió</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Observaciones Médicas / Turno
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Traer estudios previos, ecografía..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Validation summary for blocked-mode date range issues */}
          {isBlockedMode && attemptedSubmit && (horaInicioFormatoInvalido || horaFinFormatoInvalido || horaFinNoPosteriorAInicio || !horaFin) && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800">
                <span className="font-bold">Revisá el rango horario del bloqueo:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {horaInicioFormatoInvalido && <li>Hora de Inicio (formato HH:MM, ej: 15:00)</li>}
                  {!horaFin && !horaFinFormatoInvalido && <li>Hora Fin (elegí un horario o una duración rápida)</li>}
                  {horaFinFormatoInvalido && <li>Hora Fin (formato HH:MM, ej: 18:00)</li>}
                  {horaFinNoPosteriorAInicio && <li>Hora Fin debe ser posterior a la Hora Inicio</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Validation summary: shows exactly what's missing when "Agendar Turno" doesn't advance */}
          {!isBlockedMode && attemptedSubmit && missingFieldLabels.length > 0 && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800">
                <span className="font-bold">Faltan completar campos obligatorios:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {missingFieldLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left side actions when editing */}
            <div className="flex items-center gap-2">
              {appointmentToEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    isBlockedMode
                      ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30'
                      : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isBlockedMode ? 'Desbloquear Horario' : 'Eliminar Registro'}</span>
                </button>
              )}

              {appointmentToEdit && !isBlockedMode && (
                estado === 'cancelado' ? (
                  <button
                    type="button"
                    onClick={() => setEstado('confirmado')}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    ✓ Reactivar (Confirmar Turno)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEstado('cancelado')}
                    className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    ✕ Marcar Turno Cancelado
                  </button>
                )
              )}
            </div>

            {/* Right side save & close */}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Cerrar Ventana
              </button>
              <button
                type="submit"
                id="btn-save-appointment"
                disabled={
                  isBlockedMode
                    ? horaInicioFormatoInvalido || horaFinFormatoInvalido || horaFinNoPosteriorAInicio || !horaFin
                    : isPastDate || isBlockedDay || horarioFueraDeRango || hasScheduleConflict
                }
                title={
                  isBlockedMode
                    ? horaInicioFormatoInvalido || horaFinFormatoInvalido || horaFinNoPosteriorAInicio || !horaFin
                      ? 'Corregí el rango horario (Hora Inicio / Hora Fin) para poder bloquear'
                      : undefined
                    : isPastDate || isBlockedDay || horarioFueraDeRango || hasScheduleConflict
                    ? 'Corregí la fecha u horario para poder guardar el turno'
                    : undefined
                }
                className={`text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all transform active:scale-95 text-white ${
                  isBlockedMode
                    ? horaInicioFormatoInvalido || horaFinFormatoInvalido || horaFinNoPosteriorAInicio || !horaFin
                      ? 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/30 cursor-pointer'
                    : isPastDate || isBlockedDay || horarioFueraDeRango || hasScheduleConflict
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : estado === 'cancelado'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 cursor-pointer'
                    : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20 cursor-pointer'
                }`}
              >
                {isBlockedMode
                  ? appointmentToEdit ? 'Actualizar Bloqueo' : '⛔ Bloquear Horario (NO DAR)'
                  : appointmentToEdit
                  ? estado === 'cancelado' ? 'Guardar como Cancelado' : 'Guardar Cambios'
                  : 'Agendar Turno'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation inside AppointmentModal */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title={isBlockedMode ? 'Desbloquear Horario' : 'Eliminar Turno'}
        message={
          isBlockedMode
            ? '¿Deseas desbloquear este horario para permitir turnos nuevamente?'
            : `¿Estás seguro de que deseas eliminar este turno de ${appointmentToEdit?.pacienteNombre}?`
        }
        confirmText={isBlockedMode ? 'Desbloquear' : 'Eliminar Turno'}
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (appointmentToEdit && onDelete) {
            onDelete(appointmentToEdit.id);
            setIsConfirmDeleteOpen(false);
            onClose();
          }
        }}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />

      {/* RF-11: advertencia de turnos ya cargados ese mismo día */}
      <ConfirmModal
        isOpen={showSameDayWarning}
        title="Ya hay turnos ese día"
        message={`Ya existen ${
          allAppointments.filter((a) => a.fecha === fecha && a.id !== pendingAppointment?.id && !a.esBloqueo).length
        } turno(s) cargado(s) para el ${formatDatePretty(fecha)}. ¿Deseas agendar este turno de todas formas?`}
        confirmText="Sí, agendar de todas formas"
        cancelText="Revisar de nuevo"
        isDestructive={false}
        onConfirm={confirmSaveDespiteSameDay}
        onCancel={() => {
          setShowSameDayWarning(false);
          setPendingAppointment(null);
        }}
      />
    </div>
  );
}
