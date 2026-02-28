import React from 'react';
import { Trash2, Users, Clock } from 'lucide-react';
import { format, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Member, DayOfWeek } from '../types';
import { DAYS_OF_WEEK_LABELS } from '../constants';
import { cn } from '../utils/cn';

interface MemberManagerProps {
  members: Member[];
  currentDate: Date;
  currentMonthServiceDays: Date[];
  onToggleUnavailableDate: (memberId: string, date: string) => void;
  onRemoveMember: (id: string) => void;
  onResetToDefault: () => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({
  members,
  currentDate,
  currentMonthServiceDays,
  onToggleUnavailableDate,
  onRemoveMember,
  onResetToDefault,
}) => {
  const diaconosOrder = ['Kalebe', 'Wales', 'Marcos', 'Joabe', 'Claudinei', 'L. Davi', 'Edmilson', 'Victor', 'Weverson', 'L. Fernando'];
  const recepcionistasOrder = ['Letícia', 'Weverson', 'Milena', 'L. Davi', 'Marcos'];
  const semAtribuicaoOrder = ['Kauan', 'Kalebe', 'Rebeca', 'Tamara', 'Carlos'];

  const diaconos = diaconosOrder
    .map(name => members.find(m => m.name === name && m.roles?.includes('Diácono')))
    .filter((m): m is Member => !!m);

  const recepcionistas = recepcionistasOrder
    .map(name => members.find(m => m.name === name && m.roles?.includes('Recepcionista')))
    .filter((m): m is Member => !!m);

  const semAtribuicao = semAtribuicaoOrder
    .map(name => members.find(m => m.name === name && (!m.roles || m.roles.length === 0)))
    .filter((m): m is Member => !!m);

  const renderMemberCard = (member: Member) => (
    <div key={member.id} className="p-6 flex flex-col gap-6 hover:bg-white/[0.01] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner",
              member.type === 'leader' ? "text-white" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            )}
            style={member.type === 'leader' && member.color ? { backgroundColor: member.color } : {}}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">{member.name}</h3>
            <div className="flex gap-2 mt-0.5">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                member.type === 'leader' ? "text-indigo-500" : "text-emerald-500"
              )}>
                {member.type === 'leader' ? 'Líder de Equipe' : 'Auxiliar de Som'}
              </span>
              {member.roles && member.roles.length > 0 && (
                <div className="flex gap-1">
                  {member.roles.map(role => (
                    <span key={role} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/5 font-bold uppercase tracking-widest">
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={() => onRemoveMember(member.id)}
          className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
          title="Remover Membro"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="grid grid-cols-3 gap-6">
          {[0, 3, 6].map((dayOfWeek) => {
            const days = currentMonthServiceDays.filter(d => getDay(d) === dayOfWeek);
            if (days.length === 0) return null;
            
            return (
              <div key={dayOfWeek} className="flex flex-col gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] text-center border-b border-white/5 pb-2">
                  {DAYS_OF_WEEK_LABELS[dayOfWeek as DayOfWeek]}s
                </span>
                <div className="flex flex-col gap-2">
                  {days.map((date, idx) => {
                    const dateStr = date.toISOString();
                    const commitment = (member.unavailableDates || []).find(ud => isSameDay(new Date(ud.date), date));
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => onToggleUnavailableDate(member.id, dateStr)}
                        className={cn(
                          "px-3 py-3 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1 w-full group relative overflow-hidden",
                          commitment
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/5"
                            : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        <span className="text-xs tracking-tight">{format(date, 'dd/MM')}</span>
                        {commitment && (
                          <span className="text-[9px] font-medium opacity-80 truncate w-full text-center px-1">
                            {commitment.role}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121720] rounded-2xl shadow-xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">Gerenciamento de Disponibilidade</h2>
            <p className="text-xs text-slate-500 mt-1">Marque os dias que o membro já possui compromisso em {format(currentDate, 'MMMM', { locale: ptBR })}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onResetToDefault}
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
            <div className="divide-y divide-white/5">
              {diaconos.length > 0 && (
                <div className="bg-indigo-500/5">
                  <div className="px-6 py-3 border-b border-white/5">
                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Diáconos</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {diaconos.map(renderMemberCard)}
                  </div>
                </div>
              )}
              {recepcionistas.length > 0 && (
                <div className="bg-emerald-500/5">
                  <div className="px-6 py-3 border-b border-white/5">
                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Recepcionistas</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {recepcionistas.map(renderMemberCard)}
                  </div>
                </div>
              )}
              {semAtribuicao.length > 0 && (
                <div className="bg-slate-500/5">
                  <div className="px-6 py-3 border-b border-white/5">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Sem Atribuição</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {semAtribuicao.map(renderMemberCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
};
