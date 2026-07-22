import sharp from 'sharp'

/**
 * Resize (jika perlu) dan re-encode gambar untuk memangkas ukuran file
 * sebelum diupload ke Supabase Storage. Format output mengikuti mimeType
 * input — tidak dikonversi paksa ke format lain — supaya contentType/ekstensi
 * yang sudah ditentukan di caller tetap konsisten.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {{ maxWidth?: number, quality?: number }} options
 * @returns {Promise<Buffer>}
 */
export async function compressImage(buffer, mimeType, { maxWidth = 1920, quality = 80 } = {}) {
  if (mimeType === 'image/svg+xml') return buffer

  let pipeline = sharp(buffer).rotate() // rotate(): terapkan orientasi EXIF sebelum metadata di-strip
  const metadata = await sharp(buffer).metadata()

  if (metadata.width && metadata.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth })
  }

  if (mimeType === 'image/png') {
    pipeline = pipeline.png({ quality, compressionLevel: 9 })
  } else if (mimeType === 'image/webp') {
    pipeline = pipeline.webp({ quality })
  } else {
    // image/jpeg, image/jpg, dan fallback lain
    pipeline = pipeline.jpeg({ quality })
  }

  return pipeline.toBuffer()
}
