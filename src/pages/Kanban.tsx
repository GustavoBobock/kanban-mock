import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { api, type Board, type Column, type Task, type Client } from "@/lib/api";
import { KanbanColumn } from "@/components/KanbanColumn";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { NewTaskModal } from "@/components/NewTaskModal";
import { ListView } from "@/components/ListView";
import { ClientSidebar } from "@/components/ClientSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, LayoutDashboard, Loader2, AlertCircle, Clock, CheckCircle2, Filter, Search, Users, Wand2, Calendar as CalendarIcon, X } from "lucide-react";
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
  const [searchParams, setSearchParams] = useSearchParams();
  // CRM Data
  const [clients, setClients] = useState<Client[]>([]);

  // silent=true → não altera o estado de loading (usado em refreshes de background)
  // silent=false (padrão) → mostra spinner durante o carregamento inicial
  const fetchBoard = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      const data = await api.getBoard(user.id);

      // Migration of legacy columns
      let columns = data?.columns || [];
      let updated = false;

      const migrationMap: Record<string, string> = {
        "Em Progresso": "Em Andamento",
        "Feito": "Entregue"
      };

      for (const col of columns) {
        if (migrationMap[col.title]) {
          const newTitle = migrationMap[col.title];
          await api.updateColumn(col.id, { title: newTitle });
          col.title = newTitle;
          updated = true;
        }
      }

      if (updated) {
        setBoard({ ...data!, columns });
      } else {
        setBoard(data);
      }
    } catch (error) {
      console.error("Error fetching board:", error);
      if (!silent) toast.error("Erro ao carregar o quadro.");
    } finally {
      if (!silent) setLoading(false);
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

  // Hook into URL Params
  useEffect(() => {
    const clientIdParam = searchParams.get('client_id');
    if (clientIdParam && clients.length > 0) {
      setFilterClientId(clientIdParam);
      const clientName = clients.find(c => c.id === clientIdParam)?.name || "Cliente";
      toast.info(`Filtrando tarefas de ${clientName}`);

      searchParams.delete('client_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, clients, setSearchParams]);

  // New column dialog
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // New task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Filters

  // Filters
  const [filterClientId, setFilterClientId] = useState("all");
  const [filterClient, setFilterClient] = useState("");
  const [filterObligation, setFilterObligation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all, vencidas, urgentes, no_prazo
  const [generating, setGenerating] = useState(false);

  // Drag state
  const [dragData, setDragData] = useState<{ taskId: string; fromColId: string } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Detail Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskTab, setSelectedTaskTab] = useState<"details" | "history">("details");
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [inlineColTitle, setInlineColTitle] = useState("");

  // Memoized KPIs
  const kpiStats = useMemo(() => {
    if (!board) return { vencidas: 0, vencem3: 0, vencem7: 0 };
    const today = startOfDay(new Date());
    const threeDays = addDays(today, 3);
    const sevenDays = addDays(today, 7);

    return {
      vencidas: board.tasks.filter(t => t.due_date && isBefore(parseISO(t.due_date), today)).length,
      vencem3: board.tasks.filter(t => {
        if (!t.due_date) return false;
        const date = parseISO(t.due_date);
        return (isAfter(date, today) || date.getTime() === today.getTime()) && isBefore(date, threeDays);
      }).length,
      vencem7: board.tasks.filter(t => {
        if (!t.due_date) return false;
        const date = parseISO(t.due_date);
        return isAfter(date, today) && isBefore(date, sevenDays);
      }).length,
    };
  }, [board]);

  // Memoized Filters
  const filteredTasks = useMemo(() => {
    if (!board) return [];
    return board.tasks.filter(t => {
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
  }, [board?.tasks, filterClientId, filterClient, filterObligation, filterStatus]);

  const filteredBoard = useMemo(() => {
    if (!board) return null;
    return { ...board, tasks: filteredTasks };
  }, [board, filteredTasks]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleAddColumn = async (title?: string) => {
    const finalTitle = title || newColTitle;
    if (!finalTitle.trim() || !board) return;
    try {
      const position = board.columns.length;
      await api.addColumn(board.id, finalTitle.trim(), position);
      setNewColTitle("");
      setInlineColTitle("");
      setColDialogOpen(false);
      setIsAddingColumn(false);
      fetchBoard();
      toast.success("Coluna criada!");
    } catch (error: any) {
      console.error("Erro ao criar coluna:", error);
      toast.error(`Erro ao criar coluna: ${error?.message || "Falha de comunicação com o Supabase"}`);
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
    } catch (error: any) {
      console.error("Erro ao excluir coluna:", error);
      toast.error(`Erro ao excluir coluna: ${error?.message || "Servidor indisponível"}`);
    }
  };

  const handleRenameColumn = async (colId: string, title: string) => {
    try {
      await api.updateColumn(colId, { title });
      fetchBoard();
    } catch (error: any) {
      console.error("Erro ao renomear coluna:", error);
      toast.error(`Erro ao renomear coluna: ${error?.message || "Servidor indisponível"}`);
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    try {
      await api.deleteTask(taskId);
      fetchBoard();
      toast.success("Tarefa excluída.");
    } catch (error: any) {
      console.error("Erro ao excluir tarefa:", error);
      toast.error(`Erro ao excluir tarefa: ${error?.message || "Servidor indisponível"}`);
    }
  };

  const handleMoveToEntregue = async (taskId: string) => {
    const entregueCol = board?.columns.find(c => c.title.toLowerCase() === "entregue" || c.title.toLowerCase() === "concluído");
    if (entregueCol) {
      try {
        await api.moveTask(taskId, entregueCol.id, 0); // Move para o topo
        fetchBoard();
        toast.success("Tarefa concluída!");
      } catch (error) {
        toast.error("Erro ao concluir tarefa.");
      }
    } else {
      toast.error("Coluna 'Entregue' não encontrada.");
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await api.updateTask(taskId, updates);
      fetchBoard();
      toast.success("Tarefa atualizada!");
    } catch (error: any) {
      toast.error(`Erro ao atualizar tarefa: ${error?.message || "Servidor indisponível"}`);
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string, columnId: string) => {
    setDragData({ taskId, fromColId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("columnId", columnId);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, toColId: string) => {
      e.preventDefault();

      const draggedColId = e.dataTransfer.getData("columnId");
      if (draggedColId) {
        if (draggedColId === toColId || !board) return;

        const newColumns = [...board.columns];
        const fromIndex = newColumns.findIndex(c => c.id === draggedColId);
        const toIndex = newColumns.findIndex(c => c.id === toColId);

        const [movedCol] = newColumns.splice(fromIndex, 1);
        newColumns.splice(toIndex, 0, movedCol);

        // Update positions in DB
        try {
          await Promise.all(newColumns.map((col, idx) =>
            api.updateColumn(col.id, { position: idx })
          ));
          fetchBoard();
        } catch (error) {
          toast.error("Erro ao reordenar colunas.");
        }
        setDraggedColumnId(null);
        return;
      }

      if (!dragData || !board) return;
      const { taskId, fromColId } = dragData;

      if (fromColId === toColId) {
        setDragData(null);
        return;
      }

      const toCol = board.columns.find((c) => c.id === toColId);
      const newPosition = toCol ? toCol.taskIds.length : 0;

      // Salva o estado original para realizar rollback visual em caso de erro
      const originalBoard = { ...board };

      // Update Otimista Instantâneo do Board
      setBoard(prev => {
        if (!prev) return prev;
        try {
          const newBoard = { ...prev, columns: [...prev.columns], tasks: [...prev.tasks] };

          const fromColIdx = newBoard.columns.findIndex(c => c.id === fromColId);
          const toColIdx = newBoard.columns.findIndex(c => c.id === toColId);

          if (fromColIdx >= 0 && toColIdx >= 0) {
            newBoard.columns[fromColIdx] = {
              ...newBoard.columns[fromColIdx],
              taskIds: newBoard.columns[fromColIdx].taskIds.filter(id => id !== taskId)
            };

            newBoard.columns[toColIdx] = {
              ...newBoard.columns[toColIdx],
              taskIds: [...newBoard.columns[toColIdx].taskIds, taskId]
            };

            // Atualiza também a column_id da task em board.tasks
            newBoard.tasks = newBoard.tasks.map(t =>
              t.id === taskId ? { ...t, column_id: toColId } : t
            );
          }
          return newBoard;
        } catch {
          return prev; // rollback silencioso se o update otimista falhar
        }
      });

      try {
        await api.moveTask(taskId, toColId, newPosition);
        // Refresh silencioso: a atualização otimista já atualizou a UI corretamente.
        // Usar silent=true para NÃO disparar setLoading(true), que causava tela branca.
        fetchBoard(true);
      } catch (error) {
        console.error("Erro exato ao mover tarefa no Supabase:", error);
        toast.error("Erro ao mover tarefa. Tente novamente.");
        setBoard(originalBoard); // rollback visual
      }
      setDragData(null);
    },
    [dragData, board, fetchBoard]
  );

  const handleMoveTaskFromList = useCallback(
    async (taskId: string, fromColId: string, toColId: string) => {
      // similar logic to drop
      if (!board || !fromColId) return;

      if (fromColId === toColId) return;

      const toCol = board.columns.find((c) => c.id === toColId);
      const newPosition = toCol ? toCol.taskIds.length : 0;

      const originalBoard = { ...board };

      setBoard(prev => {
        if (!prev) return prev;
        const newBoard = { ...prev, columns: [...prev.columns], tasks: [...prev.tasks] };

        const fromColIdx = newBoard.columns.findIndex(c => c.id === fromColId);
        const toColIdx = newBoard.columns.findIndex(c => c.id === toColId);

        if (fromColIdx >= 0 && toColIdx >= 0) {
          newBoard.columns[fromColIdx] = {
            ...newBoard.columns[fromColIdx],
            taskIds: newBoard.columns[fromColIdx].taskIds.filter(id => id !== taskId)
          };

          newBoard.columns[toColIdx] = {
            ...newBoard.columns[toColIdx],
            taskIds: [...newBoard.columns[toColIdx].taskIds, taskId]
          };

          newBoard.tasks = newBoard.tasks.map(t =>
            t.id === taskId ? { ...t, column_id: toColId } : t
          );
        }
        return newBoard;
      });

      try {
        await api.moveTask(taskId, toColId, newPosition);
        // Refresh silencioso: sem tela branca ao mover da lista
        fetchBoard(true);
      } catch (error) {
        console.error("Erro exato ao mover tarefa da lista no Supabase:", error);
        toast.error("Erro ao mover tarefa. Tente novamente.");
        setBoard(originalBoard); // rollback
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

          <ClientSidebar clients={clients} />

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
              <h3 className="text-2xl font-bold text-red-700">{kpiStats.vencidas}</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-border/40">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vencem em 3 dias</p>
              <h3 className="text-2xl font-bold text-amber-700">{kpiStats.vencem3}</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-border/40">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vencem em 7 dias</p>
              <h3 className="text-2xl font-bold text-green-700">{kpiStats.vencem7}</h3>
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

      {filteredBoard ? (
        viewMode === "kanban" ? (
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
                  onColumnDragStart={handleColumnDragStart}
                  onTaskClick={(task) => {
                    setSelectedTask(task);
                    setSelectedTaskTab("details");
                    setDetailModalOpen(true);
                  }}
                  onAnotarClick={(task) => {
                    setSelectedTask(task);
                    setSelectedTaskTab("history");
                    setDetailModalOpen(true);
                  }}
                  onConcluirClick={handleMoveToEntregue}
                  onUpdateTask={handleUpdateTask}
                  clients={clients}
                />
              );
            })}

            {/* Add Column Inline */}
            <div className="w-72 shrink-0">
              {isAddingColumn ? (
                <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-white/50 p-4 shadow-sm">
                  <Input
                    placeholder="Nome da coluna..."
                    value={inlineColTitle}
                    onChange={(e) => setInlineColTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn(inlineColTitle);
                      if (e.key === "Escape") setIsAddingColumn(false);
                    }}
                    autoFocus
                    className="mb-2 h-9 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddColumn(inlineColTitle)} className="h-8 flex-1">
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Adicionar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsAddingColumn(false)} className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-slate-500 transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-bold">Nova Coluna</span>
                </button>
              )}
            </div>

            {filteredBoard.columns.length === 0 && !isAddingColumn && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Nenhuma coluna ainda. Clique em "Nova coluna" para começar.</p>
              </div>
            )}
          </main>
        ) : (
          <ListView
            board={filteredBoard}
            onTaskClick={(task) => {
              setSelectedTask(task);
              setSelectedTaskTab("details");
              setDetailModalOpen(true);
            }}
          />
        )
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Carregando quadro...</p>
        </div>
      )}

      {/* Task detail & history modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          clients={clients}
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          onUpdate={fetchBoard}
          defaultTab={selectedTaskTab}
        />
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
            <Button onClick={() => handleAddColumn()} disabled={!newColTitle.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New task dialog */}
      {board && (
        <NewTaskModal
          isOpen={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          board={board}
          clients={clients}
          onSuccess={() => fetchBoard(true)}
        />
      )}
    </div>
  );
};

export default Kanban;
