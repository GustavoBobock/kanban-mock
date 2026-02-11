import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import {
  getUserBoard,
  addColumn,
  removeColumn,
  renameColumn,
  addTask,
  removeTask,
  moveTask,
  type Board,
} from "@/lib/mock-storage";
import { KanbanColumn } from "@/components/KanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, LayoutDashboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const Kanban = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board>(() => getUserBoard(user!.id));

  // New column dialog
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // New task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskColId, setNewTaskColId] = useState("");

  // Drag state
  const [dragData, setDragData] = useState<{ taskId: string; fromColId: string } | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    setBoard(addColumn(board, newColTitle.trim()));
    setNewColTitle("");
    setColDialogOpen(false);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !newTaskColId) return;
    setBoard(addTask(board, newTaskColId, newTaskTitle.trim(), newTaskDesc.trim() || undefined));
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskColId("");
    setTaskDialogOpen(false);
  };

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string, columnId: string) => {
    setDragData({ taskId, fromColId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toColId: string) => {
      e.preventDefault();
      if (!dragData) return;
      const { taskId, fromColId } = dragData;
      // Drop at end of column
      const toCol = board.columns.find((c) => c.id === toColId);
      const toIndex = toCol ? toCol.taskIds.length : 0;
      setBoard(moveTask(board, taskId, fromColId, toColId, toIndex));
      setDragData(null);
    },
    [dragData, board]
  );

  return (
    <div className="flex h-screen flex-col bg-kanban-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-5 py-3.5 shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <LayoutDashboard className="h-4.5 w-4.5 text-white" />
          </div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">Meu Kanban</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setColDialogOpen(true)}
            className="bg-white/20 text-white hover:bg-white/30 border-0 font-semibold"
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova coluna
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (board.columns.length === 0) {
                alert("Crie uma coluna antes de adicionar tarefas.");
                return;
              }
              setNewTaskColId(board.columns[0].id);
              setTaskDialogOpen(true);
            }}
            className="bg-white/20 text-white hover:bg-white/30 border-0 font-semibold"
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova tarefa
          </Button>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-white/80 hover:text-white hover:bg-white/15">
            <LogOut className="mr-1 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Board */}
      <main className="flex flex-1 gap-4 overflow-x-auto p-4 kanban-scrollbar">
        {board.columns.map((col) => {
          const tasks = col.taskIds
            .map((id) => board.tasks.find((t) => t.id === id))
            .filter(Boolean) as import("@/lib/mock-storage").Task[];
          return (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks}
              onRename={(colId, title) => setBoard(renameColumn(board, colId, title))}
              onRemoveColumn={(colId) => setBoard(removeColumn(board, colId))}
              onRemoveTask={(taskId) => setBoard(removeTask(board, taskId))}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          );
        })}

        {board.columns.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">Nenhuma coluna ainda. Clique em "Nova coluna" para começar.</p>
          </div>
        )}
      </main>

      {/* New column dialog */}
      <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="col-title">Título</Label>
              <Input
                id="col-title"
                placeholder="Ex.: A Fazer"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddColumn} disabled={!newColTitle.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New task dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título</Label>
              <Input
                id="task-title"
                placeholder="Ex.: Implementar login"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Descrição (opcional)</Label>
              <Textarea
                id="task-desc"
                placeholder="Detalhes da tarefa..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Coluna</Label>
              <Select value={newTaskColId} onValueChange={setNewTaskColId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
          </div>
          <DialogFooter>
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim() || !newTaskColId}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kanban;
