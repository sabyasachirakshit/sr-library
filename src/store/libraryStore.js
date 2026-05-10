const STORE_KEY = 'sr_library';

export function getStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setStore(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export function updateStore(updates) {
  setStore({ ...getStore(), ...updates });
}

export function exportStore() {
  const data = getStore();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sr-library-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importStore(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    setStore(data);
    return true;
  } catch {
    return false;
  }
}

export function hashPin(pin) {
  const str = pin + '_sr_lib_v1';
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9) ^ (h >>> 13);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
