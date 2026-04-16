// 中国法定节假日（YYYY-MM-DD），含 2024-2026
const HOLIDAYS = new Set([
  '2024-01-01',
  '2024-02-10','2024-02-11','2024-02-12','2024-02-13','2024-02-14','2024-02-15','2024-02-16','2024-02-17',
  '2024-04-04','2024-04-05','2024-04-06',
  '2024-05-01','2024-05-02','2024-05-03','2024-05-04','2024-05-05',
  '2024-06-10',
  '2024-09-15','2024-09-16','2024-09-17',
  '2024-10-01','2024-10-02','2024-10-03','2024-10-04','2024-10-05','2024-10-06','2024-10-07',
  '2025-01-01',
  '2025-01-28','2025-01-29','2025-01-30','2025-01-31','2025-02-01','2025-02-02','2025-02-03','2025-02-04',
  '2025-04-04','2025-04-05','2025-04-06',
  '2025-05-01','2025-05-02','2025-05-03','2025-05-04','2025-05-05',
  '2025-05-31','2025-06-01','2025-06-02',
  '2025-10-01','2025-10-02','2025-10-03','2025-10-04','2025-10-05','2025-10-06','2025-10-07','2025-10-08',
  '2026-01-01',
  '2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-22','2026-02-23','2026-02-24',
  '2026-04-05','2026-04-06',
  '2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05',
  '2026-06-19','2026-06-20','2026-06-21',
  '2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07','2026-10-08',
]);

function isWorkingDay(d) {
  if (isNaN(d.getTime())) return false;
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return !HOLIDAYS.has(key);
}

export function getNextWorkingDay(dateObj) {
  let d = new Date(dateObj);
  if (isNaN(d.getTime())) return new Date();
  let guard = 0;
  do {
    d.setDate(d.getDate() + 1);
    if (++guard > 30) break; // 最多跳 30 天，防死循环
  } while (!isWorkingDay(d));
  return d;
}

export function calculateEndDate(startDateStr, durationDays) {
  if (!startDateStr) return '';
  if (durationDays <= 0) return startDateStr;
  let d = new Date(startDateStr.replace(/-/g, '/'));
  if (isNaN(d.getTime())) return startDateStr;
  for (let i = 0; i < durationDays - 1; i++) {
    d = getNextWorkingDay(d);
  }
  return formatDate(d);
}

export function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}