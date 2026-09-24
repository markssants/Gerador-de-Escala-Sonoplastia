import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  Users, 
  FileText, 
  Info,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Member } from '../types';
import { parseScheduleMessage, ParsedItem } from '../utils/messageParser';
import { cn } from '../utils/cn';

interface MessageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentDate: Date;
  serviceDays: Date[];
  onApply: (items: { memberId: string; date: string; role: string }[], replaceMonth: boolean) => void;
  theme: 'dark' | 'light';
}

const SAMPLE_MESSAGE = `Dia 03 (Sábado): Sebastião / Luiz Davi   
Dia 04 (Domingo): Giovanni / Gecil   
Dia 07 (Quarta-feira): Juvenil / Luiz Flor   
Dia 10 (Sábado): Luiz Fernando / Fabio   
Dia 11 (Domingo): Osvaldo / Vantuil   
Dia 14 (Quarta-feira): Wales / Arthur   
Dia 17 (Sábado): Kalebe / Valdenilson   
Dia 18 (Domingo): Marcos A. / Joabe   
Dia 21 (Quarta-feira): Claudinei / Eldiney   
Dia 24 (Sábado): Carlos E. / Eduardo   
Dia 25 (Domingo): Henrique / Weverson   
Dia 28 (Quarta-feira): Victor H. / Edimilson   
Dia 31 (Sábado): Sebastião / Luiz Davi`;

