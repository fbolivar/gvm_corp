/**
 * Reduce una foto antes de subirla como soporte.
 *
 * Una foto de celular pesa 4–8 MB; para un recibo basta con ~1600 px de lado
 * y JPEG al 82 %, que queda en 200–500 KB. Así la subida por datos móviles
 * tarda segundos en vez de minutos y el almacenamiento no se llena de fotos
 * a resolución de cámara.
 *
 * Si el navegador no puede decodificar la imagen (p. ej. HEIC en algunos
 * Android) se devuelve el archivo original sin tocar: mejor subir pesado que
 * no subir.
 */

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;
/** Por debajo de esto no vale la pena recomprimir. */
const SKIP_UNDER_BYTES = 400 * 1024;

export async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    if (file.size < SKIP_UNDER_BYTES) return file;

    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
        if (!blob || blob.size >= file.size) return file;

        const base = file.name.replace(/\.[^.]+$/, '') || 'foto';
        return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    } catch {
        return file;
    }
}

/** Nombre legible para una foto tomada con la cámara ("image.jpg" no dice nada). */
export function photoFileName(kind: string): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const slug = kind.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'soporte';
    return `${slug}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`;
}
