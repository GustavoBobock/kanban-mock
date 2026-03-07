import { useState, useRef, useEffect, memo } from "react";
import { type Task, type Column, type Client } from "@/lib/api";
import {
  format,
  isBefore,
  isAfter,
  addDays,
  startOfDay,
  parseISO,
  formatDistanceToNow,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  getHours
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { getColumnColor } from "@/lib/kanban-colors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  GripVertical,
  X,
  User,
  Briefcase,
  Calendar,
  AlertTriangle,
  FileText,
  Paperclip,
  Siren,
  Timer,
  CheckCircle2,
  MessageSquare,
  Send,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Check as CheckIcon, X as XIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "./ErrorBoundary";

// Helper para formatação segura de datas que evita crash
const safeFormat = (dateStr: string | undefined | null, formatStr: string) => {
  if (!dateStr) return "N/A";
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return "Data Inválida";
    return format(d, formatStr, { locale: ptBR });
  } catch (error) {
    return "Erro Data";
  }
};

const safeFormatDistance = (dateStr: string | undefined | null) => {
  if (!dateStr) return "";
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return "";
    return formatDistanceToNow(d, { locale: ptBR });
  } catch (error) {
    return "";
  }
};

interface KanbanCardProps {
  task: Task;
  columnId: string;
  accentColor: string;
  columnTitle: string;
  onRemove: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
  onClick: () => void;
  onAnotarClick?: (task: Task) => void;
  onConcluirClick?: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  clients: Client[];
}

