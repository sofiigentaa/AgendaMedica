import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  MessageCircle,
  Database,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import EsteticaLaserLogo from './EsteticaLaserLogo';
import { getNextWorkingDay, getPrevWorkingDay, getTodayDateString } from '../utils/storage';

interface NavbarProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  activeTab: 'agenda' | 'finanzas' | 'pacientes' | 'recordatorios' | 'backups';
  onTabChange: (tab: 'agenda' | 'finanzas' | 'pacientes' | 'recordatorios' | 'backups') => void;
  onOpenNewAppointment: () => void;
  onOpenNewPatient: () => void;
  onDownloadCsv: () => void;
  onQuickBackup?: () => void;
  onOpenImportExcel?: () => void;
  pendingRemindersCount: number;
}

export default function Navbar({
  currentDate,
  onDateChange,
  activeTab,
  onTabChange,
  onOpenNewAppointment,
  onOpenNewPatient,
  onDownloadCsv,
  onOpenImportExcel,
  pendingRemindersCount
}: NavbarProps) {
  const [timeString, setTimeString] = useState('');
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--nav-height', `${height}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    const observer = new ResizeObserver(updateHeight);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handlePrevDay = () => {
    const prevWorkingDay = getPrevWorkingDay(currentDate);
    onDateChange(prevWorkingDay);
  };

  const handleNextDay = () => {
    const nextWorkingDay = getNextWorkingDay(currentDate);
    onDateChange(nextWorkingDay);
  };

  const handleToday = () => {
    // Siempre va a la fecha real de hoy, sea o no día de atención.
    // El cartel de "no hay atención" se muestra en la vista del día.
    onDateChange(getTodayDateString());
  };

  return (
    <header ref={headerRef} className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top bar: Branding, Date Picker & Quick Actions */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
        {/* Brand & Clinic Info with official Logo on white background, Agenda de Turnos below */}
        <div className="flex items-center justify-between w-full md:w-auto md:min-w-[220px]">
          <div className="flex flex-col items-start gap-0.5">
            <div className="bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl shadow-sm border border-slate-200 inline-flex items-center">
              <EsteticaLaserLogo size="md" theme="light" />
            </div>
            <span className="text-[10px] sm:text-xs font-extrabold text-teal-300 tracking-wider uppercase pl-1">
              Agenda Médica Rosario
            </span>
          </div>

          {/* Quick mobile action */}
          <div className="flex md:hidden items-center gap-2">
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-300 font-mono flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3 text-teal-400" />
                <span>{timeString}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Selector in center - Truly centered and touch friendly (min 44px tap targets on mobile) */}
        <div className="w-full md:w-auto flex-1 flex items-center justify-center">
          <div className="flex items-center justify-between sm:justify-center w-full sm:w-auto gap-1 sm:gap-1.5 bg-slate-800/95 border border-slate-700 p-1 rounded-2xl shadow-xs">
            <button
              id="btn-prev-day"
              onClick={handlePrevDay}
              className="p-2 sm:p-1.5 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-slate-200 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Día anterior"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            <input
              id="input-current-date"
              type="date"
              value={currentDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs sm:text-xs font-bold px-3 py-2 sm:py-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer font-mono text-center flex-1 sm:flex-initial"
            />

            <button
              id="btn-next-day"
              onClick={handleNextDay}
              className="p-2 sm:p-1.5 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-slate-200 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Día siguiente"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            <button
              id="btn-today"
              onClick={handleToday}
              className="px-3 py-2 sm:py-1 text-xs font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl transition-colors min-h-[40px] flex items-center justify-center"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Right side: Import Excel button & Current time / Status on desktop */}
        <div className="hidden md:flex items-center justify-end gap-3 md:min-w-[220px]">
          {onOpenImportExcel && (
            <button
              id="btn-navbar-import-excel"
              onClick={onOpenImportExcel}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 hover:border-teal-500/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
              title="Importar padrón de pacientes desde Excel o CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              <span>Importar Hoja Google Sheet</span>
            </button>
          )}

          <div className="text-right pl-1 border-l border-slate-800">
            <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5 justify-end">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{timeString} hs</span>
            </div>
            <div className="text-[10px] text-teal-300/80 font-medium">
              Consultorios Médicos
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs on desktop */}
      <div className="hidden md:block max-w-7xl mx-auto px-2 sm:px-6 border-t border-slate-800/80 overflow-x-auto">
        <nav className="flex items-center justify-start gap-1 sm:gap-2 py-1.5 text-xs sm:text-sm">
          <button
            id="tab-agenda"
            onClick={() => onTabChange('agenda')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'agenda'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Agenda de Turnos</span>
          </button>

          <button
            id="tab-finanzas"
            onClick={() => onTabChange('finanzas')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'finanzas'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>Cierre Diario & Honorarios</span>
          </button>

          <button
            id="tab-pacientes"
            onClick={() => onTabChange('pacientes')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'pacientes'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Padrón de Pacientes</span>
          </button>

          <button
            id="tab-recordatorios"
            onClick={() => onTabChange('recordatorios')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all relative ${
              activeTab === 'recordatorios'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Recordatorios WhatsApp</span>
            {pendingRemindersCount > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {pendingRemindersCount}
              </span>
            )}
          </button>

          <button
            id="tab-backups"
            onClick={() => onTabChange('backups')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'backups'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Respaldos & Exportación</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
