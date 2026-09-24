import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  Calendar, 
  Check, 
  AlertCircle, 
  Loader2, 
  CheckSquare, 
  Image as ImageIcon,
  Tag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  FileText,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { getDay } from 'date-fns';
import { createWorker } from 'tesseract.js';
import { Member, DayOfWeek } from '../types';
import { DAYS_OF_WEEK_LABELS } from '../constants';
import { cn } from '../utils/cn';
import { UnavailabilityCandidate } from '../utils/memberMatcher';
import { parseScheduleText } from '../utils/scheduleParser';

interface ImportUnavailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentDate: Date;
  onApply: (
    candidates: Array<{ memberId: string; dateIso: string; role: string }>,
    replaceExistingInMonth: boolean,
    targetMonthDate: Date
  ) => void;
  theme: 'dark' | 'light';
}

export const ImportUnavailabilityModal: React.FC<ImportUnavailabilityModalProps> = ({
  isOpen,
  onClose,
  members,
  currentDate,
  onApply,
  theme,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [scheduleText, setScheduleText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleHint, setRoleHint] = useState<string>('Diácono');
  const [customRole, setCustomRole] = useState<string>('');
  const [targetMonth, setTargetMonth] = useState<number>(currentDate.getMonth());
  const [targetYear, setTargetYear] = useState<number>(currentDate.getFullYear());
  
  // Results
  const [candidates, setCandidates] = useState<UnavailabilityCandidate[]>([]);
  const [unmatchedNames, setUnmatchedNames] = useState<Array<{ day: number; name: string }>>([]);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [showUnmatched, setShowUnmatched] = useState<boolean>(false);
  const [showExtractedText, setShowExtractedText] = useState<boolean>(false);
  const [imageZoom, setImageZoom] = useState<number>(100);

  // Manual Add Day Bar
  const [manualDay, setManualDay] = useState<number>(1);
  const [manualMemberId, setManualMemberId] = useState<string>(members[0]?.id || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with currentDate when opened
  useEffect(() => {
    if (isOpen) {
      setTargetMonth(currentDate.getMonth());
      setTargetYear(currentDate.getFullYear());
      setCandidates([]);
      setUnmatchedNames([]);
      setErrorMessage(null);
      setOcrProgress(0);
      setOcrStatusText('');
      setImageZoom(100);
      if (members.length > 0) {
        setManualMemberId(members[0].id);
      }
    }
  }, [isOpen, currentDate, members]);

  // Support paste from clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          handleFileSelected(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPEG, WebP).');
      return;
    }
    setImageFile(file);
    setErrorMessage(null);
    setCandidates([]);
    setUnmatchedNames([]);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Safe image scaling for OCR without pixel destruction
  const prepareImageForOCR = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // If the image is small, enlarge it with smooth rendering
        const minDim = Math.min(img.width, img.height);
        const scale = minDim < 800 ? Math.min(3, 1200 / minDim) : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const handleProcessImage = async () => {
    if (!imagePreview) {
      setErrorMessage('Selecione ou cole uma imagem da escala primeiro.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setOcrProgress(10);
    setOcrStatusText('Carregando imagem...');

    let worker: any = null;

    try {
      setOcrStatusText('Otimizando imagem para leitura...');
      const readyImageUrl = await prepareImageForOCR(imagePreview);

      setOcrStatusText('Iniciando motor de leitura (100% grátis)...');
      setOcrProgress(30);

      worker = await createWorker('por');

      // Set page segmentation to sparse text / uniform block
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
        });
      } catch {
        // fallback to default if setParameters fails
      }

      setOcrStatusText('Lendo linhas da tabela da escala...');
      setOcrProgress(60);

      const ret = await worker.recognize(readyImageUrl);
      const extractedRawText = ret.data.text || '';
      
      setScheduleText(extractedRawText);
      setOcrProgress(90);
      setOcrStatusText('Identificando membros e datas...');

      const activeRole = roleHint === 'outro' ? (customRole.trim() || 'Escala Externa') : roleHint;
      const parseResult = parseScheduleText(extractedRawText, members, activeRole);

      if (parseResult.detectedMonth !== undefined) {
        setTargetMonth(parseResult.detectedMonth);
      }
      if (parseResult.detectedYear !== undefined) {
        setTargetYear(parseResult.detectedYear);
      }

      setCandidates(parseResult.candidates);
      setUnmatchedNames(parseResult.unmatchedNames);

      if (parseResult.candidates.length === 0) {
        setShowExtractedText(true);
        setErrorMessage(
          'A imagem foi lida, mas os nomes na foto podem estar abreviados ou em formato não reconhecido. Você pode adicionar manualmente os dias olhando a imagem ao lado ou conferir o texto abaixo!'
        );
      } else {
        setOcrProgress(100);
      }
    } catch (err: any) {
      console.error('Erro no OCR:', err);
      setErrorMessage(
        'Não foi possível ler todo o texto automaticamente. Você pode usar a ferramenta de adição rápida ao lado da imagem ou colar o texto!'
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore
        }
      }
      setIsProcessing(false);
    }
  };

  const handleProcessText = () => {
    if (!scheduleText.trim()) {
      setErrorMessage('Cole ou digite o texto da escala no campo abaixo.');
      return;
    }

    setErrorMessage(null);
    const activeRole = roleHint === 'outro' ? (customRole.trim() || 'Escala Externa') : roleHint;
    const parseResult = parseScheduleText(scheduleText, members, activeRole);

    if (parseResult.detectedMonth !== undefined) {
      setTargetMonth(parseResult.detectedMonth);
    }
    if (parseResult.detectedYear !== undefined) {
      setTargetYear(parseResult.detectedYear);
    }

    setCandidates(parseResult.candidates);
    setUnmatchedNames(parseResult.unmatchedNames);

    if (parseResult.candidates.length === 0) {
      setErrorMessage(
        'Nenhum membro da Sonoplastia foi identificado. Verifique se as linhas contêm o dia seguido dos nomes (ex: "14 - Wales / Arthur").'
      );
    }
  };

  const handleAddManualCandidate = () => {
    const member = members.find(m => m.id === manualMemberId);
    if (!member) return;

    const activeRole = roleHint === 'outro' ? (customRole.trim() || 'Escala Externa') : roleHint;

    const exists = candidates.some(c => c.day === manualDay && c.memberId === member.id);
    if (exists) {
      setErrorMessage(`${member.name} já está marcado no dia ${manualDay}.`);
      return;
    }

    setErrorMessage(null);
    setCandidates(prev => [
      ...prev,
      {
        day: manualDay,
        rawName: member.name,
        memberId: member.id,
        memberName: member.name,
        role: activeRole,
        selected: true,
      }
    ].sort((a, b) => a.day - b.day));
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleCandidate = (index: number) => {
    setCandidates(prev =>
      prev.map((c, idx) => (idx === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleToggleAll = (select: boolean) => {
    setCandidates(prev => prev.map(c => ({ ...c, selected: select })));
  };

  const handleConfirmApply = () => {
    const selected = candidates.filter(c => c.selected && c.memberId);
    if (selected.length === 0) {
      setErrorMessage('Selecione pelo menos um membro para marcar a indisponibilidade.');
      return;
    }

    const targetDateForMonth = new Date(targetYear, targetMonth, 1);
    const preparedList = selected.map(c => {
      // Use midday 12:00 to prevent timezone day shifting
      const itemDate = new Date(targetYear, targetMonth, c.day, 12, 0, 0);
      return {
        memberId: c.memberId!,
        dateIso: itemDate.toISOString(),
        role: c.role || roleHint || 'Ocupado',
      };
    });

    onApply(preparedList, replaceExisting, targetDateForMonth);
    onClose();
  };

  const monthOptions = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={cn(
        "w-full max-w-4xl max-h-[94vh] flex flex-col rounded-[2.5rem] shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200",
        theme === 'dark' ? "bg-[#0d121a] border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900"
      )}>
        {/* Modal Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between flex-shrink-0 transition-colors",
          theme === 'dark' ? "border-white/5 bg-[#121722]" : "border-slate-100 bg-slate-50/50"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
                Importar Indisponibilidade da Escala
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500 text-white">
                  100% Grátis
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Carregue a foto da escala ou cole o texto para marcar os membros ocupados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2.5 rounded-xl transition-colors",
              theme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Mode Switcher Tabs */}
          <div className={cn(
            "flex p-1 rounded-2xl border",
            theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-slate-100 border-slate-200"
          )}>
            <button
              type="button"
              onClick={() => {
                setInputMode('image');
                setErrorMessage(null);
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                inputMode === 'image'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : theme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ImageIcon size={14} />
              <span>Foto / Imagem da Escala</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('text');
                setErrorMessage(null);
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                inputMode === 'text'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : theme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <FileText size={14} />
              <span>Colar Texto da Escala</span>
            </button>
          </div>

          {/* Scale Setup (Month, Year, Role) */}
          <div className={cn(
            "p-4 rounded-3xl border grid grid-cols-1 sm:grid-cols-3 gap-3 items-center",
            theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
          )}>
            {/* Month & Year Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={12} />
                Mês da Escala
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={targetMonth}
                  onChange={e => setTargetMonth(Number(e.target.value))}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none",
                    theme === 'dark' 
                      ? "bg-[#121720] border-white/10 text-white focus:border-indigo-500" 
                      : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
                  )}
                >
                  {monthOptions.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={targetYear}
                  onChange={e => setTargetYear(Number(e.target.value))}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none",
                    theme === 'dark' 
                      ? "bg-[#121720] border-white/10 text-white focus:border-indigo-500" 
                      : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
                  )}
                />
              </div>
            </div>

            {/* Ministry / Role tag */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Tag size={12} />
                Cargo / Motivo
              </label>
              <div className="flex gap-2">
                {['Diácono', 'Recepcionista', 'outro'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleHint(role)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize",
                      roleHint === role
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20"
                        : theme === 'dark' ? "bg-white/5 border-white/5 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {role === 'outro' ? 'Outro' : role}
                  </button>
                ))}
                {roleHint === 'outro' && (
                  <input
                    type="text"
                    placeholder="Ex: Louvor..."
                    value={customRole}
                    onChange={e => setCustomRole(e.target.value)}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none",
                      theme === 'dark' ? "bg-[#121720] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Main Visual Workspace: Side-by-Side when image is present */}
          {inputMode === 'image' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Image viewer with zoom and replace button */}
              <div className="md:col-span-6 flex flex-col gap-2">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => !imagePreview && fileInputRef.current?.click()}
                  className={cn(
                    "relative rounded-3xl border-2 border-dashed p-3 flex flex-col items-center justify-center text-center transition-all h-[260px] sm:h-[320px] overflow-hidden",
                    imagePreview 
                      ? (theme === 'dark' ? "border-white/10 bg-black/40" : "border-slate-300 bg-slate-100")
                      : (theme === 'dark' ? "border-white/10 hover:border-indigo-400/50 hover:bg-white/[0.02] cursor-pointer" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 cursor-pointer")
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                  />

                  {imagePreview ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-auto p-2">
                      <img 
                        src={imagePreview} 
                        alt="Escala" 
                        style={{ transform: `scale(${imageZoom / 100})`, transformOrigin: 'top center' }}
                        className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-lg shadow-md" 
                      />

                      {/* Floating zoom & change controls */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-xl text-white text-[11px] shadow-lg">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImageZoom(z => Math.max(50, z - 25)); }}
                          className="p-1 hover:text-indigo-300 transition-colors"
                          title="Diminuir zoom"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span className="font-mono text-[10px] w-8 text-center">{imageZoom}%</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImageZoom(z => Math.min(250, z + 25)); }}
                          className="p-1 hover:text-indigo-300 transition-colors"
                          title="Aumentar zoom"
                        >
                          <ZoomIn size={14} />
                        </button>
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="px-3 py-1 rounded-xl bg-black/75 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-sm"
                        >
                          <RefreshCw size={12} />
                          <span>Trocar Imagem</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1">
                        <Upload size={24} />
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        Clique ou arraste a foto da escala aqui
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Ou cole direto com <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Ctrl+V</kbd>
                      </p>
                    </div>
                  )}
                </div>

                {/* Read with OCR Button */}
                <button
                  type="button"
                  onClick={handleProcessImage}
                  disabled={!imagePreview || isProcessing}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg",
                    !imagePreview || isProcessing
                      ? "opacity-50 cursor-not-allowed bg-indigo-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 hover:scale-[1.01] active:scale-[0.99]"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{ocrStatusText || 'Lendo imagem...'} {ocrProgress > 0 ? `(${ocrProgress}%)` : ''}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Ler Imagem Automaticamente</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Identified Days & Quick Add */}
              <div className="md:col-span-6 flex flex-col gap-3">
                {/* Quick Add Bar: look at photo and tap to add */}
                <div className={cn(
                  "p-3 rounded-2xl border space-y-2",
                  theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                )}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Plus size={12} className="text-emerald-400" />
                    Adicionar ou Marcar Dia Rapidamente
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">Dia</span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={manualDay}
                          onChange={e => setManualDay(Number(e.target.value))}
                          className={cn(
                            "w-full pl-8 pr-2 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none",
                            theme === 'dark' ? "bg-[#121720] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                    </div>

                    <select
                      value={manualMemberId}
                      onChange={e => setManualMemberId(e.target.value)}
                      className={cn(
                        "flex-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none",
                        theme === 'dark' ? "bg-[#121720] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddManualCandidate}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-md"
                    >
                      <Plus size={14} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {/* Candidate List on the right */}
                <div className="flex-1 flex flex-col min-h-[200px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckSquare size={14} className="text-emerald-400" />
                      Indisponibilidades ({candidates.filter(c => c.selected).length})
                    </span>
                    {candidates.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleToggleAll(true)}
                          className="font-bold text-indigo-400 hover:text-indigo-300"
                        >
                          Marcar Todos
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAll(false)}
                          className="font-bold text-slate-500 hover:text-slate-400"
                        >
                          Desmarcar
                        </button>
                      </div>
                    )}
                  </div>

                  {candidates.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl my-2">
                      <p className="text-xs font-semibold">Nenhuma data adicionada ainda.</p>
                      <p className="text-[11px] mt-1 text-slate-500">
                        Clique em <strong>"Ler Imagem Automaticamente"</strong> ou adicione membros olhando a foto ao lado!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto py-2 pr-1">
                      {candidates.map((cand, idx) => {
                        const dateObj = new Date(targetYear, targetMonth, cand.day);
                        const dayOfWeek = getDay(dateObj) as DayOfWeek;
                        const dayLabel = DAYS_OF_WEEK_LABELS[dayOfWeek] || '';

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2",
                              cand.selected
                                ? (theme === 'dark' ? "bg-indigo-500/10 border-indigo-500/30 text-white" : "bg-indigo-50 border-indigo-200 text-slate-900")
                                : (theme === 'dark' ? "bg-white/[0.02] border-white/5 opacity-50" : "bg-slate-50 border-slate-200 opacity-50")
                            )}
                          >
                            <div 
                              onClick={() => handleToggleCandidate(idx)}
                              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-md flex items-center justify-center transition-colors flex-shrink-0 text-white",
                                cand.selected ? "bg-indigo-600" : "bg-white/10"
                              )}>
                                {cand.selected && <Check size={12} />}
                              </div>
                              <span className="text-xs font-black">
                                Dia {String(cand.day).padStart(2, '0')} ({dayLabel})
                              </span>
                              <span className="text-xs font-bold text-indigo-400 truncate">
                                {cand.memberName}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveCandidate(idx)}
                              className="p-1 hover:text-red-400 text-slate-500 transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Text Input Mode */
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Texto da Escala (copiado do WhatsApp ou digitado)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Ex: 14 - Wales / Arthur</span>
                </label>
                <textarea
                  value={scheduleText}
                  onChange={e => setScheduleText(e.target.value)}
                  placeholder={`OUTUBRO
3 - Sebastião / Luiz Davi
10 - Luiz Fernando / Fabio
14 - Wales / Arthur
18 - Marcos A. / Joabe
21 - Claudinei / Eldiney
24 - Carlos E. / Eduardo
25 - Henrique / Weverson
28 - Victor H. / Edimilson`}
                  rows={8}
                  className={cn(
                    "w-full p-3.5 rounded-2xl border text-xs font-mono resize-none transition-colors outline-none",
                    theme === 'dark' 
                      ? "bg-[#121720] border-white/10 text-slate-200 placeholder-slate-600 focus:border-indigo-500" 
                      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500"
                  )}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessText}
                  disabled={!scheduleText.trim()}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg",
                    !scheduleText.trim()
                      ? "opacity-50 cursor-not-allowed bg-indigo-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <Check size={16} />
                  <span>Processar Texto da Escala</span>
                </button>
              </div>

              {candidates.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-emerald-400" />
                    {candidates.length} membros identificados no texto
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto">
                    {candidates.map((cand, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleCandidate(idx)}
                        className={cn(
                          "p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer text-xs",
                          cand.selected
                            ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                            : "bg-white/[0.02] border-white/5 opacity-50"
                        )}
                      >
                        <span className="font-bold">Dia {cand.day}</span>
                        <span className="text-indigo-400 font-bold">{cand.memberName}</span>
                        <Check size={12} className={cand.selected ? "text-emerald-400" : "opacity-0"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold">Aviso</p>
                <p className="opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Extracted Text Inspector (Optional review/edit) */}
          {scheduleText && inputMode === 'image' && (
            <div className="border border-white/5 rounded-2xl p-3 bg-white/[0.01]">
              <button
                type="button"
                onClick={() => setShowExtractedText(!showExtractedText)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={13} />
                  Texto reconhecido pelo leitor da imagem (clique para ver/editar)
                </span>
                {showExtractedText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showExtractedText && (
                <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                  <textarea
                    value={scheduleText}
                    onChange={e => setScheduleText(e.target.value)}
                    rows={5}
                    className={cn(
                      "w-full p-2.5 rounded-xl text-xs font-mono resize-y border outline-none",
                      theme === 'dark' ? "bg-black/30 border-white/10 text-slate-200" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleProcessText}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} />
                      <span>Re-processar texto</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Unmatched People on the image (Collapsible) */}
          {unmatchedNames.length > 0 && (
            <div className="border border-white/5 rounded-2xl p-3 bg-white/[0.01]">
              <button
                type="button"
                onClick={() => setShowUnmatched(!showUnmatched)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-400"
              >
                <span className="flex items-center gap-1.5">
                  <Info size={13} />
                  {unmatchedNames.length} pessoas encontradas na imagem não são da equipe de Som (ignoradas)
                </span>
                {showUnmatched ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showUnmatched && (
                <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-500 flex flex-wrap gap-1.5">
                  {unmatchedNames.map((u, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                      Dia {u.day}: {u.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Replace or Append Checkbox */}
          {candidates.length > 0 && (
            <div className="pt-1 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Substituir indisponibilidades já cadastradas deste mês ({monthOptions[targetMonth]})</span>
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={cn(
          "px-6 py-4 border-t flex items-center justify-between flex-shrink-0 transition-colors",
          theme === 'dark' ? "border-white/5 bg-[#121722]" : "border-slate-100 bg-slate-50/50"
        )}>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors",
              theme === 'dark' ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            )}
          >
            Cancelar
          </button>

          {candidates.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmApply}
              disabled={candidates.filter(c => c.selected).length === 0}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-xl",
                candidates.filter(c => c.selected).length === 0
                  ? "opacity-50 cursor-not-allowed bg-slate-700 text-slate-400"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <Check size={16} />
              <span>
                Aplicar {candidates.filter(c => c.selected).length} Indisponibilidade(s)
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
