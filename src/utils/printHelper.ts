import { Appointment, DailySummary, Patient } from '../types';
import { formatDatePretty } from './storage';
import { formatCurrency } from '../data/treatments';

/**
 * Universal safe print function that works inside iframes, standalone tabs, and mobile.
 * Opens a dedicated print window with automatic trigger, action toolbar, and fallback to direct download/iframe.
 */
export function executePrintDocument(
  htmlContent: string,
  documentTitle: string = 'Documento',
  forceNewTab: boolean = false
): void {
  const fullHtml = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${documentTitle} - Estética Láser Rosario</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm 12mm 15mm 12mm;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        background: #f8fafc;
        font-size: 11px;
        line-height: 1.4;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 20px;
      }
      .no-print-toolbar {
        position: sticky;
        top: 0;
        z-index: 9999;
        background: #0f172a;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .toolbar-title {
        font-weight: 800;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .btn {
        cursor: pointer;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        border: none;
        transition: all 0.15s ease;
      }
      .btn-primary {
        background: #2dd4bf;
        color: #042f2e;
      }
      .btn-primary:hover {
        background: #14b8a6;
      }
      .btn-secondary {
        background: #334155;
        color: #f8fafc;
      }
      .btn-secondary:hover {
        background: #475569;
      }
      .paper-container {
        background: #ffffff;
        padding: 30px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        max-width: 900px;
        margin: 0 auto;
      }
      .header-container {
        border-bottom: 2px solid #0f172a;
        padding-bottom: 14px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .clinic-title {
        font-size: 18px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.3px;
        color: #0f172a;
      }
      .clinic-subtitle {
        font-size: 11.5px;
        color: #0d9488;
        font-weight: 700;
        margin-top: 2px;
      }
      .doc-type-badge {
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        background: #f1f5f9;
        color: #0f172a;
        padding: 5px 12px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        display: inline-block;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }
      .meta-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 10px;
      }
      .meta-card.highlight {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }
      .meta-label {
        font-size: 9.5px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
      }
      .meta-val {
        font-size: 14px;
        font-weight: 900;
        color: #0f172a;
        margin-top: 2px;
      }
      .meta-val.green {
        color: #15803d;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
        font-size: 10.5px;
      }
      th {
        background-color: #f1f5f9;
        color: #1e293b;
        font-weight: 800;
        text-align: left;
        padding: 8px;
        border: 1px solid #cbd5e1;
        text-transform: uppercase;
        font-size: 9px;
        letter-spacing: 0.3px;
      }
      td {
        padding: 7px 8px;
        border: 1px solid #cbd5e1;
        vertical-align: middle;
      }
      tr:nth-child(even) td {
        background-color: #f8fafc;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .font-bold { font-weight: 700; }
      .font-black { font-weight: 900; }
      .blocked-row td {
        background-color: #fef2f2 !important;
        color: #991b1b;
      }
      .footer-notes {
        margin-top: 20px;
        padding-top: 12px;
        border-top: 1px solid #cbd5e1;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 10px;
        color: #64748b;
      }
      .signature-box {
        width: 220px;
        border-top: 1px dashed #475569;
        text-align: center;
        padding-top: 6px;
        font-weight: 700;
        color: #334155;
      }
      @media print {
        body {
          padding: 0 !important;
          background: #ffffff !important;
          width: 100% !important;
        }
        .no-print-toolbar {
          display: none !important;
        }
        .paper-container {
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          max-width: 100% !important;
          width: 100% !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="no-print-toolbar">
      <div class="toolbar-title">
        <span>🖨️ ${documentTitle}</span>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-secondary" onclick="window.close()">Cerrar</button>
        <button class="btn btn-primary" onclick="window.print()">Imprimir / Guardar PDF</button>
      </div>
    </div>

    <div class="paper-container">
      ${htmlContent}
    </div>

    <script>
      // Auto-trigger print when window finishes rendering
      window.addEventListener('load', function() {
        setTimeout(function() {
          try {
            window.print();
          } catch(e) {
            console.warn('Auto print trigger error:', e);
          }
        }, 350);
      });
    </script>
  </body>
</html>`;

  try {
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    // 1. Try opening in a dedicated new window / tab
    const printWindow = window.open(blobUrl, '_blank');

    if (printWindow && !printWindow.closed) {
      printWindow.focus();
      return;
    }

    // 2. If popup was blocked or returned null (e.g. inside restrictive iframes)
    // Use the visible DOM print iframe fallback
    let printIframe = document.getElementById('print-sandbox-iframe') as HTMLIFrameElement | null;
    if (printIframe) {
      printIframe.remove();
    }

    printIframe = document.createElement('iframe');
    printIframe.id = 'print-sandbox-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '200px';
    printIframe.style.height = '200px';
    printIframe.style.opacity = '0.01';
    printIframe.style.pointerEvents = 'none';
    printIframe.style.border = 'none';

    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        try {
          printIframe?.contentWindow?.focus();
          printIframe?.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to window.print():', e);
          window.print();
        }
      }, 400);
    } else {
      // 3. Direct window print
      window.print();
    }
  } catch (err) {
    console.error('Error al imprimir documento:', err);
    window.print();
  }
}

/**
 * Print Daily Financial Summary (Balance Diario & Cierre de Caja)
 */
export function printDailyFinancialReport(
  currentDate: string,
  appointments: Appointment[],
  summary: DailySummary,
  patients: Patient[]
): void {
  const dayAppointments = appointments
    .filter((a) => a.fecha === currentDate)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const totalTurnos = dayAppointments.filter((a) => !a.esBloqueo && a.tratamientoId !== 'no_dar').length;
  const turnosCobrados = dayAppointments.filter(
    (a) => a.estadoPago === 'pagado' && !a.esBloqueo && a.tratamientoId !== 'no_dar'
  ).length;

  const totalEfectivo = summary.porMetodoPago?.efectivo || 0;
  const totalTransferencia = summary.porMetodoPago?.transferencia || 0;
  const totalTarjeta = (summary.porMetodoPago?.debito || 0) + (summary.porMetodoPago?.credito || 0);

  const rowsHtml =
    dayAppointments.length === 0
      ? `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #64748b;">No se registraron turnos para esta fecha (${currentDate}).</td></tr>`
      : dayAppointments
          .map((apt) => {
            const isBlocked = apt.esBloqueo || apt.tratamientoId === 'no_dar';
            if (isBlocked) {
              return `
            <tr class="blocked-row">
              <td class="text-center font-mono font-bold">${apt.horaInicio} - ${apt.horaFin}</td>
              <td colspan="3" class="font-bold">⛔ BLOQUEO DE AGENDA (${apt.observaciones || 'No disponible'})</td>
              <td class="text-center">-</td>
              <td class="text-right">-</td>
              <td class="text-center font-bold">No Aplica</td>
            </tr>
          `;
            }

            const patient = patients.find((p) => p.id === apt.pacienteId);
            const cobertura = apt.obraSocial || patient?.obraSocial || 'Particular';
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
            const isPaid = apt.estadoPago === 'pagado';

            return `
          <tr>
            <td class="text-center font-mono font-bold">${apt.horaInicio} - ${apt.horaFin}</td>
            <td class="font-bold">
              ${apt.pacienteNombre}
              <div style="font-size: 8.5px; color: #64748b; font-weight: normal;">Tel: ${apt.pacienteTelefono}</div>
            </td>
            <td>${apt.pacienteDni || patient?.dni || '-'}</td>
            <td>${apt.tratamientoNombre}</td>
            <td>${cobertura}</td>
            <td class="text-right font-mono font-bold">${formatCurrency(Number(apt.honorarios) || 0)}</td>
            <td class="text-center">
              <span style="font-weight: 700; color: ${isPaid ? '#15803d' : '#b45309'};">
                ${isPaid ? '✓ PAGADO' : 'PENDIENTE'}
              </span>
              <div style="font-size: 8px; color: #475569;">(${metodoPagoText})</div>
            </td>
          </tr>
        `;
          })
          .join('');

  const html = `
    <div class="header-container">
      <div>
        <div class="clinic-title">Clínica Estética Láser Rosario</div>
        <div class="clinic-subtitle">Balance Diario de Honorarios & Cierre de Caja</div>
      </div>
      <div style="text-align: right;">
        <div class="doc-type-badge">PLANILLA DE CIERRE</div>
        <div style="font-size: 10px; font-weight: 700; color: #334155; margin-top: 4px;">
          Fecha: ${formatDatePretty(currentDate)}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card highlight">
        <div class="meta-label">Honorarios Percibidos (Cobrado)</div>
        <div class="meta-val green">${formatCurrency(summary.totalHonorariosPercibidos)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Total Efectivo</div>
        <div class="meta-val">${formatCurrency(totalEfectivo)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Total Transferencia / Digital</div>
        <div class="meta-val">${formatCurrency(totalTransferencia + totalTarjeta)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Turnos Cobrados</div>
        <div class="meta-val">${turnosCobrados} / ${totalTurnos}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 75px;" class="text-center">Horario</th>
          <th>Paciente</th>
          <th style="width: 80px;">DNI</th>
          <th>Tratamiento</th>
          <th style="width: 90px;">Cobertura</th>
          <th style="width: 85px;" class="text-right">Honorarios</th>
          <th style="width: 85px;" class="text-center">Estado Pago</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: 800;">
          <td colspan="5" class="text-right" style="padding: 8px; font-size: 11px;">TOTAL HONORARIOS PERCIBIDOS:</td>
          <td class="text-right font-mono font-black" style="padding: 8px; font-size: 12px; color: #15803d;">
            ${formatCurrency(summary.totalHonorariosPercibidos)}
          </td>
          <td class="text-center font-mono" style="padding: 8px; font-size: 9px; color: #475569;">
            ${turnosCobrados} de ${totalTurnos}
          </td>
        </tr>
      </tfoot>
    </table>

    <div class="footer-notes">
      <div>
        <strong>Estética Láser Rosario</strong> • San Lorenzo 1333, Rosario, Santa Fe<br/>
        Generado el: ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })} hs
      </div>
      <div class="signature-box">
        Firma Responsable / Médico
      </div>
    </div>
  `;

  executePrintDocument(html, `Cierre_Caja_${currentDate}`);
}

/**
 * Print Daily Schedule (Agenda Diaria de Turnos)
 */
export function printDailyScheduleReport(
  date: string,
  appointments: Appointment[],
  customPayments: Record<string, { method: string; fee: number }>
): void {
  const dayAppointments = appointments
    .filter((a) => a.fecha === date)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const totalCalculated = dayAppointments.reduce(
    (sum, apt) => sum + (customPayments[apt.id]?.fee ?? Number(apt.honorarios) ?? 0),
    0
  );

  const totalTurnos = dayAppointments.filter((a) => !a.esBloqueo && a.tratamientoId !== 'no_dar').length;
  const totalConfirmados = dayAppointments.filter(
    (a) => a.estado === 'confirmado' && !a.esBloqueo && a.tratamientoId !== 'no_dar'
  ).length;

  const rowsHtml =
    dayAppointments.length === 0
      ? `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #64748b;">No hay turnos agendados para esta fecha (${date}).</td></tr>`
      : dayAppointments
          .map((apt) => {
            const isBlocked = apt.esBloqueo || apt.tratamientoId === 'no_dar';
            if (isBlocked) {
              return `
            <tr class="blocked-row">
              <td class="text-center font-mono font-bold">${apt.horaInicio} - ${apt.horaFin}</td>
              <td colspan="3" class="font-bold">⛔ BLOQUEO DE AGENDA (NO DAR TURNOS)</td>
              <td class="text-center">-</td>
              <td class="text-right">-</td>
              <td>${apt.observaciones || 'Franja horaria no disponible'}</td>
            </tr>
          `;
            }

            const currentInfo = customPayments[apt.id] || {
              method: '',
              fee: Number(apt.honorarios) || 0
            };

            return `
          <tr>
            <td class="text-center font-mono font-bold">
              ${apt.horaInicio} - ${apt.horaFin}
              <div style="font-size: 8px; color: #64748b;">(${apt.duracionMinutos}m)</div>
            </td>
            <td class="font-bold">
              ${apt.pacienteNombre}
              <div style="font-size: 8.5px; color: #475569; font-weight: normal;">Cel: ${apt.pacienteTelefono}</div>
            </td>
            <td class="font-mono">${apt.pacienteDni || '-'}</td>
            <td class="font-semibold">${apt.tratamientoNombre}</td>
            <td>
              <div class="font-bold">${apt.obraSocial || 'Particular'}</div>
              ${apt.numeroAfiliado ? `<div style="font-size: 8px; color: #64748b;">N° ${apt.numeroAfiliado}</div>` : ''}
            </td>
            <td class="text-right">
              <div class="font-mono font-bold">${formatCurrency(currentInfo.fee)}</div>
              ${
                currentInfo.method
                  ? `<div style="font-size: 8.5px; font-weight: 700; color: #0d9488; text-transform: uppercase;">${currentInfo.method}</div>`
                  : ''
              }
            </td>
            <td style="font-size: 9.5px; color: #475569;">${apt.observaciones || '-'}</td>
          </tr>
        `;
          })
          .join('');

  const html = `
    <div class="header-container">
      <div>
        <div class="clinic-title">Clínica Estética Láser Rosario</div>
        <div class="clinic-subtitle">Agenda Diaria de Turnos & Pacientes</div>
      </div>
      <div style="text-align: right;">
        <div class="doc-type-badge">HOJA DE AGENDA</div>
        <div style="font-size: 10px; font-weight: 700; color: #334155; margin-top: 4px;">
          Fecha: ${formatDatePretty(date)}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Total de Turnos</div>
        <div class="meta-val">${totalTurnos}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Turnos Confirmados</div>
        <div class="meta-val" style="color: #0369a1;">${totalConfirmados}</div>
      </div>
      <div class="meta-card highlight">
        <div class="meta-label">Total Previsto a Cobrar</div>
        <div class="meta-val green">${formatCurrency(totalCalculated)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Horario de Atención</div>
        <div class="meta-val" style="font-size: 11px;">14:30 a 20:00 hs</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 75px;" class="text-center">Horario</th>
          <th>Paciente & Celular</th>
          <th style="width: 75px;">DNI</th>
          <th>Tratamiento</th>
          <th style="width: 90px;">Cobertura</th>
          <th style="width: 90px;" class="text-right">Honorarios / Pago</th>
          <th>Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: 800;">
          <td colspan="5" class="text-right" style="padding: 8px; font-size: 11px;">TOTAL GENERAL DEL DÍA:</td>
          <td class="text-right font-mono font-black" style="padding: 8px; font-size: 12px; color: #15803d;">
            ${formatCurrency(totalCalculated)}
          </td>
          <td class="text-center font-mono" style="padding: 8px; font-size: 9px; color: #475569;">
            ${totalTurnos} turnos
          </td>
        </tr>
      </tfoot>
    </table>

    <div class="footer-notes">
      <div>
        <strong>Estética Láser Rosario</strong> • Planilla de Control Diario<br/>
        Impreso el: ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })} hs
      </div>
      <div class="signature-box">
        Firma Recepción / Médico
      </div>
    </div>
  `;

  executePrintDocument(html, `Agenda_${date}`);
}
