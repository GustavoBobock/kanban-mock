import { useState } from "react";
import { type Board, type Client, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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

interface NewTaskModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    board: Board;
    clients: Client[];
    onSuccess: () => Promise<void>;
}

export function NewTaskModal({ isOpen, onOpenChange, board, clients, onSuccess }: NewTaskModalProps) {
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const maskCNPJ = (value: string) => {
        const digits = value.replace(/\D/g, "");
        return digits
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .substring(0, 18);
    };

    const maskCompetence = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2, 6)}`.substring(0, 7);
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) {
            toast.error("Informe o título da tarefa.");
            return;
        }
        if (!newTaskColId) {
            toast.error("Selecione uma coluna para a tarefa.");
            return;
        }

        setIsSubmitting(true);
        try {
            const col = board.columns.find(c => c.id === newTaskColId);
            const position = col ? col.taskIds.length : 0;

            const selectedClient = clients.find(c => c.id === newTaskClientId);
            const clientName = selectedClient ? selectedClient.name : newTaskClient.trim();

            const finalClientId = (newTaskClientId && newTaskClientId !== "none") ? newTaskClientId : undefined;

            await api.addTask(newTaskColId, newTaskTitle.trim(), newTaskDesc.trim() || undefined, position, {
                client_id: finalClientId,
                client_name: clientName,
                client_cnpj: newTaskCnpj.trim() || selectedClient?.cnpj,
                obligation_type: newTaskObligation,
                due_date: newTaskDueDate || undefined,
                competence: newTaskCompetence.trim(),
                priority: newTaskPriority,
                observations: newTaskObs.trim()
            });

            resetForm();
            onOpenChange(false);
            await onSuccess();
            toast.success("Tarefa criada!");
        } catch (error: any) {
            console.error("Erro completo ao criar tarefa:", error);
            toast.error("Erro ao criar tarefa. Verifique os campos.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
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
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                            onChange={(e) => setNewTaskCnpj(maskCNPJ(e.target.value))}
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
                            onChange={(e) => setNewTaskCompetence(maskCompetence(e.target.value))}
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
                    <Button onClick={handleAddTask} disabled={!newTaskTitle.trim() || !newTaskColId || isSubmitting} className="w-full">
                        {isSubmitting ? "Criando..." : "Criar Tarefa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
