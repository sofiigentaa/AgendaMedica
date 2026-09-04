import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  X,
  Link,
  Globe,
  Info,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Patient } from '../types';
import {
  downloadPatientsImportTemplate,
  fetchPatientsFromGoogleSheets,
  ImportResult
} from '../utils/excelImport';

interface ImportPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: (importedPatients: Patient[]) => void;
  existingPatientsCount: number;
}

export default function ImportPatientsModal({
  isOpen,
  onClose,
  onImportCompleted,
  existingPatientsCount
}: ImportPatientsModalProps) {
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Reset el estado interno cada vez que se abre el modal, así siempre
  // arranca "limpio" y no muestra la vista previa de una importación anterior.
  useEffect(() => {
    if (isOpen) {
      setGoogleSheetsUrl('');
      setIsProcessing(false);
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setGoogleSheetsUrl('');
    setResult(null);
    onClose();
  };

  const handleFetchGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) return;
    setIsProcessing(true);
    setResult(null);

    const res = await fetchPatientsFromGoogleSheets(googleSheetsUrl);
    setResult(res);
    setIsProcessing(false);
  };

  const handleConfirmImport = () => {
    if (!result || result.patients.length === 0) return;
    onImportCompleted(result.patients);
    setGoogleSheetsUrl('');
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Importar Padrón de Pacientes</h3>
              <p className="text-xs text-slate-400">
                Carga pacientes directamente desde un enlace de Google Sheets / Drive
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Information & Template Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-teal-600" />
                Detección Inteligente de Columnas
              </div>
              <p className="text-[11px] text-slate-600">
                Reconoce automáticamente columnas de <strong>Nombre, Apellido, DNI, Teléfono / Celular / WhatsApp, Email, Obra Social y Fecha de Nacimiento</strong>.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={downloadPatientsImportTemplate}
                className="text-xs font-bold text-teal-700 bg-white hover:bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Descargar archivo modelo de Excel listo para rellenar"
              >
                <Download className="w-3.5 h-3.5 text-teal-600" />
                <span>Descargar Plantilla Excel</span>
              </button>
            </div>
          </div>

          {/* GOOGLE DRIVE / SHEETS */}
          {(
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-600" />
                  ¿Cómo importar tu hoja de cálculo de Google Drive?
                </div>
                <ol className="text-[11px] text-sky-800 list-decimal list-inside space-y-1">
                  <li>Abre tu hoja de cálculo en <strong>Google Drive / Google Sheets</strong>.</li>
                  <li>Haz clic arriba a la derecha en <strong>"Compartir"</strong>.</li>
                  <li>En Acceso general, elige <strong>"Cualquier persona con el enlace"</strong> (Lector).</li>
                  <li>Copia el enlace de la barra del navegador y pégalo aquí abajo.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Enlace de tu Hoja de Cálculo de Google Sheets
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchGoogleSheets}
                    disabled={!googleSheetsUrl.trim() || isProcessing}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Cargar Hoja</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="py-4 text-center text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
              <span>Conectando y analizando pacientes en la hoja de cálculo...</span>
            </div>
          )}

          {/* Result Preview */}
          {result && (
            <div className="space-y-4">
              {result.success ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>¡Planilla leída y validada con éxito!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <div className="text-slate-500">Filas leídas</div>
                      <div className="text-base font-extrabold text-slate-900">{result.totalRows}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <div className="text-emerald-700 font-semibold">Pacientes listos</div>
                      <div className="text-base font-extrabold text-emerald-700">{result.importedCount}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 col-span-2 sm:col-span-1">
                      <div className="text-slate-500">Padrón actual</div>
                      <div className="text-base font-extrabold text-slate-900">{existingPatientsCount} pac.</div>
                    </div>
                  </div>

                  {/* Preview table (all imported patients, scrollable) */}
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-slate-700">Vista previa de pacientes detectados:</div>
                    <div className="bg-white rounded-xl border border-emerald-100 overflow-y-auto divide-y divide-slate-100 max-h-64">
                      {result.patients.map((p, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">
                              {p.nombre} {p.apellido}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              DNI: {p.dni} • Cel: {p.telefono}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                            {p.obraSocial || 'Particular'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <span className="font-bold">Aviso ({result.errors.length} filas omitidas por faltar nombre):</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {result.errors.slice(0, 3).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span>No se pudieron importar pacientes</span>
                  </div>
                  <ul className="text-xs text-rose-700 list-disc list-inside space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold text-slate-600 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            disabled={!result || !result.success || result.patients.length === 0}
            onClick={handleConfirmImport}
            className="bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Confirmar e Importar {result?.importedCount || 0} Pacientes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
