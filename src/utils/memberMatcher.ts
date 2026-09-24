import { Member } from '../types';

export interface UnavailabilityCandidate {
  day: number;
  rawName: string;
  memberId?: string;
  memberName?: string;
  role: string;
  selected: boolean;
}

export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n];
}

/**
 * Calculates similarity between 0 and 1
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

/**
 * Finds a matching member for a given name found on a church schedule.
 * Handles abbreviations, initials, and common OCR reading artifacts.
 */
export function findMatchingMember(rawName: string, members: Member[]): Member | null {
  if (!rawName) return null;
  const rawNorm = normalizeText(rawName);
  if (rawNorm.length < 2) return null;

  // Direct exact match
  const direct = members.find(m => normalizeText(m.name) === rawNorm);
  if (direct) return direct;

  // Well-known church roster aliases and OCR misreadings
  const knownAliases: Record<string, string[]> = {
    'l. davi': ['luiz davi', 'luis davi', 'davi', 'l davi', 'l. davi', 'luiz d.', 'luis d.', 'davi s.'],
    'l. fernando': ['luiz fernando', 'luis fernando', 'fernando', 'l fernando', 'l. fernando', 'luiz f.', 'luis f.'],
    'edmilson': ['edimilson', 'edmilson', 'eameon', 'edimilsor', 'edimilson s.', 'edmilson s.'],
    'marcos': ['marcos a.', 'marcos a', 'marcos antonio', 'marcos antônio', 'm. antonio', 'marco'],
    'carlos': ['carlos e.', 'carlos e', 'carlos eduardo', 'c. eduardo', 'carlo'],
    'victor': ['victor h.', 'victor h', 'victor hugo', 'vitor', 'vitor h.', 'vitor hugo', 'veom', 'victo'],
    'kalebe': ['calebe', 'kalebe', 'kalebi', 'calebi', 'kaleb'],
    'claudinei': ['claudinei', 'claudiney', 'claudineo', 'claudine'],
    'weverson': ['weverson', 'weverton', 'weversor', 'weverso'],
    'wales': ['wales', 'vales', 'walez', 'wale'],
    'arthur': ['arthur', 'artur', 'artur h.', 'arthu'],
    'joabe': ['joabe', 'joab', 'joabi'],
    'kauan': ['kauan', 'cauan', 'kaua', 'caua'],
    'leticia': ['leticia', 'let'],
    'milena': ['milena', 'milen'],
    'tamara': ['tamara'],
    'yan': ['yan', 'ian'],
  };

  // Check defined aliases
  for (const m of members) {
    const mNorm = normalizeText(m.name);
    const aliases = knownAliases[mNorm] || [];
    for (const alias of aliases) {
      if (
        rawNorm === alias ||
        rawNorm.startsWith(alias + ' ') ||
        alias.startsWith(rawNorm + ' ') ||
        rawNorm.endsWith(' ' + alias)
      ) {
        return m;
      }
      // Check high fuzzy similarity against alias
      if (stringSimilarity(rawNorm, alias) >= 0.72) {
        return m;
      }
    }
  }

  // Token-based matching (First name)
  for (const m of members) {
    const mNorm = normalizeText(m.name);
    const mFirstName = mNorm.replace(/^[a-z]\.\s*/, '').split(' ')[0];
    const rawFirstName = rawNorm.replace(/^[a-z]\.\s*/, '').split(' ')[0];

    if (mFirstName.length >= 3 && mFirstName === rawFirstName) {
      return m;
    }

    if (rawNorm === mNorm || rawNorm.startsWith(mNorm + ' ') || mNorm.startsWith(rawNorm + ' ')) {
      return m;
    }
  }

  // Fuzzy match against member names (Levenshtein)
  let bestMatch: Member | null = null;
  let bestScore = 0;

  for (const m of members) {
    const mNorm = normalizeText(m.name);
    const score = stringSimilarity(rawNorm, mNorm);
    if (score > 0.75 && score > bestScore) {
      bestScore = score;
      bestMatch = m;
    }
  }

  return bestMatch;
}
