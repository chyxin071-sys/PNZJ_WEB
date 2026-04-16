// utils/format.js
export function maskName(name) {
  if (!name) return '';
  return name.substring(0, 1) + '**';
}

export function maskPhone(phone) {
  if (!phone || phone.length < 11) return phone || '';
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

export function maskAddress(address) {
  if (!address) return '';
  return address.replace(/\d/g, '*');
}