import Tesseract from 'tesseract.js'

let worker = null

export async function recognizeImage(file, onProgress) {
  try {
    const result = await Tesseract.recognize(
      file,
      'chi_sim+eng',
      {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text') {
            onProgress(Math.round(m.progress * 100))
          }
        },
      }
    )
    return { text: result.data.text.trim(), confidence: result.data.confidence }
  } catch (err) {
    console.error('OCR error:', err)
    return { text: '', error: err.message }
  }
}
