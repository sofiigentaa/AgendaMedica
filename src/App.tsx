import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, CalendarClock } from 'lucide-react';
import {
  Patient,
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
  HolidayOrNonWorkingDay
} from './types';
import {
  loadPatients,
  savePatients,
  loadAppointments,
  saveAppointments,
  loadHolidays,
  saveHolidays,
  getTodayDateString,
  loadBackupConfig,
  computeDailySummary,
  saveBackupHistoryItem,
  formatDatePretty
} from './utils/storage';
import { exportFullBackupPackage, generateAppointmentsCSV, triggerFileDownload } from './utils/export';
import { INITIAL_PATIENTS, getInitialAppointments } from './utils/storage';
import Navbar from './components/Navbar';
import CalendarView from './components/CalendarView';
import DailyFinancialSummary from './components/DailyFinancialSummary';
import PatientManager from './components/PatientManager';
import ReminderManager from './components/ReminderManager';
import BackupManager from './components/BackupManager';
import AppointmentModal from './components/AppointmentModal';
import PatientModal from './components/PatientModal';
import PrintDailyScheduleModal from './components/PrintDailyScheduleModal';
import ImportPatientsModal from './components/ImportPatientsModal';
import ResetAgendaModal from './components/ResetAgendaModal';
import MobileBottomNav from './components/MobileBottomNav';

// BUG-20 / BUG-21: pantalla mínima y aislada que ve el PACIENTE al tocar el
// link de "Confirmar" o "Cancelar" del mensaje de WhatsApp. No importa,
// no monta y no tiene forma de acceder a Navbar/CalendarView/PatientManager
// ni a ningún otro turno o paciente: solo confirma/cancela el turno propio
// (identificado por el id de la URL) y muestra un único mensaje de
// resultado. Nunca debe mostrarse la agenda ni el listado de pacientes.
function PatientActionScreen({
  type,
  appointment
}: {
  type: 'confirm' | 'cancel';
  appointment: Appointment | null;
}) {
  const isConfirm = type === 'confirm';
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-sm p-8 text-center space-y-4">
        <div
          className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
            isConfirm ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isConfirm ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>
        <h1 className="text-lg font-black text-slate-900">
          {isConfirm ? '¡Turno confirmado!' : 'Turno cancelado'}
        </h1>
        <p className="text-sm text-slate-600">
          {isConfirm
            ? 'Gracias por confirmar tu asistencia. Te esperamos.'
            : 'Registramos la cancelación de tu turno. Nos comunicaremos para coordinar una nueva fecha si lo necesitás.'}
        </p>

        {appointment && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CalendarClock className="w-3.5 h-3.5 text-teal-600" />
              <span>{formatDatePretty(appointment.fecha)}</span>
            </div>
            <div>Horario: {appointment.horaInicio} hs</div>
            {appointment.tratamientoNombre && <div>Tratamiento: {appointment.tratamientoNombre}</div>}
          </div>
        )}

        <p className="text-[11px] text-slate-400 pt-2">Ya podés cerrar esta ventana.</p>
      </div>
    </div>
  );
}

export default function App() {
  // BUG-20 / BUG-21: se resuelve ANTES que cualquier otro estado de la app.
  // Si la URL trae confirm_turno / cancel_turno, la app entera se corta acá:
  // se actualiza únicamente ese turno y se muestra la pantalla mínima de
  // arriba. Nunca se llega a montar Navbar, CalendarView, PatientManager ni
  // ningún componente que exponga otros turnos o pacientes.
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

  return <AdminApp />;
}

// Wrapper that loads/persists only what's needed to apply the confirm/cancel
// action and to show the appointment's own summary — it never reads or
// exposes the rest of the patients/appointments list to the UI.
function PatientOnlyActionRoute({ type, id }: { type: 'confirm' | 'cancel'; id: string }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const allAppointments = loadAppointments();
    const target = allAppointments.find((a) => a.id === id) || null;
    if (target) {
      const updated: Appointment = {
        ...target,
        estado: (type === 'confirm' ? 'confirmado' : 'cancelado') as AppointmentStatus,
        recordatorioEnviado: type === 'confirm' ? true : target.recordatorioEnviado,
        updatedAt: new Date().toISOString()
      };
      saveAppointments(allAppointments.map((a) => (a.id === id ? updated : a)));
      setAppointment(updated);
    }
    // Clean the query params from the URL without navigating anywhere else.
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [type, id]);

  return <PatientActionScreen type={type} appointment={appointment} />;
}

