import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  CreditCard,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { Appointment, Patient, DailySummary, PaymentMethod } from '../types';
import { formatDatePretty, computeDailySummary } from '../utils/storage';
import { formatCurrency } from '../data/treatments';
import { generateDailyExcelWorkbook, generateAppointmentsCSV, triggerFileDownload } from '../utils/export';
import { printDailyFinancialReport } from '../utils/printHelper';
import PrintDailyFinancialModal from './PrintDailyFinancialModal';
import confetti from 'canvas-confetti';

interface DailyFinancialSummaryProps {
  currentDate: string;
  appointments: Appointment[];
  patients: Patient[];
  onUpdatePayment: (id: string, estadoPago: any, metodoPago?: PaymentMethod) => void;
}

export default function DailyFinancialSummary({
  currentDate,
  appointments,
  patients,
  onUpdatePayment
}: DailyFinancialSummaryProps) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [cierreMessage, setCierreMessage] = useState<string | null>(null);

  const summary = computeDailySummary(appointments, currentDate);
  const dayAppointments = appointments
    .filter((a) => a.fecha === currentDate)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const handleExportExcel = () => {
    const excelBlob = generateDailyExcelWorkbook(currentDate, appointments, patients, summary);
    triggerFileDownload(excelBlob, `CierreDiario_Honorarios_${currentDate}.xlsx`);
  };

  const handleExportCsv = () => {
    const csvContent = generateAppointmentsCSV(currentDate, appointments);
    triggerFileDownload(csvContent, `Turnos_Honorarios_${currentDate}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleCierreCaja = () => {
    setCierreMessage('✓ Caja Cerrada correctamente.');
    setTimeout(() => setCierreMessage(null), 4000);
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {
      // Ignore
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Balance Diario de Honorarios & Cierre de Caja
              </h2>
              <p className="text-xs text-slate-500">
                Suma total acumulada de honorarios percibidos el {formatDatePretty(currentDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Descargar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>Descargar CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={handleCierreCaja}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Realizar Cierre de Caja</span>
          </button>
        </div>
      </div>

      {cierreMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{cierreMessage}</span>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Percibido (Actual Collected Revenue) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-100">
            <span className="text-xs font-bold uppercase tracking-wider">
              Honorarios Percibidos (Cobrado)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight pt-1">
            {formatCurrency(summary.totalHonorariosPercibidos)}
          </div>
          <p className="text-[11px] text-emerald-100 font-medium">
            Monto total efectivamente cobrado hoy
          </p>
        </div>

        {/* Total Esperado / Proyectado */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              Honorarios Proyectados
            </span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 pt-1">
            {formatCurrency(summary.totalHonorariosEsperados)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Total de todos los turnos del día agendados
          </p>
        </div>

        {/* Pendiente de Cobro */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              Pendiente de Cobro
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 pt-1">
            {formatCurrency(
              Math.max(0, summary.totalHonorariosEsperados - summary.totalHonorariosPercibidos)
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Turnos pendientes de abonar o liquidar
          </p>
        </div>

        {/* Pacientes / Turnos Atendidos */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              Turnos Atendidos
            </span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 pt-1">
            {summary.turnosAtendidos}{' '}
            <span className="text-sm font-normal text-slate-400">/ {summary.turnosTotales} turnos</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span>Confirmados: {summary.turnosConfirmados}</span>
            <span>• Cancelados: {summary.turnosCancelados}</span>
          </div>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Desglose por Medio de Cobro
            </h3>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-700">💵 Efectivo</span>
              <span className="text-xs font-bold text-slate-900">
                {formatCurrency(summary.porMetodoPago.efectivo || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-700">📱 Transferencia Bancaria</span>
              <span className="text-xs font-bold text-slate-900">
                {formatCurrency(summary.porMetodoPago.transferencia || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-700">💳 Tarjeta de Débito</span>
              <span className="text-xs font-bold text-slate-900">
                {formatCurrency(summary.porMetodoPago.debito || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-700">💳 Tarjeta de Crédito</span>
              <span className="text-xs font-bold text-slate-900">
                {formatCurrency(summary.porMetodoPago.credito || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-700">🏥 Obra Social Directo</span>
              <span className="text-xs font-bold text-slate-900">
                {formatCurrency(summary.porMetodoPago.obra_social_directo || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
              <span className="text-xs font-medium text-amber-900">⏳ Pendiente de cobro</span>
              <span className="text-xs font-bold text-amber-900">
                {formatCurrency(summary.porMetodoPago.pendiente || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Treatments Breakdown (The exact 7 treatments) */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Honorarios por Tratamiento
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(summary.porTratamiento).map(([tratamiento, data]) => {
              if (data.cantidad === 0) return null;
              return (
                <div
                  key={tratamiento}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{tratamiento}</div>
                    <div className="text-[11px] text-slate-500">{data.cantidad} {data.cantidad === 1 ? 'sesión' : 'sesiones'}</div>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {formatCurrency(data.total)}
                  </div>
                </div>
              );
            })}
            {Object.values(summary.porTratamiento).every((d) => d.cantidad === 0) && (
              <p className="text-xs text-slate-400 text-center py-4">
                No hay tratamientos registrados para hoy
              </p>
            )}
          </div>
        </div>

        {/* 3. Insurance Coverage Breakdown */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Honorarios por Cobertura Médica
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(summary.porObraSocial).map(([obraSocial, data]) => {
              if (data.cantidad === 0) return null;
              return (
                <div
                  key={obraSocial}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{obraSocial}</div>
                    <div className="text-[11px] text-slate-500">{data.cantidad} {data.cantidad === 1 ? 'paciente' : 'pacientes'}</div>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {formatCurrency(data.total)}
                  </div>
                </div>
              );
            })}
            {Object.values(summary.porObraSocial).every((d) => d.cantidad === 0) && (
              <p className="text-xs text-slate-400 text-center py-4">
                No hay datos de obras sociales hoy
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Appointments Table for the day */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Detalle de Turnos y Honorarios del Día ({dayAppointments.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Total Recaudado: <strong className="text-emerald-700">{formatCurrency(summary.totalHonorariosPercibidos)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Horario</th>
                <th className="py-2.5 px-4">Paciente / DNI</th>
                <th className="py-2.5 px-4">Tratamiento</th>
                <th className="py-2.5 px-4">Cobertura / Obra Social</th>
                <th className="py-2.5 px-4 text-right">Honorarios</th>
                <th className="py-2.5 px-4 text-center">Estado Turno</th>
                <th className="py-2.5 px-4 text-center">Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dayAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No hay turnos registrados en esta fecha.
                  </td>
                </tr>
              ) : (
                dayAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {apt.horaInicio} - {apt.horaFin} hs
                      <div className="text-[10px] font-normal text-slate-400">({apt.duracionMinutos} min)</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{apt.pacienteNombre}</div>
                      <div className="text-[11px] text-slate-500">DNI: {apt.pacienteDni}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {apt.tratamientoNombre}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-medium text-[11px] border border-slate-200">
                        {apt.obraSocial}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(apt.honorarios)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          apt.estado === 'atendido'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : apt.estado === 'cancelado'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {apt.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          const nextStatus = apt.estadoPago === 'pagado' ? 'pendiente' : 'pagado';
                          onUpdatePayment(apt.id, nextStatus, nextStatus === 'pagado' ? 'efectivo' : 'pendiente');
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          apt.estadoPago === 'pagado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {apt.estadoPago === 'pagado'
                          ? `✓ Pagado (${apt.metodoPago || 'efectivo'})`
                          : 'Pendiente ($)'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print & PDF Modal */}
      <PrintDailyFinancialModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        date={currentDate}
        appointments={appointments}
        summary={summary}
        patients={patients}
      />
    </div>
  );
}
