import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  ShieldCheck,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react';
import { 
  format, 
  getDay, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Member, Team, Assignment, DayOfWeek, MemberType } from './types';
import { generateSchedule } from './utils/scheduler';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado'
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function App() {
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('sonosched_members_v5');
    if (saved) return JSON.parse(saved);
    
    // Default sample members
    return [
      { id: '1', name: 'Carlos', type: 'leader', unavailableDays: [], color: '#6366f1' },
      { id: '2', name: 'Claudinei', type: 'leader', unavailableDays: [], color: '#10b981' },
      { id: '3', name: 'Marcos', type: 'leader', unavailableDays: [], color: '#f59e0b' },
      { id: '4', name: 'Tamara', type: 'leader', unavailableDays: [], color: '#f43f5e' },
      { id: '5', name: 'Victor', type: 'leader', unavailableDays: [], color: '#8b5cf6' },
      { id: '6', name: 'Wales', type: 'leader', unavailableDays: [], color: '#06b6d4' },
      { id: '7', name: 'Rebeca', type: 'participant', unavailableDays: [] },
      { id: '8', name: 'Joabe', type: 'participant', unavailableDays: [] },
      { id: '9', name: 'Milena', type: 'participant', unavailableDays: [] },
      { id: '10', name: 'Weverson', type: 'participant', unavailableDays: [] },
      { id: '11', name: 'Letícia', type: 'participant', unavailableDays: [] },
      { id: '12', name: 'Kalebe', type: 'participant', unavailableDays: [] },
      { id: '13', name: 'Luis', type: 'participant', unavailableDays: [] },
      { id: '14', name: 'Kauan', type: 'participant', unavailableDays: [] },
      { id: '15', name: 'Edmilson', type: 'participant', unavailableDays: [] },
      { id: '16', name: 'Davi', type: 'participant', unavailableDays: [] },
    ];
  });
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'schedule'>('schedule');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  
  // Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberType, setNewMemberType] = useState<MemberType>('leader');

  useEffect(() => {
    localStorage.setItem('sonosched_members_v5', JSON.stringify(members));
  }, [members]);

  const handleResetToDefault = () => {
    if (confirm('Deseja resetar a lista de membros para o padrão? Isso apagará todos os membros atuais.')) {
      const defaultMembers: Member[] = [
        { id: '1', name: 'Carlos', type: 'leader', unavailableDays: [], color: '#6366f1' },
        { id: '2', name: 'Claudinei', type: 'leader', unavailableDays: [], color: '#10b981' },
        { id: '3', name: 'Marcos', type: 'leader', unavailableDays: [], color: '#f59e0b' },
        { id: '4', name: 'Tamara', type: 'leader', unavailableDays: [], color: '#f43f5e' },
        { id: '5', name: 'Victor', type: 'leader', unavailableDays: [], color: '#8b5cf6' },
        { id: '6', name: 'Wales', type: 'leader', unavailableDays: [], color: '#06b6d4' },
        { id: '7', name: 'Rebeca', type: 'participant', unavailableDays: [] },
        { id: '8', name: 'Joabe', type: 'participant', unavailableDays: [] },
        { id: '9', name: 'Milena', type: 'participant', unavailableDays: [] },
        { id: '10', name: 'Weverson', type: 'participant', unavailableDays: [] },
        { id: '11', name: 'Letícia', type: 'participant', unavailableDays: [] },
        { id: '12', name: 'Kalebe', type: 'participant', unavailableDays: [] },
        { id: '13', name: 'Luis', type: 'participant', unavailableDays: [] },
        { id: '14', name: 'Kauan', type: 'participant', unavailableDays: [] },
        { id: '15', name: 'Edmilson', type: 'participant', unavailableDays: [] },
        { id: '16', name: 'Davi', type: 'participant', unavailableDays: [] },
      ];
      setMembers(defaultMembers);
      setSchedule([]);
    }
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    
    // Assign a random color if it's a leader
    const leaderColors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
    const randomColor = leaderColors[Math.floor(Math.random() * leaderColors.length)];

    const newMember: Member = {
      id: crypto.randomUUID(),
      name: newMemberName,
      type: newMemberType,
      unavailableDays: [],
      color: newMemberType === 'leader' ? randomColor : undefined
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const toggleUnavailableDay = (memberId: string, day: DayOfWeek) => {
    setMembers(members.map(m => {
      if (m.id === memberId) {
        const exists = m.unavailableDays.find(ud => ud.dayOfWeek === day);
        if (exists) {
          return { ...m, unavailableDays: m.unavailableDays.filter(ud => ud.dayOfWeek !== day) };
        } else {
          return { ...m, unavailableDays: [...m.unavailableDays, { dayOfWeek: day, role: 'Ocupado' }] };
        }
      }
      return m;
    }));
  };

  const addUnavailableDate = (memberId: string, date: string, role: string) => {
    if (!date || !role) return;
    setMembers(members.map(m => {
      if (m.id === memberId) {
        const dates = m.unavailableDates || [];
        if (dates.some(d => d.date === date)) return m;
        return { ...m, unavailableDates: [...dates, { date, role }] };
      }
      return m;
    }));
  };

  const removeUnavailableDate = (memberId: string, date: string) => {
    setMembers(members.map(m => {
      if (m.id === memberId) {
        return { ...m, unavailableDates: (m.unavailableDates || []).filter(d => d.date !== date) };
      }
      return m;
    }));
  };

  const handleGenerate = () => {
    const leaders = members.filter(m => m.type === 'leader');
    const participants = members.filter(m => m.type === 'participant');

    if (leaders.length < 6 || participants.length < 4) {
      alert('Você precisa de pelo menos 6 líderes e 4 auxiliares para gerar as equipes (4 equipes com auxiliares e 2 equipes individuais).');
      return;
    }

    const newSchedule = generateSchedule(
      currentDate.getMonth(),
      currentDate.getFullYear(),
      members
    );
    setSchedule(newSchedule);
  };

  const leadersCount = members.filter(m => m.type === 'leader').length;
  const participantsCount = members.filter(m => m.type === 'participant').length;

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-[#121720]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={20} />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white">SonoSched</h1>
          </div>
          
          <nav className="flex gap-1 bg-white/5 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('schedule')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'schedule' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              Escala
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'members' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              Membros
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'members' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Add Member Card */}
              <div className="bg-[#121720] p-6 rounded-2xl shadow-xl border border-white/5 h-fit">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <UserPlus size={20} className="text-indigo-400" />
                  Novo Membro
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome</label>
                    <input 
                      type="text" 
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Função</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setNewMemberType('leader')}
                        className={cn(
                          "py-2 rounded-xl text-sm font-medium border transition-all",
                          newMemberType === 'leader' ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                        )}
                      >
                        Líder
                      </button>
                      <button 
                        onClick={() => setNewMemberType('participant')}
                        className={cn(
                          "py-2 rounded-xl text-sm font-medium border transition-all",
                          newMemberType === 'participant' ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                        )}
                      >
                        Auxiliar
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddMember}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                  >
                    <Plus size={18} />
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Stats Card */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-[#121720] p-6 rounded-2xl shadow-xl border border-white/5 flex flex-col justify-between group">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Líderes</span>
                  <div className="flex items-end justify-between">
                    <span className="text-5xl font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tighter">{leadersCount}</span>
                    <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold tracking-widest uppercase", leadersCount >= 6 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>
                      {leadersCount >= 6 ? 'OK' : 'Mínimo 6'}
                    </span>
                  </div>
                </div>
                <div className="bg-[#121720] p-6 rounded-2xl shadow-xl border border-white/5 flex flex-col justify-between group">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Auxiliares</span>
                  <div className="flex items-end justify-between">
                    <span className="text-5xl font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tighter">{participantsCount}</span>
                    <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold tracking-widest uppercase", participantsCount >= 4 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>
                      {participantsCount >= 4 ? 'OK' : 'Mínimo 4'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-[#121720] rounded-2xl shadow-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-white">Lista de Membros e Restrições</h2>
                  <p className="text-xs text-slate-500 mt-1">Marque os dias que o membro já possui compromisso (Diácono, Recepção, etc.)</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleResetToDefault}
                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors"
                  >
                    Resetar para Padrão
                  </button>
                  <Users size={24} className="text-slate-700" />
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {members.length === 0 ? (
                  <div className="p-16 text-center text-slate-600 flex flex-col items-center gap-3">
                    <Users size={40} className="opacity-20" />
                    <p className="font-medium">Nenhum membro cadastrado ainda.</p>
                  </div>
                ) : (
                  members.map(member => (
                    <div key={member.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div 
                          className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner",
                            member.type === 'leader' ? "text-white" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}
                          style={member.type === 'leader' && member.color ? { backgroundColor: member.color } : {}}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{member.name}</h3>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest",
                            member.type === 'leader' ? "text-indigo-500" : "text-emerald-500"
                          )}>
                            {member.type === 'leader' ? 'Líder' : 'Auxiliar'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mr-2">Indisponível em:</span>
                          {[0, 3, 6].map((day) => (
                            <button
                              key={day}
                              onClick={() => toggleUnavailableDay(member.id, day as DayOfWeek)}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                member.unavailableDays.some(ud => ud.dayOfWeek === day)
                                  ? "bg-rose-500/10 border-rose-500/50 text-rose-400"
                                  : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                              )}
                            >
                              {DAYS_OF_WEEK_LABELS[day as DayOfWeek]}
                            </button>
                          ))}
                          <button 
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all ml-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        {/* Specific Dates Section */}
                        <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compromissos Extras (Diaconato, Recepção, etc.)</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(member.unavailableDates || []).map((ud, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg">
                                <span className="text-[10px] font-bold text-indigo-400">{format(new Date(ud.date), 'dd/MM')}</span>
                                <span className="text-[10px] text-slate-400">({ud.role})</span>
                                <button 
                                  onClick={() => removeUnavailableDate(member.id, ud.date)}
                                  className="text-slate-500 hover:text-rose-400"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input 
                              type="date" 
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/50"
                              onChange={(e) => {
                                const date = e.target.value;
                                if (date) {
                                  const role = prompt('Qual o compromisso? (Ex: Diaconato, Recepção)');
                                  if (role) addUnavailableDate(member.id, date, role);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <p className="text-[9px] text-slate-600 self-center italic">Selecione uma data para adicionar um compromisso</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Schedule Controls */}
            <div className="bg-[#121720] p-6 rounded-2xl shadow-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-center min-w-[180px]">
                  <h2 className="text-2xl font-bold capitalize text-white tracking-tight">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                </div>
                <button 
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'calendar' ? "bg-indigo-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'list' ? "bg-indigo-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <List size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSchedule([])}
                    className="px-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-300 transition-all uppercase tracking-widest"
                  >
                    Limpar
                  </button>
                  <button 
                    onClick={handleGenerate}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                  >
                    <Settings size={20} />
                    Gerar Escala
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {schedule.length === 0 ? (
                  <div className="col-span-full bg-[#121720]/50 border-2 border-dashed border-white/5 rounded-3xl p-20 text-center flex flex-col items-center gap-4">
                    <CalendarIcon size={56} className="text-slate-800" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Nenhuma escala gerada</h3>
                      <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Clique no botão acima para sortear as equipes respeitando as restrições de cada membro.</p>
                    </div>
                  </div>
                ) : (
                  schedule.map((assignment, idx) => (
                    <div key={idx} className="bg-[#121720] rounded-2xl shadow-xl border border-white/5 overflow-hidden hover:border-indigo-500/30 transition-all group">
                      <div className={cn(
                        "p-5 border-b flex justify-between items-center",
                        assignment.hasConflict ? "bg-rose-500/10 border-rose-500/20" :
                        getDay(assignment.date) === 0 ? "bg-indigo-500/10 border-indigo-500/20" : 
                        getDay(assignment.date) === 3 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
                      )}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              assignment.hasConflict ? "text-rose-400" :
                              getDay(assignment.date) === 0 ? "text-indigo-400" : 
                              getDay(assignment.date) === 3 ? "text-emerald-400" : "text-amber-400"
                            )}>
                              {format(assignment.date, 'EEEE', { locale: ptBR })}
                            </span>
                            {assignment.hasConflict && (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="bg-rose-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-tighter flex items-center gap-0.5">
                                  <AlertCircle size={8} /> CONFLITO
                                </span>
                                {assignment.conflictReason && (
                                  <span className="text-[8px] text-rose-400 font-bold uppercase tracking-tighter">
                                    {assignment.conflictReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-lg text-white leading-tight">
                            {format(assignment.date, "dd 'de' MMMM", { locale: ptBR })}
                          </h4>
                        </div>
                        <div className="bg-black/20 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 border border-white/5">
                          {format(assignment.date, 'HH:mm')}
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        {assignment.team.members.map((m, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-4">
                            <div 
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-inner",
                                m.type === 'leader' ? "text-white" : "bg-white/5 text-slate-500 border border-white/5"
                              )}
                              style={m.type === 'leader' && m.color ? { backgroundColor: m.color } : {}}
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{m.name}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                                {m.type === 'leader' ? 'Líder' : 'Auxiliar'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-[#121720] rounded-3xl shadow-2xl border border-white/5 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
                  {WEEK_DAYS.map(day => (
                    <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-[120px]">
                  {calendarDays.map((day, idx) => {
                    const assignment = schedule.find(a => isSameDay(a.date, day));
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDay = isToday(day);
                    
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-2 border-r border-b border-white/5 transition-colors relative group",
                          !isCurrentMonth && "opacity-20",
                          isTodayDay && "bg-indigo-500/5"
                        )}
                      >
                        <span className={cn(
                          "text-xs font-bold mb-2 block",
                          isTodayDay ? "text-indigo-400" : "text-slate-500"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {assignment && (
                          <div className={cn(
                            "rounded-lg p-1.5 space-y-1 border shadow-lg",
                            assignment.hasConflict ? "bg-rose-500/10 border-rose-500/20" :
                            getDay(assignment.date) === 0 ? "bg-indigo-500/10 border-indigo-500/20" : 
                            getDay(assignment.date) === 3 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
                          )}>
                            {assignment.team.members.map((m, mIdx) => (
                              <div key={mIdx} className="flex items-center gap-1.5 overflow-hidden">
                                <div 
                                  className={cn(
                                    "w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold",
                                    m.type === 'leader' ? "text-white" : "bg-white/10 text-slate-400"
                                  )}
                                  style={m.type === 'leader' && m.color ? { backgroundColor: m.color } : {}}
                                >
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-[9px] font-bold text-white truncate">
                                  {m.name.split(' ')[0]}
                                </span>
                              </div>
                            ))}
                            {assignment.hasConflict && (
                              <div className="flex flex-col gap-0.5 mt-1">
                                <div className="text-[7px] font-black text-rose-400 flex items-center gap-0.5">
                                  <AlertCircle size={8} /> CONFLITO
                                </div>
                                {assignment.conflictReason && (
                                  <div className="text-[6px] text-rose-400/80 font-bold leading-none truncate">
                                    {assignment.conflictReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#121720] rounded-2xl border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-600 shadow-xl">
          <Clock size={14} className="text-indigo-500" />
          Dias de Culto: Domingo, Quarta e Sábado
        </div>
        <p className="mt-6 text-slate-700 text-[10px] font-bold uppercase tracking-[0.2em]">Sonoplastia &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
