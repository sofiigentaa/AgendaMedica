import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Clock,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  FileSpreadsheet,
  Settings2
} from 'lucide-react';
import { Appointment, Patient, AutoBackupConfig } from '../types';
import { computeDailySummary } from '../utils/storage';
import { fetchBackupConfig, saveBackupConfig } from '../utils/api';
import { generateAppointmentsCSV, triggerFileDownload } from '../utils/export';

interface BackupManagerProps {
  currentDate: string;
  appointments: Appointment[];
  patients: Patient[];
  onOpenResetAgenda?: () => void;
  onOpenImportExcel?: () => void;
}

export default function BackupManager({
  currentDate,
  appointments,
  patients,
  onOpenResetAgenda,
  onOpenImportExcel
}: BackupManagerProps) {
  const [config, setConfig] = useState<AutoBackupConfig | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBackupConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const summary = computeDailySummary(appointments, currentDate);

  // Generar y Descargar Backup Ahora -> descarga rápida en formato .csv
  const handleQuickBackup = async () => {
    setIsExporting(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const csvContent = generateAppointmentsCSV(currentDate, appointments);
    const fileName = `Backup_AgendaMedica_${currentDate.replace(/-/g, '')}.csv`;
    triggerFileDownload(csvContent, fileName, 'text/csv;charset=utf-8;');

    try {
      const updatedConfig = await saveBackupConfig({
        enabled: config?.enabled ?? false,
        nightlyHour: config?.nightlyHour ?? 21,
        nightlyMinute: config?.nightlyMinute ?? 0,
        autoDownloadExcel: config?.autoDownloadExcel ?? false,
        autoDownloadCsv: config?.autoDownloadCsv ?? false,
        saveLocalHistory: config?.saveLocalHistory ?? true,
        lastBackupDate: currentDate,
        lastBackupTime: timeStr
      });
      setConfig(updatedConfig);
      setStatusMessage('¡Backup .csv descargado exitosamente!');
    } catch {
      // The CSV already downloaded regardless — only the "last backup" timestamp failed to save.
      setStatusMessage('¡Backup .csv descargado! (no se pudo registrar la fecha en el servidor)');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner: Respaldo Garantizado */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 rounded-3xl shadow-lg border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold">
                  Sistema de Respaldo & Auto-Exportación
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                  100% Blindado
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Turnos, pacientes y cierres se guardan en la base de datos del consultorio, compartida entre todos los dispositivos, y se pueden exportar en cualquier momento
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 self-start sm:self-auto">
            {onOpenResetAgenda && (
              <button
                id="btn-open-reset-agenda"
                onClick={onOpenResetAgenda}
                className="bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-600 hover:border-rose-500/50 font-bold text-xs px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
                title="Vaciar turnos, vaciar base de datos o cargar datos de prueba"
              >
                <Settings2 className="w-4 h-4 text-rose-400" />
                <span>Gestionar / Restablecer Agenda</span>
              </button>
            )}

            <button
              id="btn-run-manual-snapshot"
              onClick={handleQuickBackup}
              disabled={isExporting}
              className="bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Generar y Descargar Backup Ahora</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Explanation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-800/70 border border-slate-700 p-3.5 rounded-2xl space-y-1">
            <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              Base de Datos Compartida
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cada turno u honorario se graba en el servidor del consultorio y está disponible al instante desde cualquier dispositivo con acceso.
            </p>
          </div>

          <div className="bg-slate-800/70 border border-slate-700 p-3.5 rounded-2xl space-y-1">
            <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Formato Excel (.xlsx) y CSV
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Libro multi-hoja con turnos del día, desglose de tratamientos (15m, 30m, 45m), padrón de DNI y balance de caja.
            </p>
          </div>

          <div className="bg-slate-800/70 border border-slate-700 p-3.5 rounded-2xl space-y-1">
            <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Programador Nocturno
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Último backup realizado:{' '}
              <strong className="text-slate-200">
                {config?.lastBackupDate
                  ? `${config.lastBackupDate} a las ${config.lastBackupTime || '21:00'} hs`
                  : 'Pendiente para esta noche'}
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
