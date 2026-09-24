import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  AlertCircle, 
  Check, 
  Calendar, 
  User, 
  Users, 
  Clock, 
  ChevronRight,
  Shield,
  HelpCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { format, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Assignment, Member, DayOfWeek } from '../types';
import { checkAssignmentConflict } from '../utils/scheduler';
import { cn } from '../utils/cn';

interface ScheduleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Assignment[];
  members: Member[];
  onUpdateSchedule: (newSchedule: Assignment[]) => void;
  initialSelectedDate?: Date | null;
  theme: 'dark' | 'light';
}

export const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({
  isOpen,
  onClose,
  schedule,
  members,
  onUpdateSchedule,
  initialSelectedDate,
  theme,
}) => {
  // Currently selected assignment index
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    if (initialSelectedDate && schedule.length > 0) {
      const foundIdx = schedule.findIndex(a => isSameDay(new Date(a.date), initialSelectedDate));
      return foundIdx !== -1 ? foundIdx : 0;
    }
    return 0;
  });

  // Secondary date index for swapping between two days
  const [targetSwapIndex, setTargetSwapIndex] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'replace' | 'swap'>('replace');
  const [leaderSearch, setLeaderSearch] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');

  // Synchronize when initialSelectedDate changes
  React.useEffect(() => {
    if (initialSelectedDate && schedule.length > 0) {
      const foundIdx = schedule.findIndex(a => isSameDay(new Date(a.date), initialSelectedDate));
      if (foundIdx !== -1) {
        setSelectedIndex(foundIdx);
      }
    }
  }, [initialSelectedDate, schedule]);

  // Adjust selectedIndex if schedule length changes
  const safeSelectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, schedule.length - 1));
  const activeAssignment = schedule[safeSelectedIndex];

  // Count appearances of each member in current schedule
  const memberAppearanceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach(m => counts.set(m.id, 0));
    schedule.forEach(a => {
      a.team.members.forEach(m => {
        counts.set(m.id, (counts.get(m.id) || 0) + 1);
      });
    });
    return counts;
  }, [schedule, members]);

  // Helper to check individual member availability on a specific date
  const getMemberAvailabilityStatus = (member: Member, date: Date) => {
    const dow = getDay(date) as DayOfWeek;
    const recurring = member.unavailableDays?.find(ud => ud.dayOfWeek === dow);
    const specific = member.unavailableDates?.find(ud => isSameDay(new Date(ud.date), date));

    if (recurring) {
      return { available: false, reason: recurring.role };
    }
    if (specific) {
      return { available: false, reason: specific.role };
    }
    return { available: true, reason: null };
  };

  const getServiceTimeRange = (date: Date) => {
    const dow = getDay(date);
    if (dow === 6) return '08:40 as 12:00';
    if (dow === 0 || dow === 3) return '19:40 as 21:00';
    return format(date, 'HH:mm');
  };

  if (!isOpen || !activeAssignment) return null;

  const currentLeader = activeAssignment.team.members.find(m => m.type === 'leader');
  const currentParticipant = activeAssignment.team.members.find(m => m.type === 'participant');

  // Handle replacing the leader of the active assignment
  const handleReplaceLeader = (newLeader: Member) => {
    const nextSchedule = [...schedule];
    const currentMembers = activeAssignment.team.members;
    const participant = currentMembers.find(m => m.type === 'participant');

    // Replace leader
    const updatedTeamMembers = participant ? [newLeader, participant] : [newLeader];
    const conflictCheck = checkAssignmentConflict(activeAssignment.date, updatedTeamMembers);

    nextSchedule[safeSelectedIndex] = {
      ...activeAssignment,
      team: {
        ...activeAssignment.team,
        members: updatedTeamMembers,
      },
      hasConflict: conflictCheck.hasConflict,
      conflictReason: conflictCheck.conflictReason,
    };

    onUpdateSchedule(nextSchedule);
  };

  // Handle replacing the assistant/participant of the active assignment
  const handleReplaceParticipant = (newParticipant: Member | null) => {
    const nextSchedule = [...schedule];
    const leader = activeAssignment.team.members.find(m => m.type === 'leader') || activeAssignment.team.members[0];

    const updatedTeamMembers = newParticipant ? [leader, newParticipant] : [leader];
    const conflictCheck = checkAssignmentConflict(activeAssignment.date, updatedTeamMembers);

    nextSchedule[safeSelectedIndex] = {
      ...activeAssignment,
      team: {
        ...activeAssignment.team,
        members: updatedTeamMembers,
      },
      hasConflict: conflictCheck.hasConflict,
      conflictReason: conflictCheck.conflictReason,
    };

    onUpdateSchedule(nextSchedule);
  };

  // Handle swapping teams between two dates
  const handleSwapBetweenDates = (swapType: 'team' | 'leaders' | 'participants') => {
    if (targetSwapIndex === safeSelectedIndex || !schedule[targetSwapIndex]) return;

    const nextSchedule = [...schedule];
    const assignA = { ...nextSchedule[safeSelectedIndex] };
    const assignB = { ...nextSchedule[targetSwapIndex] };

    const leaderA = assignA.team.members.find(m => m.type === 'leader');
    const partA = assignA.team.members.find(m => m.type === 'participant');

    const leaderB = assignB.team.members.find(m => m.type === 'leader');
    const partB = assignB.team.members.find(m => m.type === 'participant');

    let newMembersA: Member[] = [];
    let newMembersB: Member[] = [];

    if (swapType === 'team') {
      newMembersA = [...assignB.team.members];
      newMembersB = [...assignA.team.members];
    } else if (swapType === 'leaders') {
      if (leaderB && partA) newMembersA = [leaderB, partA];
      else if (leaderB) newMembersA = [leaderB];
      else newMembersA = assignA.team.members;

      if (leaderA && partB) newMembersB = [leaderA, partB];
      else if (leaderA) newMembersB = [leaderA];
      else newMembersB = assignB.team.members;
    } else if (swapType === 'participants') {
      if (leaderA && partB) newMembersA = [leaderA, partB];
      else if (leaderA) newMembersA = [leaderA];
      else newMembersA = assignA.team.members;

      if (leaderB && partA) newMembersB = [leaderB, partA];
      else if (leaderB) newMembersB = [leaderB];
      else newMembersB = assignB.team.members;
    }

    const conflictA = checkAssignmentConflict(assignA.date, newMembersA);
    const conflictB = checkAssignmentConflict(assignB.date, newMembersB);

    nextSchedule[safeSelectedIndex] = {
      ...assignA,
      team: { ...assignA.team, members: newMembersA },
      hasConflict: conflictA.hasConflict,
      conflictReason: conflictA.conflictReason,
    };

    nextSchedule[targetSwapIndex] = {
      ...assignB,
      team: { ...assignB.team, members: newMembersB },
      hasConflict: conflictB.hasConflict,
      conflictReason: conflictB.conflictReason,
    };

    onUpdateSchedule(nextSchedule);
  };

  // Group members into leaders and participants
  const leaderCandidates = members
    .filter(m => m.name.toLowerCase().includes(leaderSearch.toLowerCase()))
    .sort((a, b) => {
      // Prioritize leaders first, then by alphabetical
      if (a.type === 'leader' && b.type !== 'leader') return -1;
      if (a.type !== 'leader' && b.type === 'leader') return 1;
      return a.name.localeCompare(b.name);
    });

  const participantCandidates = members
    .filter(m => m.name.toLowerCase().includes(participantSearch.toLowerCase()))
    .sort((a, b) => {
      // Prioritize participants first, then by alphabetical
      if (a.type === 'participant' && b.type !== 'participant') return -1;
      if (a.type !== 'participant' && b.type === 'participant') return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={cn(
        "w-full max-w-5xl h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200",
        theme === 'dark' ? "bg-[#10151f] border-white/10 text-slate-200" : "bg-white border-slate-200 text-slate-900"
      )}>
        {/* Modal Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between gap-4 flex-shrink-0",
          theme === 'dark' ? "bg-[#141a26] border-white/5" : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-bold tracking-tight",
                theme === 'dark' ? "text-white" : "text-slate-900"
              )}>
                Modificar Escala Gerada
              </h3>
              <p className="text-xs text-slate-500">
                Selecione o culto abaixo para trocar membros ou permutar escalas entre datas
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl transition-colors",
              theme === 'dark' ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-200 text-slate-500"
            )}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: List of all Cultos in Month */}
          <div className={cn(
            "w-full md:w-80 flex-shrink-0 border-r flex flex-col overflow-hidden",
            theme === 'dark' ? "border-white/5 bg-[#0b0e14]/50" : "border-slate-200 bg-slate-50/50"
          )}>
            <div className={cn(
              "p-3.5 border-b text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between",
              theme === 'dark' ? "border-white/5 bg-[#121720]" : "border-slate-200 bg-slate-100"
            )}>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-400" />
                Cultos Escalados ({schedule.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {schedule.map((assignment, idx) => {
                const isSelected = idx === safeSelectedIndex;
                const leader = assignment.team.members.find(m => m.type === 'leader');
                const participant = assignment.team.members.find(m => m.type === 'participant');

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedIndex(idx);
                      // default target swap index to another day if equal
                      if (targetSwapIndex === idx) {
                        setTargetSwapIndex(idx === 0 ? 1 : 0);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 group",
                      isSelected
                        ? "bg-indigo-500/15 border-indigo-500/40 shadow-sm"
                        : theme === 'dark'
                          ? "bg-white/[0.02] border-white/5 hover:bg-white/5 text-slate-400"
                          : "bg-white border-slate-200 hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn(
                          "text-[10px] font-black uppercase px-1.5 py-0.5 rounded leading-none",
                          isSelected
                            ? "bg-indigo-500 text-white"
                            : theme === 'dark' ? "bg-white/10 text-slate-300" : "bg-slate-200 text-slate-700"
                        )}>
                          {format(assignment.date, 'dd/MM')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {format(assignment.date, 'EEE', { locale: ptBR })}
                        </span>
                        {assignment.hasConflict && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 py-0.2 rounded font-bold">
                            Conflito
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold truncate text-slate-200">
                        <span className={isSelected ? "text-indigo-400 font-bold" : (theme === 'dark' ? "text-slate-200" : "text-slate-800")}>
                          {leader?.name || 'Sem Líder'}
                        </span>
                        {participant && (
                          <span className="text-slate-400 font-normal"> / {participant.name}</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight 
                      size={14} 
                      className={cn(
                        "flex-shrink-0 transition-transform",
                        isSelected ? "text-indigo-400 translate-x-0.5" : "text-slate-600 opacity-0 group-hover:opacity-100"
                      )} 
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Assignment Editor */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Active Culto Header Card */}
            <div className={cn(
              "p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm",
              activeAssignment.hasConflict 
                ? "bg-rose-500/10 border-rose-500/30" 
                : theme === 'dark' ? "bg-[#141a26] border-white/5" : "bg-slate-50 border-slate-200"
            )}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                    activeAssignment.hasConflict 
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  )}>
                    {format(activeAssignment.date, 'EEEE', { locale: ptBR })}
                  </span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {getServiceTimeRange(activeAssignment.date)}
                  </span>
                </div>
                <h4 className={cn(
                  "text-xl font-bold tracking-tight",
                  theme === 'dark' ? "text-white" : "text-slate-900"
                )}>
                  Culto de {format(activeAssignment.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h4>
              </div>

              {/* Navigation between cultos */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  disabled={safeSelectedIndex <= 0}
                  onClick={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                    theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Culto Anterior
                </button>
                <button
                  disabled={safeSelectedIndex >= schedule.length - 1}
                  onClick={() => setSelectedIndex(prev => Math.min(schedule.length - 1, prev + 1))}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                    theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Próximo Culto
                </button>
              </div>
            </div>

            {/* Conflict Alert Banner if active assignment has conflict */}
            {activeAssignment.hasConflict && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-3">
                <AlertCircle size={18} className="flex-shrink-0 text-rose-400" />
                <div className="text-xs">
                  <span className="font-bold">Aviso de Indisponibilidade:</span> {activeAssignment.conflictReason || 'Membro escalado possui restrição nesta data.'}
                </div>
              </div>
            )}

            {/* Tab switch: Trocar Membro individual vs Trocar entre Dois Dias */}
            <div className="flex items-center gap-2 border-b pb-3 border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('replace')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                  activeTab === 'replace'
                    ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                    : theme === 'dark' 
                      ? "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10" 
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                )}
              >
                <Users size={14} />
                Substituir Integrante Deste Dia
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('swap')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                  activeTab === 'swap'
                    ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                    : theme === 'dark' 
                      ? "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10" 
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                )}
              >
                <ArrowLeftRight size={14} />
                Permutar / Trocar com Outro Dia
              </button>
            </div>

            {/* Content for Tab 1: Replace Leader / Replace Assistant */}
            {activeTab === 'replace' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. SELEÇÃO DE LÍDER */}
                <div className={cn(
                  "p-4 rounded-2xl border flex flex-col gap-3",
                  theme === 'dark' ? "bg-[#141a26]/60 border-white/5" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Shield size={14} />
                      Líder de Equipe
                    </span>
                    {currentLeader && (
                      <span className="text-[10px] text-slate-400">
                        Atual: <strong className={theme === 'dark' ? "text-white" : "text-slate-900"}>{currentLeader.name}</strong>
                      </span>
                    )}
                  </div>

                  {/* Filter leaders */}
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={leaderSearch}
                    onChange={(e) => setLeaderSearch(e.target.value)}
                    className={cn(
                      "w-full px-3 py-1.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                      theme === 'dark' ? "bg-[#0b0e14] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />

                  {/* List of candidates for Leader */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {leaderCandidates.map(member => {
                      const isCurrent = currentLeader?.id === member.id;
                      const count = memberAppearanceCounts.get(member.id) || 0;
                      const availability = getMemberAvailabilityStatus(member, activeAssignment.date);

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleReplaceLeader(member)}
                          className={cn(
                            "w-full p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-2 group",
                            isCurrent
                              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-200 font-bold"
                              : theme === 'dark'
                                ? "bg-white/[0.02] border-white/5 hover:bg-white/10 text-slate-300"
                                : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner flex-shrink-0",
                                member.type === 'leader' ? "text-white" : theme === 'dark' ? "bg-white/10 text-slate-400" : "bg-slate-200 text-slate-600"
                              )}
                              style={member.type === 'leader' && member.color ? { backgroundColor: member.color } : {}}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs truncate font-bold">{member.name}</span>
                                {member.type === 'leader' && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-black">L</span>
                                )}
                              </div>
                              <div className="text-[10px] flex items-center gap-1 mt-0.5">
                                <span className="text-slate-400">{count}x no mês</span>
                                {!availability.available && (
                                  <span className="text-rose-400 font-bold">
                                    • ⚠️ {availability.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity">
                              Selecionar
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SELEÇÃO DE AUXILIAR */}
                <div className={cn(
                  "p-4 rounded-2xl border flex flex-col gap-3",
                  theme === 'dark' ? "bg-[#141a26]/60 border-white/5" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <User size={14} />
                      Auxiliar de Som
                    </span>
                    <div className="flex items-center gap-2">
                      {currentParticipant && (
                        <button
                          type="button"
                          onClick={() => handleReplaceParticipant(null)}
                          className="text-[10px] text-rose-400 hover:underline font-semibold"
                          title="Remover auxiliar e deixar apenas o líder"
                        >
                          Remover
                        </button>
                      )}
                      <span className="text-[10px] text-slate-400">
                        Atual: <strong className={theme === 'dark' ? "text-white" : "text-slate-900"}>{currentParticipant?.name || 'Nenhum'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Filter participants */}
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className={cn(
                      "w-full px-3 py-1.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                      theme === 'dark' ? "bg-[#0b0e14] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />

                  {/* List of candidates for Participant */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {participantCandidates.map(member => {
                      const isCurrent = currentParticipant?.id === member.id;
                      const count = memberAppearanceCounts.get(member.id) || 0;
                      const availability = getMemberAvailabilityStatus(member, activeAssignment.date);

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleReplaceParticipant(member)}
                          className={cn(
                            "w-full p-2.5 rounded-xl border transition-all text-left flex items-center justify-between gap-2 group",
                            isCurrent
                              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold"
                              : theme === 'dark'
                                ? "bg-white/[0.02] border-white/5 hover:bg-white/10 text-slate-300"
                                : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner flex-shrink-0",
                                member.type === 'leader' ? "text-white" : theme === 'dark' ? "bg-white/10 text-slate-400" : "bg-slate-200 text-slate-600"
                              )}
                              style={member.type === 'leader' && member.color ? { backgroundColor: member.color } : {}}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs truncate font-bold">{member.name}</span>
                                {member.type === 'participant' && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-black">Aux</span>
                                )}
                              </div>
                              <div className="text-[10px] flex items-center gap-1 mt-0.5">
                                <span className="text-slate-400">{count}x no mês</span>
                                {!availability.available && (
                                  <span className="text-rose-400 font-bold">
                                    • ⚠️ {availability.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity">
                              Selecionar
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Content for Tab 2: Permutar / Trocar com Outro Dia */}
            {activeTab === 'swap' && (
              <div className="space-y-5">
                <div className={cn(
                  "p-4 rounded-2xl border",
                  theme === 'dark' ? "bg-[#141a26]/60 border-white/5" : "bg-slate-50 border-slate-200"
                )}>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Selecione o culto de destino para permutar com {format(activeAssignment.date, "dd/MM (EEEE)", { locale: ptBR })}:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {schedule.map((assignment, idx) => {
                      if (idx === safeSelectedIndex) return null;
                      const isTarget = idx === targetSwapIndex;
                      const leader = assignment.team.members.find(m => m.type === 'leader');
                      const participant = assignment.team.members.find(m => m.type === 'participant');

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTargetSwapIndex(idx)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition-all",
                            isTarget
                              ? "bg-indigo-500/20 border-indigo-500 text-white shadow-sm"
                              : theme === 'dark'
                                ? "bg-white/[0.02] border-white/5 hover:bg-white/5 text-slate-400"
                                : "bg-white border-slate-200 hover:bg-slate-100 text-slate-600"
                          )}
                        >
                          <div className="text-[10px] font-bold uppercase text-indigo-400">
                            {format(assignment.date, "dd/MM (EEE)", { locale: ptBR })}
                          </div>
                          <div className="text-xs font-bold truncate mt-0.5">
                            {leader?.name || '---'} {participant ? `/ ${participant.name}` : ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview of the Swap */}
                {schedule[targetSwapIndex] && (
                  <div className={cn(
                    "p-4 rounded-2xl border space-y-4",
                    theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Escolha o tipo de troca que deseja realizar:
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Option 1: Swap Entire Team */}
                      <div className={cn(
                        "p-3.5 rounded-2xl border flex flex-col justify-between gap-3",
                        theme === 'dark' ? "bg-[#10151f] border-white/5" : "bg-white border-slate-200"
                      )}>
                        <div>
                          <div className="font-bold text-xs text-indigo-400 flex items-center gap-1.5 mb-1">
                            <ArrowLeftRight size={14} /> Trocar Equipe Completa
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Inverte completamente os membros do dia {format(activeAssignment.date, 'dd/MM')} com o dia {format(schedule[targetSwapIndex].date, 'dd/MM')}.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSwapBetweenDates('team')}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20"
                        >
                          Trocar Equipes
                        </button>
                      </div>

                      {/* Option 2: Swap Leaders Only */}
                      <div className={cn(
                        "p-3.5 rounded-2xl border flex flex-col justify-between gap-3",
                        theme === 'dark' ? "bg-[#10151f] border-white/5" : "bg-white border-slate-200"
                      )}>
                        <div>
                          <div className="font-bold text-xs text-amber-400 flex items-center gap-1.5 mb-1">
                            <Shield size={14} /> Trocar Apenas Líderes
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Mantém os auxiliares nos seus dias e troca somente os líderes entre as duas datas.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSwapBetweenDates('leaders')}
                          className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20"
                        >
                          Trocar Líderes
                        </button>
                      </div>

                      {/* Option 3: Swap Participants Only */}
                      <div className={cn(
                        "p-3.5 rounded-2xl border flex flex-col justify-between gap-3",
                        theme === 'dark' ? "bg-[#10151f] border-white/5" : "bg-white border-slate-200"
                      )}>
                        <div>
                          <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5 mb-1">
                            <User size={14} /> Trocar Apenas Auxiliares
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Mantém os líderes nos seus dias e troca somente os auxiliares de som.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSwapBetweenDates('participants')}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
                        >
                          Trocar Auxiliares
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={cn(
          "px-6 py-4 border-t flex items-center justify-between gap-3 flex-shrink-0",
          theme === 'dark' ? "bg-[#141a26] border-white/5" : "bg-slate-50 border-slate-200"
        )}>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>As modificações são salvas automaticamente na escala.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            Concluir Modificações
          </button>
        </div>
      </div>
    </div>
  );
};
