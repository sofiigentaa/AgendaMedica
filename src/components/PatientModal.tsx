import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, Shield, FileText, Check } from 'lucide-react';
import { Patient } from '../types';
import { INSURANCE_SUGGESTIONS } from '../data/treatments';
import { normalizeDateString } from '../utils/excelImport';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  patientToEdit?: Patient | null;
  // All existing patients, used to validate DNI uniqueness (BUG-07).
  patients?: Patient[];
}

// Characters we don't allow in Nombre / Apellido. A comma is the most common
// mistake (pasting "Apellido, Nombre" into a single field), but any other
// digit/symbol is also invalid for a person's name (BUG-06).
const INVALID_NAME_CHARS_REGEX = /[,;0-9]/;

export default function PatientModal({
  isOpen,
  onClose,
  onSave,
  patientToEdit,
  patients = []
}: PatientModalProps) {
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [coberturaPreset, setCoberturaPreset] = useState<'particular' | 'la_segunda' | 'otra'>('particular');
  const [obraSocial, setObraSocial] = useState('Particular');
  const [numeroAfiliado, setNumeroAfiliado] = useState('');
  const [notasMedicas, setNotasMedicas] = useState('');
  const [formError, setFormError] = useState('');

  // Today's date (YYYY-MM-DD) — used to block future birth dates (BUG-02).
  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  useEffect(() => {
    if (patientToEdit) {
      setDni(patientToEdit.dni);
      setNombre(patientToEdit.nombre);
      setApellido(patientToEdit.apellido);
      setEmail(patientToEdit.email);
      setTelefono(patientToEdit.telefono);
      setFechaNacimiento(normalizeDateString(patientToEdit.fechaNacimiento) || patientToEdit.fechaNacimiento);
      
      const currentIns = patientToEdit.obraSocial || 'Particular';
      setObraSocial(currentIns);
      if (currentIns.toLowerCase().includes('particular') || currentIns.toLowerCase().includes('sin cobertura')) {
        setCoberturaPreset('particular');
      } else if (currentIns.toLowerCase().includes('segunda')) {
        setCoberturaPreset('la_segunda');
      } else {
        setCoberturaPreset('otra');
      }

      setNumeroAfiliado(patientToEdit.numeroAfiliado || '');
      setNotasMedicas(patientToEdit.notasMedicas || '');
    } else {
      setDni('');
      setNombre('');
      setApellido('');
      setEmail('');
      // BUG-01: el campo de teléfono ya no trae un prefijo precargado.
      setTelefono('');
      // BUG-02: sin fecha de nacimiento precargada; el usuario debe elegirla.
      setFechaNacimiento('');
      setCoberturaPreset('particular');
      setObraSocial('Particular');
      setNumeroAfiliado('');
      setNotasMedicas('');
    }
    setFormError('');
  }, [patientToEdit, isOpen]);

  const handleSelectPreset = (preset: 'particular' | 'la_segunda' | 'otra') => {
    setCoberturaPreset(preset);
    if (preset === 'particular') {
      setObraSocial('Particular');
    } else if (preset === 'la_segunda') {
      setObraSocial('La Segunda');
    } else {
      if (obraSocial === 'Particular' || obraSocial === 'La Segunda' || !obraSocial) {
        setObraSocial('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!dni || !nombre || !apellido || !telefono) {
      setFormError('Por favor complete los campos obligatorios: DNI, Nombre, Apellido y Teléfono.');
      return;
    }

    // BUG-06: nombre/apellido no pueden contener comas, números u otros
    // caracteres inválidos. Mensaje específico en vez de uno genérico.
    if (INVALID_NAME_CHARS_REGEX.test(nombre)) {
      setFormError('El campo "Nombre" no puede contener comas, números ni símbolos.');
      return;
    }
    if (INVALID_NAME_CHARS_REGEX.test(apellido)) {
      setFormError('El campo "Apellido" no puede contener comas, números ni símbolos.');
      return;
    }

    // BUG-02: la fecha de nacimiento no puede ser posterior a hoy.
    if (fechaNacimiento && fechaNacimiento > todayStr) {
      setFormError('La fecha de nacimiento no puede ser posterior a la fecha actual.');
      return;
    }

    // BUG-07: no permitir dos pacientes con el mismo DNI (comparando solo
    // dígitos, para que "34.892.120" y "34892120" cuenten como el mismo DNI).
    const normalizedDni = dni.replace(/\D/g, '');
    const dniAlreadyUsed = patients.some(
      (p) => p.id !== (patientToEdit ? patientToEdit.id : null) && p.dni.replace(/\D/g, '') === normalizedDni
    );
    if (normalizedDni && dniAlreadyUsed) {
      setFormError(`Ya existe un paciente registrado con el DNI ${dni}. Verificá el padrón antes de continuar.`);
      return;
    }

    // BUG-03: si estamos editando y ningún dato cambió realmente, no
    // disparamos onSave (evita tocar updatedAt / re-guardar sin motivo).
    if (patientToEdit) {
      const finalObraSocialCheck =
        coberturaPreset === 'particular'
          ? 'Particular'
          : coberturaPreset === 'la_segunda'
          ? 'La Segunda'
          : obraSocial.trim() || 'Particular';

      const noChanges =
        dni.trim() === patientToEdit.dni &&
        nombre.trim() === patientToEdit.nombre &&
        apellido.trim() === patientToEdit.apellido &&
        email.trim() === (patientToEdit.email || '') &&
        telefono.trim() === patientToEdit.telefono &&
        fechaNacimiento === patientToEdit.fechaNacimiento &&
        finalObraSocialCheck === patientToEdit.obraSocial &&
        numeroAfiliado.trim() === (patientToEdit.numeroAfiliado || '') &&
        notasMedicas.trim() === (patientToEdit.notasMedicas || '');

      if (noChanges) {
        onClose();
        return;
      }
    }

    const finalObraSocial =
      coberturaPreset === 'particular'
        ? 'Particular'
        : coberturaPreset === 'la_segunda'
        ? 'La Segunda'
        : obraSocial.trim() || 'Particular';

    const patientData: Patient = {
      id: patientToEdit ? patientToEdit.id : `pat-${Date.now()}`,
      dni: dni.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      fechaNacimiento,
      coberturaTipo: finalObraSocial === 'Particular' ? 'particular' : 'obra_social',
      obraSocial: finalObraSocial,
      numeroAfiliado: numeroAfiliado.trim(),
      notasMedicas: notasMedicas.trim(),
      createdAt: patientToEdit ? patientToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(patientData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {patientToEdit ? 'Editar Paciente' : 'Registrar Nuevo Paciente'}
              </h2>
              <p className="text-xs text-slate-400">
                Padrón clínico de Rosario (DNI, Contacto, Cobertura)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Valentina"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Apellido <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Rossi"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Documento (DNI) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-patient-dni"
                type="text"
                required
                placeholder="Ej. 34.892.120"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                required
                max={todayStr}
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Teléfono Móvil (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="Ej. +54 9 341 588-4321"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                Email
              </label>
              <input
                type="email"
                placeholder="Ej. paciente@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Cobertura Médica */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                Cobertura Médica
              </label>

              {/* Selector de Presets: Particular, La Segunda, Otra / Escribir */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('particular')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    coberturaPreset === 'particular'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {coberturaPreset === 'particular' && <Check className="w-3 h-3" />}
                  <span>Particular</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('la_segunda')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    coberturaPreset === 'la_segunda'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {coberturaPreset === 'la_segunda' && <Check className="w-3 h-3" />}
                  <span>La Segunda</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('otra')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    coberturaPreset === 'otra'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {coberturaPreset === 'otra' && <Check className="w-3 h-3" />}
                  <span>Otra / Escribir</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {coberturaPreset === 'particular'
                    ? 'Tipo de Cobertura'
                    : coberturaPreset === 'la_segunda'
                    ? 'Prepaga Seleccionada'
                    : 'Escribir Obra Social o Prepaga'}
                </label>
                {coberturaPreset === 'particular' ? (
                  <div className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 font-medium">
                    Particular (Sin Cobertura)
                  </div>
                ) : coberturaPreset === 'la_segunda' ? (
                  <div className="w-full text-xs px-3 py-2 rounded-lg border border-teal-200 bg-teal-50/50 text-teal-900 font-bold">
                    La Segunda (Seguros / Salud)
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      list="insurance-patient-suggestions"
                      placeholder="Escribir prepaga (ej. Swiss Medical, OSDE, IAPOS...)"
                      value={obraSocial}
                      onChange={(e) => setObraSocial(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-teal-400 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-xs"
                      autoFocus={coberturaPreset === 'otra'}
                    />
                    <datalist id="insurance-patient-suggestions">
                      {INSURANCE_SUGGESTIONS.filter((s) => s !== 'Particular' && s !== 'La Segunda').map((sugg) => (
                        <option key={sugg} value={sugg} />
                      ))}
                    </datalist>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Podés escribir cualquier obra social o prepaga libremente.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  N° de Credencial / Afiliado
                </label>
                <input
                  type="text"
                  placeholder={coberturaPreset === 'particular' ? 'No aplica (opcional)' : 'Ej. SM-90238411-01'}
                  value={numeroAfiliado}
                  onChange={(e) => setNumeroAfiliado(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Antecedentes / Notas Clínicas
            </label>
            <textarea
              rows={2}
              placeholder="Alergias, intervenciones previas, medicación habitual..."
              value={notasMedicas}
              onChange={(e) => setNotasMedicas(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {formError && (
            <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 rounded-xl shadow-md shadow-teal-500/20 transition-all"
            >
              {patientToEdit ? 'Actualizar Paciente' : 'Guardar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
