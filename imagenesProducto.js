// imagenesProducto.js
// Todo lo relacionado con las fotos de producto: recibir el archivo, validarlo
// y borrarlo. No sabe nada de la base de datos ni de las rutas de la API.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const URL_BASE = '/uploads';   // desde donde el navegador ve las fotos
const MAX_MB = 5;

// Tipos aceptados -> extension con la que se guardan. La extension sale de
// aqui y no del nombre que manda el cliente. SVG queda fuera a proposito:
// puede llevar scripts.
const EXTENSIONES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png',  '.png'],
  ['image/webp', '.webp']
]);

const MENSAJE_TIPO = 'Solo se aceptan imágenes JPG, PNG o WEBP.';

// Middleware: recibe UNA foto en el campo "imagen" y la guarda en `dir` con
// un nombre generado. Si algo falla responde 400/500 y la ruta ni se ejecuta;
// si todo sale bien, deja el archivo en req.file.
function subirImagen(dir) {
  const recibir = multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXTENSIONES.get(file.mimetype))
    }),
    fileFilter: (req, file, cb) => {
      if (EXTENSIONES.has(file.mimetype)) return cb(null, true);
      cb(Object.assign(new Error(MENSAJE_TIPO), { code: 'TIPO_NO_PERMITIDO' }));
    },
    limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 }
  }).single('imagen');

  return (req, res, next) => {
    recibir(req, res, err => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ success: false, message: `La imagen pesa más de ${MAX_MB} MB.` });
      if (err.code === 'TIPO_NO_PERMITIDO')
        return res.status(400).json({ success: false, message: MENSAJE_TIPO });
      if (err instanceof multer.MulterError)
        return res.status(400).json({ success: false, message: 'Archivo inválido.' });
      console.error('Error al recibir la imagen:', err.message);
      res.status(500).json({ success: false, message: 'Error al guardar la imagen.' });
    });
  };
}

// Borra el archivo de una foto a partir de su ruta publica (ej. /uploads/abc.jpg).
// Si ya no existe no pasa nada; cualquier otro error se registra pero no tumba
// la peticion: la foto es secundaria al producto.
async function borrarImagen(dir, imagenUrl) {
  if (!imagenUrl) return;
  try {
    // basename: aunque en la BD hubiera algo raro, nunca se sale de la carpeta
    await fs.promises.unlink(path.join(dir, path.basename(imagenUrl)));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('No se pudo borrar la imagen:', err.message);
  }
}

module.exports = { subirImagen, borrarImagen, URL_BASE };
