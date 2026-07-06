/** SHA-1 hex digest without Node.js `crypto` (safe in workflow bundles). */
export function sha1Hex(data: Uint8Array): string {
  const words = new Uint32Array(80)
  const bitLength = data.length * 8

  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6)
  padded.set(data)
  padded[data.length] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 4, bitLength >>> 0, false)
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x1_0000_0000), false)

  let h0 = 0x67452301
  let h1 = 0xEFCDAB89
  let h2 = 0x98BADCFE
  let h3 = 0x10325476
  let h4 = 0xC3D2E1F0

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let j = 0; j < 16; j++) {
      words[j] = view.getUint32(offset + j * 4, false)
    }
    for (let j = 16; j < 80; j++) {
      words[j] = rotl(words[j - 3]! ^ words[j - 8]! ^ words[j - 14]! ^ words[j - 16]!, 1)
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4

    for (let j = 0; j < 80; j++) {
      let f: number
      let k: number
      if (j < 20) {
        f = (b & c) | (~b & d)
        k = 0x5A827999
      } else if (j < 40) {
        f = b ^ c ^ d
        k = 0x6ED9EBA1
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8F1BBCDC
      } else {
        f = b ^ c ^ d
        k = 0xCA62C1D6
      }

      const temp = (rotl(a, 5) + f + e + k + words[j]!) >>> 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }

  return [h0, h1, h2, h3, h4].map(word => word.toString(16).padStart(8, '0')).join('')
}

function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0
}
