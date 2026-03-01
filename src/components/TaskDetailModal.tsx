import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, type Task, type TaskNote, type Client } from "@/lib/api";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
    History,
    FileText,
    Paperclip,
    Image as ImageIcon,
    Send,
    Trash2,
    Edit2,
    Pencil,
    Save,
    X,
    Loader2,
    Calendar,
    User,
    Briefcase,
    AlertTriangle,
    MessageSquare,
    ChevronDown,
    Building2,
    Hash
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";

interface TaskDetailModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    clients: Client[];
    defaultTab?: "details" | "history";
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate, clients, defaultTab = "details" }: TaskDetailModalProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<string>(defaultTab);

    // Update activeTab when defaultTab changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);
    const [notes, setNotes] = useState<TaskNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);

    // New note state
    const [newNoteContent, setNewNoteContent] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [pendingImages, setPendingImages] = useState<string[]>([]);
    const [charCount, setCharCount] = useState(0);

    // Edit note state
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Task Editing State
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editedTask, setEditedTask] = useState<Partial<Task>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEditedTask({
                title: task.title,
                client_id: task.client_id,
                client_name: task.client_name,
                client_cnpj: task.client_cnpj,
                obligation_type: task.obligation_type,
                due_date: task.due_date,
                competence: task.competence,
                priority: task.priority || "Média",
                observations: task.observations
            });
            setIsEditingTask(false);
            setHasChanges(false);
        }
    }, [isOpen, task]);

    const handleTaskFieldChange = (field: keyof Task, value: any) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSaveTask = async () => {
        try {
            setIsSaving(true);
            await api.updateTask(task.id, editedTask);
            setHasChanges(false);
            setIsEditingTask(false);
            onUpdate();
            toast.success("Tarefa atualizada com sucesso!");
        } catch (error) {
            toast.error("Erro ao atualizar tarefa.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            if (confirm("Você tem alterações não salvas. Deseja sair?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    // Persistence of draft
    useEffect(() => {
        if (isOpen) {
            const draft = localStorage.getItem(`task_draft_${task.id}`);
            if (draft) {
                setNewNoteContent(draft);
                setCharCount(draft.length);
            }
            fetchNotes();
        }
    }, [isOpen, task.id]);

    useEffect(() => {
        if (newNoteContent) {
            localStorage.setItem(`task_draft_${task.id}`, newNoteContent);
        } else {
            localStorage.removeItem(`task_draft_${task.id}`);
        }
    }, [newNoteContent, task.id]);

    const fetchNotes = async () => {
        try {
            setLoadingNotes(true);
            const data = await api.getTaskNotes(task.id);
            setNotes(data);
        } catch (error) {
            console.error("Erro ao buscar notas:", error);
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleCreateNote = async () => {
        if (!newNoteContent.trim() && pendingImages.length === 0) return;
        if (!user) return;

        try {
            await api.addTaskNote(task.id, user.id, newNoteContent, pendingImages);
            setNewNoteContent("");
            setPendingImages([]);
            setCharCount(0);
            localStorage.removeItem(`task_draft_${task.id}`);
            fetchNotes();
            toast.success("Anotação salva!");
        } catch (error) {
            toast.error("Erro ao salvar anotação.");
        }
    };

    const handleUpdateNote = async (noteId: string) => {
        try {
            await api.updateTaskNote(noteId, { content: editContent });
            setEditingNoteId(null);
            fetchNotes();
            toast.success("Anotação atualizada!");
        } catch (error) {
            toast.error("Erro ao atualizar anotação.");
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Excluir esta anotação? Esta ação não pode ser desfeita.")) return;
        try {
            await api.deleteTaskNote(noteId);
            fetchNotes();
            toast.success("Anotação excluída.");
        } catch (error) {
            toast.error("Erro ao excluir anotação.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (pendingImages.length + files.length > 5) {
            toast.error("Máximo de 5 imagens por anotação.");
            return;
        }

        setIsUploading(true);
        try {
            const uploadPromises = Array.from(files).map(file => api.uploadTaskImage(file));
            const urls = await Promise.all(uploadPromises);
            setPendingImages([...pendingImages, ...urls]);
        } catch (error) {
            toast.error("Erro ao fazer upload das imagens.");
        } finally {
            setIsUploading(false);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    if (pendingImages.length >= 5) {
                        toast.error("Máximo de 5 imagens.");
                        return;
                    }
                    setIsUploading(true);
                    try {
                        const url = await api.uploadTaskImage(file);
                        setPendingImages(prev => [...prev, url]);
                    } catch (error) {
                        toast.error("Erro ao processar imagem colada.");
                    } finally {
                        setIsUploading(false);
                    }
                }
            }
        }
    };

    // WhatsApp Detector & Formatter
    const renderContent = (content: string) => {
        const waRegex = /\[(\d{2}\/\d{2}\/\d{4}),\s(\d{2}:\d{2}:\d{2})\]\s([^:]+):\s/g;
        const isWhatsApp = waRegex.test(content);

        if (!isWhatsApp) {
            return <p className="whitespace-pre-wrap text-sm text-slate-700">{content}</p>;
        }

        const lines = content.split('\n');
        return (
            <div className="space-y-2 mt-2">
                {lines.map((line, idx) => {
                    const match = /\[(\d{2}\/\d{2}\/\d{4}),\s(\d{2}:\d{2}:\d{2})\]\s([^:]+):\s(.*)/.exec(line);
                    if (match) {
                        const [_, date, time, sender, text] = match;
                        const isContador = sender.toLowerCase().includes("contador") || sender.toLowerCase().includes("você");

                        return (
                            <div key={idx} className={`flex ${isContador ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg px-3 py-1.5 shadow-sm ${isContador ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                    }`}>
                                    <div className="flex justify-between items-center gap-4 mb-0.5">
                                        <span className="text-[10px] font-bold text-slate-500">{sender}</span>
                                        <span className="text-[9px] text-slate-400">{time}</span>
                                    </div>
                                    <p className="text-sm">{text}</p>
                                </div>
                            </div>
                        );
                    }
                    return <p key={idx} className="text-sm text-slate-600 pl-4 border-l-2 border-slate-100 italic">{line}</p>;
                })}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2 border-b">
                    <div className="flex items-center justify-between pr-8">
                        {isEditingTask ? (
                            <Input
                                value={editedTask.title}
                                onChange={(e) => handleTaskFieldChange("title", e.target.value)}
                                className="text-xl font-bold h-9 border-primary/30 focus-visible:ring-primary/20"
                            />
                        ) : (
                            <DialogTitle className="text-xl font-bold">{task.title}</DialogTitle>
                        )}
                        <div className="flex items-center gap-2">
                            {!isEditingTask && (
                                <Badge variant={task.priority === "Urgente" ? "destructive" : "secondary"}>
                                    {task.priority || "Média"}
                                </Badge>
                            )}
                            <Button
                                variant={isEditingTask ? "outline" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 gap-1.5 font-bold",
                                    isEditingTask ? "text-slate-500" : "text-primary hover:text-primary hover:bg-primary/5"
                                )}
                                onClick={() => isEditingTask ? setIsEditingTask(false) : setIsEditingTask(true)}
                            >
                                {isEditingTask ? (
                                    <><X className="h-3.5 w-3.5" /> Cancelar</>
                                ) : (
                                    <><Pencil className="h-3.5 w-3.5" /> Editar tarefa</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b">
                        <TabsList className="w-full justify-start bg-transparent h-12 gap-6 p-0">
                            <TabsTrigger
                                value="details"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12"
                            >
                                <FileText className="h-4 w-4 mr-2" /> Detalhes
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12"
                            >
                                <History className="h-4 w-4 mr-2" /> Histórico
                                {notes.length > 0 && (
                                    <span className="ml-1.5 bg-primary/10 text-primary text-[10px] py-0.5 px-1.5 rounded-full font-bold">
                                        {notes.length}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto">
                        <TabsContent value="details" className="p-6 m-0 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" /> Cliente
                                    </Label>
                                    {isEditingTask ? (
                                        <Select
                                            value={editedTask.client_id || "none"}
                                            onValueChange={(val) => {
                                                handleTaskFieldChange("client_id", val === "none" ? undefined : val);
                                                handleTaskFieldChange("client_name", val === "none" ? undefined : clients.find(c => c.id === val)?.name);
                                            }}
                                        >
                                            <SelectTrigger className={cn(
                                                "h-10 text-sm",
                                                editedTask.client_id !== task.client_id && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                            )}>
                                                <SelectValue placeholder="Selecione o cliente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {clients.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700">{task.client_name || "N/A"}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                        <Hash className="h-3.5 w-3.5" /> CNPJ
                                    </Label>
                                    {isEditingTask ? (
                                        <Input
                                            value={editedTask.client_cnpj || ""}
                                            onChange={(e) => handleTaskFieldChange("client_cnpj", e.target.value)}
                                            placeholder="00.000.000/0000-00"
                                            className={cn(
                                                "h-10 text-sm",
                                                editedTask.client_cnpj !== task.client_cnpj && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                            )}
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700">{task.client_cnpj || "N/A"}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                        <Briefcase className="h-3.5 w-3.5" /> Obrigação
                                    </Label>
                                    {isEditingTask ? (
                                        <Input
                                            value={editedTask.obligation_type || ""}
                                            onChange={(e) => handleTaskFieldChange("obligation_type", e.target.value)}
                                            className={cn(
                                                "h-10 text-sm",
                                                editedTask.obligation_type !== task.obligation_type && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                            )}
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700">{task.obligation_type || "N/A"}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" /> Vencimento
                                    </Label>
                                    {isEditingTask ? (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "h-10 w-full justify-start text-left font-normal text-sm",
                                                        !editedTask.due_date && "text-muted-foreground",
                                                        editedTask.due_date !== task.due_date && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                                    )}
                                                >
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    {editedTask.due_date ? format(parseISO(editedTask.due_date), "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <CalendarComponent
                                                    mode="single"
                                                    selected={editedTask.due_date ? parseISO(editedTask.due_date) : undefined}
                                                    onSelect={(date) => handleTaskFieldChange("due_date", date?.toISOString())}
                                                    initialFocus
                                                    locale={ptBR}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700">
                                            {task.due_date ? format(parseISO(task.due_date), "PPP", { locale: ptBR }) : "Sem data"}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                        <MessageSquare className="h-3.5 w-3.5" /> Competência
                                    </Label>
                                    {isEditingTask ? (
                                        <Input
                                            value={editedTask.competence || ""}
                                            onChange={(e) => handleTaskFieldChange("competence", e.target.value)}
                                            placeholder="MM/AAAA"
                                            className={cn(
                                                "h-10 text-sm",
                                                editedTask.competence !== task.competence && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                            )}
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700">{task.competence || "N/A"}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Prioridade
                                    </Label>
                                    {isEditingTask ? (
                                        <Select
                                            value={editedTask.priority || "Média"}
                                            onValueChange={(val) => handleTaskFieldChange("priority", val)}
                                        >
                                            <SelectTrigger className={cn(
                                                "h-10 text-sm",
                                                editedTask.priority !== task.priority && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                            )}>
                                                <SelectValue placeholder="Prioridade" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Baixa">Baixa</SelectItem>
                                                <SelectItem value="Média">Média</SelectItem>
                                                <SelectItem value="Alta">Alta</SelectItem>
                                                <SelectItem value="Urgente">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={task.priority === "Urgente" ? "destructive" : "secondary"}>
                                            {task.priority || "Média"}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Observações da Tarefa</Label>
                                {isEditingTask ? (
                                    <Textarea
                                        value={editedTask.observations || ""}
                                        onChange={(e) => handleTaskFieldChange("observations", e.target.value)}
                                        placeholder="Detalhes adicionais sobre a obrigação..."
                                        className={cn(
                                            "min-h-[120px] text-sm focus-visible:ring-primary/20 transition-all border-slate-200",
                                            editedTask.observations !== task.observations && "border-primary ring-1 ring-primary/20 bg-primary/5"
                                        )}
                                    />
                                ) : (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm italic text-slate-600 leading-relaxed">
                                        {task.observations || "Nenhuma observação registrada."}
                                    </div>
                                )}
                            </div>

                            {isEditingTask && (
                                <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4 sticker bottom-0 bg-white pb-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (hasChanges && confirm("Descartar alterações?")) {
                                                setIsEditingTask(false);
                                                setHasChanges(false);
                                            } else if (!hasChanges) {
                                                setIsEditingTask(false);
                                            }
                                        }}
                                        className="h-10 px-6 font-bold text-slate-500"
                                    >
                                        Descartar
                                    </Button>
                                    <Button
                                        onClick={handleSaveTask}
                                        disabled={isSaving || !hasChanges}
                                        className="h-10 px-8 font-bold gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Salvar Alterações
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="p-0 m-0 flex flex-col min-h-full">
                            {/* Note List */}
                            <div className="p-6 space-y-6 flex-1">
                                {loadingNotes ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                        <p className="text-sm">Carregando notas...</p>
                                    </div>
                                ) : notes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <History className="h-12 w-12 opacity-10 mb-2" />
                                        <p className="text-sm font-medium">Nenhuma anotação ainda.</p>
                                        <p className="text-xs">O Diário de Bordo está vazio.</p>
                                    </div>
                                ) : (
                                    notes.map((note) => (
                                        <div key={note.id} className="group flex flex-col gap-2 relative border-b border-slate-50 pb-4 last:border-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-slate-400">
                                                        {formatDistanceToNow(parseISO(note.created_at), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                    {note.updated_at !== note.created_at && (
                                                        <span className="text-[10px] text-slate-300 italic">(editado)</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-slate-400 hover:text-primary"
                                                        onClick={() => {
                                                            setEditingNoteId(note.id);
                                                            setEditContent(note.content);
                                                        }}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                                                        onClick={() => handleDeleteNote(note.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {editingNoteId === note.id ? (
                                                <div className="space-y-2 mt-1">
                                                    <Textarea
                                                        className="min-h-[100px] text-sm"
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>Cancelar</Button>
                                                        <Button size="sm" onClick={() => handleUpdateNote(note.id)}>Salvar</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                renderContent(note.content)
                                            )}

                                            {note.images && note.images.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {note.images.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-md border border-slate-200 overflow-hidden hover:opacity-80 transition-opacity">
                                                            <img src={url} alt={`Anexo ${i + 1}`} className="w-full h-full object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input Area (Pinned to bottom) */}
                            <div className="sticky bottom-0 bg-white border-t p-4 space-y-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                                <div className="relative">
                                    <Textarea
                                        ref={textareaRef}
                                        placeholder="Adicione uma anotação, cole uma conversa do WhatsApp..."
                                        className="min-h-[100px] pr-12 text-sm focus-visible:ring-primary/20 transition-all border-slate-200"
                                        value={newNoteContent}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 2000) {
                                                setNewNoteContent(e.target.value);
                                                setCharCount(e.target.value.length);
                                            }
                                        }}
                                        onPaste={handlePaste}
                                    />
                                    <div className="absolute top-2 right-2 text-[10px] font-bold text-slate-400">
                                        {charCount}/2000
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-bold text-slate-500 border-slate-200 gap-1.5"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading || pendingImages.length >= 5}
                                        >
                                            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                                            Anexar imagem
                                        </Button>
                                    </div>

                                    <Button
                                        size="sm"
                                        className="h-8 px-4 font-bold gap-2"
                                        disabled={(!newNoteContent.trim() && pendingImages.length === 0) || isUploading}
                                        onClick={handleCreateNote}
                                    >
                                        <Send className="h-3.5 w-3.5" /> Salvar Anotação
                                    </Button>
                                </div>

                                {pendingImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {pendingImages.map((url, i) => (
                                            <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden border border-slate-200 shadow-sm group">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-4 w-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
