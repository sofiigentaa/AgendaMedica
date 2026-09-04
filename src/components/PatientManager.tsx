import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Shield,
  Edit2,
  Trash2,
  MessageCircle,
  FileText,
  CalendarPlus,
  FileSpreadsheet,
  Upload,
  ArrowDownAZ,
  Undo2
} from 'lucide-react';
import { Patient, Appointment } from '../types';
import ConfirmModal from './ConfirmModal';

interface PatientManagerProps {
  patients: Patient[];
  appointments: Appointment[];
  onOpenNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (id: string) => void;
  onBookAppointmentForPatient: (patient: Patient) => void;
  onOpenImportExcel: () => void;
  lastImportBatch?: { ids: string[]; count: number; dismissed?: boolean } | null;
  onUndoLastImport?: () => void;
  onDismissImportBanner?: () => void;
}

export function calculateAge(birthDateString: string): number | null {
  if (!birthDateString) return null;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) ? null : age;
}

export default function PatientManager({
  patients,
  appointments,
  onOpenNewPatient,
  onEditPatient,
  onDeletePatient,
  onBookAppointmentForPatient,
  onOpenImportExcel,
  lastImportBatch = null,
  onUndoLastImport,
  onDismissImportBanner
}: PatientManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  const distinctInsurances = useMemo(() => {
    const set = new Set<string>();
    set.add('La Segunda');
    set.add('Swiss Medical');
    set.add('OSDE');
    set.add('IAPOS');
    patients.forEach((p) => {
      if (p.obraSocial && !p.obraSocial.toLowerCase().includes('particular') && !p.obraSocial.toLowerCase().includes('sin cobertura')) {
        set.add(p.obraSocial);
      }
    });
    return Array.from(set).sort();
  }, [patients]);

  const filteredPatients = patients
    .filter((p) => {
      const matchesSearch =
        `${p.nombre} ${p.apellido} ${p.dni} ${p.telefono} ${p.email} ${p.obraSocial}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesInsurance =
        insuranceFilter === 'all' ||
        (insuranceFilter === 'particular'
          ? p.coberturaTipo === 'particular' || p.obraSocial.toLowerCase().includes('particular')
          : p.obraSocial.toLowerCase().includes(insuranceFilter.toLowerCase()));

      return matchesSearch && matchesInsurance;
    })
    .sort((a, b) => {
      if (!sortAlphabetically) return 0;
      return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es', { sensitivity: 'base' });
    });

  return (
    <div className="space-y-5">
      {/* Undo last import banner */}
      {lastImportBatch && lastImportBatch.count > 0 && !lastImportBatch.dismissed && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-amber-900">
            <span className="font-bold">
              Se importaron {lastImportBatch.count} paciente{lastImportBatch.count === 1 ? '' : 's'} recién.
            </span>{' '}
            ¿Subiste la hoja equivocada o hubo un error? Podés deshacerlo.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onUndoLastImport) onUndoLastImport();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Deshacer Importación</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onDismissImportBanner) onDismissImportBanner();
              }}
              className="text-xs font-semibold text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Mantener
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Padrón General de Pacientes ({patients.length})
              </h2>
              <p className="text-xs text-slate-500">
                Registro de DNI, coberturas médicas en Rosario (Swiss Medical, La Segunda, etc.) y contactos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="btn-import-excel-patients"
            onClick={onOpenImportExcel}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-all"
            title="Importar pacientes desde un archivo Excel o CSV de otra agenda"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Importar Hoja Google Sheet</span>
          </button>

          <button
            id="btn-add-patient-main"
            onClick={onOpenNewPatient}
            className="bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Paciente</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por DNI, Nombre, Apellido, Teléfono o Cobertura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSortAlphabetically((prev) => !prev)}
            className={`text-xs font-bold px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-colors shrink-0 ${
              sortAlphabetically
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Ordenar la lista alfabéticamente por apellido"
          >
            <ArrowDownAZ className="w-3.5 h-3.5" />
            <span>Orden A-Z</span>
          </button>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 w-full sm:w-auto">
            <select
              value={insuranceFilter}
              onChange={(e) => setInsuranceFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer w-full"
            >
              <option value="all">Todas las Coberturas</option>
              <option value="particular">Particular</option>
              {distinctInsurances.map((insName) => (
                <option key={insName} value={insName}>
                  {insName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No se encontraron pacientes con ese criterio
          </h3>
          <button
            onClick={onOpenNewPatient}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nuevo Paciente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => {
            const age = calculateAge(patient.fechaNacimiento);
            const patientAppts = appointments.filter((a) => a.pacienteId === patient.id);
            const cleanPhone = patient.telefono.replace(/\D/g, '');

            return (
              <div
                key={patient.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Name and DNI */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {patient.apellido}, {patient.nombre}
                      </h3>
                      <div className="text-xs text-slate-500 font-medium">
                        DNI: <strong className="text-slate-800">{patient.dni}</strong>
                        {age !== null && (
                          <span className="ml-2 text-[11px] text-slate-400">({age} años)</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        patient.coberturaTipo === 'particular'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      {patient.coberturaTipo === 'particular' ? 'Particular' : 'Obra Social'}
                    </span>
                  </div>

                  {/* Insurance */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Shield className="w-3.5 h-3.5 text-teal-600" />
                      {patient.coberturaTipo === 'particular' ? 'Particular' : patient.obraSocial}
                    </span>
                    {patient.numeroAfiliado && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {patient.numeroAfiliado}
                      </span>
                    )}
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {patient.telefono}
                      </span>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Chat
                        </a>
                      )}
                    </div>

                    {patient.email && (
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Nacimiento:{' '}
                        {patient.fechaNacimiento || (
                          <em className="not-italic text-slate-400">Sin fecha de nacimiento cargada</em>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Medical notes preview */}
                  {patient.notasMedicas && (
                    <div className="bg-amber-50/50 border border-amber-100 p-2 rounded-xl text-[11px] text-amber-900 line-clamp-2">
                      <FileText className="w-3 h-3 inline mr-1 text-amber-600" />
                      {patient.notasMedicas}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 pt-1">
                    Historial: <strong>{patientAppts.length}</strong> turnos registrados
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onBookAppointmentForPatient(patient)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Dar Turno</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditPatient(patient)}
                      title="Editar paciente"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatientToDelete(patient)}
                      title="Eliminar paciente"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Patient Confirm Modal */}
      <ConfirmModal
        isOpen={!!patientToDelete}
        title="Eliminar Paciente"
        message={`¿Estás seguro de que deseas eliminar a ${patientToDelete?.nombre} ${patientToDelete?.apellido}?`}
        subMessage={
          patientToDelete
            ? `DNI: ${patientToDelete.dni} • Obra Social: ${patientToDelete.obraSocial || 'Particular'}`
            : undefined
        }
        confirmText="Eliminar Paciente"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (patientToDelete) {
            onDeletePatient(patientToDelete.id);
            setPatientToDelete(null);
          }
        }}
        onCancel={() => setPatientToDelete(null)}
      />
    </div>
  );
}
