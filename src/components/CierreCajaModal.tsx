import { useState } from 'react';
import { X, MessageCircle, Download, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import { DailySummary } from '../types';
import { formatDatePretty } from '../utils/storage';
import { formatCurrency } from '../data/treatments';
import { generateCierreCajaImage, buildCierreCajaWhatsappText } from '../utils/cierreCajaImage';
import { triggerFileDownload } from '../utils/export';

interface CierreCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  summary: DailySummary;
}

export default function CierreCajaModal({ isOpen, onClose, date, summary }: CierreCajaModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleShareWhatsapp = () => {
    const text = buildCierreCajaWhatsappText(date, summary);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateCierreCajaImage(date, summary);
      triggerFileDownload(blob, `CierreDeCaja_${date}.png`);
    } catch (err) {
      // Ignore — el botón simplemente no descarga nada si el canvas falla.
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold text-base">Caja Cerrada</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {formatDatePretty(date)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Total honorarios cobrados hoy</p>
            <div className="text-4xl font-black text-emerald-700 pt-1">
              {formatCurrency(summary.totalHonorariosPercibidos)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="text-lg font-black text-slate-900">{summary.turnosAtendidos}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Atendidos</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="text-lg font-black text-slate-900">{summary.turnosConfirmados}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Confirmados</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="text-lg font-black text-slate-900">{summary.turnosCancelados}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Cancelados</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold px-3 py-2.5 rounded-xl flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Los estados de turno y de pago de este día quedaron bloqueados.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={handleShareWhatsapp}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Compartir por WhatsApp</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Generando...' : 'Descargar'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 pt-1"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
