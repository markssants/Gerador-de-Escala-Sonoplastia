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
    
    const getLeaderTier = (m: Member): number => {
      const isEdmilson = m.name === 'Edmilson' || m.name === 'Edimilson';
      const count = counts.get(m.id) || 0;
      if (!isEdmilson) {
        // Priority for main leaders: 2 times per month each
        if (count < 2) return 1;
        return 4; // Main leaders if already >= 2 times
      } else {
        // Minor leader (Edmilson): 1 time per month, and 2 times when possible
        if (count < 1) return 2;
        if (count < 2) return 3;
        return 5; // Edmilson if already >= 2 times
      }
    };

    const pickLeader = () => {
      const available = leaders.filter(m => {
        const hasRecurring = m.unavailableDays.some(ud => ud.dayOfWeek === dayOfWeek);
        const hasSpecific = m.unavailableDates?.some(ud => isSameDay(new Date(ud.date), day));
        return !hasRecurring && !hasSpecific;
      });

      let selected: Member;
      let hasConflict = false;
      let conflictReason = '';

      if (available.length === 0) {
        const sortedPool = [...leaders].sort((a, b) => {
          const tierA = getLeaderTier(a);
          const tierB = getLeaderTier(b);
          if (tierA !== tierB) return tierA - tierB;
          const countA = counts.get(a.id) || 0;
          const countB = counts.get(b.id) || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });
        selected = sortedPool[0];
        hasConflict = true;
        
        const rec = selected.unavailableDays.find(ud => ud.dayOfWeek === dayOfWeek);
        const spec = selected.unavailableDates?.find(ud => isSameDay(new Date(ud.date), day));
        conflictReason = rec ? rec.role : (spec ? spec.role : 'Ocupado');
      } else {
        const minTier = Math.min(...available.map(getLeaderTier));
        const tierAvailable = available.filter(m => getLeaderTier(m) === minTier);

        const notWorkedOnThisDayOfWeek = tierAvailable.filter(m => {
          return !assignments.some(a => 
            a.team.members.some(tm => tm.id === m.id) && 
            getDay(a.date) === dayOfWeek
          );
        });

        const candidates = notWorkedOnThisDayOfWeek.length > 0 ? notWorkedOnThisDayOfWeek : tierAvailable;

        const sortedCandidates = [...candidates].sort((a, b) => {
          const countA = counts.get(a.id) || 0;
          const countB = counts.get(b.id) || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });
        
        selected = sortedCandidates[0];
      }

      counts.set(selected.id, (counts.get(selected.id) || 0) + 1);
      return { member: selected, hasConflict, conflictReason };
    };

    const pickParticipant = (pool: Member[]) => {
      const available = pool.filter(m => {
        const hasRecurring = m.unavailableDays.some(ud => ud.dayOfWeek === dayOfWeek);
        const hasSpecific = m.unavailableDates?.some(ud => isSameDay(new Date(ud.date), day));
        return !hasRecurring && !hasSpecific;
      });

      let selected: Member;
      let hasConflict = false;
      let conflictReason = '';

      if (available.length === 0) {
        const sortedPool = [...pool].sort((a, b) => {
          const countA = counts.get(a.id) || 0;
          const countB = counts.get(b.id) || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });
        selected = sortedPool[0];
        hasConflict = true;
        
        const rec = selected.unavailableDays.find(ud => ud.dayOfWeek === dayOfWeek);
        const spec = selected.unavailableDates?.find(ud => isSameDay(new Date(ud.date), day));
        conflictReason = rec ? rec.role : (spec ? spec.role : 'Ocupado');
      } else {
        const notWorkedOnThisDayOfWeek = available.filter(m => {
          return !assignments.some(a => 
            a.team.members.some(tm => tm.id === m.id) && 
            getDay(a.date) === dayOfWeek
          );
        });

        const candidates = notWorkedOnThisDayOfWeek.length > 0 ? notWorkedOnThisDayOfWeek : available;

        const sortedCandidates = [...candidates].sort((a, b) => {
          const countA = counts.get(a.id) || 0;
          const countB = counts.get(b.id) || 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });
        
        selected = sortedCandidates[0];
      }

      counts.set(selected.id, (counts.get(selected.id) || 0) + 1);
      return { member: selected, hasConflict, conflictReason };
    };

    const leaderResult = pickLeader();
    const participantResult = participants.length > 0 ? pickParticipant(participants) : null;

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
