import { useState, useEffect, useRef } from 'react';
import {
  CalendarSync,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Info,
  RefreshCw
} from 'lucide-react';
import { Appointment, Patient } from '../types';
import { parseTurnosWorkbook, TurnosImportResult } from '../utils/excelImportTurnos';

interface ImportTurnosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: (appointments: Appointment[]) => void | Promise<void>;
  patients: Patient[];
}

export default function ImportTurnosModal({ isOpen, onClose, onImportCompleted, patients }: ImportTurnosModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<TurnosImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setIsSaving(false);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSaving) return; // no cerrar a mitad de un guardado
    setResult(null);
    onClose();
  };

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setResult(null);
    const res = await parseTurnosWorkbook(file, patients);
    setResult(res);
    setIsProcessing(false);
  };

  const handleConfirmImport = async () => {
    if (!result || result.appointments.length === 0) return;
    setIsSaving(true);
    try {
      await onImportCompleted(result.appointments);
    } finally {
      setIsSaving(false);
      setResult(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CalendarSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Sincronizar con Plantilla de Excel</h3>
              <p className="text-xs text-slate-400">Trae los turnos ya cargados en la agenda de Excel a la app</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600" />
              Cómo funciona
            </div>
            <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1">
              <li>Subí el archivo .xlsx completo (con todas las hojas de meses, la de Pacientes y la de Variables).</li>
              <li>Solo se importan los turnos cuyo N° de Documento coincide con un paciente que ya existe en el Padrón.</li>
              <li>Los turnos con un DNI que no está en el Padrón se listan aparte, sin importarse, para cargarlos a mano.</li>
              <li>Podés correr esto las veces que quieras — es solo una copia hacia la app, el Excel no se modifica ni se reemplaza.</li>
            </ul>
          </div>

          {!result && !isProcessing && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/40 rounded-2xl py-8 flex flex-col items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Elegir el archivo .xlsx de la Agenda</span>
                <span className="text-[11px] text-slate-400">Click para buscar el archivo en tu computadora</span>
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="py-6 text-center text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Leyendo el archivo y buscando turnos en cada hoja...</span>
            </div>
          )}

          {isSaving && (
            <div className="py-6 text-center text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Guardando turnos en la agenda...</span>
            </div>
          )}

          {result && !isSaving && (
            <div className="space-y-4">
              {result.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>No se pudo leer el archivo</span>
                  </div>
                  {result.errors.map((err, idx) => (
                    <p key={idx} className="text-[11px] text-rose-700">
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {result.appointments.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Turnos listos para importar</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <div className="text-slate-500">Horarios leídos</div>
                      <div className="text-base font-extrabold text-slate-900">{result.totalSlotsScanned}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <div className="text-emerald-700 font-semibold">Turnos a importar</div>
                      <div className="text-base font-extrabold text-emerald-700">{result.importedCount}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                      <div className="text-amber-700 font-semibold">Sin paciente</div>
                      <div className="text-base font-extrabold text-amber-700">{result.skippedNoPatientMatch}</div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="font-bold text-slate-700">Vista previa (primeros turnos detectados):</div>
                    <div className="bg-white rounded-xl border border-emerald-100 overflow-y-auto divide-y divide-slate-100 max-h-56">
                      {result.appointments.slice(0, 60).map((a, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{a.pacienteNombre}</div>
                            <div className="text-[11px] text-slate-500">
                              {a.fecha} {a.horaInicio}–{a.horaFin} • {a.tratamientoNombre}
                            </div>
                          </div>
                        </div>
                      ))}
                      {result.appointments.length > 60 && (
                        <div className="p-2.5 text-[11px] text-slate-400 text-center">
                          + {result.appointments.length - 60} turno(s) más
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>{result.warnings.length} turno(s) no se importaron / necesitan revisión</span>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-100 overflow-y-auto divide-y divide-slate-100 max-h-48">
                    {result.warnings.map((w, idx) => (
                      <div key={idx} className="p-2.5 text-[11px] text-slate-700">
                        <span className="font-bold text-amber-700">
                          [{w.sheet} · {w.fecha}]
                        </span>{' '}
                        {w.detail}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {result && result.appointments.length > 0 && !isSaving && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs"
            >
              Importar {result.importedCount} Turno{result.importedCount === 1 ? '' : 's'}
            </button>
          </div>
        )}

        {result && result.appointments.length === 0 && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-xs font-bold text-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 transition-colors"
            >
              Probar con otro archivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
