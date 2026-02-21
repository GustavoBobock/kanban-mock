import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { api, type Board, type Column, type Task } from "@/lib/api";
import { KanbanColumn } from "@/components/KanbanColumn";
import { ListView } from "@/components/ListView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, LayoutDashboard, Loader2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { toast } from "sonner";

type ViewMode = "kanban" | "list";

const Kanban = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const viewModeStorageKey = `kanban_view_mode:${user?.id}`;
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const raw = localStorage.getItem(viewModeStorageKey);
    return raw === "list" || raw === "kanban" ? raw : "kanban";
  });

  const fetchBoard = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.getBoard(user.id);
      setBoard(data);
    } catch (error) {
      console.error("Error fetching board:", error);
      toast.error("Erro ao carregar o quadro.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    localStorage.setItem(viewModeStorageKey, viewMode);
  }, [viewMode, viewModeStorageKey]);

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

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleAddColumn = async () => {
    if (!newColTitle.trim() || !board) return;
    try {
      const position = board.columns.length;
      await api.addColumn(board.id, newColTitle.trim(), position);
      setNewColTitle("");
      setColDialogOpen(false);
      fetchBoard(); // Refresh board
      toast.success("Coluna criada!");
    } catch (error) {
      toast.error("Erro ao criar coluna.");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !newTaskColId || !board) return;
    try {
      const col = board.columns.find(c => c.id === newTaskColId);
      const position = col ? col.taskIds.length : 0;
      await api.addTask(newTaskColId, newTaskTitle.trim(), newTaskDesc.trim() || undefined, position);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskColId("");
      setTaskDialogOpen(false);
      fetchBoard();
      toast.success("Tarefa criada!");
    } catch (error) {
      toast.error("Erro ao criar tarefa.");
    }
  };

  const handleRemoveColumn = async (colId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta coluna e suas tarefas?")) return;
    try {
      await api.deleteColumn(colId);
      fetchBoard();
      toast.success("Coluna excluída.");
    } catch (error) {
      toast.error("Erro ao excluir coluna.");
    }
  };

  const handleRenameColumn = async (colId: string, title: string) => {
    try {
      await api.updateColumn(colId, { title });
      fetchBoard();
    } catch (error) {
      toast.error("Erro ao renomear coluna.");
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    try {
      await api.deleteTask(taskId);
      fetchBoard();
      toast.success("Tarefa excluída.");
    } catch (error) {
      toast.error("Erro ao excluir tarefa.");
    }
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
    async (e: React.DragEvent, toColId: string) => {
      e.preventDefault();
      if (!dragData || !board) return;
      const { taskId, fromColId } = dragData;

      // Optimistic update logic could go here, but for simplicity we just API call and refresh
      // Calculate new position (append to end for now)
      const toCol = board.columns.find((c) => c.id === toColId);
      const newPosition = toCol ? toCol.taskIds.length : 0;

      try {
        await api.moveTask(taskId, toColId, newPosition);
        fetchBoard();
      } catch (error) {
        toast.error("Erro ao mover tarefa.");
      }
      setDragData(null);
    },
    [dragData, board, fetchBoard]
  );

  const handleMoveTaskFromList = useCallback(
    async (taskId: string, fromColId: string, toColId: string) => {
      // similar logic to drop
      if (!board) return;
      const toCol = board.columns.find((c) => c.id === toColId);
      const newPosition = toCol ? toCol.taskIds.length : 0;
      try {
        await api.moveTask(taskId, toColId, newPosition);
        fetchBoard();
      } catch (error) {
        toast.error("Erro ao mover tarefa.");
      }
    },
    [board, fetchBoard]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-kanban-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!board) {
    return <div className="flex h-screen items-center justify-center">Erro ao carregar quadro.</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-kanban-bg">
      {/* Top bar */}
      <header
        className="flex items-center justify-between gap-4 px-5 py-3.5 shadow-lg"
        style={{ background: "linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <LayoutDashboard className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <h1 className="text-lg font-extrabold text-white tracking-tight">{board.title}</h1>
            {user && (
              <p
                className="mt-0.5 text-xs font-medium text-white/90"
                title={`Logado como ${user.user_metadata?.full_name || user.email}`}
              >
                {user.user_metadata?.full_name || user.email}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="mr-1 rounded-md bg-white/15 p-1"
          >
            <ToggleGroupItem
              value="kanban"
              aria-label="Modo Kanban"
              className="text-white data-[state=on]:bg-white/25 data-[state=on]:text-white"
            >
              Kanban
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="Modo Lista"
              className="text-white data-[state=on]:bg-white/25 data-[state=on]:text-white"
            >
              Lista
            </ToggleGroupItem>
          </ToggleGroup>
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
                toast.error("Crie uma coluna antes de adicionar tarefas.");
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
      {viewMode === "kanban" ? (
        <main className="flex flex-1 gap-4 overflow-x-auto p-4 kanban-scrollbar">
          {board?.columns.map((col, idx) => {
            const tasks = col.taskIds
              .map((id) => board.tasks.find((t) => t.id === id))
              .filter(Boolean) as Task[];
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasks}
                colorIndex={idx}
                onRename={handleRenameColumn}
                onRemoveColumn={handleRemoveColumn}
                onRemoveTask={handleRemoveTask}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            );
          })}

          {board?.columns.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground">Nenhuma coluna ainda. Clique em "Nova coluna" para começar.</p>
            </div>
          )}
        </main>
      ) : (
        <main className="flex flex-1 overflow-y-auto p-4 kanban-scrollbar">
          <ListView
            board={board}
            onRemoveTask={handleRemoveTask}
            onMoveTask={handleMoveTaskFromList}
          />
        </main>
      )}

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
