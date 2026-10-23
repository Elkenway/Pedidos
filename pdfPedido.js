const PDFDocument = require('pdfkit');

const COLOR_DARK  = '#1a1a18';
const COLOR_WARM  = '#c9a96e';
const COLOR_MID   = '#4a4540';
const COLOR_LIGHT = '#eae4d8';

const METODO_LABELS = {
  efectivo: 'Efectivo',
  datafono: 'Datáfono',
  transferencia: 'Transferencia'
};

function fmtPrice(n) {
  return Number(n).toLocaleString('es-CO');
}

function seccionTitulo(doc, texto, marginX, contentWidth) {
  doc.fillColor(COLOR_DARK).fontSize(10).font('Helvetica-Bold').text(texto, marginX);
  doc.moveTo(marginX, doc.y + 3).lineTo(marginX + contentWidth, doc.y + 3).strokeColor(COLOR_LIGHT).stroke();
  doc.moveDown(0.7);
}

function filaDato(doc, marginX, label, valor) {
  doc.fontSize(8).font('Helvetica').fillColor(COLOR_MID).text(label.toUpperCase(), marginX);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR_DARK).text(valor || '-', marginX);
  doc.moveDown(0.5);
}

function generarPdfPedido(venta, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  const marginX = 50;
  const contentWidth = doc.page.width - marginX * 2;

  doc.rect(0, 0, doc.page.width, 90).fill(COLOR_DARK);
  doc.rect(marginX, 22, 30, 30).fill(COLOR_WARM);
  doc.fillColor(COLOR_DARK).fontSize(12).font('Helvetica-Bold').text('CL', marginX + 7, 30);

  doc.fillColor(COLOR_WARM).fontSize(18).font('Helvetica-Bold').text('CASTANO LIVING', marginX + 40, 26);
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica').text('INDOOR · OUTDOOR FURNITURE', marginX + 40, 50);

  doc.fillColor(COLOR_WARM).fontSize(13).font('Helvetica-Bold')
     .text(`Pedido #${venta.numero_pedido}`, marginX, 26, { align: 'right', width: contentWidth });

  const fecha = new Date(venta.fecha_pedido).toLocaleString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
     .text(fecha, marginX, 48, { align: 'right', width: contentWidth });

  doc.y = 115;

  doc.fillColor(COLOR_MID).fontSize(9).font('Helvetica')
     .text(`Atendido por: ${venta.vendedor_nombre || 'N/D'}`, marginX);
  doc.moveDown(1.2);

  seccionTitulo(doc, 'DATOS DE ENTREGA', marginX, contentWidth);
  filaDato(doc, marginX, 'Cliente', venta.nombre_destinatario);
  filaDato(doc, marginX, 'Dirección', `${venta.direccion}, ${venta.ciudad}`);
  filaDato(doc, marginX, 'Teléfono', venta.telefono);
  if (venta.notas) filaDato(doc, marginX, 'Notas', venta.notas);
  doc.moveDown(0.6);

  seccionTitulo(doc, 'PRODUCTOS', marginX, contentWidth);

  const colProducto = marginX, colCant = marginX + 260, colPrecio = marginX + 320, colSubtotal = marginX + 410;

  doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR_MID);
  const yHead = doc.y;
  doc.text('PRODUCTO', colProducto, yHead);
  doc.text('CANT.', colCant, yHead);
  doc.text('PRECIO', colPrecio, yHead);
  doc.text('SUBTOTAL', colSubtotal, yHead);
  doc.y = yHead;
  doc.moveDown(0.9);
  doc.moveTo(marginX, doc.y).lineTo(marginX + contentWidth, doc.y).strokeColor(COLOR_LIGHT).stroke();
  doc.moveDown(0.5);

  venta.items.forEach(item => {
    const subtotal = item.precio_unitario * item.cantidad;
    const y = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_DARK);
    doc.text(item.nombre_producto, colProducto, y, { width: 250 });
    doc.text(String(item.cantidad), colCant, y);
    doc.text(`$${fmtPrice(item.precio_unitario)}`, colPrecio, y);
    doc.text(`$${fmtPrice(subtotal)}`, colSubtotal, y);
    doc.y = y;
    doc.moveDown(0.95);
  });

  doc.moveTo(marginX, doc.y).lineTo(marginX + contentWidth, doc.y).strokeColor(COLOR_DARK).lineWidth(1.2).stroke();
  doc.moveDown(0.6);

  const yTotal = doc.y;
  doc.fontSize(9).font('Helvetica').fillColor(COLOR_MID).text('TOTAL', colPrecio, yTotal);
  doc.fontSize(15).font('Helvetica-Bold').fillColor(COLOR_DARK)
     .text(`$${fmtPrice(venta.total)}`, colSubtotal, yTotal - 3);

  doc.y = yTotal + 20;
  doc.moveDown(1.4);

  seccionTitulo(doc, 'PAGO', marginX, contentWidth);
  filaDato(doc, marginX, 'Total del pedido', `$${fmtPrice(venta.total)}`);
  filaDato(doc, marginX, 'Pagado', `$${fmtPrice(venta.monto_pagado)}`);
  if (venta.saldo_pendiente > 0.01) {
    filaDato(doc, marginX, 'Saldo pendiente', `$${fmtPrice(venta.saldo_pendiente)}`);
  }

  if (venta.pagos && venta.pagos.length > 0) {
    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR_MID).text('HISTORIAL DE PAGOS', marginX);
    doc.moveDown(0.3);
    venta.pagos.forEach(pg => {
      const fechaPg = new Date(pg.fecha_pago).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      const metodoPg = METODO_LABELS[pg.metodo_pago] || pg.metodo_pago;
      const refPg = pg.referencia_pago ? `, ref. ${pg.referencia_pago}` : '';
      doc.fontSize(9).font('Helvetica').fillColor(COLOR_DARK)
         .text(`${fechaPg} — $${fmtPrice(pg.monto)} (${metodoPg}${refPg})`, marginX);
      doc.moveDown(0.3);
    });
  }

 
  doc.fontSize(8).fillColor(COLOR_MID).font('Helvetica')
     .text('Gracias por su compra en Castano Living.', marginX, doc.page.height - 60, {
       align: 'center', width: contentWidth
     });

  doc.end();
}

module.exports = { generarPdfPedido };
