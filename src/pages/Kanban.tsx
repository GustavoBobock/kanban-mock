import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { api, type Board, type Column, type Task, type Client } from "@/lib/api";
import { KanbanColumn } from "@/components/KanbanColumn";
import { ListView } from "@/components/ListView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, LayoutDashboard, Loader2, AlertCircle, Clock, CheckCircle2, Filter, Search, Users, Wand2, Calendar as CalendarIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, isAfter, addDays, startOfDay, parseISO, setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
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
    if (user) {
      api.getClients(user.id).then(setClients).catch(() => { });
    }
  }, [fetchBoard, user]);

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
  const [newTaskClientId, setNewTaskClientId] = useState("");
  const [newTaskClient, setNewTaskClient] = useState("");
  const [newTaskCnpj, setNewTaskCnpj] = useState("");
  const [newTaskObligation, setNewTaskObligation] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskCompetence, setNewTaskCompetence] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Média");
  const [newTaskObs, setNewTaskObs] = useState("");

  // CRM Data
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [filterClientId, setFilterClientId] = useState("all");
  const [filterClient, setFilterClient] = useState("");
  const [filterObligation, setFilterObligation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all, vencidas, urgentes, no_prazo
  const [generating, setGenerating] = useState(false);

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

      const selectedClient = clients.find(c => c.id === newTaskClientId);
      const clientName = selectedClient ? selectedClient.name : newTaskClient.trim();

      await api.addTask(newTaskColId, newTaskTitle.trim(), newTaskDesc.trim() || undefined, position, {
        client_id: newTaskClientId || undefined,
        client_name: clientName,
        client_cnpj: newTaskCnpj.trim() || selectedClient?.cnpj,
        obligation_type: newTaskObligation,
        due_date: newTaskDueDate || undefined,
        competence: newTaskCompetence.trim(),
        priority: newTaskPriority,
        observations: newTaskObs.trim()
      });
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskColId("");
      setNewTaskClientId("");
      setNewTaskClient("");
      setNewTaskCnpj("");
      setNewTaskObligation("");
      setNewTaskDueDate("");
      setNewTaskCompetence("");
      setNewTaskPriority("Média");
      setNewTaskObs("");
      setTaskDialogOpen(false);
      fetchBoard();
      toast.success("Tarefa criada!");
    } catch (error) {
      toast.error("Erro ao criar tarefa.");
    }
  };

  const handleGenerateMonthlyTasks = async (targetClientId?: string) => {
    if (!board || !user || clients.length === 0) return;

    setGenerating(true);
    const toDoCol = board.columns.find(c => c.title === "A Fazer");
    if (!toDoCol) {
      toast.error("Coluna 'A Fazer' não encontrada.");
      setGenerating(false);
      return;
    }

    const clientsToProcess = targetClientId
      ? clients.filter(c => c.id === targetClientId)
      : clients;

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const competence = `${currentMonth.toString().padStart(2, '0')}/${currentYear}`;

    let createdCount = 0;
    try {
      for (const client of clientsToProcess) {
        if (!client.active_obligations || !Array.isArray(client.active_obligations)) continue;

        for (const ob of client.active_obligations) {
          let day = 15; // default
          if (ob === "PGDAS") day = 20;
          if (ob === "Folha de Pagamento" || ob === "FGTS") day = 7;

          // Use a new date object for each calculation to be safe
          const taskDate = setDate(new Date(today), day);
          const dueDate = format(taskDate, "yyyy-MM-dd");

          // Basic check: don't create if same client/ob/competence exists in this board
          const exists = board.tasks.some(t =>
            t.client_id === client.id &&
            t.obligation_type === ob &&
            t.competence === competence
          );

          if (!exists) {
            await api.addTask(toDoCol.id, `${ob} - ${client.name}`, undefined, 0, {
              client_id: client.id,
              client_name: client.name,
              obligation_type: ob,
              due_date: dueDate,
              competence: competence,
              priority: "Média"
            });
            createdCount++;
          }
        }
      }
      if (createdCount > 0) {
        toast.success(`${createdCount} tarefas geradas com sucesso!`);
        fetchBoard();
      } else {
        toast.info("Nenhuma tarefa nova para gerar este mês.");
      }
    } catch (error: any) {
      console.error("Erro detalhado na geração:", error);
      toast.error(`Erro ao gerar tarefas: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setGenerating(false);
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
            className="mr-3 rounded-md bg-white/15 p-1"
          >
            <ToggleGroupItem
              value="kanban"
              aria-label="Modo Kanban"
              className="text-white data-[state=on]:bg-white/25 data-[state=on]:text-white h-7 px-3 text-xs"
            >
              Kanban
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="Modo Lista"
              className="text-white data-[state=on]:bg-white/25 data-[state=on]:text-white h-7 px-3 text-xs"
            >
              Lista
            </ToggleGroupItem>
          </ToggleGroup>

          <Button variant="outline" size="sm" asChild className="bg-white/10 text-white hover:bg-white/20 border-white/20">
            <Link to="/clientes">
              <Users className="mr-2 h-4 w-4" />
              Clientes (CRM)
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateMonthlyTasks()}
            disabled={generating}
            className="bg-white/10 text-white hover:bg-white/20 border-white/20"
          >
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Gerar do Mês
          </Button>

          <NotificationCenter boardTasks={board?.tasks || []} />

          <Button onClick={() => setTaskDialogOpen(true)} size="sm" className="bg-white text-primary hover:bg-white/90 font-bold">
            <Plus className="mr-1 h-4 w-4" />
            Nova Tarefa
          </Button>

          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/80 hover:text-white hover:bg-white/15 ml-2" title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Dashboard & Filters */}
      <div className="bg-white/50 border-b border-border/40 p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-border/40">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vencidas</p>
              <h3 className="text-2xl font-bold text-red-700">
                {board.tasks.filter(t => t.due_date && isBefore(parseISO(t.due_date), startOfDay(new Date()))).length}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-border/40">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vencem em 3 dias</p>
              <h3 className="text-2xl font-bold text-amber-700">
                {board.tasks.filter(t => {
                  if (!t.due_date) return false;
                  const date = parseISO(t.due_date);
                  const today = startOfDay(new Date());
                  return (isAfter(date, today) || date.getTime() === today.getTime()) && isBefore(date, addDays(today, 3));
                }).length}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-border/40">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vencem em 7 dias</p>
              <h3 className="text-2xl font-bold text-green-700">
                {board.tasks.filter(t => {
                  if (!t.due_date) return false;
                  const date = parseISO(t.due_date);
                  const today = startOfDay(new Date());
                  return isAfter(date, today) && isBefore(date, addDays(today, 7));
                }).length}
              </h3>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterClientId} onValueChange={setFilterClientId}>
            <SelectTrigger className="w-[200px] bg-white h-9 text-sm">
              <SelectValue placeholder="Selecionar Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterObligation} onValueChange={setFilterObligation}>
            <SelectTrigger className="w-[180px] bg-white h-9 text-sm">
              <SelectValue placeholder="Obrigação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Obrigações</SelectItem>
              <SelectItem value="DCTF">DCTF</SelectItem>
              <SelectItem value="SPED">SPED</SelectItem>
              <SelectItem value="PGDAS">PGDAS</SelectItem>
              <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
              <SelectItem value="Folha de Pagamento">Folha de Pagamento</SelectItem>
              <SelectItem value="FGTS">FGTS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] bg-white h-9 text-sm">
              <SelectValue placeholder="Prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Prazos</SelectItem>
              <SelectItem value="vencidas">Vencidas</SelectItem>
              <SelectItem value="urgentes">Urgentes (3 dias)</SelectItem>
              <SelectItem value="no_prazo">No Prazo</SelectItem>
            </SelectContent>
          </Select>

          {(filterClientId !== "all" || filterObligation !== "all" || filterStatus !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => {
              setFilterClientId("all");
              setFilterObligation("all");
              setFilterStatus("all");
            }} className="text-xs h-8">
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Board */}
      {(() => {
        if (!board) return null;

        const filteredTasks = board.tasks.filter(t => {
          if (filterClientId !== "all" && t.client_id !== filterClientId) return false;
          if (filterClient && !t.client_name?.toLowerCase().includes(filterClient.toLowerCase())) return false;
          if (filterObligation && filterObligation !== "all" && t.obligation_type !== filterObligation) return false;

          if (filterStatus && filterStatus !== "all") {
            const today = startOfDay(new Date());
            if (!t.due_date) return filterStatus === "no_prazo";
            const date = parseISO(t.due_date);

            if (filterStatus === "vencidas") return isBefore(date, today);
            if (filterStatus === "urgentes") return (isAfter(date, today) || date.getTime() === today.getTime()) && isBefore(date, addDays(today, 3));
            if (filterStatus === "no_prazo") return isAfter(date, addDays(today, 3));
          }
          return true;
        });

        const filteredBoard = { ...board, tasks: filteredTasks };

        return viewMode === "kanban" ? (
          <main className="flex flex-1 gap-4 overflow-x-auto p-4 kanban-scrollbar">
            {filteredBoard.columns.map((col, idx) => {
              const columnTasks = col.taskIds
                .map((id) => filteredBoard.tasks.find((t) => t.id === id))
                .filter(Boolean) as Task[];

              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={columnTasks}
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

            {filteredBoard.columns.length === 0 && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Nenhuma coluna ainda. Clique em "Nova coluna" para começar.</p>
              </div>
            )}
          </main>
        ) : (
          <main className="flex flex-1 overflow-y-auto p-4 kanban-scrollbar">
            <ListView
              board={filteredBoard}
              onRemoveTask={handleRemoveTask}
              onMoveTask={handleMoveTaskFromList}
            />
          </main>
        );
      })()}

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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova tarefa contábil</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-title" className="text-right">Título</Label>
              <Input
                id="task-title"
                className="col-span-3"
                placeholder="Ex.: Declaração do Simples"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Cliente Fixo</Label>
              <Select value={newTaskClientId} onValueChange={setNewTaskClientId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Opcional: selecionar do CRM..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (usar manual)</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-client" className="text-right">Cliente Manual</Label>
              <Input
                id="task-client"
                className="col-span-3"
                placeholder="Nome do Cliente (se não estiver no CRM)"
                value={newTaskClient}
                onChange={(e) => setNewTaskClient(e.target.value)}
                disabled={!!newTaskClientId && newTaskClientId !== "none"}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-cnpj" className="text-right">CNPJ</Label>
              <Input
                id="task-cnpj"
                className="col-span-3"
                placeholder="00.000.000/0000-00"
                value={newTaskCnpj}
                onChange={(e) => setNewTaskCnpj(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Obrigação</Label>
              <Select value={newTaskObligation} onValueChange={setNewTaskObligation}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {["DCTF", "SPED", "PGDAS", "DEFIS", "ECF", "ECD", "REINF", "NFS-e", "Simples Nacional", "Folha de Pagamento", "FGTS", "Outros"].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-due" className="text-right">Vencimento</Label>
              <Input
                id="task-due"
                type="date"
                className="col-span-3"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-comp" className="text-right">Competência</Label>
              <Input
                id="task-comp"
                placeholder="MM/AAAA"
                className="col-span-3"
                value={newTaskCompetence}
                onChange={(e) => setNewTaskCompetence(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Prioridade</Label>
              <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-obs" className="text-right">Observações</Label>
              <Textarea
                id="task-obs"
                className="col-span-3"
                placeholder="Notas internas..."
                value={newTaskObs}
                onChange={(e) => setNewTaskObs(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Coluna</Label>
              <Select value={newTaskColId} onValueChange={setNewTaskColId}>
                <SelectTrigger className="col-span-3">
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
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim() || !newTaskColId} className="w-full">
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kanban;