export const KanbanCard = memo(function KanbanCard({
  task,
  columnId,
  accentColor,
  columnTitle,
  onRemove,
  onDragStart,
  onClick,
  onAnotarClick,
  onConcluirClick,
  onUpdateTask,
  clients
}: KanbanCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Local edit state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(task.due_date ? parseISO(task.due_date) : undefined);
  const [editPriority, setEditPriority] = useState(task.priority || "Média");
  const [editClientId, setEditClientId] = useState(task.client_id || "");
  const editContainerRef = useRef<HTMLDivElement>(null);

  const handleSaveInline = async () => {
    if (!onUpdateTask) return;
    try {
      await onUpdateTask(task.id, {
        title: editTitle,
        due_date: editDueDate?.toISOString(),
        priority: editPriority,
        client_id: editClientId === "" ? undefined : editClientId,
        client_name: clients.find(c => c.id === editClientId)?.name
      });
      setIsEditing(false);
    } catch (error) {
      // toast is handled in parent
    }
  };

  const handleCancelInline = () => {
    setEditTitle(task.title);
    setEditDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setEditPriority(task.priority || "Média");
    setEditClientId(task.client_id || "");
    setIsEditing(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isEditing && editContainerRef.current && !editContainerRef.current.contains(event.target as Node)) {
        handleSaveInline();
      }
    }

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, editTitle, editDueDate, editPriority, editClientId]);

  const getStatusColor = () => {
    if (columnTitle === "Entregue") return "border-gray-500 bg-gray-50";
    if (!task.due_date) return "border-slate-200";

    const dueDate = parseISO(task.due_date);
    const today = startOfDay(new Date());

    if (isBefore(dueDate, today) || dueDate.getTime() === today.getTime()) return "border-red-500 bg-red-50/30";
    if (isBefore(dueDate, addDays(today, 3))) return "border-amber-500 bg-amber-50/30";
    return "border-green-500 bg-green-50/30";
  };

  const getUrgencyConfig = () => {
    if (!task.due_date) return null;
    try {
      const due = startOfDay(parseISO(task.due_date));
      if (isNaN(due.getTime())) return null;

      const today = startOfDay(new Date());
      const diff = differenceInDays(due, today);

      if (diff < 0) return { color: "bg-red-600", text: "VENCIDA HÁ " + Math.abs(diff) + (Math.abs(diff) === 1 ? " DIA" : " DIAS"), sub: "Atenção: obrigação em atraso! Risco de multa.", icon: <Siren className="h-4 w-4" /> };
      if (diff === 0) return { color: "bg-orange-500", text: "VENCE HOJE", sub: "Último dia! Entregue antes das 17:30.", icon: <AlertTriangle className="h-4 w-4" /> };
      if (diff === 1) return { color: "bg-amber-600", text: "VENCE EM 1 DIA", sub: "Prazo amanhã — priorize esta tarefa.", icon: <Timer className="h-4 w-4" /> };
      if (diff <= 3) return { color: "bg-amber-400 text-slate-900", text: `VENCE EM ${diff} DIAS`, sub: `Atenção ao prazo — ${diff} dias restantes.`, icon: <Timer className="h-4 w-4" /> };
      if (diff <= 7) return { color: "bg-green-500", text: `${diff} DIAS RESTANTES`, sub: `${diff} dias restantes — dentro do prazo.`, icon: <CheckCircle2 className="h-4 w-4" /> };
      return { color: "bg-slate-400", text: `${diff} DIAS RESTANTES`, sub: `${diff} dias restantes — sem urgência.`, icon: <Calendar className="h-4 w-4" /> };
    } catch (e) {
      return null;
    }
  };


  const getProgressBar = () => {
    if (!task.due_date || !task.created_at) return null;
    try {
      const start = new Date(task.created_at).getTime();
      const end = new Date(task.due_date).getTime();
      if (isNaN(start) || isNaN(end)) return null;

      const now = new Date().getTime();

      if (now >= end) return { value: 100, color: "bg-red-600", label: "100% — VENCIDA" };

      const total = end - start;
      if (total <= 0) return null;

      const consumed = now - start;
      const percent = Math.min(Math.max(Math.round((consumed / total) * 100), 0), 100);

      let color = "bg-green-500";
      if (percent > 80) color = "bg-red-500";
      else if (percent > 60) color = "bg-orange-500";
      else if (percent > 40) color = "bg-amber-500";

      return { value: percent, color, label: `${percent}% do prazo consumido` };
    } catch (e) {
      return null;
    }
  };


  const urgency = getUrgencyConfig();
  const progress = getProgressBar();
  const now = new Date();
  const isAfter16 = getHours(now) >= 16;
  const venceHoje = task.due_date && differenceInDays(startOfDay(parseISO(task.due_date)), startOfDay(now)) === 0;

  const renderInlineEdition = () => (
    <div
      ref={editContainerRef}
      className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-xl border-2 border-primary/30 animate-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase text-slate-400">Título da Tarefa</Label>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-8 text-xs font-medium focus-visible:ring-primary/20"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveInline();
              if (e.key === "Escape") handleCancelInline();
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 w-full justify-start text-left font-normal text-xs px-2",
                    !editDueDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {editDueDate ? format(editDueDate, "dd/MM/yy") : <span>Data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={editDueDate}
                  onSelect={setEditDueDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Prioridade</Label>
            <Select value={editPriority} onValueChange={setEditPriority}>
              <SelectTrigger className="h-8 text-xs px-2">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase text-slate-400">Cliente</Label>
          <Select value={editClientId} onValueChange={setEditClientId}>
            <SelectTrigger className="h-8 text-xs px-2">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          className="h-8 flex-1 bg-green-600 hover:bg-green-700 font-bold gap-1"
          onClick={handleSaveInline}
        >
          <CheckIcon className="h-3.5 w-3.5" /> Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 flex-1 text-slate-500 font-bold gap-1"
          onClick={handleCancelInline}
        >
          <XIcon className="h-3.5 w-3.5" /> Cancelar
        </Button>
      </div>
    </div>
  );

  const renderCardContent = () => (
    <div
      draggable={!isEditing}
      onDragStart={(e) => {
        if (isEditing) return;
        e.stopPropagation();
        onDragStart(e, task.id, columnId);
      }}
      onClick={isEditing ? undefined : onClick}
      onMouseEnter={() => !isEditing && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl bg-card p-4 shadow-md transition-all active:scale-[0.98] border border-border/50",
        !isEditing && "hover:shadow-lg",
        getStatusColor(),
        isEditing && "ring-2 ring-primary/20 shadow-xl scale-[1.02] z-10"
      )}
    >
      {isEditing ? renderInlineEdition() : (
        <>
          {/* Botão flutuante de histórico rápido */}
          {task.notes_count && task.notes_count > 0 && (
            <div className="absolute top-2 right-2 flex gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[13px] font-bold leading-tight text-card-foreground line-clamp-2">
                {task.title}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {task.client_name && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-slate-100/50 px-1.5 py-0.5 rounded">
                    <User className="h-2.5 w-2.5" />
                    {task.client_name}
                  </span>
                )}
                {task.priority && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${task.priority === "Urgente" ? "bg-red-100 text-red-700" :
                    task.priority === "Alta" ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                    {task.priority}
                  </span>
                )}
              </div>
              {(task.client_cnpj || task.competence) && (
                <div className="flex items-center gap-2 mt-1.5 opacity-80">
                  {task.client_cnpj && (
                    <span className="text-[9px] font-mono bg-slate-100 px-1 rounded flex items-center gap-1">
                      <FileText className="h-2 w-2" /> {task.client_cnpj}
                    </span>
                  )}
                  {task.competence && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 rounded">
                      Comp: {task.competence}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                title="Editar rápida"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Remover tarefa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1 text-[10px]">
            <div className="flex items-center gap-3">
              {task.due_date && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "flex items-center gap-1 font-bold transition-colors hover:bg-slate-100 rounded px-1 -ml-1",
                        task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date())) ? "text-red-600" : "text-slate-500"
                      )}
                      title="Alteração rápida de data"
                    >
                      <Calendar className="h-3 w-3" />
                      {safeFormat(task.due_date, "dd/MM")}
                    </button>

                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={parseISO(task.due_date)}
                      onSelect={(date) => {
                        if (date && onUpdateTask) {
                          onUpdateTask(task.id, { due_date: date.toISOString() });
                        }
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Indicadores de Notas e Imagens - SOMENTE SE > 0 */}
              <div className="flex items-center gap-2">
                {task.notes_count && task.notes_count > 0 && (
                  <div className="flex items-center gap-0.5 text-blue-600 font-bold">
                    <FileText className="h-3 w-3" />
                    {task.notes_count}
                  </div>
                )}
                {task.images_count && task.images_count > 0 && (
                  <div className="flex items-center gap-0.5 text-blue-500">
                    <Paperclip className="h-3.5 w-3.5" />
                    {task.images_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )
      }
    </div>
  );

  return (
    <ErrorBoundary>
      <HoverCard openDelay={500}>
        <HoverCardTrigger asChild>
          <div>
            {renderCardContent()}
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          className={cn(
            "w-[320px] p-0 overflow-hidden border-none shadow-2xl z-[100] animate-in fade-in duration-200",
            isEditing && "hidden"
          )}
        >
          {urgency && (
            <div className={`p-3 text-white ${urgency.color} flex flex-col gap-1`}>
              <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
                {urgency.icon}
                {urgency.text}
              </div>
              <p className="text-[10px] opacity-90 leading-tight font-medium">{urgency.sub}</p>
            </div>
          )}

          <div className="p-4 space-y-4 bg-white">
            {progress && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Progresso do Prazo</span>
                  <span className={progress.value > 80 ? "text-red-600" : ""}>{progress.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${progress.color}`}
                    style={{ width: `${progress.value}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <User className="h-3.5 w-3.5 mt-0.5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {task.client_name || "N/A"}
                    {task.client_cnpj && <span className="block text-[10px] font-mono text-slate-500">{task.client_cnpj}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Briefcase className="h-3.5 w-3.5 mt-0.5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Obrigação</p>
                  <p className="text-xs font-semibold text-slate-700">{task.obligation_type || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="h-3.5 w-3.5 mt-0.5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Vencimento</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {safeFormat(task.due_date, "dd/MM/yyyy (eeee)")}
                    {task.competence && <span className="block text-[10px] font-bold text-blue-600">Competência: {task.competence}</span>}
                  </p>
                </div>
              </div>

            </div>

            <div className="pt-2 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-500 font-medium">⏰ Expediente até 17:30</span>
                </div>
                {venceHoje && isAfter16 && (
                  <span className="text-[10px] font-bold text-red-600 animate-pulse bg-red-50 px-1.5 py-0.5 rounded">
                    ⚠️ Menos de 1h30 restante!
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100/50">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  {task.notes_count && task.notes_count > 0 ? "Última Anotação" : "Histórico"}
                </span>
                {task.last_note_at && (
                  <span className="text-[9px] text-slate-400 ml-auto font-medium">
                    {safeFormatDistance(task.last_note_at) ? `há ${safeFormatDistance(task.last_note_at)}` : ""}
                  </span>
                )}
              </div>

              {task.last_note_content ? (
                <div className="flex gap-2.5">
                  <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-3 flex-1">
                    "{task.last_note_content.substring(0, 150)}{task.last_note_content.length > 150 ? "..." : ""}"
                  </p>
                  {task.last_note_image && (
                    <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-slate-200 border border-slate-100">
                      <img src={task.last_note_image} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Sem anotações — clique para registrar o andamento.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold gap-1.5 border-slate-200 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnotarClick?.(task);
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Anotar
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-bold gap-1.5 bg-green-600 hover:bg-green-700 shadow-sm text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onConcluirClick?.(task.id);
                }}
              >
                <Check className="h-3.5 w-3.5" /> Concluir
              </Button>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-sm border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir "<strong>{task.title}</strong>"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="font-bold border-slate-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 font-bold text-white hover:bg-red-700 transition-colors"
              onClick={() => onRemove(task.id)}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
});

interface KanbanColumnProps {

  column: Column;
  tasks: Task[];
  colorIndex: number;
  onRename: (colId: string, title: string) => Promise<void>;
  onRemoveColumn: (colId: string) => Promise<void>;
  onRemoveTask: (taskId: string) => Promise<void>;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, toColId: string) => void;
  onColumnDragStart: (e: React.DragEvent, columnId: string) => void;
  onTaskClick: (task: Task) => void;
  onAnotarClick?: (task: Task) => void;
  onConcluirClick?: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  clients: Client[];
}

export const KanbanColumn = memo(function KanbanColumn({
  column,
  tasks,
  colorIndex,
  onRename,
  onRemoveColumn,
  onRemoveTask,
  onDragStart,
  onDragOver,
  onDrop,
  onColumnDragStart,
  onTaskClick,
  onAnotarClick,
  onConcluirClick,
  onUpdateTask,
  clients
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const colors = getColumnColor(colorIndex);

  const commitRename = () => {
    const trimmed = title.trim();
    if (trimmed.length > 0) {
      onRename(column.id, trimmed);
    } else {
      setTitle(column.title);
    }
    setEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onColumnDragStart(e, column.id)}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border-2 transition-all ${dragOver ? "scale-[1.01] shadow-lg" : "shadow-sm"
        }`}
      style={{
        borderColor: dragOver ? colors.border : `${colors.border}40`,
        backgroundColor: dragOver ? `${colors.bg}` : undefined,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
        onDragOver(e);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        onDrop(e, column.id);
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-[14px] px-3.5 py-3"
        style={{ backgroundColor: colors.header }}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          {editing ? (
            <input
              ref={inputRef}
              className="flex-1 rounded-lg bg-background px-2 py-0.5 text-sm font-semibold text-foreground outline-none ring-2 ring-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === "Enter" && commitRename()}
              autoFocus
            />
          ) : (
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <h3
                onDoubleClick={() => setEditing(true)}
                className="truncate text-sm font-extrabold text-foreground tracking-tight"
              >
                {column.title}
              </h3>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/50 text-[10px] font-black text-foreground shadow-sm">
                {tasks.length}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => onRemoveColumn(column.id)}
          className="rounded-lg p-1 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-3 px-3 py-4 overflow-y-auto">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            columnId={column.id}
            columnTitle={column.title}
            accentColor={colors.border}
            onRemove={onRemoveTask}
            onDragStart={onDragStart}
            onClick={() => onTaskClick(task)}
            onAnotarClick={onAnotarClick}
            onConcluirClick={onConcluirClick}
            onUpdateTask={onUpdateTask}
            clients={clients}
          />
        ))}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30 border-2 border-dashed border-border/20 rounded-xl">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
});
