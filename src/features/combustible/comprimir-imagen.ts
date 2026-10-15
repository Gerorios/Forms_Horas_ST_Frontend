// 2560px/0.85: suficiente definición para que la IA lea la letra chica de tickets térmicos
// (con 1600px/0.7 el modelo perdía decimales y litros — ver contexto §44).
const MAX_LADO = 2560;

// `maxLado`/`calidad` son parámetros para otros usos (fotos de seguridad: 1600px
// alcanza para ver el riesgo); el default sigue siendo el del ticket.
export async function comprimirImagen(archivo: File, maxLado = MAX_LADO, calidad = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen'))), 'image/jpeg', calidad),
  );
}
