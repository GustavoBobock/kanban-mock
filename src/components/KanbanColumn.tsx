import { useState, useRef } from "react";
import { type Board, type Task, type Column } from "@/lib/mock-storage";
import { GripVertical, Trash2, X } from "lucide-react";

interface KanbanCardProps {
  task: Task;
  columnId: string;
  onRemove: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
}

export function KanbanCard({ task, columnId, onRemove, onDragStart }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id, columnId)}
      className="group flex cursor-grab items-start gap-2 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:cursor-grabbing"
    >
      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-card-foreground">{task.title}</p>
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(task.id)}
        className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title="Remover tarefa"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
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
      className={`flex w-72 shrink-0 flex-col rounded-2xl border transition-all ${
        dragOver ? "border-primary/40 bg-kanban-drag-over shadow-lg shadow-primary/10" : "border-border/60 bg-kanban-column shadow-sm"
      }`}
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
      <div className="flex items-center gap-2 rounded-t-2xl bg-kanban-column-header px-3.5 py-3">
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
            className="flex-1 truncate text-left text-sm font-semibold text-foreground hover:text-primary"
            onClick={() => {
              setEditing(true);
              setTimeout(() => inputRef.current?.select(), 0);
            }}
            title="Clique para editar"
          >
            {column.title}
          </button>
        )}
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-kanban-badge px-1.5 text-[10px] font-bold text-kanban-badge-foreground">
          {tasks.length}
        </span>
        <button
          onClick={() => {
            if (window.confirm(`Excluir coluna "${column.title}" e suas ${tasks.length} tarefa(s)?`)) {
              onRemoveColumn(column.id);
            }
          }}
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
            onRemove={onRemoveTask}
            onDragStart={onDragStart}
          />
        ))}
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">Solte tarefas aqui</p>
        )}
      </div>
    </div>
  );
}
