export async function fetchSecureSplat(url, onProgress, signal) {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    referrer: window.location.href,
    referrerPolicy: 'same-origin',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
  }

  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body) {
    const bytes = await response.arrayBuffer();
    onProgress({ lengthComputable: total > 0, loaded: bytes.byteLength, total });
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    loaded += value.byteLength;
    onProgress({ lengthComputable: total > 0, loaded, total });
  }

  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
