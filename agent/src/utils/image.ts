import fs from 'fs'

// TODO: we should use this in the Pardaym wallet to detect an image in a field.
// Function to check if buffer is a JPEG image
function isJPEG(buffer: Buffer) {
  // JPEG files start with FF D8 and end with FF D9
  return (
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9
  )
}

// Sync version if you prefer
export function loadJPEGBufferSync(filePath: string) {
  const buffer = fs.readFileSync(filePath)

  if (!isJPEG(buffer)) {
    throw new Error('File is not a valid JPEG image')
  }

  return buffer
}
