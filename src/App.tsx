import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, CalendarClock, X, Loader2 } from 'lucide-react';
import {
  Patient,
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
  HolidayOrNonWorkingDay
} from './types';
import { getTodayDateString, computeDailySummary, formatDatePretty } from './utils/storage';
import { exportFullBackupPackage, generateAppointmentsCSV, triggerFileDownload } from './utils/export';
import * as api from './utils/api';
import Navbar from './components/Navbar';
import CalendarView from './components/CalendarView';
import DailyFinancialSummary from './components/DailyFinancialSummary';
import PatientManager from './components/PatientManager';
import BackupManager from './components/BackupManager';
import AppointmentModal from './components/AppointmentModal';
import PatientModal from './components/PatientModal';
import PrintDailyScheduleModal from './components/PrintDailyScheduleModal';
import ImportPatientsModal from './components/ImportPatientsModal';
import ResetAgendaModal from './components/ResetAgendaModal';
import MobileBottomNav from './components/MobileBottomNav';
import LoginScreen from './components/LoginScreen';

// BUG-20 / BUG-21: pantalla mínima y aislada que ve el PACIENTE al tocar el
// link de "Confirmar" o "Cancelar" del mensaje de WhatsApp. No importa,
// no monta y no tiene forma de acceder a Navbar/CalendarView/PatientManager
// ni a ningún otro turno o paciente: solo confirma/cancela el turno propio
// (identificado por el id de la URL) y muestra un único mensaje de
// resultado. Nunca debe mostrarse la agenda ni el listado de pacientes.
//
// Esta pantalla NO requiere login: llama a los endpoints públicos
// /api/public/appointments/:id/confirm|cancel (ver server/routes/public.ts),
// que solo devuelven fecha/hora/tratamiento de ESE turno — nunca el resto
// de la agenda ni datos de otros pacientes.
function PatientActionScreen({
  type,
  summary,
  notFound
}: {
  type: 'confirm' | 'cancel';
  summary: api.PublicAppointmentSummary | null;
  notFound: boolean;
}) {
  const isConfirm = type === 'confirm';

  // BUG-23 (corregido, 2da vuelta): esta pantalla es la única parte de la
  // app que puede ver un PACIENTE. Probamos con window.close() para cerrar
  // la pestaña sola, pero en el navegador interno de WhatsApp ese llamado
  // termina "navegando hacia atrás" en vez de cerrar (o no hacer nada), y
  // eso llevaba al paciente a la agenda del consultorio. Por eso el botón
  // "Cerrar" ya NO llama a ninguna función del navegador: solo oculta el
  // mensaje en esta misma pantalla. El paciente cierra la pestaña a mano.
  const [closed, setClosed] = useState(false);

  const handleClose = () => {
    setClosed(true);
  };

  if (closed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-sm text-slate-500">Ya podés cerrar esta pestaña.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-sm p-8 text-center space-y-4">
        <div
          className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
            notFound
              ? 'bg-slate-100 text-slate-500'
              : isConfirm
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-rose-100 text-rose-600'
          }`}
        >
          {notFound ? <XCircle className="w-8 h-8" /> : isConfirm ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>
        <h1 className="text-lg font-black text-slate-900">
          {notFound ? 'Turno no encontrado' : isConfirm ? '¡Turno confirmado!' : 'Turno cancelado'}
        </h1>
        <p className="text-sm text-slate-600">
          {notFound
            ? 'El link ya no es válido. Contactanos si necesitás ayuda con tu turno.'
            : isConfirm
            ? 'Gracias por confirmar tu asistencia. Te esperamos.'
            : 'Registramos la cancelación de tu turno. Nos comunicaremos para coordinar una nueva fecha si lo necesitás.'}
        </p>

        {summary && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CalendarClock className="w-3.5 h-3.5 text-teal-600" />
              <span>{formatDatePretty(summary.fecha)}</span>
            </div>
            <div>Horario: {summary.horaInicio} hs</div>
            {summary.tratamientoNombre && <div>Tratamiento: {summary.tratamientoNombre}</div>}
          </div>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <X className="w-4 h-4" />
          <span>Cerrar</span>
        </button>
      </div>
    </div>
  );
}

// Wrapper that calls only the narrow public confirm/cancel endpoint and
// shows the appointment's own summary — it never has access to (and never
// requests) the rest of the patients/appointments data.
function PatientOnlyActionRoute({ type, id }: { type: 'confirm' | 'cancel'; id: string }) {
  const [summary, setSummary] = useState<api.PublicAppointmentSummary | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const action = type === 'confirm' ? api.confirmAppointmentPublic : api.cancelAppointmentPublic;
    action(id)
      .then(setSummary)
      .catch(() => setNotFound(true));
    // A propósito NO se limpia el query param (?confirm_turno=/?cancel_turno=)
    // de la URL acá. Si se lo saca y el navegador (sobre todo el navegador
    // interno de WhatsApp) vuelve a cargar esta misma pestaña más adelante
    // -por ejemplo al volver de segundo plano-, la app pierde el contexto de
    // "esto es una confirmación de turno" y termina mostrando la agenda del
    // consultorio en su lugar. Dejando el parámetro, cualquier recarga cae
    // otra vez en esta misma pantalla aislada (repetir confirm/cancel es
    // inofensivo, solo vuelve a guardar el mismo estado).
  }, [type, id]);

  return <PatientActionScreen type={type} summary={summary} notFound={notFound} />;
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
        <p className="text-sm font-semibold">{label}</p>
      </div>
    </div>
  );
}

export default function App() {
  // BUG-20 / BUG-21: se resuelve ANTES que cualquier otro estado de la app.
  // Si la URL trae confirm_turno / cancel_turno, la app entera se corta acá:
  // se actualiza únicamente ese turno y se muestra la pantalla mínima de
  // arriba. Nunca se llega a montar Navbar, CalendarView, PatientManager ni
  // ningún componente que exponga otros turnos o pacientes, y nunca se pide
  // (ni se necesita) haber iniciado sesión.
  const patientActionParams = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const confirmId = urlParams.get('confirm_turno');
    const cancelId = urlParams.get('cancel_turno');
    if (confirmId) return { type: 'confirm' as const, id: confirmId };
    if (cancelId) return { type: 'cancel' as const, id: cancelId };
    return null;
  }, []);

  if (patientActionParams) {
    return <PatientOnlyActionRoute {...patientActionParams} />;
  }

  return <AuthGate />;
}

// Todo el resto de la app (agenda, pacientes, finanzas, backups) vive detrás
// de la contraseña compartida del consultorio: sin sesión válida, ni
// siquiera se intenta cargar el padrón ni los turnos.
function AuthGate() {
  const [status, setStatus] = useState<'checking' | 'guest' | 'authed'>('checking');

  useEffect(() => {
    api
      .checkSession()
      .then((authenticated) => setStatus(authenticated ? 'authed' : 'guest'))
      .catch(() => setStatus('guest'));
  }, []);

  if (status === 'checking') return <FullScreenLoader label="Verificando sesión…" />;
  if (status === 'guest') return <LoginScreen onLoggedIn={() => setStatus('authed')} />;
  return <AdminApp onLogout={() => setStatus('guest')} />;
}

function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [holidays, setHolidays] = useState<HolidayOrNonWorkingDay[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayDateString());
  const [activeTab, setActiveTab] = useState<'agenda' | 'finanzas' | 'pacientes' | 'backups'>('agenda');

  // Modals state
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [suggestedAppointmentTime, setSuggestedAppointmentTime] = useState<string | undefined>('14:30');
  const [isBlockedSlotMode, setIsBlockedSlotMode] = useState<boolean>(false);

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [preSelectedPatientId, setPreSelectedPatientId] = useState<string | null>(null);
  // BUG-18: se agrega "dismissed" al propio estado (en vez de guardarlo como
  // estado local dentro de PatientManager). Así, si el componente se
  // desmonta y remonta al cambiar de pestaña, la elección de "Mantener" no
  // se pierde y el aviso no vuelve a aparecer.
  const [lastImportBatch, setLastImportBatch] = useState<{ ids: string[]; count: number; dismissed?: boolean } | null>(
    null
  );

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetAgendaModalOpen, setIsResetAgendaModalOpen] = useState(false);
  // BUG-09 / BUG-10: notificación genérica para acciones administrativas
  // (vaciar turnos, vaciar todo, restablecer con datos demo, errores de red).
  // Cada acción define su propio mensaje y color, así nunca se mezcla con el
  // mensaje de "se importaron N pacientes" de otra funcionalidad.
  const [adminNotification, setAdminNotification] = useState<{ message: string; type: 'success' | 'danger' } | null>(
    null
  );

  const showError = (message: string) => setAdminNotification({ message, type: 'danger' });

  // Data now lives in a shared database instead of this browser's
  // localStorage — load it from the API once per session instead of
  // synchronously seeding it on first render.
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.fetchPatients(), api.fetchAppointments(), api.fetchHolidays()])
      .then(([p, a, h]) => {
        if (cancelled) return;
        setPatients(p);
        setAppointments(a);
        setHolidays(h);
        setIsLoadingData(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'No se pudieron cargar los datos del servidor.');
        setIsLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // RF-14: el toast de notificación (ej. "Se restablecieron los datos de
  // demostración") se cierra solo a los pocos segundos, además de poder
  // cerrarse manualmente con el botón "Cerrar".
  useEffect(() => {
    if (!adminNotification) return;
    const timer = setTimeout(() => setAdminNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [adminNotification]);

  const handleToggleHoliday = async (
    date: string,
    reason?: string,
    type?: HolidayOrNonWorkingDay['type']
  ) => {
    const trimmedReason = (reason || '').trim();
    try {
      if (!trimmedReason) {
        await api.deleteHoliday(date);
        setHolidays((prev) => prev.filter((h) => h.date !== date));
        return;
      }
      const saved = await api.saveHoliday(date, trimmedReason, type);
      setHolidays((prev) => {
        const exists = prev.some((h) => h.date === date);
        return exists ? prev.map((h) => (h.date === date ? saved : h)) : [...prev, saved];
      });
    } catch (err: any) {
      showError(err.message || 'No se pudo guardar el feriado.');
    }
  };

  // Automated Nightly Backup Cron-like interval
  useEffect(() => {
    const checkNightlyBackup = async () => {
      try {
        const config = await api.fetchBackupConfig();
        if (!config.enabled) return;

        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = getTodayDateString();

        // If it's the configured backup hour and hasn't run today
        if (currentHour >= config.nightlyHour && config.lastBackupDate !== todayStr) {
          console.log(`[Backup Automático] Ejecutando respaldo nocturno de las ${config.nightlyHour}:00 hs...`);
          const summary = computeDailySummary(appointments, todayStr);

          if (config.autoDownloadExcel || config.autoDownloadCsv) {
            exportFullBackupPackage(todayStr, appointments, patients, summary);
          }

          await api.saveBackupConfig({ ...config, lastBackupDate: todayStr, lastBackupTime: now.toLocaleTimeString('es-AR') });
          await api.createBackupHistoryItem({
            id: `auto-${Date.now()}`,
            date: todayStr,
            timestamp: `${todayStr} ${now.toLocaleTimeString('es-AR')}`,
            appointmentsCount: appointments.length,
            patientsCount: patients.length,
            totalRevenue: summary.totalHonorariosPercibidos,
            jsonData: JSON.stringify({ patients, appointments, summary, exportDate: todayStr })
          });
        }
      } catch (err) {
        console.error('Error en el backup automático nocturno', err);
      }
    };

    const interval = setInterval(checkNightlyBackup, 60000); // check every min
    return () => clearInterval(interval);
  }, [appointments, patients]);

  // Appointment CRUD Handlers
  const handleSaveAppointment = async (appointment: Appointment) => {
    try {
      const saved = await api.saveAppointment(appointment);
      setAppointments((prev) => {
        const exists = prev.some((a) => a.id === saved.id);
        return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved];
      });
    } catch (err: any) {
      showError(err.message || 'No se pudo guardar el turno.');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await api.deleteAppointment(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      showError(err.message || 'No se pudo eliminar el turno.');
    }
  };

  // Patches (and persists) a single field-level change to one appointment —
  // used by the quick inline controls (status/payment dropdowns, reminder
  // sent) that don't go through the full AppointmentModal form.
  const patchAppointment = async (id: string, patch: Partial<Appointment>) => {
    const current = appointments.find((a) => a.id === id);
    if (!current) return;
    const updated: Appointment = { ...current, ...patch, updatedAt: new Date().toISOString() };
    // Optimistic update so the UI feels instant; reconciled with the
    // server's response (or rolled back on error) right after.
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    try {
      const saved = await api.saveAppointment(updated);
      setAppointments((prev) => prev.map((a) => (a.id === id ? saved : a)));
    } catch (err: any) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? current : a)));
      showError(err.message || 'No se pudo guardar el cambio.');
    }
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    patchAppointment(id, { estado: status });
  };

  const handleUpdatePayment = (id: string, estadoPago: PaymentStatus, metodoPago?: PaymentMethod) => {
    const current = appointments.find((a) => a.id === id);
    patchAppointment(id, { estadoPago, metodoPago: metodoPago || current?.metodoPago });
  };

  const handleMarkReminderSent = (appointmentId: string) => {
    patchAppointment(appointmentId, { recordatorioEnviado: true, ultimoRecordatorioAt: new Date().toISOString() });
  };

  // Patient CRUD Handlers. Returns a Promise so PatientModal can await it and
  // keep the form open (showing the server's error, e.g. a duplicate DNI
  // caught by the database's unique constraint) instead of closing blindly.
  const handleSavePatient = async (patient: Patient) => {
    const isNewPatient = !patientToEdit;
    const saved = await api.savePatient(patient);

    setPatients((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved];
    });

    // Al registrar un paciente nuevo, pasamos directamente a cargarle un
    // turno (evita tener que volver a buscarlo en el padrón).
    if (isNewPatient) {
      setPatientToEdit(null);
      setAppointmentToEdit(null);
      setIsBlockedSlotMode(false);
      setPreSelectedPatientId(saved.id);
      setIsAppointmentModalOpen(true);
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
      await api.deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      showError(err.message || 'No se pudo eliminar el paciente.');
    }
  };

  const handleBookAppointmentForPatient = (patient: Patient) => {
    setPatientToEdit(null);
    setAppointmentToEdit(null);
    setPreSelectedPatientId(patient.id);
    setIsAppointmentModalOpen(true);
  };

  const handleDownloadCsv = () => {
    const csvContent = generateAppointmentsCSV(currentDate, appointments);
    const fileName = `AgendaMedica_Turnos_${currentDate.replace(/-/g, '')}.csv`;
    triggerFileDownload(csvContent, fileName, 'text/csv;charset=utf-8;');
  };

  const handleQuickBackup = () => {
    const summary = computeDailySummary(appointments, currentDate);
    exportFullBackupPackage(currentDate, appointments, patients, summary);
  };

  const handleImportPatientsCompleted = async (imported: Patient[]) => {
    try {
      const { created, skippedDuplicateDni } = await api.bulkCreatePatients(imported);
      setPatients((prev) => [...prev, ...created]);
      setLastImportBatch(
        created.length > 0 ? { ids: created.map((p) => p.id), count: created.length, dismissed: false } : null
      );
      if (skippedDuplicateDni.length > 0 && created.length === 0) {
        showError('Todos los pacientes de la planilla ya estaban en el padrón (DNI duplicado).');
      }
    } catch (err: any) {
      showError(err.message || 'No se pudo importar el padrón.');
    }
  };

  // BUG-18: "Mantener" ahora persiste en el estado de App, no en un estado
  // local del componente que se pierde al cambiar de pestaña.
  const handleDismissImportBanner = () => {
    setLastImportBatch((prev) => (prev ? { ...prev, dismissed: true } : prev));
  };

  const handleUndoLastImport = async () => {
    if (!lastImportBatch) return;
    try {
      await fetch('/api/patients/bulk', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: lastImportBatch.ids })
      });
      const idsToRemove = new Set(lastImportBatch.ids);
      setPatients((prev) => prev.filter((p) => !idsToRemove.has(p.id)));
      setLastImportBatch(null);
    } catch (err: any) {
      showError(err.message || 'No se pudo deshacer la importación.');
    }
  };

  // BUG-09: al borrar/restablecer la agenda, también se limpia cualquier
  // aviso de importación de pacientes que hubiera quedado colgado de antes
  // (evita que aparezca "Se importaron 1808 pacientes" después de un borrado).
  const handleClearAllData = async () => {
    try {
      await Promise.all([api.deleteAllAppointments(), api.deleteAllPatients()]);
      setPatients([]);
      setAppointments([]);
      setLastImportBatch(null);
      // BUG-10: mensaje de éxito real (verde), nunca un cartel de error.
      setAdminNotification({ message: 'Se vació toda la agenda: pacientes y turnos eliminados.', type: 'success' });
    } catch (err: any) {
      showError(err.message || 'No se pudo vaciar la agenda.');
    }
  };

  const handleClearAppointmentsOnly = async () => {
    try {
      await api.deleteAllAppointments();
      setAppointments([]);
      setAdminNotification({ message: 'Se vaciaron todos los turnos. El padrón de pacientes se mantuvo intacto.', type: 'success' });
    } catch (err: any) {
      showError(err.message || 'No se pudieron vaciar los turnos.');
    }
  };

  const handleLoadDemoData = async () => {
    try {
      const { patients: p, appointments: a } = await api.loadDemoData();
      setPatients(p);
      setAppointments(a);
      setLastImportBatch(null);
      setAdminNotification({ message: 'Se restablecieron los datos de demostración.', type: 'success' });
    } catch (err: any) {
      showError(err.message || 'No se pudieron cargar los datos de demostración.');
    }
  };

  // Count pending reminders for current day
  const pendingRemindersToday = appointments.filter(
    (a) => a.fecha === currentDate && !a.recordatorioEnviado && a.estado !== 'cancelado'
  ).length;

  const currentDaySummary = computeDailySummary(appointments, currentDate);

  if (isLoadingData) return <FullScreenLoader label="Cargando agenda…" />;

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-rose-200 p-6 max-w-sm text-center space-y-3">
          <p className="text-sm font-bold text-rose-700">No se pudo conectar con el servidor</p>
          <p className="text-xs text-slate-500">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-xl"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewAppointment={() => {
          setAppointmentToEdit(null);
          setIsAppointmentModalOpen(true);
        }}
        onOpenNewPatient={() => {
          setPatientToEdit(null);
          setIsPatientModalOpen(true);
        }}
        onDownloadCsv={handleDownloadCsv}
        onQuickBackup={handleQuickBackup}
        onOpenImportExcel={() => setIsImportModalOpen(true)}
        pendingRemindersCount={pendingRemindersToday}
        holidays={holidays}
        onLogout={async () => {
          await api.logout();
          onLogout();
        }}
      />

      {/* Main Content Area - with bottom padding for mobile navigation */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 pb-28 md:pb-8">
        {/* Admin Action Notification Banner (reset agenda, vaciar todo, etc.) */}
        {adminNotification && (
          <div
            className={`p-4 rounded-2xl border shadow-md flex items-center justify-between animate-in fade-in duration-300 ${
              adminNotification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{adminNotification.type === 'success' ? '🎉' : '⚠️'}</span>
              <div className="text-sm font-bold">{adminNotification.message}</div>
            </div>
            <button
              onClick={() => setAdminNotification(null)}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}

        {activeTab === 'agenda' && (
          <CalendarView
            currentDate={currentDate}
            onSelectDate={setCurrentDate}
            appointments={appointments}
            holidays={holidays}
            onToggleHoliday={handleToggleHoliday}
            onOpenNewAppointment={(suggestedTime) => {
              setSuggestedAppointmentTime(suggestedTime || '14:30');
              setAppointmentToEdit(null);
              setPreSelectedPatientId(null);
              setIsBlockedSlotMode(false);
              setIsAppointmentModalOpen(true);
            }}
            onOpenBlockSlot={(suggestedTime) => {
              setSuggestedAppointmentTime(suggestedTime || '14:30');
              setAppointmentToEdit(null);
              setPreSelectedPatientId(null);
              setIsBlockedSlotMode(true);
              setIsAppointmentModalOpen(true);
            }}
            onEditAppointment={(appointment) => {
              setAppointmentToEdit(appointment);
              setPreSelectedPatientId(null);
              setIsBlockedSlotMode(!!appointment.esBloqueo || appointment.tratamientoId === 'no_dar');
              setIsAppointmentModalOpen(true);
            }}
            onDeleteAppointment={handleDeleteAppointment}
            onUpdateStatus={handleUpdateStatus}
            onUpdatePayment={handleUpdatePayment}
            onSendReminder={(appointment) => handleMarkReminderSent(appointment.id)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        )}

        {activeTab === 'finanzas' && (
          <DailyFinancialSummary
            currentDate={currentDate}
            appointments={appointments}
            patients={patients}
            onUpdatePayment={handleUpdatePayment}
          />
        )}

        {activeTab === 'pacientes' && (
          <PatientManager
            patients={patients}
            appointments={appointments}
            onOpenNewPatient={() => {
              setPatientToEdit(null);
              setIsPatientModalOpen(true);
            }}
            onEditPatient={(patient) => {
              setPatientToEdit(patient);
              setIsPatientModalOpen(true);
            }}
            onDeletePatient={handleDeletePatient}
            onBookAppointmentForPatient={handleBookAppointmentForPatient}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
            lastImportBatch={lastImportBatch}
            onDismissImportBanner={handleDismissImportBanner}
            onUndoLastImport={handleUndoLastImport}
          />
        )}

        {activeTab === 'backups' && (
          <BackupManager
            currentDate={currentDate}
            appointments={appointments}
            patients={patients}
            onOpenResetAgenda={() => setIsResetAgendaModalOpen(true)}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
          />
        )}
      </main>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setAppointmentToEdit(null);
          setPreSelectedPatientId(null);
          setIsBlockedSlotMode(false);
        }}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        appointmentToEdit={appointmentToEdit}
        initialIsBlocked={isBlockedSlotMode}
        preSelectedPatientId={preSelectedPatientId}
        selectedDate={currentDate}
        suggestedTime={suggestedAppointmentTime}
        holidays={holidays}
        patients={patients}
        allAppointments={appointments}
        onOpenNewPatientModal={() => {
          setPatientToEdit(null);
          setIsPatientModalOpen(true);
        }}
      />

      {/* Patient Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => {
          setIsPatientModalOpen(false);
          setPatientToEdit(null);
        }}
        onSave={handleSavePatient}
        patientToEdit={patientToEdit}
        patients={patients}
      />

      {/* Print Daily Schedule Modal */}
      <PrintDailyScheduleModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        date={currentDate}
        appointments={appointments}
        patients={patients}
        summary={currentDaySummary}
      />

      {/* Import Patients Modal */}
      <ImportPatientsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={handleImportPatientsCompleted}
        existingPatientsCount={patients.length}
      />

      {/* Reset Agenda Modal */}
      <ResetAgendaModal
        isOpen={isResetAgendaModalOpen}
        onClose={() => setIsResetAgendaModalOpen(false)}
        onClearAllData={handleClearAllData}
        onClearAppointmentsOnly={handleClearAppointmentsOnly}
        onLoadDemoData={handleLoadDemoData}
        totalAppointments={appointments.length}
        totalPatients={patients.length}
      />

      {/* Mobile-First Persistent Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewAppointment={() => {
          setAppointmentToEdit(null);
          setSuggestedAppointmentTime('14:30');
          setIsBlockedSlotMode(false);
          setIsAppointmentModalOpen(true);
        }}
        pendingRemindersCount={pendingRemindersToday}
        onLogout={async () => {
          await api.logout();
          onLogout();
        }}
      />
    </div>
  );
}