function AdminApp() {
  const [patients, setPatients] = useState<Patient[]>(() => loadPatients());
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadAppointments());
  const [holidays, setHolidays] = useState<HolidayOrNonWorkingDay[]>(() => loadHolidays());
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayDateString());
  const [activeTab, setActiveTab] = useState<'agenda' | 'finanzas' | 'pacientes' | 'recordatorios' | 'backups'>('agenda');

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
  // (vaciar turnos, vaciar todo, restablecer con datos demo). Cada acción
  // define su propio mensaje y color, así nunca se mezcla con el mensaje de
  // "se importaron N pacientes" de otra funcionalidad.
  const [adminNotification, setAdminNotification] = useState<{ message: string; type: 'success' | 'danger' } | null>(
    null
  );

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    savePatients(patients);
  }, [patients]);

  useEffect(() => {
    saveAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    saveHolidays(holidays);
  }, [holidays]);

  const handleToggleHoliday = (date: string, reason?: string) => {
    setHolidays((prev) => {
      const exists = prev.some((h) => h.date === date);
      if (exists) {
        return prev.filter((h) => h.date !== date);
      } else {
        const newHoliday: HolidayOrNonWorkingDay = {
          id: `hol-${Date.now()}`,
          date,
          reason: reason || 'Feriado / Día no laborable',
          type: 'feriado',
          createdAt: new Date().toISOString()
        };
        return [...prev, newHoliday];
      }
    });
  };

  // Automated Nightly Backup Cron-like interval in browser
  useEffect(() => {
    const checkNightlyBackup = () => {
      const config = loadBackupConfig();
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

        saveBackupHistoryItem({
          id: `auto-${Date.now()}`,
          date: todayStr,
          timestamp: `${todayStr} ${now.toLocaleTimeString('es-AR')}`,
          appointmentsCount: appointments.length,
          patientsCount: patients.length,
          totalRevenue: summary.totalHonorariosPercibidos,
          jsonData: JSON.stringify({ patients, appointments, summary, exportDate: todayStr })
        });
      }
    };

    const interval = setInterval(checkNightlyBackup, 60000); // check every min
    return () => clearInterval(interval);
  }, [appointments, patients]);

  // Appointment CRUD Handlers
  const handleSaveAppointment = (appointment: Appointment) => {
    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === appointment.id);
      if (exists) {
        return prev.map((a) => (a.id === appointment.id ? appointment : a));
      }
      return [...prev, appointment];
    });
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: status, updatedAt: new Date().toISOString() } : a))
    );
  };

  const handleUpdatePayment = (
    id: string,
    estadoPago: PaymentStatus,
    metodoPago?: PaymentMethod
  ) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              estadoPago,
              metodoPago: metodoPago || a.metodoPago,
              updatedAt: new Date().toISOString()
            }
          : a
      )
    );
  };

  const handleMarkReminderSent = (appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              recordatorioEnviado: true,
              ultimoRecordatorioAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : a
      )
    );
  };

  const handleMarkAllRemindersSent = (appointmentIds: string[]) => {
    setAppointments((prev) =>
      prev.map((a) =>
        appointmentIds.includes(a.id)
          ? {
              ...a,
              recordatorioEnviado: true,
              ultimoRecordatorioAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : a
      )
    );
  };

  // Patient CRUD Handlers
  const handleSavePatient = (patient: Patient) => {
    setPatients((prev) => {
      const exists = prev.some((p) => p.id === patient.id);
      if (exists) {
        return prev.map((p) => (p.id === patient.id ? patient : p));
      }
      return [...prev, patient];
    });
  };

  const handleDeletePatient = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
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

  const handleDataRestored = (newPatients: Patient[], newAppointments: Appointment[]) => {
    setPatients(newPatients);
    setAppointments(newAppointments);
  };

  const handleImportPatientsCompleted = (imported: Patient[]) => {
    const existingDnis = new Set(patients.map((p) => p.dni.replace(/\D/g, '')));
    const newUnique = imported.filter((p) => {
      const cleanDni = p.dni.replace(/\D/g, '');
      return cleanDni === '' || !existingDnis.has(cleanDni);
    });
    setPatients((prev) => [...prev, ...newUnique]);
    setLastImportBatch(
      newUnique.length > 0 ? { ids: newUnique.map((p) => p.id), count: newUnique.length, dismissed: false } : null
    );
  };

  // BUG-18: "Mantener" ahora persiste en el estado de App, no en un estado
  // local del componente que se pierde al cambiar de pestaña.
  const handleDismissImportBanner = () => {
    setLastImportBatch((prev) => (prev ? { ...prev, dismissed: true } : prev));
  };

  const handleUndoLastImport = () => {
    if (!lastImportBatch) return;
    const idsToRemove = new Set(lastImportBatch.ids);
    setPatients((prev) => prev.filter((p) => !idsToRemove.has(p.id)));
    setLastImportBatch(null);
  };

  // BUG-09: al borrar/restablecer la agenda, también se limpia cualquier
  // aviso de importación de pacientes que hubiera quedado colgado de antes
  // (evita que aparezca "Se importaron 1808 pacientes" después de un borrado).
  const handleClearAllData = () => {
    setPatients([]);
    setAppointments([]);
    setLastImportBatch(null);
    // BUG-10: mensaje de éxito real (verde), nunca un cartel de error.
    setAdminNotification({ message: 'Se vació toda la agenda: pacientes y turnos eliminados.', type: 'success' });
  };

  const handleClearAppointmentsOnly = () => {
    setAppointments([]);
    setAdminNotification({ message: 'Se vaciaron todos los turnos. El padrón de pacientes se mantuvo intacto.', type: 'success' });
  };

  const handleLoadDemoData = () => {
    setPatients(INITIAL_PATIENTS);
    setAppointments(getInitialAppointments());
    setLastImportBatch(null);
    setAdminNotification({ message: 'Se restablecieron los datos de demostración.', type: 'success' });
  };

  // Count pending reminders for current day
  const pendingRemindersToday = appointments.filter(
    (a) => a.fecha === currentDate && !a.recordatorioEnviado && a.estado !== 'cancelado'
  ).length;

  const currentDaySummary = computeDailySummary(appointments, currentDate);

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

        {activeTab === 'recordatorios' && (
          <ReminderManager
            currentDate={currentDate}
            appointments={appointments}
            onMarkReminderSent={handleMarkReminderSent}
            onMarkAllRemindersSent={handleMarkAllRemindersSent}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'backups' && (
          <BackupManager
            currentDate={currentDate}
            appointments={appointments}
            patients={patients}
            onDataRestored={handleDataRestored}
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
      />
    </div>
  );
}
