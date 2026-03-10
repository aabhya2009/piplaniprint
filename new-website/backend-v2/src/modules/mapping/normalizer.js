const enumMaps = {
  payment_status: {
    captured: 'paid',
    paid: 'paid',
    failed: 'failed',
    refunded: 'refunded'
  }
};

export function normalizeEnum(domain, input) {
  const map = enumMaps[domain] || {};
  return map[String(input || '').toLowerCase()] || 'unknown';
}

export function normalizeTimestamp(input, defaultZone = 'Asia/Kolkata') {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return {
    iso: date.toISOString(),
    timezone: defaultZone
  };
}

export function validateRequired(payload, fields) {
  const missing = fields.filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === '');
  return {
    valid: missing.length === 0,
    missing
  };
}
