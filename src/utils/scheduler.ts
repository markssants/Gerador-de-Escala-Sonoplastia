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
    return dow === 0 || dow === 3 || dow === 6;
  });
}

export function generateSchedule(
  month: number, 
  year: number, 
  members: Member[]
): Assignment[] {
  const serviceDays = getServiceDays(month, year);
  const assignments: Assignment[] = [];
  
  const leaders = members.filter(m => m.type === 'leader').sort(() => Math.random() - 0.5);
  const participants = members.filter(m => m.type === 'participant').sort(() => Math.random() - 0.5);

  if (leaders.length === 0) return [];

  // Queues for rotation to ensure everyone is used before repeating
  let leaderQueue = [...leaders];
  let participantQueue = [...participants];

  serviceDays.forEach((day, index) => {
    const dayOfWeek = getDay(day) as DayOfWeek;
    
    // 1. Pick Leader
    let selectedLeader: Member | null = null;
    for (let i = 0; i < leaderQueue.length; i++) {
      const candidate = leaderQueue[i];
      const hasRecurringConflict = candidate.unavailableDays.some(ud => ud.dayOfWeek === dayOfWeek);
      const hasSpecificConflict = candidate.unavailableDates?.some(ud => isSameDay(new Date(ud.date), day));
      
      if (!hasRecurringConflict && !hasSpecificConflict) {
        selectedLeader = candidate;
        leaderQueue.splice(i, 1);
        leaderQueue.push(selectedLeader);
        break;
      }
    }
    // Fallback if everyone has conflict
    if (!selectedLeader) {
      selectedLeader = leaderQueue.shift()!;
      leaderQueue.push(selectedLeader);
    }

    // 2. Pick Participant (1 per day)
    let selectedParticipant: Member | null = null;
    let participantConflict = false;

    if (participants.length > 0) {
      for (let i = 0; i < participantQueue.length; i++) {
        const candidate = participantQueue[i];
        const recurringConflict = candidate.unavailableDays.some(ud => ud.dayOfWeek === dayOfWeek);
        const specificConflict = candidate.unavailableDates?.some(ud => isSameDay(new Date(ud.date), day));
        
        if (!recurringConflict && !specificConflict) {
          selectedParticipant = candidate;
          participantQueue.splice(i, 1);
          participantQueue.push(selectedParticipant);
          break;
        }
      }
      // Fallback if everyone has conflict
      if (!selectedParticipant) {
        selectedParticipant = participantQueue.shift()!;
        participantQueue.push(selectedParticipant);
        participantConflict = true;
      }
    }

    // Check if leader also had conflict for the final flag
    const leaderRecurringConflict = selectedLeader.unavailableDays.find(ud => ud.dayOfWeek === dayOfWeek);
    const leaderSpecificConflict = selectedLeader.unavailableDates?.find(ud => isSameDay(new Date(ud.date), day));
    const leaderConflict = !!(leaderRecurringConflict || leaderSpecificConflict);
    
    let conflictReason = '';
    if (leaderRecurringConflict) conflictReason = `Líder: ${leaderRecurringConflict.role}`;
    if (leaderSpecificConflict) conflictReason = `Líder: ${leaderSpecificConflict.role}`;
    if (participantConflict) {
      const pRecurring = selectedParticipant?.unavailableDays.find(ud => ud.dayOfWeek === dayOfWeek);
      const pSpecific = selectedParticipant?.unavailableDates?.find(ud => isSameDay(new Date(ud.date), day));
      if (pRecurring) conflictReason = conflictReason ? `${conflictReason}, Auxiliar: ${pRecurring.role}` : `Auxiliar: ${pRecurring.role}`;
      if (pSpecific) conflictReason = conflictReason ? `${conflictReason}, Auxiliar: ${pSpecific.role}` : `Auxiliar: ${pSpecific.role}`;
    }

    assignments.push({
      date: day,
      team: {
        id: `gen-${index}`,
        members: selectedParticipant ? [selectedLeader, selectedParticipant] : [selectedLeader]
      },
      hasConflict: participantConflict || leaderConflict,
      conflictReason: conflictReason || undefined
    });
  });

  return assignments;
}
