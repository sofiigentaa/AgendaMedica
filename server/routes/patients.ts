import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export function createPatientsRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const patients = await prisma.patient.findMany({ orderBy: { apellido: 'asc' } });
    res.json(patients);
  });

  // Literal-path routes (/bulk) must be registered before the parameterized
  // /:id routes below — otherwise Express would match a request for
  // "/bulk" against ":id" (treating "bulk" as the id) before ever reaching
  // these handlers.

  // Bulk insert used by the Excel/Google Sheets import flow and by "Cargar
  // datos de demostración" — importing hundreds of rows one PUT at a time
  // would be hundreds of round trips, so this does it as one transaction.
  // Rows whose DNI collides with an existing patient (not part of this same
  // batch) are silently skipped, same as the pre-existing client-side filter
  // this replaces — duplicates are reported back, not just dropped.
  router.post('/bulk', async (req: Request, res: Response) => {
    const items = Array.isArray(req.body) ? req.body : [];
    if (items.length === 0) {
      res.json({ created: [], skippedDuplicateDni: [] });
      return;
    }

    const existing = await prisma.patient.findMany({ select: { dni: true } });
    const existingDnis = new Set(existing.map((p) => p.dni.replace(/\D/g, '')));

    const toCreate: any[] = [];
    const skipped: string[] = [];
    const seenInBatch = new Set<string>();

    for (const item of items) {
      const normalizedDni = String(item.dni || '').replace(/\D/g, '');
      if (normalizedDni && (existingDnis.has(normalizedDni) || seenInBatch.has(normalizedDni))) {
        skipped.push(item.dni);
        continue;
      }
      if (normalizedDni) seenInBatch.add(normalizedDni);

      // Cuando la fila no trae un DNI real, el texto por defecto ("Sin DNI")
      // queda idéntico para todas esas filas — y como la columna dni es
      // única en la base, la segunda fila sin DNI del mismo lote rompía el
      // insert entero con un error interno (P2002). Se le agrega un sufijo
      // único solo en ese caso puntual, nunca cuando sí hay un DNI real.
      const dniValue = normalizedDni
        ? String(item.dni || '')
        : `${String(item.dni || 'Sin DNI')} (${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)})`;

      toCreate.push({
        id: item.id || undefined,
        dni: dniValue,
        nombre: String(item.nombre || 'Paciente'),
        apellido: String(item.apellido || ''),
        email: item.email || '',
        telefono: item.telefono || '',
        fechaNacimiento: item.fechaNacimiento || '',
        coberturaTipo: item.coberturaTipo || 'particular',
        obraSocial: item.obraSocial || 'Particular',
        numeroAfiliado: item.numeroAfiliado || '',
        notasMedicas: item.notasMedicas || ''
      });
    }

    let created: any[] = [];
    try {
      created = await prisma.$transaction(toCreate.map((data) => prisma.patient.create({ data })));
    } catch (err: any) {
      // Si algo en el lote choca contra la base (ej. un DNI real que ya
      // existía y no se detectó por alguna variación de formato), la
      // transacción entera se revierte y se perdían también los pacientes
      // válidos. Como respaldo, se reintenta de a uno: lo que se pueda crear
      // se crea, y solo la fila que realmente falla queda afuera.
      created = [];
      for (const data of toCreate) {
        try {
          const patient = await prisma.patient.create({ data });
          created.push(patient);
        } catch {
          skipped.push(data.dni);
        }
      }
    }
    res.json({ created, skippedDuplicateDni: skipped });
  });

  // Deletes a specific set of patients by id — used to undo a bulk import.
  router.delete('/bulk', async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    await prisma.patient.deleteMany({ where: { id: { in: ids } } });
    res.json({ success: true });
  });

  router.delete('/', async (_req: Request, res: Response) => {
    await prisma.patient.deleteMany({});
    res.json({ success: true });
  });

  // Upsert by id — a single "save" endpoint used for both creating a new
  // patient and editing an existing one, matching the single onSave()
  // callback the frontend forms already use. Each write only ever touches
  // the one patient record it targets, so two devices editing *different*
  // patients at the same time can never clobber each other's changes.
  router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body || {};

    const required = ['dni', 'nombre', 'apellido', 'telefono'];
    const missing = required.filter((field) => !data[field] || String(data[field]).trim() === '');
    if (missing.length > 0) {
      res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}` });
      return;
    }

    const record = {
      dni: String(data.dni),
      nombre: String(data.nombre),
      apellido: String(data.apellido),
      email: data.email || '',
      telefono: String(data.telefono),
      fechaNacimiento: data.fechaNacimiento || '',
      coberturaTipo: data.coberturaTipo || 'particular',
      obraSocial: data.obraSocial || 'Particular',
      numeroAfiliado: data.numeroAfiliado || '',
      notasMedicas: data.notasMedicas || ''
    };

    try {
      const saved = await prisma.patient.upsert({
        where: { id },
        create: { id, ...record },
        update: record
      });
      res.json(saved);
    } catch (err: any) {
      // Prisma unique constraint violation (dni already used by another patient).
      if (err.code === 'P2002') {
        res.status(409).json({ error: `Ya existe un paciente registrado con el DNI ${data.dni}.` });
        return;
      }
      throw err;
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    await prisma.patient.deleteMany({ where: { id } });
    res.json({ success: true });
  });

  return router;
}
