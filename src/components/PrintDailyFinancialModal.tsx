import React from 'react';
import {
  Printer,
  X,
  Download,
  DollarSign,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { Appointment, DailySummary, Patient } from '../types';
import { formatDatePretty } from '../utils/storage';
import { formatCurrency } from '../data/treatments';
import { executePrintDocument } from '../utils/printHelper';
import EsteticaLaserLogo from './EsteticaLaserLogo';

interface PrintDailyFinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  appointments: Appointment[];
  summary: DailySummary;
  patients: Patient[];
}

export default function PrintDailyFinancialModal({
  isOpen,
  onClose,
  date,
  appointments,
  summary,
  patients
}: PrintDailyFinancialModalProps) {
  if (!isOpen) return null;

  const dayAppointments = appointments
    .filter((a) => a.fecha === date)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const totalTurnos = dayAppointments.filter((a) => !a.esBloqueo && a.tratamientoId !== 'no_dar').length;
  const turnosCobrados = dayAppointments.filter(
    (a) => a.estadoPago === 'pagado' && !a.esBloqueo && a.tratamientoId !== 'no_dar'
  ).length;

  const totalEfectivo = summary.porMetodoPago?.efectivo || 0;
  const totalTransferencia = summary.porMetodoPago?.transferencia || 0;
  const totalTarjeta = (summary.porMetodoPago?.debito || 0) + (summary.porMetodoPago?.credito || 0);

  const handlePrint = () => {
    // Generate and execute print document
    const htmlContent = document.getElementById('printable-financial-content')?.innerHTML || '';
    executePrintDocument(htmlContent, `Cierre_Caja_${date}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Imprimir Balance Diario & Cierre de Caja</h2>
              <p className="text-xs text-slate-400">
                Vista previa oficial en formato A4 para imprimir o guardar en PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-financial"
              className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Preview Area */}
        <div className="p-6 sm:p-8 overflow-y-auto bg-slate-100/70">
          <div
            id="printable-financial-content"
            className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 max-w-4xl mx-auto text-slate-900"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col items-start gap-2">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs inline-block">
                  <EsteticaLaserLogo size="lg" theme="light" />
                </div>
                <p className="text-xs text-teal-800 font-semibold tracking-wide">
                  San Lorenzo 1333, Rosario • Tel: 341 555-4321
                </p>
              </div>

              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                <span className="inline-block bg-teal-100 text-teal-900 border border-teal-300 text-xs font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                  BALANCE & CIERRE DE CAJA
                </span>
                <div className="text-lg font-black text-slate-900 mt-1 capitalize">
                  {formatDatePretty(date)}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Emitido: {new Date().toLocaleDateString('es-AR')} • {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                </div>
              </div>
            </div>

            {/* Financial KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cobrado Total</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-950 mt-1 font-mono">
                  {formatCurrency(summary.totalHonorariosPercibidos)}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Efectivo</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
                  {formatCurrency(totalEfectivo)}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span>Transferencia</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
                  {formatCurrency(totalTransferencia + totalTarjeta)}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Turnos Cobrados</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
                  {turnosCobrados} / {totalTurnos}
                </div>
              </div>
            </div>

            {/* Table of Appointments & Fees */}
            <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase font-black tracking-wider text-[10px] border-b border-slate-300">
                    <th className="p-2.5 w-24 text-center">Horario</th>
                    <th className="p-2.5">Paciente</th>
                    <th className="p-2.5 w-24">DNI</th>
                    <th className="p-2.5">Tratamiento</th>
                    <th className="p-2.5 w-28">Cobertura</th>
                    <th className="p-2.5 w-28 text-right">Honorarios</th>
                    <th className="p-2.5 w-28 text-center">Estado Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dayAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 font-medium">
                        No se registraron turnos para esta fecha ({date}).
                      </td>
                    </tr>
                  ) : (
                    dayAppointments.map((apt) => {
                      const isBlocked = apt.esBloqueo || apt.tratamientoId === 'no_dar';
                      if (isBlocked) {
                        return (
                          <tr key={apt.id} className="bg-rose-50/50 text-rose-900">
                            <td className="p-2.5 text-center font-mono font-bold">
                              {apt.horaInicio} - {apt.horaFin}
                            </td>
                            <td colSpan={3} className="p-2.5 font-bold">
                              ⛔ BLOQUEO DE AGENDA ({apt.observaciones || 'No disponible'})
                            </td>
                            <td className="p-2.5 text-center">-</td>
                            <td className="p-2.5 text-right">-</td>
                            <td className="p-2.5 text-center font-bold">No Aplica</td>
                          </tr>
                        );
                      }

                      const patient = patients.find((p) => p.id === apt.pacienteId);
                      const cobertura = apt.obraSocial || patient?.obraSocial || 'Particular';
                      const isPaid = apt.estadoPago === 'pagado';
                      const metodoPagoText =
                        apt.metodoPago === 'efectivo'
                          ? 'Efectivo'
                          : apt.metodoPago === 'transferencia'
                          ? 'Transferencia'
                          : apt.metodoPago === 'debito'
                          ? 'Débito'
                          : apt.metodoPago === 'credito'
                          ? 'Crédito'
                          : apt.metodoPago || '-';

                      return (
                        <tr key={apt.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                            {apt.horaInicio} - {apt.horaFin}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {apt.pacienteNombre}
                            <div className="text-[10px] font-normal text-slate-500">
                              Tel: {apt.pacienteTelefono}
                            </div>
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">
                            {apt.pacienteDni || patient?.dni || '-'}
                          </td>
                          <td className="p-2.5 text-slate-800 font-medium">
                            {apt.tratamientoNombre}
                          </td>
                          <td className="p-2.5 text-slate-700">
                            {cobertura}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(Number(apt.honorarios) || 0)}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isPaid ? '✓ Pagado' : 'Pendiente'}
                            </span>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              ({metodoPagoText})
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={5} className="p-3 text-right text-xs uppercase">
                      Total Honorarios Percibidos (Cobrado):
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-emerald-700">
                      {formatCurrency(summary.totalHonorariosPercibidos)}
                    </td>
                    <td className="p-3 text-center text-xs text-slate-600">
                      {turnosCobrados} de {totalTurnos}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Document Signature & Footer */}
            <div className="pt-6 border-t border-slate-300 flex items-end justify-between text-xs text-slate-600">
              <div>
                <strong className="text-slate-800">Clínica Estética Láser Rosario</strong>
                <p className="text-[11px] text-slate-500">
                  Planilla Oficial de Cierre y Rendición de Caja Diaria
                </p>
              </div>
              <div className="w-52 text-center">
                <div className="border-t border-dashed border-slate-500 pt-1 font-bold text-slate-800">
                  Firma Responsable
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
