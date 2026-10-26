/** Small portable codecs: Hermes does not provide TextDecoder on every version. */
export function decodeText(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let units: number[] = [];
  const append = (codePoint: number) => {
    if (codePoint > 0xffff) {
      const value = codePoint - 0x10000;
      units.push(0xd800 | (value >> 10), 0xdc00 | (value & 0x3ff));
    } else units.push(codePoint);
    if (units.length >= 8192) {
      chunks.push(String.fromCharCode(...units));
      units = [];
    }
  };

  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    const littleEndian = bytes[0] === 0xff;
    for (let i = 2; i < bytes.length; i += 2) {
      append(i + 1 < bytes.length ? littleEndian ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1] : 0xfffd);
    }
  } else {
    for (let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0; i < bytes.length;) {
      const first = bytes[i];
      const length = first < 0x80 ? 1 : first >= 0xc2 && first <= 0xdf ? 2 : first >= 0xe0 && first <= 0xef ? 3 : first >= 0xf0 && first <= 0xf4 ? 4 : 0;
      if (!length || i + length > bytes.length) { append(0xfffd); i++; continue; }
      let point = first & (length === 1 ? 0x7f : length === 2 ? 0x1f : length === 3 ? 0x0f : 0x07);
      let valid = true;
      for (let j = 1; j < length; j++) {
        if ((bytes[i + j] & 0xc0) !== 0x80) { valid = false; break; }
        point = (point << 6) | (bytes[i + j] & 0x3f);
      }
      if (!valid || (length === 2 && point < 0x80) || (length === 3 && point < 0x800) ||
        (length === 4 && point < 0x10000) || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) {
        append(0xfffd); i++; continue;
      }
      append(point);
      i += length;
    }
  }
  if (units.length) chunks.push(String.fromCharCode(...units));
  return chunks.join('');
}

export function encodeBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  let chunk = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i];
    const second = bytes[i + 1] ?? 0;
    const third = bytes[i + 2] ?? 0;
    chunk += alphabet[first >> 2] + alphabet[((first & 3) << 4) | (second >> 4)] +
      (i + 1 < bytes.length ? alphabet[((second & 15) << 2) | (third >> 6)] : '=') +
      (i + 2 < bytes.length ? alphabet[third & 63] : '=');
    if (chunk.length >= 16384) { chunks.push(chunk); chunk = ''; }
  }
  if (chunk) chunks.push(chunk);
  return chunks.join('');
}
