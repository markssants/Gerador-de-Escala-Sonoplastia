import { format, isSameDay } from 'date-fns';
import { Member } from '../types';

export interface ParsedItem {
  id: string; // unique key for preview lists
  dayNumber: number;
  dateIso: string;
  dateObj: Date;
  rawLine: string;
  matchedMember: Member;
  matchedName: string;
  role: string;
  selected: boolean;
}

export interface ParsedSummary {
  items: ParsedItem[];
  unmatchedNames: { dayNumber: number; name: string }[];
  totalLinesProcessed: number;
  totalDaysFound: number;
}

export function normalizeStr(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Robust fuzzy/rule-based matcher for Brazilian names with initials, prefixes, and common church list variations
 */
export function matchMemberByName(rawName: string, members: Member[]): Member | null {
  const cleanInput = normalizeStr(rawName)
    .replace(/^[^\w]+|[^\w]+$/g, '')
    .replace(/\s+/g, ' ');

  if (!cleanInput) return null;

  // 1. Exact match (accent and case insensitive)
  for (const m of members) {
    const cleanMember = normalizeStr(m.name);
    if (cleanMember === cleanInput) return m;
  }

  // 2. Edmilson / Edimilson variation
  if (/ed[i]?milson/i.test(cleanInput)) {
    const found = members.find(m => /ed[i]?milson/i.test(m.name));
    if (found) return found;
  }

  // 3. Initials and abbreviations (e.g. "Luiz Davi" <-> "L. Davi", "Luiz Fernando" <-> "L. Fernando")
  for (const m of members) {
    const cleanMember = normalizeStr(m.name).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    const cleanIn = cleanInput.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

    const mParts = cleanMember.split(' ');
    const inParts = cleanIn.split(' ');

    if (mParts.length >= 2 && inParts.length >= 2) {
      const mFirst = mParts[0];
      const mLast = mParts[mParts.length - 1];
      const inFirst = inParts[0];
      const inLast = inParts[inParts.length - 1];

      // Initial matches: e.g. "l" and "luiz", and same last name ("davi" or "fernando")
      const firstMatchesInitial = 
        (mFirst.length === 1 && inFirst.startsWith(mFirst)) ||
        (inFirst.length === 1 && mFirst.startsWith(inFirst));

      if (firstMatchesInitial && mLast === inLast) {
        return m;
      }
    }

    // Direct check for "l. davi" or "l davi" vs "luiz davi"
    if (
      (cleanMember === 'l davi' && cleanIn === 'luiz davi') ||
      (cleanMember === 'luiz davi' && cleanIn === 'l davi') ||
      (cleanMember === 'l fernando' && cleanIn === 'luiz fernando') ||
      (cleanMember === 'luiz fernando' && cleanIn === 'l fernando')
    ) {
      return m;
    }
  }

  // 4. First name matching with initials/second names (e.g. "Marcos A." -> "Marcos", "Carlos E." -> "Carlos", "Victor H." -> "Victor")
  const inFirstWord = cleanInput.split(' ')[0];
  if (inFirstWord && inFirstWord.length >= 3) {
    const candidates = members.filter(m => {
      const mFirstWord = normalizeStr(m.name).split(' ')[0];
      return mFirstWord === inFirstWord;
    });

    if (candidates.length === 1) {
      return candidates[0];
    }
  }

  // 5. Contains substring match if length is significant
  for (const m of members) {
    const cleanMember = normalizeStr(m.name);
    if (cleanMember.length >= 4 && cleanInput.includes(cleanMember)) {
      return m;
    }
    if (cleanInput.length >= 4 && cleanMember.includes(cleanInput)) {
      return m;
    }
  }

  return null;
}

/**
 * Parses raw text message containing schedule lines like:
 * "Dia 03 (Sábado): Sebastião / Luiz Davi"
 * "Dia 14 (Quarta-feira): Wales / Arthur"
 * "Dia 28 (Quarta-feira): Victor H. / Edimilson"
 */
export function parseScheduleMessage(
  text: string,
  members: Member[],
  referenceDate: Date,
  serviceDays: Date[],
  defaultRoleMode: 'diacono' | 'recepcionista' | 'member_role' | 'custom',
  customRoleName: string = 'Diácono'
): ParsedSummary {
  const lines = text.split(/\r?\n/);
  const items: ParsedItem[] = [];
  const unmatchedNames: { dayNumber: number; name: string }[] = [];
  let totalLinesProcessed = 0;
  const daysFound = new Set<number>();

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  // Common line patterns:
  // "Dia 03 (Sábado): Sebastião / Luiz Davi"
  // "Dia 03: Sebastião / Luiz Davi"
  // "03 (Sábado): ..."
  // "03/10: ..."
  // "3 - Sebastião / Luiz Davi"
  const lineRegex = /^(?:dia\s*)?(\d{1,2})(?:[\/\.](\d{1,2}))?(?:\s*\(([^)]+)\))?\s*[:\-–—]?\s*(.+)$/i;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    totalLinesProcessed++;
    const match = trimmed.match(lineRegex);
    if (!match) return;

    const dayNumber = parseInt(match[1], 10);
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) return;

    daysFound.add(dayNumber);

    // Clean names payload by removing any trailing colons, semicolons or spaces
    const rawNamesStr = match[4].replace(/[:;\s]+$/, '').trim();
    if (!rawNamesStr) return;

    // Find date object: either from serviceDays or create new date
    let dateObj = serviceDays.find(sd => sd.getDate() === dayNumber);
    if (!dateObj) {
      dateObj = new Date(year, month, dayNumber, 19, 40, 0, 0);
    }
    const dateIso = dateObj.toISOString();

    // Split names separated by /, |, ;, +, or " e "
    const nameTokens = rawNamesStr
      .split(/\s*[\/|;&+]\s*|\s+e\s+/i)
      .map(t => t.trim().replace(/^[-–—\s]+|[-–—\s]+$/g, ''))
      .filter(t => t.length > 0);

    nameTokens.forEach((token) => {
      const matched = matchMemberByName(token, members);
      if (matched) {
        let role = customRoleName.trim() || 'Ocupado';
        if (defaultRoleMode === 'diacono') {
          role = 'Diácono';
        } else if (defaultRoleMode === 'recepcionista') {
          role = 'Recepcionista';
        } else if (defaultRoleMode === 'member_role') {
          role = (matched.roles && matched.roles.length > 0) ? matched.roles[0] : 'Ocupado';
        }

        items.push({
          id: `${matched.id}-${dayNumber}-${dateIso}`,
          dayNumber,
          dateIso,
          dateObj,
          rawLine: trimmed,
          matchedMember: matched,
          matchedName: token,
          role,
          selected: true,
        });
      } else {
        // Skip common auxiliary words if accidentally matched
        if (!/^(culto|igreja|sabado|domingo|quarta|escala|dia)$/i.test(token)) {
          unmatchedNames.push({ dayNumber, name: token });
        }
      }
    });
  });

  return {
    items,
    unmatchedNames,
    totalLinesProcessed,
    totalDaysFound: daysFound.size,
  };
}
