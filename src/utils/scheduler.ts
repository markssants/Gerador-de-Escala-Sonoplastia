import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  format,
  isSameDay
} from 'date-fns';
import { Member, Team, Assignment, DayOfWeek, MonthlySchedule } from '../types';

export function getServiceDays(month: number, year: number): Date[] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(start);
  
  const allDays = eachDayOfInterval({ start, end });
  
  // 0 = Sunday, 3 = Wednesday, 6 = Saturday
  return allDays.filter(day => {
    const dow = getDay(day);
    if (dow === 0 || dow === 3) {
      day.setHours(19, 40, 0, 0);
      return true;
    }
    if (dow === 6) {
      day.setHours(8, 40, 0, 0);
      return true;
    }
    return false;
  });
}

export function generateSchedule(
  month: number, 
  year: number, 
  members: Member[],
  skippedDates: string[] = []
): Assignment[] {
  const allServiceDays = getServiceDays(month, year);
  const serviceDays = allServiceDays.filter(day => !skippedDates.includes(day.toISOString()));
  const assignments: Assignment[] = [];
  
  const leaders = members.filter(m => m.type === 'leader');
  const participants = members.filter(m => m.type === 'participant');

  if (leaders.length === 0) return [];

  // Track assignment counts for this specific generation
  const counts = new Map<string, number>();
  members.forEach(m => counts.set(m.id, 0));

  serviceDays.forEach((day, index) => {
    const dayOfWeek = getDay(day) as DayOfWeek;
    
    const pickMember = (pool: Member[], categoryLabel: string) => {
      // 1. Filter by conflict (recurring or specific date)
      const available = pool.filter(m => {
        const hasRecurring = m.unavailableDays.some(ud => ud.dayOfWeek === dayOfWeek);
        const hasSpecific = m.unavailableDates?.some(ud => isSameDay(new Date(ud.date), day));
        return !hasRecurring && !hasSpecific;
      });

      let selected: Member;
      let hasConflict = false;
      let conflictReason = '';

      if (available.length === 0) {
        // Fallback: everyone has conflict, pick the one with lowest count from full pool
        const sortedPool = [...pool].sort((a, b) => {
          const countA = counts.get(a.id) || 0;
          const countB = counts.get(b.id) || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });
        selected = sortedPool[0];
        hasConflict = true;
        
        // Identify conflict reason for the UI
        const rec = selected.unavailableDays.find(ud => ud.dayOfWeek === dayOfWeek);
        const spec = selected.unavailableDates?.find(ud => isSameDay(new Date(ud.date), day));
        conflictReason = rec ? rec.role : (spec ? spec.role : 'Ocupado');
      } else {
        // 2. Preference: Try to find those who haven't worked on THIS day of week yet (e.g. avoid same person every Sunday)
        const notWorkedOnThisDayOfWeek = available.filter(m => {
          return !assignments.some(a => 
            a.team.members.some(tm => tm.id === m.id) && 
            getDay(a.date) === dayOfWeek
          );
        });

        const candidates = notWorkedOnThisDayOfWeek.length > 0 ? notWorkedOnThisDayOfWeek : available;

        // 3. Strict Rotation: Pick the one with the lowest total assignment count so far this month
        // This ensures "everyone participates before anyone repeats"
        const sortedCandidates = [...candidates].sort((a, b) => {
          const countA = counts.get(a.id) || 0;
          const countB = counts.get(b.id) || 0;
          if (countA !== countB) return countA - countB;
          // Randomize among those with same count to keep scale fresh
          return Math.random() - 0.5;
        });
        
        selected = sortedCandidates[0];
      }

      counts.set(selected.id, (counts.get(selected.id) || 0) + 1);
      return { member: selected, hasConflict, conflictReason };
    };

    const leaderResult = pickMember(leaders, 'Líder');

    // Rule: Wales and Arthur always together
    // Wales is a leader, Arthur is a participant.
    let participantPool = participants;
    const walesName = 'Wales';
    const arthurName = 'Arthur';
    const arthurMember = participants.find(p => p.name === arthurName);

    if (arthurMember) {
      if (leaderResult.member.name === walesName) {
        // If Wales is selected as leader, force Arthur as participant
        participantPool = [arthurMember];
      } else {
        // If any other leader is selected, ensure Arthur is NOT selected
        participantPool = participants.filter(p => p.name !== arthurName);
      }
    }

    const participantResult = participantPool.length > 0 ? pickMember(participantPool, 'Auxiliar') : null;

    let finalConflictReason = '';
    if (leaderResult.hasConflict) finalConflictReason = `Líder: ${leaderResult.conflictReason}`;
    if (participantResult?.hasConflict) {
      const pReason = `Auxiliar: ${participantResult.conflictReason}`;
      finalConflictReason = finalConflictReason ? `${finalConflictReason}, ${pReason}` : pReason;
    }

    assignments.push({
      date: day,
      team: {
        id: `gen-${index}`,
        members: participantResult ? [leaderResult.member, participantResult.member] : [leaderResult.member]
      },
      hasConflict: leaderResult.hasConflict || (participantResult?.hasConflict ?? false),
      conflictReason: finalConflictReason || undefined
    });
  });

  return assignments;
}
