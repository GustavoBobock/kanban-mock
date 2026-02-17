import { useState } from "react";
import { type Board, type Task } from "@/lib/mock-storage";
import { getColumnColor } from "@/components/KanbanColumn";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ListViewProps {
  board: Board;
  onRemoveTask: (taskId: string) => void;
  onMoveTask: (taskId: string, fromColId: string, toColId: string) => void;
}

function ListTaskRow({
  task,
  fromColId,
  accentColor,
  board,
  onRemoveTask,
  onMoveTask,
}: {
  task: Task;
  fromColId: string;
  accentColor: string;
  board: Board;
  onRemoveTask: (taskId: string) => void;
  onMoveTask: (taskId: string, fromColId: string, toColId: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-start justify-between gap-3 rounded-xl bg-card p-3 shadow-sm"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground">{task.title}</p>
          {task.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="w-40">
            <Select
              value={fromColId}
              onValueChange={(toColId) => {
                if (!toColId || toColId === fromColId) return;
                onMoveTask(task.id, fromColId, toColId);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Mover para..." />
              </SelectTrigger>
              <SelectContent>
                {board.columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
            title="Remover tarefa"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
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
              onClick={() => onRemoveTask(task.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ListView({ board, onRemoveTask, onMoveTask }: ListViewProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      {board.columns.map((col, idx) => {
        const colors = getColumnColor(idx);
        const tasks = col.taskIds
          .map((id) => board.tasks.find((t) => t.id === id))
          .filter(Boolean) as Task[];

        return (
          <section key={col.id} className="rounded-2xl border bg-background">
            <div
              className="flex items-center justify-between gap-3 rounded-t-2xl px-4 py-3"
              style={{ backgroundColor: colors.header }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.border }} />
                <h2 className="truncate text-sm font-semibold text-foreground">{col.title}</h2>
              </div>
              <span
                className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: colors.badge }}
              >
                {tasks.length}
              </span>
            </div>

            <div className="flex flex-col gap-2 p-3">
              {tasks.map((task) => (
                <ListTaskRow
                  key={task.id}
                  task={task}
                  fromColId={col.id}
                  accentColor={colors.border}
                  board={board}
                  onRemoveTask={onRemoveTask}
                  onMoveTask={onMoveTask}
                />
              ))}
              {tasks.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Sem tarefas nesta coluna.</p>}
            </div>
          </section>
        );
      })}

      {board.columns.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Nenhuma coluna ainda. Clique em "Nova coluna" para começar.</p>
        </div>
      )}
    </div>
  );
}

