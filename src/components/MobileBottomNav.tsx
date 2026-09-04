import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  MessageCircle,
  Plus,
  MoreHorizontal,
  Database,
  X
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'agenda' | 'finanzas' | 'pacientes' | 'recordatorios' | 'backups';
  onTabChange: (tab: 'agenda' | 'finanzas' | 'pacientes' | 'recordatorios' | 'backups') => void;
  onOpenNewAppointment: () => void;
  pendingRemindersCount: number;
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenNewAppointment,
  pendingRemindersCount
}: MobileBottomNavProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Close on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreMenuOpen]);

  const handleSelectTab = (tab: 'agenda' | 'finanzas' | 'pacientes' | 'recordatorios' | 'backups') => {
    onTabChange(tab);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* "More" Sheet Overlay for mobile */}
      {isMoreMenuOpen && (
        <div
          id="more-options-overlay"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200 flex flex-col justify-end p-4 pb-24 cursor-pointer"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-5 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Más Secciones & Opciones
              </span>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectTab('backups')}
                className={`p-3.5 rounded-2xl flex items-center gap-3 text-sm font-bold transition-all border cursor-pointer ${
                  activeTab === 'backups'
                    ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold shadow-md'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Database className="w-5 h-5 text-teal-400 shrink-0" />
                <div className="text-left">
                  <div className="font-bold">Respaldos y Copias de Seguridad</div>
                  <div className="text-[11px] text-slate-400 font-normal">Exportar e importar mediante hoja de cálculo</div>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(false)}
              className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-white bg-slate-800/60 rounded-xl cursor-pointer"
            >
              Cerrar Menú
            </button>
          </div>
        </div>
      )}

      {/* Main Fixed Bottom Navigation Bar (Visible only on mobile / small screens) */}
      <nav
        id="mobile-bottom-navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 md:hidden px-2 py-1.5 shadow-2xl flex items-center justify-around"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Agenda */}
        <button
          onClick={() => handleSelectTab('agenda')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition-all ${
            activeTab === 'agenda'
              ? 'text-teal-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Agenda</span>
          {activeTab === 'agenda' && (
            <span className="w-1 h-1 bg-teal-400 rounded-full mt-0.5" />
          )}
        </button>

        {/* Pacientes */}
        <button
          onClick={() => handleSelectTab('pacientes')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition-all ${
            activeTab === 'pacientes'
              ? 'text-teal-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Pacientes</span>
          {activeTab === 'pacientes' && (
            <span className="w-1 h-1 bg-teal-400 rounded-full mt-0.5" />
          )}
        </button>

        {/* Central "+ Turno" Hero Floating Action Button */}
        <div className="relative -top-3 flex flex-col items-center">
          <button
            id="btn-mobile-fab-new-appointment"
            onClick={onOpenNewAppointment}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/40 border-2 border-slate-900 active:scale-95 transition-transform"
            title="Nuevo Turno"
            aria-label="Nuevo Turno"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-teal-300 mt-0.5">Turno</span>
        </div>

        {/* Finanzas */}
        <button
          onClick={() => handleSelectTab('finanzas')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition-all ${
            activeTab === 'finanzas'
              ? 'text-teal-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Finanzas</span>
          {activeTab === 'finanzas' && (
            <span className="w-1 h-1 bg-teal-400 rounded-full mt-0.5" />
          )}
        </button>

        {/* WhatsApp & Recordatorios */}
        <button
          onClick={() => handleSelectTab('recordatorios')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition-all relative ${
            activeTab === 'recordatorios'
              ? 'text-teal-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 mb-0.5" />
            {pendingRemindersCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center">
                {pendingRemindersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">WhatsApp</span>
          {activeTab === 'recordatorios' && (
            <span className="w-1 h-1 bg-teal-400 rounded-full mt-0.5" />
          )}
        </button>

        {/* Más */}
        <button
          onClick={() => setIsMoreMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 px-1 rounded-xl transition-all ${
            activeTab === 'backups' || isMoreMenuOpen
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Más</span>
        </button>
      </nav>
    </>
  );
}
