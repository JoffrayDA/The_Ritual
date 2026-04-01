// Lettres sans ambiguïté : pas de O (ressemble à 0) ni I (ressemble à 1)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateRoomCode(existingCodes: Set<string>): string {
  let code: string
  let attempts = 0
  do {
    code = Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
    attempts++
    if (attempts > 100) throw new Error('Could not generate unique room code')
  } while (existingCodes.has(code))
  return code
}
