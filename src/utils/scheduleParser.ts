import { Member } from '../types';
import { findMatchingMember, UnavailabilityCandidate, normalizeText } from './memberMatcher';

export const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export interface ParseResult {
  detectedMonth?: number; // 0 to 11
  detectedYear?: number;
  candidates: UnavailabilityCandidate[];
  unmatchedNames: Array<{ day: number; name: string }>;
}

export function detectMonthAndYear(text: string): { month?: number; year?: number } {
  const norm = normalizeText(text);

  let month: number | undefined;
  for (let i = 0; i < MONTH_NAMES_PT.length; i++) {
    const mName = normalizeText(MONTH_NAMES_PT[i]);
    const regex = new RegExp(`\\b${mName}\\b`, 'i');
    if (regex.test(norm)) {
      month = i;
      break;
    }
  }

  // Detect 4-digit year like 2024, 2025, 2026
  const yearMatch = text.match(/\b(202[4-9]|203[0-9])\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  return { month, year };
}

export function parseScheduleText(
  text: string,
  members: Member[],
  defaultRole: string = 'Diácono'
): ParseResult {
  const { month: detectedMonth, year: detectedYear } = detectMonthAndYear(text);

  const lines = text.split(/\r?\n/);
  const candidates: UnavailabilityCandidate[] = [];
  const unmatchedNames: Array<{ day: number; name: string }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Ignore headers like "QUARTA-FEIRA | SÁBADO | DOMINGO" or "OUTUBRO"
    const lineNorm = normalizeText(line);
    if (
      lineNorm === 'outubro' ||
      lineNorm === 'novembro' ||
      lineNorm.includes('quarta-feira') && lineNorm.includes('sabado')
    ) {
      continue;
    }

    // Clean leading/trailing table borders, brackets, pipes, bullets
    const cleanLine = line.replace(/^[\[\(\{|\s*•\-\*~_]+/, '').replace(/[\]\)\}|\s*~_]+$/, '').trim();
    if (!cleanLine) continue;

    let day: number | null = null;
    let namesPart = '';

    // Pattern 1: date with slash "14/10 - Wales / Arthur" or "14/10: ..."
    const dateSlashMatch = cleanLine.match(/(?:dia\s*)?(\d{1,2})\s*\/\s*\d{1,2}\s*[-—–:.]\s*(.+)/i);
    // Pattern 2: weekday prefix "Quarta-feira 28 - Victor / Edimilson"
    const prefixDayMatch = cleanLine.match(/(?:quarta|quarta-feira|sabado|sábado|domingo)[^0-9]*(\d{1,2})\s*[-—–:. ]\s*(.+)/i);
    // Pattern 3: standard "14 - Wales / Arthur" or "28-veom /eameon" or "3: Sebastião"
    const dayMatch = cleanLine.match(/(?:dia\s*)?(\b[1-3]?[0-9]\b)\s*[-—–:.]\s*(.+)/i);
    // Pattern 4: space separated "14 Wales / Arthur"
    const spaceMatch = cleanLine.match(/^(\b[1-3]?[0-9]\b)\s+([A-Za-zÀ-ÿ].+)/);

    if (dateSlashMatch) {
      day = parseInt(dateSlashMatch[1], 10);
      namesPart = dateSlashMatch[2];
    } else if (prefixDayMatch) {
      day = parseInt(prefixDayMatch[1], 10);
      namesPart = prefixDayMatch[2];
    } else if (dayMatch) {
      day = parseInt(dayMatch[1], 10);
      namesPart = dayMatch[2];
    } else if (spaceMatch) {
      day = parseInt(spaceMatch[1], 10);
      namesPart = spaceMatch[2];
    }

    if (day !== null && day >= 1 && day <= 31 && namesPart) {
      // Split names by / , ; \ | e or &
      const rawNames = namesPart
        .split(/\s*[\/\\|;,]\s*|\s+(?:e|&|\+)\s+/i)
        .map(n => n.trim().replace(/^[-—–:.]\s*/, ''))
        .filter(n => n.length >= 2);

      for (const name of rawNames) {
        // Skip common church roles if accidentally split
        const nameNorm = normalizeText(name);
        if (
          nameNorm === 'diacono' ||
          nameNorm === 'diaconos' ||
          nameNorm === 'recepcao' ||
          nameNorm === 'recepcionista' ||
          nameNorm === 'sabado' ||
          nameNorm === 'domingo' ||
          nameNorm === 'quarta'
        ) {
          continue;
        }

        const member = findMatchingMember(name, members);
        if (member) {
          const alreadyAdded = candidates.some(
            c => c.day === day && c.memberId === member.id
          );
          if (!alreadyAdded) {
            candidates.push({
              day,
              rawName: name,
              memberId: member.id,
              memberName: member.name,
              role: defaultRole,
              selected: true,
            });
          }
        } else {
          unmatchedNames.push({ day, name });
        }
      }
    }
  }

  candidates.sort((a, b) => a.day - b.day);
  return {
    detectedMonth,
    detectedYear,
    candidates,
    unmatchedNames,
  };
}
