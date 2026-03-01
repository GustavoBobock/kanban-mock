import { useState, useRef } from "react";
import { type Task, type Column } from "@/lib/api";
import { Trash2, GripVertical, X, User, Briefcase, Calendar, AlertTriangle, FileText, Paperclip } from "lucide-react";
import { format, isBefore, isAfter, addDays, startOfDay, parseISO, formatDistanceToNow } from "date-fns";
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

interface KanbanCardProps {
  task: Task;
  columnId: string;
  accentColor: string;
  columnTitle: string;
  onRemove: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
  onClick: () => void;
}

export function KanbanCard({ task, columnId, accentColor, columnTitle, onRemove, onDragStart, onClick }: KanbanCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const getStatusColor = () => {
    if (columnTitle === "Entregue") return "border-gray-500 bg-gray-50";
    if (!task.due_date) return "border-slate-200";

    const dueDate = parseISO(task.due_date);
    const today = startOfDay(new Date());

    if (isBefore(dueDate, today) || dueDate.getTime() === today.getTime()) return "border-red-500 bg-red-50/30";
    if (isBefore(dueDate, addDays(today, 3))) return "border-amber-500 bg-amber-50/30";
    return "border-green-500 bg-green-50/30";
  };

  const statusClass = getStatusColor();

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(e, task.id, columnId);
        }}
        onClick={onClick}
        className={`group flex cursor-pointer items-start gap-2 rounded-xl border-l-[4px] bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing ${statusClass}`}
      >
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-card-foreground leading-tight line-clamp-2">{task.title}</h4>
            <div className="flex items-center gap-1">
              {task.notes_count && task.notes_count > 0 && (
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" title="Tem histórico registrado" />
              )}
              {task.priority === "Urgente" && (
                <Badge variant="destructive" className="h-4 px-1 text-[8px] uppercase tracking-wider">Urgente</Badge>
              )}
            </div>
          </div>

          {(task.client_name || task.obligation_type) && (
            <div className="flex flex-col gap-1">
              {task.client_name && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                  <User className="h-3 w-3 text-primary" />
                  <span className="truncate">{task.client_name}</span>
                </div>
              )}
              {task.obligation_type && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <Briefcase className="h-3 w-3 text-secondary-foreground/60" />
                  <span>{task.obligation_type}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <div className="flex items-center gap-3">
              {task.due_date && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(task.due_date), "dd/MM/yy", { locale: ptBR })}
                </div>
              )}

              {task.notes_count && task.notes_count > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                      <FileText className="h-3 w-3" />
                      {task.notes_count}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">
                    <p>{task.notes_count} anotações registradas</p>
                    {task.last_note_at && (
                      <p className="text-muted-foreground">Última há {formatDistanceToNow(parseISO(task.last_note_at), { locale: ptBR })}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}

              {task.images_count && task.images_count > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500/80">
                  <Paperclip className="h-3 w-3" />
                  {task.images_count}
                </div>
              )}
            </div>

            {task.priority && task.priority !== "Urgente" && (
              <span className={`text-[10px] font-extrabold px-1.5 rounded-full ${task.priority === "Alta" ? "bg-orange-100 text-orange-700" :
                task.priority === "Média" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                {task.priority}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmOpen(true);
          }}
          className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Remover tarefa"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "<strong>{task.title}</strong>"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onRemove(task.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  colorIndex: number;
  onRename: (colId: string, title: string) => void;
  onRemoveColumn: (colId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onColumnDragStart: (e: React.DragEvent, columnId: string) => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({
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
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    <>
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
          {editing ? (
            <input
              ref={inputRef}
              className="flex-1 rounded-lg bg-background px-2 py-0.5 text-sm font-semibold text-foreground outline-none ring-2 ring-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setTitle(column.title);
                  setEditing(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button
              className="flex-1 truncate text-left text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-text"
              onDoubleClick={() => {
                setEditing(true);
                setTimeout(() => inputRef.current?.select(), 0);
              }}
              title="Dê um duplo clique para editar"
            >
              {column.title}
            </button>
          )}
          <span
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: colors.badge }}
          >
            {tasks.length}
          </span>
          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remover coluna"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Cards */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 180px)" }}>
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
            />
          ))}
          {tasks.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">Solte tarefas aqui</p>
          )}
        </div>
      </div>

      {/* Column delete confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coluna</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a coluna "<strong>{column.title}</strong>" e suas {tasks.length} tarefa(s)? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onRemoveColumn(column.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
