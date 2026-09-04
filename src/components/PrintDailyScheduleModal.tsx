import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Calendar, User, Phone, CheckCircle, Shield, FileText, DollarSign, Edit3 } from 'lucide-react';
import { Appointment, Patient, DailySummary } from '../types';
import { formatDatePretty } from '../utils/storage';
import { formatCurrency } from '../data/treatments';
import { printDailyScheduleReport } from '../utils/printHelper';
import EsteticaLaserLogo from './EsteticaLaserLogo';

interface PrintDailyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  appointments: Appointment[];
  patients: Patient[];
  summary: DailySummary;
}

export default function PrintDailyScheduleModal({
  isOpen,
  onClose,
  date,
  appointments,
  patients,
  summary
}: PrintDailyScheduleModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // State to allow user to write/override custom payment method and fee for any appointment before printing
  const [customPayments, setCustomPayments] = useState<Record<string, { method: string; fee: number }>>({});

  const dayAppointments = appointments
    .filter((a) => a.fecha === date)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  // Initialize or synchronize custom payment methods and fees when appointments load
  useEffect(() => {
    const initial: Record<string, { method: string; fee: number }> = {};
    dayAppointments.forEach((apt) => {
      // If paid, use the method name formatted nicely; if not, keep blank so it doesn't show 'a definir' or 'pendiente'
      let initialMethod = '';
      if (apt.estadoPago === 'pagado' && apt.metodoPago && apt.metodoPago !== 'pendiente') {
        initialMethod =
          apt.metodoPago === 'efectivo'
            ? 'Efectivo'
            : apt.metodoPago === 'transferencia'
            ? 'Transferencia'
            : apt.metodoPago === 'debito'
            ? 'Débito'
            : apt.metodoPago === 'credito'
            ? 'Crédito'
            : apt.metodoPago === 'obra_social_directo'
            ? 'Obra Social Directo'
            : apt.metodoPago;
      }
      initial[apt.id] = {
        method: initialMethod,
        fee: Number(apt.honorarios) || 0
      };
    });
    setCustomPayments(initial);
  }, [date, appointments]);

  if (!isOpen) return null;

  const handlePrint = () => {
    printDailyScheduleReport(date, appointments, customPayments);
  };

  const handleMethodChange = (id: string, value: string) => {
    setCustomPayments((prev) => ({
      ...prev,
      [id]: {
        method: value,
        fee: prev[id]?.fee ?? 0
      }
    }));
  };

  const handleFeeChange = (id: string, value: number) => {
    setCustomPayments((prev) => ({
      ...prev,
      [id]: {
        method: prev[id]?.method || '',
        fee: value
      }
    }));
  };

  const totalCalculated = dayAppointments.reduce(
    (sum, apt) => sum + (customPayments[apt.id]?.fee ?? Number(apt.honorarios) ?? 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-4 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        {/* Top bar (Hidden in print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Imprimir Agenda Diaria de Turnos</h2>
              <p className="text-xs text-slate-400">
                Podes personalizar o escribir el medio de pago antes de imprimir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-trigger-print-modal"
              className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div
          ref={printAreaRef}
          className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-900 print:p-4 print:overflow-visible"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col items-start gap-2">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs inline-block">
                <EsteticaLaserLogo size="lg" theme="light" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  Agenda de Turnos Médicos
                </h1>
                <p className="text-xs text-slate-600 font-semibold">
                  Estética Láser Rosario
                </p>
              </div>
            </div>

            <div className="sm:text-right bg-slate-50 print:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha del Día</div>
              <div className="text-base font-black text-slate-900 capitalize">
                {formatDatePretty(date)}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-center text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">Total Turnos</div>
              <div className="text-lg font-black text-slate-900">
                {dayAppointments.filter((a) => !a.esBloqueo && a.tratamientoId !== 'no_dar').length}
              </div>
            </div>
            <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200">
              <div className="text-sky-700 font-medium">Confirmados</div>
              <div className="text-lg font-black text-sky-950">
                {dayAppointments.filter((a) => a.estado === 'confirmado' && !a.esBloqueo && a.tratamientoId !== 'no_dar').length}
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">Total a Cobrar</div>
              <div className="text-base font-black text-slate-900">
                {formatCurrency(totalCalculated)}
              </div>
            </div>
          </div>

          {/* Appointments Table */}
          {dayAppointments.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              No hay turnos programados para esta fecha ({date}).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-16 text-center">Horario</th>
                    <th className="p-2 border-r border-slate-300">Paciente & Celular</th>
                    <th className="p-2 border-r border-slate-300">DNI</th>
                    <th className="p-2 border-r border-slate-300">Tratamiento</th>
                    <th className="p-2 border-r border-slate-300">Cobertura</th>
                    <th className="p-2 border-r border-slate-300 text-right">Honorarios / Medio de Pago</th>
                    <th className="p-2">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-normal">
                  {dayAppointments.map((apt) => {
                    const isBlocked = apt.esBloqueo || apt.tratamientoId === 'no_dar';

                    if (isBlocked) {
                      return (
                        <tr key={apt.id} className="bg-slate-100/80">
                          <td className="p-2 border-r border-slate-300 text-center font-bold font-mono text-slate-900 whitespace-nowrap">
                            {apt.horaInicio} - {apt.horaFin}
                            <span className="block text-[10px] text-slate-500 font-normal">
                              ({apt.duracionMinutos}m)
                            </span>
                          </td>
                          <td colSpan={2} className="p-2 border-r border-slate-300 font-black text-rose-800">
                            ⛔ HORARIO BLOQUEADO (NO DAR TURNOS)
                          </td>
                          <td className="p-2 border-r border-slate-300 font-semibold text-slate-700 italic">
                            Franja No Disponible
                          </td>
                          <td className="p-2 border-r border-slate-300 text-slate-400">
                            -
                          </td>
                          <td className="p-2 border-r border-slate-300 text-right font-bold text-slate-400">
                            -
                          </td>
                          <td className="p-2 text-slate-700 font-medium">
                            {apt.observaciones || 'No dar turnos en este horario'}
                          </td>
                        </tr>
                      );
                    }

                    const currentInfo = customPayments[apt.id] || {
                      method: '',
                      fee: Number(apt.honorarios) || 0
                    };

                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/50">
                        {/* Horario */}
                        <td className="p-2 border-r border-slate-300 text-center font-bold font-mono text-slate-900 whitespace-nowrap">
                          {apt.horaInicio} - {apt.horaFin}
                          <span className="block text-[10px] text-slate-500 font-normal">
                            ({apt.duracionMinutos}m)
                          </span>
                        </td>

                        {/* Paciente & Celular */}
                        <td className="p-2 border-r border-slate-300 font-bold text-slate-900">
                          <div>{apt.pacienteNombre}</div>
                          <div className="text-[11px] font-normal text-slate-600 flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-slate-700">Cel:</span> {apt.pacienteTelefono}
                          </div>
                        </td>

                        {/* DNI */}
                        <td className="p-2 border-r border-slate-300 font-mono text-slate-700 whitespace-nowrap">
                          {apt.pacienteDni}
                        </td>

                        {/* Tratamiento */}
                        <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                          {apt.tratamientoNombre}
                        </td>

                        {/* Cobertura */}
                        <td className="p-2 border-r border-slate-300 text-slate-700">
                          <div className="font-semibold text-slate-900">{apt.obraSocial}</div>
                          {apt.numeroAfiliado && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              N° {apt.numeroAfiliado}
                            </div>
                          )}
                        </td>

                        {/* Honorarios / Medio de Pago */}
                        <td className="p-2 border-r border-slate-300 text-right whitespace-nowrap font-bold text-slate-900">
                          {/* Amount */}
                          <div className="text-sm font-black text-slate-900">
                            {formatCurrency(currentInfo.fee)}
                          </div>

                          {/* Interactive input in modal (hidden when printing) */}
                          <div className="print:hidden mt-1 flex flex-col items-end gap-1">
                            <input
                              type="text"
                              placeholder="Escribir medio de pago..."
                              value={currentInfo.method}
                              onChange={(e) => handleMethodChange(apt.id, e.target.value)}
                              className="w-36 text-[11px] px-2 py-0.5 border border-slate-300 rounded font-normal text-right focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                            />
                            <div className="flex gap-1 text-[9px] text-slate-400">
                              <button
                                type="button"
                                onClick={() => handleMethodChange(apt.id, 'Efectivo')}
                                className="hover:text-teal-700 hover:underline"
                              >
                                Efectivo
                              </button>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => handleMethodChange(apt.id, 'Transferencia')}
                                className="hover:text-teal-700 hover:underline"
                              >
                                Transf.
                              </button>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => handleMethodChange(apt.id, 'Débito / Posnet')}
                                className="hover:text-teal-700 hover:underline"
                              >
                                Débito
                              </button>
                            </div>
                          </div>

                          {/* Plain text display when printed (no 'a definir' or 'pendiente') */}
                          {currentInfo.method.trim() ? (
                            <div className="hidden print:block text-[10px] font-semibold text-slate-700 uppercase mt-0.5">
                              {currentInfo.method.trim()}
                            </div>
                          ) : null}
                        </td>

                        {/* Observaciones */}
                        <td className="p-2 text-slate-600 text-[11px] max-w-xs">
                          {apt.observaciones || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table ends */}
        </div>

        {/* Modal Bottom Actions (Hidden in print) */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between print:hidden shrink-0">
          <span className="text-xs text-slate-500">
            Consejo: En el cuadro de diálogo de impresión, puedes elegir "Guardar como PDF".
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