export const MessageImportModal: React.FC<MessageImportModalProps> = ({
  isOpen,
  onClose,
  members,
  currentDate,
  serviceDays,
  onApply,
  theme,
}) => {
  const [inputText, setInputText] = useState('');
  const [roleMode, setRoleMode] = useState<'diacono' | 'recepcionista' | 'member_role' | 'custom'>('diacono');
  const [customRole, setCustomRole] = useState('Diácono');
  const [replaceMonth, setReplaceMonth] = useState(false);
  const [unselectedItemIds, setUnselectedItemIds] = useState<Set<string>>(new Set());

  // Parse whenever input text or role settings change
  const parsedData = useMemo(() => {
    return parseScheduleMessage(
      inputText,
      members,
      currentDate,
      serviceDays,
      roleMode,
      customRole
    );
  }, [inputText, members, currentDate, serviceDays, roleMode, customRole]);

  // Handle active selection state
  const selectedItems = useMemo(() => {
    return parsedData.items.filter(item => !unselectedItemIds.has(item.id));
  }, [parsedData.items, unselectedItemIds]);

  const toggleItemSelection = (id: string) => {
    setUnselectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setUnselectedItemIds(new Set());
  };

  const handleDeselectAll = () => {
    setUnselectedItemIds(new Set(parsedData.items.map(i => i.id)));
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_MESSAGE);
    setUnselectedItemIds(new Set());
  };

  const handleClear = () => {
    setInputText('');
    setUnselectedItemIds(new Set());
  };

  const handleConfirm = () => {
    if (selectedItems.length === 0) return;

    const payload = selectedItems.map(item => ({
      memberId: item.matchedMember.id,
      date: item.dateIso,
      role: item.role,
    }));

    onApply(payload, replaceMonth);
    onClose();
  };

  if (!isOpen) return null;

  const monthName = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  // Unique external members
  const uniqueUnmatched = Array.from(new Set(parsedData.unmatchedNames.map(u => u.name)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={cn(
        "w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200",
        theme === 'dark' ? "bg-[#10151f] border-white/10 text-slate-200" : "bg-white border-slate-200 text-slate-900"
      )}>
        {/* Header */}
        <div className={cn(
          "px-6 py-5 border-b flex items-center justify-between gap-4 flex-shrink-0",
          theme === 'dark' ? "bg-[#141a26] border-white/5" : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-bold tracking-tight",
                theme === 'dark' ? "text-white" : "text-slate-900"
              )}>
                Importar Indisponibilidade por Mensagem
              </h3>
              <p className="text-xs text-slate-500">
                Cole a mensagem do WhatsApp para marcar as indisponibilidades de <strong className="capitalize">{monthName}</strong>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Options & Textarea */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-400" />
                Mensagem da Escala Externa
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className={cn(
                    "text-xs px-3 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5",
                    theme === 'dark' 
                      ? "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30" 
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200"
                  )}
                >
                  <Sparkles size={12} />
                  Usar mensagem de exemplo
                </button>
                {inputText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1",
                      theme === 'dark'
                        ? "bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-white/5"
                        : "bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200"
                    )}
                  >
                    <Trash2 size={12} />
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={7}
                placeholder={`Cole o texto aqui, por exemplo:\n\nDia 03 (Sábado): Sebastião / Luiz Davi\nDia 04 (Domingo): Giovanni / Gecil\nDia 10 (Sábado): Luiz Fernando / Fabio\nDia 14 (Quarta-feira): Wales / Arthur\nDia 28 (Quarta-feira): Victor H. / Edimilson...`}
                className={cn(
                  "w-full rounded-2xl p-4 text-xs font-mono leading-relaxed border transition-all resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                  theme === 'dark' 
                    ? "bg-[#0b0e14] border-white/10 text-slate-200 placeholder:text-slate-600" 
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                )}
              />
            </div>
          </div>

          {/* Configuration Settings */}
          <div className={cn(
            "p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-4",
            theme === 'dark' ? "bg-[#141a26]/60 border-white/5" : "bg-slate-50 border-slate-200"
          )}>
            {/* Role Tag Configuration */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Motivo / Cargo da Indisponibilidade:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'diacono', label: 'Diácono' },
                  { id: 'recepcionista', label: 'Recepção' },
                  { id: 'member_role', label: 'Cargo do Membro' },
                  { id: 'custom', label: 'Outro...' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoleMode(opt.id as any)}
                    className={cn(
                      "px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center truncate",
                      roleMode === opt.id
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                        : theme === 'dark'
                          ? "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                          : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {roleMode === 'custom' && (
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Nome do compromisso (ex: Plantão, Louvor)"
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mt-2",
                    theme === 'dark' ? "bg-[#0b0e14] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  )}
                />
              )}
            </div>

            {/* Overwrite mode */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Comportamento da Importação:
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setReplaceMonth(false)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all",
                    !replaceMonth
                      ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-bold"
                      : theme === 'dark' ? "bg-white/5 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                  )}
                >
                  <span>Adicionar às indisponibilidades já existentes</span>
                  {!replaceMonth && <Check size={16} className="text-indigo-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setReplaceMonth(true)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all",
                    replaceMonth
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold"
                      : theme === 'dark' ? "bg-white/5 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                  )}
                >
                  <span>Substituir todas as indisponibilidades deste mês</span>
                  {replaceMonth && <Check size={16} className="text-rose-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Results Preview */}
          {inputText.trim().length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-indigo-400" />
                  <h4 className={cn(
                    "text-sm font-bold",
                    theme === 'dark' ? "text-white" : "text-slate-900"
                  )}>
                    Prévia de Reconhecimento ({selectedItems.length} selecionados)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-indigo-400 hover:underline font-semibold"
                  >
                    Marcar todos
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs text-slate-400 hover:underline font-semibold"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              {parsedData.items.length === 0 ? (
                <div className={cn(
                  "p-8 rounded-2xl border text-center flex flex-col items-center gap-2",
                  theme === 'dark' ? "bg-[#141a26]/40 border-white/5 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-500"
                )}>
                  <AlertCircle size={28} className="text-amber-500/70" />
                  <p className="text-sm font-medium">Nenhum membro da equipe de som foi identificado nessas linhas.</p>
                  <p className="text-xs text-slate-500">
                    Certifique-se de que os nomes nas linhas correspondam (ou comecem) com os membros cadastrados na equipe.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parsedData.items.map((item) => {
                    const isSelected = !unselectedItemIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={cn(
                          "p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none",
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500/40 shadow-sm"
                            : theme === 'dark'
                              ? "bg-white/[0.02] border-white/5 opacity-50 hover:opacity-75"
                              : "bg-slate-50 border-slate-200 opacity-50 hover:opacity-75"
                        )}
                      >
                        {/* Checkbox indicator */}
                        <div className={cn(
                          "w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-all flex-shrink-0",
                          isSelected
                            ? "bg-indigo-500 border-indigo-500 text-white shadow-sm"
                            : "border-slate-500 bg-transparent"
                        )}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-0.5 rounded-md border",
                              isSelected 
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            )}>
                              Dia {String(item.dayNumber).padStart(2, '0')}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {format(item.dateObj, 'EEE', { locale: ptBR })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <div 
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner flex-shrink-0",
                                item.matchedMember.type === 'leader' 
                                  ? "text-white" 
                                  : theme === 'dark' ? "bg-white/10 text-slate-300" : "bg-slate-200 text-slate-700"
                              )}
                              style={item.matchedMember.type === 'leader' && item.matchedMember.color ? { backgroundColor: item.matchedMember.color } : {}}
                            >
                              {item.matchedMember.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className={cn(
                                "text-xs font-bold truncate leading-tight",
                                theme === 'dark' ? "text-white" : "text-slate-900"
                              )}>
                                {item.matchedMember.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] text-slate-400 truncate">
                                  no texto: &ldquo;{item.matchedName}&rdquo;
                                </span>
                                <span className={cn(
                                  "text-[8px] px-1 py-0.2 rounded font-bold uppercase",
                                  item.role === 'Diácono' 
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                )}>
                                  {item.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unmatched external members notice */}
              {uniqueUnmatched.length > 0 && (
                <div className={cn(
                  "p-4 rounded-2xl border text-xs flex items-start gap-3",
                  theme === 'dark' ? "bg-[#141a26]/40 border-white/5 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                )}>
                  <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-300">
                      Nomes externos identificados (não pertencem à equipe de som):
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {uniqueUnmatched.join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 flex-shrink-0",
          theme === 'dark' ? "bg-[#141a26] border-white/5" : "bg-slate-50 border-slate-200"
        )}>
          <div className="text-xs text-slate-500">
            {selectedItems.length > 0 ? (
              <span><strong>{selectedItems.length}</strong> indisponibilidade(s) pronta(s) para aplicar</span>
            ) : (
              <span>Cole a mensagem para visualizar as indisponibilidades</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold border transition-all",
                theme === 'dark' 
                  ? "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5" 
                  : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg",
                selectedItems.length > 0
                  ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20 active:scale-[0.98]"
                  : "bg-indigo-500/40 text-white/50 cursor-not-allowed shadow-none"
              )}
            >
              <CheckCheck size={16} />
              Aplicar Indisponibilidades ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
