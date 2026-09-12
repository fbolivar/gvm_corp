/**
 * Redimensiona y comprime una imagen en el NAVEGADOR antes de subirla.
 *
 * Por qué: las fotos de celular pesan varios MB. Enviar el dataURL base64 crudo
 * a un Server Action puede superar límites de payload y, sobre todo, es lento e
 * innecesario para un carnet. Aquí la reducimos a un lado máximo razonable y la
 * codificamos como JPEG de calidad media → típicamente 100-400 KB. El resultado
 * es un dataURL listo para guardar en Storage.
 *
 * Es tolerante: si algo del pipeline de canvas falla, cae al dataURL original.
 */
export async function fileToResizedDataUrl(
    file: File,
    maxSize = 512,
    quality = 0.85,
): Promise<string> {
    const originalDataUrl = await readFileAsDataUrl(file)

    try {
        const img = await loadImage(originalDataUrl)

        // Escala manteniendo proporción; nunca agranda.
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return originalDataUrl

        // Fondo blanco (por si la imagen trae transparencia y salimos a JPEG).
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)

        const out = canvas.toDataURL('image/jpeg', quality)
        // Si por alguna razón el canvas devuelve algo inválido, usa el original.
        return out.startsWith('data:image/jpeg') ? out : originalDataUrl
    } catch {
        return originalDataUrl
    }
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
    })
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
        img.src = src
    })
}
