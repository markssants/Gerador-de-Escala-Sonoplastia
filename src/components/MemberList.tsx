import React from 'react';
import { Users, UserPlus, Shield, UserCheck } from 'lucide-react';
import { Member } from '../types';
import { cn } from '../utils/cn';

interface MemberListProps {
  members: Member[];
  theme: 'dark' | 'light';
}

export const MemberList: React.FC<MemberListProps> = ({ members, theme }) => {
  // Sort members: leaders first, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.type === 'leader' && b.type !== 'leader') return -1;
    if (a.type !== 'leader' && b.type === 'leader') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={cn(
        "rounded-2xl shadow-xl border overflow-hidden transition-colors",
        theme === 'dark' ? "bg-[#121720] border-white/5" : "bg-white border-slate-200"
      )}>
        <div className={cn(
          "p-6 border-b flex justify-between items-center transition-colors",
          theme === 'dark' ? "border-white/5" : "border-slate-100"
        )}>
          <div>
            <h2 className={cn(
              "text-lg font-semibold transition-colors",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>Lista de Membros</h2>
            <p className="text-xs text-slate-500 mt-1">Todos os membros cadastrados na equipe de sonoplastia</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
              theme === 'dark' ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
            )}>
              {members.length} Membros
            </div>
            <Users size={24} className={theme === 'dark' ? "text-slate-700" : "text-slate-200"} />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMembers.map((member) => {
              const isDiacono = member.roles?.includes('Diácono');
              const isRecepcionista = member.roles?.includes('Recepcionista');

              return (
                <div 
                  key={member.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all group",
                    theme === 'dark' 
                      ? "bg-white/[0.02] border-white/5 hover:border-indigo-500/30" 
                      : "bg-slate-50 border-slate-100 hover:border-indigo-500/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner transition-transform group-hover:scale-105",
                        member.type === 'leader' ? "text-white" : 
                        isDiacono ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        isRecepcionista ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      )}
                      style={member.type === 'leader' && member.color ? { backgroundColor: member.color } : {}}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-bold text-base tracking-tight truncate transition-colors",
                        theme === 'dark' ? "text-white" : "text-slate-900"
                      )}>
                        {member.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {member.type === 'leader' ? (
                          <div className="flex items-center gap-1 text-indigo-500">
                            <Shield size={10} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Líder</span>
                          </div>
                        ) : (
                          <div className={cn(
                            "flex items-center gap-1",
                            isDiacono ? "text-amber-400" : isRecepcionista ? "text-emerald-400" : "text-slate-500"
                          )}>
                            <UserCheck size={10} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Auxiliar</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {member.roles && member.roles.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {member.roles.map(role => (
                        <span 
                          key={role} 
                          className={cn(
                            "text-[8px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest transition-colors",
                            role === 'Diácono' ? (theme === 'dark' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-600 border-amber-200") :
                            role === 'Recepcionista' ? (theme === 'dark' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-600 border-emerald-200") :
                            theme === 'dark' ? "bg-white/5 text-slate-500 border-white/5" : "bg-white text-slate-400 border-slate-200"
                          )}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
