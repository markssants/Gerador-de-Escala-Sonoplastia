import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Trash2, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  Volume2,
  Clock,
  LayoutGrid,
  List,
  Sun,
  Moon
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
import { generateSchedule, getServiceDays } from './utils/scheduler';
import { MemberManager } from './components/MemberManager';
import { cn } from './utils/cn';
import { DAYS_OF_WEEK_LABELS, WEEK_DAYS } from './constants';

export default function App() {
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('sonosched_members_v8');
    if (saved) return JSON.parse(saved);
    
    // Default sample members
    return [
      { id: '1', name: 'Carlos', type: 'leader', unavailableDays: [], color: '#6366f1', roles: [] },
      { id: '2', name: 'Claudinei', type: 'leader', unavailableDays: [], color: '#10b981', roles: ['Diácono'] },
      { id: '3', name: 'Marcos', type: 'leader', unavailableDays: [], color: '#f59e0b', roles: ['Diácono', 'Recepcionista'] },
      { id: '4', name: 'Tamara', type: 'leader', unavailableDays: [], color: '#f43f5e', roles: [] },
      { id: '5', name: 'Victor', type: 'leader', unavailableDays: [], color: '#8b5cf6', roles: ['Diácono'] },
      { id: '6', name: 'Wales', type: 'leader', unavailableDays: [], color: '#06b6d4', roles: ['Diácono'] },
      { id: '7', name: 'Rebeca', type: 'participant', unavailableDays: [], roles: [] },
      { id: '8', name: 'Joabe', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
      { id: '9', name: 'Milena', type: 'participant', unavailableDays: [], roles: ['Recepcionista'] },
      { id: '10', name: 'Weverson', type: 'participant', unavailableDays: [], roles: ['Diácono', 'Recepcionista'] },
      { id: '11', name: 'Letícia', type: 'participant', unavailableDays: [], roles: ['Recepcionista'] },
      { id: '12', name: 'Kalebe', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
      { id: '13', name: 'L. Fernando', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
      { id: '14', name: 'Kauan', type: 'participant', unavailableDays: [], roles: [] },
      { id: '15', name: 'Edmilson', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
      { id: '16', name: 'L. Davi', type: 'participant', unavailableDays: [], roles: ['Diácono', 'Recepcionista'] },
    ];
  });
  
  const [currentDate, setCurrentDate] = useState(addMonths(new Date(), 1));
  const [schedule, setSchedule] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'schedule'>('schedule');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('sonosched_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('sonosched_theme', theme);
  }, [theme]);
  
  const currentMonthServiceDays = useMemo(() => {
    return getServiceDays(currentDate.getMonth(), currentDate.getFullYear());
  }, [currentDate]);

  useEffect(() => {
    localStorage.setItem('sonosched_members_v8', JSON.stringify(members));
  }, [members]);

  const handleResetToDefault = () => {
    if (window.confirm('Deseja resetar a lista de membros para o padrão? Isso apagará todos os membros atuais.')) {
      const defaultMembers: Member[] = [
        { id: '1', name: 'Carlos', type: 'leader', unavailableDays: [], color: '#6366f1', roles: [] },
        { id: '2', name: 'Claudinei', type: 'leader', unavailableDays: [], color: '#10b981', roles: ['Diácono'] },
        { id: '3', name: 'Marcos', type: 'leader', unavailableDays: [], color: '#f59e0b', roles: ['Diácono', 'Recepcionista'] },
        { id: '4', name: 'Tamara', type: 'leader', unavailableDays: [], color: '#f43f5e', roles: [] },
        { id: '5', name: 'Victor', type: 'leader', unavailableDays: [], color: '#8b5cf6', roles: ['Diácono'] },
        { id: '6', name: 'Wales', type: 'leader', unavailableDays: [], color: '#06b6d4', roles: ['Diácono'] },
        { id: '7', name: 'Rebeca', type: 'participant', unavailableDays: [], roles: [] },
        { id: '8', name: 'Joabe', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
        { id: '9', name: 'Milena', type: 'participant', unavailableDays: [], roles: ['Recepcionista'] },
        { id: '10', name: 'Weverson', type: 'participant', unavailableDays: [], roles: ['Diácono', 'Recepcionista'] },
        { id: '11', name: 'Letícia', type: 'participant', unavailableDays: [], roles: ['Recepcionista'] },
        { id: '12', name: 'Kalebe', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
        { id: '13', name: 'L. Fernando', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
        { id: '14', name: 'Kauan', type: 'participant', unavailableDays: [], roles: [] },
        { id: '15', name: 'Edmilson', type: 'participant', unavailableDays: [], roles: ['Diácono'] },
        { id: '16', name: 'L. Davi', type: 'participant', unavailableDays: [], roles: ['Diácono', 'Recepcionista'] },
      ];
      setMembers(defaultMembers);
      setSchedule([]);
      localStorage.removeItem('sonosched_members_v8');
    }
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const toggleUnavailableDate = (memberId: string, date: string) => {
    setMembers(members.map(m => {
      if (m.id === memberId) {
        const dates = m.unavailableDates || [];
        const exists = dates.find(d => d.date === date);
        if (exists) {
          return { ...m, unavailableDates: dates.filter(d => d.date !== date) };
        } else {
          const role = prompt('Qual o compromisso? (Ex: Diaconato, Recepção)') || 'Ocupado';
          return { ...m, unavailableDates: [...dates, { date, role }] };
        }
      }
      return m;
    }));
  };

  const handleGenerate = () => {
    const leaders = members.filter(m => m.type === 'leader');
    const participants = members.filter(m => m.type === 'participant');

    if (leaders.length < 6 || participants.length < 4) {
      alert('Você precisa de pelo menos 6 líderes e 4 auxiliares para gerar as equipes.');
      return;
    }

    const newSchedule = generateSchedule(
      currentDate.getMonth(),
      currentDate.getFullYear(),
      members
    );
    setSchedule(newSchedule);
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300 selection:bg-indigo-500/30",
      theme === 'dark' ? "bg-[#0B0E14] text-slate-200" : "bg-slate-50 text-slate-900"
    )}>
      {/* Header */}
      <header className={cn(
        "backdrop-blur-md border-b sticky top-0 z-10 transition-colors duration-300",
        theme === 'dark' ? "bg-[#121720]/80 border-white/5" : "bg-white/80 border-slate-200"
      )}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Volume2 size={20} />
            </div>
            <h1 className={cn(
              "font-bold text-xl tracking-tight transition-colors",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>Escala Sonoplastia</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "p-2 rounded-xl border transition-all",
                theme === 'dark' 
                  ? "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10" 
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              )}
              title={theme === 'dark' ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <nav className={cn(
              "flex gap-1 p-1 rounded-xl transition-colors",
              theme === 'dark' ? "bg-white/5" : "bg-slate-100"
            )}>
              <button 
                onClick={() => setActiveTab('schedule')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'schedule' 
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                    : theme === 'dark' ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-500 hover:text-slate-700 hover:bg-white"
                )}
              >
                Escala
              </button>
              <button 
                onClick={() => setActiveTab('members')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'members' 
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                    : theme === 'dark' ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-500 hover:text-slate-700 hover:bg-white"
                )}
              >
                Membros
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'members' ? (
          <MemberManager 
            members={members}
            currentDate={currentDate}
            currentMonthServiceDays={currentMonthServiceDays}
            onToggleUnavailableDate={toggleUnavailableDate}
            onRemoveMember={handleRemoveMember}
            onResetToDefault={handleResetToDefault}
            theme={theme}
          />
        ) : (
          <div className="space-y-6">
            {/* Schedule Controls */}
            <div className={cn(
              "p-6 rounded-2xl shadow-xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-colors",
              theme === 'dark' ? "bg-[#121720] border-white/5" : "bg-white border-slate-200"
            )}>
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className={cn(
                    "p-3 rounded-xl transition-all border",
                    theme === 'dark' 
                      ? "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/5" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200"
                  )}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-center min-w-[180px]">
                  <h2 className={cn(
                    "text-2xl font-bold capitalize tracking-tight transition-colors",
                    theme === 'dark' ? "text-white" : "text-slate-900"
                  )}>
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                </div>
                <button 
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className={cn(
                    "p-3 rounded-xl transition-all border",
                    theme === 'dark' 
                      ? "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/5" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200"
                  )}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex p-1 rounded-xl border transition-colors",
                  theme === 'dark' ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-200"
                )}>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'list' ? "bg-indigo-500 text-white shadow-lg" : theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <List size={20} />
                  </button>
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'calendar' ? "bg-indigo-500 text-white shadow-lg" : theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <LayoutGrid size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSchedule([])}
                    className={cn(
                      "px-4 py-3 text-sm font-bold transition-all uppercase tracking-widest",
                      theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                    )}
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
                  <div className={cn(
                    "col-span-full border-2 border-dashed rounded-3xl p-20 text-center flex flex-col items-center gap-4 transition-colors",
                    theme === 'dark' ? "bg-[#121720]/50 border-white/5" : "bg-white/50 border-slate-200"
                  )}>
                    <CalendarIcon size={56} className={theme === 'dark' ? "text-slate-800" : "text-slate-200"} />
                    <div>
                      <h3 className={cn(
                        "text-xl font-bold transition-colors",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                      )}>Nenhuma escala gerada</h3>
                      <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Clique no botão acima para sortear as equipes respeitando as restrições de cada membro.</p>
                    </div>
                  </div>
                ) : (
                  schedule.map((assignment, idx) => (
                    <div key={idx} className={cn(
                      "rounded-2xl shadow-xl border overflow-hidden transition-all group",
                      theme === 'dark' ? "bg-[#121720] border-white/5 hover:border-indigo-500/30" : "bg-white border-slate-200 hover:border-indigo-500/30"
                    )}>
                      <div className={cn(
                        "p-5 border-b flex justify-between items-center transition-colors",
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
                          <h4 className={cn(
                            "font-bold text-lg leading-tight transition-colors",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                          )}>
                            {format(assignment.date, "dd 'de' MMMM", { locale: ptBR })}
                          </h4>
                        </div>
                        <div className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors",
                          theme === 'dark' ? "bg-black/20 text-slate-400 border-white/5" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {format(assignment.date, 'HH:mm')}
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        {assignment.team.members.map((m, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-4">
                            <div 
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-inner transition-colors",
                                m.type === 'leader' ? "text-white" : theme === 'dark' ? "bg-white/5 text-slate-500 border border-white/5" : "bg-slate-50 text-slate-400 border-slate-200"
                              )}
                              style={m.type === 'leader' && m.color ? { backgroundColor: m.color } : {}}
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={cn(
                                "text-sm font-bold transition-colors group-hover:text-indigo-400",
                                theme === 'dark' ? "text-white" : "text-slate-900"
                              )}>{m.name}</p>
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
              <div className={cn(
                "rounded-3xl shadow-2xl border overflow-hidden transition-colors",
                theme === 'dark' ? "bg-[#121720] border-white/5" : "bg-white border-slate-200"
              )}>
                <div className={cn(
                  "grid grid-cols-7 border-b transition-colors",
                  theme === 'dark' ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-slate-50"
                )}>
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
                          "p-2 border-r border-b transition-colors relative group",
                          theme === 'dark' ? "border-white/5" : "border-slate-100",
                          !isCurrentMonth && "opacity-20",
                          isTodayDay && (theme === 'dark' ? "bg-indigo-500/5" : "bg-indigo-50")
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
                                    m.type === 'leader' ? "text-white" : theme === 'dark' ? "bg-white/10 text-slate-400" : "bg-slate-200 text-slate-500"
                                  )}
                                  style={m.type === 'leader' && m.color ? { backgroundColor: m.color } : {}}
                                >
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <span className={cn(
                                  "text-[9px] font-bold truncate transition-colors",
                                  theme === 'dark' ? "text-white" : "text-slate-700"
                                )}>
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
        <div className={cn(
          "inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest shadow-xl transition-colors",
          theme === 'dark' ? "bg-[#121720] border-white/5 text-slate-600" : "bg-white border-slate-200 text-slate-400"
        )}>
          <Clock size={14} className="text-indigo-500" />
          Dias de Culto: Domingo, Quarta e Sábado
        </div>
        <p className={cn(
          "mt-6 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors",
          theme === 'dark' ? "text-slate-700" : "text-slate-300"
        )}>Sonoplastia &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
