export function formatDate(dateObj: any): string {
  if (!dateObj) return new Date().toISOString().split('T')[0];
  try {
    if (typeof dateObj === 'string' || typeof dateObj === 'number') {
      return new Date(dateObj).toISOString().split('T')[0];
    }
    if (dateObj.$date) {
      return new Date(dateObj.$date).toISOString().split('T')[0];
    }
    return new Date(dateObj).toISOString().split('T')[0];
  } catch (err) {
    console.error('Date parse error:', err);
    return new Date().toISOString().split('T')[0];
  }
}
