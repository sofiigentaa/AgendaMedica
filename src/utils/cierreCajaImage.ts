import { DailySummary } from '../types';
import { formatCurrency } from '../data/treatments';
import { formatDatePretty } from './storage';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
  obra_social_directo: 'Obra Social Directo',
  pendiente: 'Pendiente'
};

/**
 * Dibuja el "cartelito" de cierre de caja en un <canvas> y lo devuelve como
 * PNG, sin depender de ninguna librería externa de generación de imágenes.
 */
export function generateCierreCajaImage(date: string, summary: DailySummary): Promise<Blob> {
  const width = 720;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('No se pudo generar la imagen.'));

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Header band
  const headerHeight = 150;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#059669');
  gradient.addColorStop(1, '#0d9488');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '700 30px Arial';
  ctx.fillText('CIERRE DE CAJA', width / 2, 65);
  ctx.font = '600 18px Arial';
  ctx.fillText(formatDatePretty(date), width / 2, 100);
  ctx.font = '400 13px Arial';
  ctx.fillStyle = '#d1fae5';
  ctx.fillText('Agenda Médica', width / 2, 128);

  let y = headerHeight + 60;

  // Total percibido - big number
  ctx.fillStyle = '#64748b';
  ctx.font = '700 14px Arial';
  ctx.fillText('TOTAL HONORARIOS COBRADOS HOY', width / 2, y);
  y += 55;
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 56px Arial';
  ctx.fillText(formatCurrency(summary.totalHonorariosPercibidos), width / 2, y);
  y += 60;

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, y);
  ctx.lineTo(width - 60, y);
  ctx.stroke();
  y += 45;

  // Turnos summary row
  ctx.textAlign = 'left';
  ctx.font = '700 15px Arial';
  ctx.fillStyle = '#334155';
  ctx.fillText('Turnos atendidos:', 60, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${summary.turnosAtendidos} / ${summary.turnosTotales}`, width - 60, y);
  y += 32;

  ctx.textAlign = 'left';
  ctx.fillText('Confirmados:', 60, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${summary.turnosConfirmados}`, width - 60, y);
  y += 32;

  ctx.textAlign = 'left';
  ctx.fillText('Cancelados:', 60, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${summary.turnosCancelados}`, width - 60, y);
  y += 45;

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(60, y);
  ctx.lineTo(width - 60, y);
  ctx.stroke();
  y += 40;

  // By payment method
  ctx.textAlign = 'left';
  ctx.font = '700 16px Arial';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Desglose por Medio de Cobro', 60, y);
  y += 34;

  ctx.font = '400 14px Arial';
  Object.entries(summary.porMetodoPago).forEach(([method, total]) => {
    if (!total) return;
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(PAYMENT_METHOD_LABELS[method] || method, 60, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(total), width - 60, y);
    ctx.font = '400 14px Arial';
    y += 30;
  });

  // Footer
  ctx.textAlign = 'center';
  ctx.font = '400 11px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Generado el ${new Date().toLocaleString('es-AR')}`, width / 2, height - 25);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo generar la imagen.'));
    }, 'image/png');
  });
}

export function buildCierreCajaWhatsappText(date: string, summary: DailySummary): string {
  const lines = [
    `*CIERRE DE CAJA — ${formatDatePretty(date)}*`,
    '',
    `💰 Total cobrado hoy: *${formatCurrency(summary.totalHonorariosPercibidos)}*`,
    `✅ Turnos atendidos: ${summary.turnosAtendidos} / ${summary.turnosTotales}`,
    `📋 Confirmados: ${summary.turnosConfirmados} • Cancelados: ${summary.turnosCancelados}`
  ];
  return lines.join('\n');
}
