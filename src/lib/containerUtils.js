const ISO_6346_PATTERN = /^[A-Z]{4}\d{7}$/;

export function normalizeContainerId(value = '') {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11);
}

export function containerIdError(value = '') {
  const normalized = normalizeContainerId(value);
  if (!normalized) return 'ID kontainer wajib diisi.';
  if (normalized.length !== 11) return 'ID kontainer harus 4 huruf dan 7 angka.';
  if (!ISO_6346_PATTERN.test(normalized)) return 'Format harus seperti MSCU1234567.';
  return null;
}
