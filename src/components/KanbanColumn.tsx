import { useState, useRef } from "react";
import { type Task, type Column } from "@/lib/mock-storage";
import { GripVertical, Trash2, X } from "lucide-react";
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

/** Palette of soft column accent colors (HSL) */
const COLUMN_COLORS = [
  { bg: "hsl(250 80% 96%)", border: "hsl(250 80% 72%)", badge: "hsl(250 80% 60%)", header: "hsl(250 40% 95%)" },
  { bg: "hsl(200 75% 95%)", border: "hsl(200 70% 58%)", badge: "hsl(200 70% 50%)", header: "hsl(200 40% 93%)" },
  { bg: "hsl(160 60% 94%)", border: "hsl(160 65% 45%)", badge: "hsl(160 65% 40%)", header: "hsl(160 30% 93%)" },
  { bg: "hsl(340 70% 96%)", border: "hsl(340 75% 60%)", badge: "hsl(340 75% 55%)", header: "hsl(340 40% 95%)" },
  { bg: "hsl(40 85% 95%)",  border: "hsl(40 90% 50%)",  badge: "hsl(40 90% 45%)",  header: "hsl(40 50% 93%)" },
  { bg: "hsl(280 60% 96%)", border: "hsl(280 60% 62%)", badge: "hsl(280 60% 55%)", header: "hsl(280 30% 95%)" },
  { bg: "hsl(20 80% 95%)",  border: "hsl(20 80% 55%)",  badge: "hsl(20 80% 50%)",  header: "hsl(20 40% 93%)" },
  { bg: "hsl(170 55% 94%)", border: "hsl(170 55% 42%)", badge: "hsl(170 55% 38%)", header: "hsl(170 30% 92%)" },
];

export function getColumnColor(index: number) {
  return COLUMN_COLORS[index % COLUMN_COLORS.length];
}

interface KanbanCardProps {
  task: Task;
  columnId: string;
  accentColor: string;
  onRemove: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
}

export function KanbanCard({ task, columnId, accentColor, onRemove, onDragStart }: KanbanCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, task.id, columnId)}
        className="group flex cursor-grab items-start gap-2 rounded-xl bg-card p-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground">{task.title}</p>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
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
        className={`flex w-72 shrink-0 flex-col rounded-2xl border-2 transition-all ${
          dragOver ? "scale-[1.01] shadow-lg" : "shadow-sm"
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
              className="flex-1 truncate text-left text-sm font-semibold text-foreground hover:text-primary transition-colors"
              onClick={() => {
                setEditing(true);
                setTimeout(() => inputRef.current?.select(), 0);
              }}
              title="Clique para editar"
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
              accentColor={colors.border}
              onRemove={onRemoveTask}
              onDragStart={onDragStart}
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
