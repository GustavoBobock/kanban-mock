import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { api, type Client, type TaxRegime } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";
import { LayoutDashboard, Users, Plus, Upload, Trash2, Edit, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { ImportCSVModal } from "@/components/ImportCSVModal";

const TAX_REGIMES: TaxRegime[] = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI'];
const OBLIGATIONS = ["DCTF", "SPED", "PGDAS", "DEFIS", "ECF", "ECD", "REINF", "NFS-e", "Simples Nacional", "Folha de Pagamento", "FGTS"];

const Clientes = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [regime, setRegime] = useState<TaxRegime>('Simples Nacional');
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [selectedObligations, setSelectedObligations] = useState<string[]>([]);

    useEffect(() => {
        if (user) fetchClients();
    }, [user]);

    const fetchClients = async () => {
        try {
            const data = await api.getClients(user!.id);
            setClients(data);
        } catch (error) {
            toast.error("Erro ao carregar clientes.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setCnpj("");
        setRegime('Simples Nacional');
        setEmail("");
        setPhone("");
        setSelectedObligations([]);
        setEditingClient(null);
    };

    const handleSave = async () => {
        if (!name.trim() || !user) return;

        const clientData = {
            user_id: user.id,
            name,
            cnpj,
            tax_regime: regime,
            email,
            phone,
            active_obligations: selectedObligations,
        };

        try {
            if (editingClient) {
                await api.updateClient(editingClient.id, clientData);
                toast.success("Cliente atualizado!");
            } else {
                await api.addClient(clientData);
                toast.success("Cliente cadastrado!");
            }
            setDialogOpen(false);
            resetForm();
            fetchClients();
        } catch (error) {
            toast.error("Erro ao salvar cliente.");
        }
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setName(client.name);
        setCnpj(client.cnpj || "");
        setRegime(client.tax_regime || 'Simples Nacional');
        setEmail(client.email || "");
        setPhone(client.phone || "");
        setSelectedObligations(client.active_obligations || []);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
        try {
            await api.deleteClient(id);
            toast.success("Cliente removido.");
            fetchClients();
        } catch (error) {
            toast.error("Erro ao remover cliente.");
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj?.includes(searchTerm)
    );

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            {/* Header */}
            <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none">Gestão de Clientes</h1>
                        <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold">Carteira Contábil</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/kanban">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Ver Kanban
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar CSV
                    </Button>
                    <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Cliente
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-6">
                <div className="mx-auto max-w-6xl space-y-4">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm max-w-md">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-0 p-0 h-auto focus-visible:ring-0 shadow-none text-sm"
                        />
                    </div>

                    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead className="font-bold">Nome</TableHead>
                                    <TableHead className="font-bold">CNPJ</TableHead>
                                    <TableHead className="font-bold">Regime</TableHead>
                                    <TableHead className="font-bold">Obrigações</TableHead>
                                    <TableHead className="text-right font-bold whitespace-nowrap">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Carregando...</TableCell>
                                    </TableRow>
                                ) : filteredClients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Nenhum cliente encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredClients.map((client) => (
                                        <TableRow key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-medium text-slate-700">{client.name}</TableCell>
                                            <TableCell className="text-slate-600 font-mono text-xs">{client.cnpj || "-"}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                                                    {client.tax_regime}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {client.active_obligations?.slice(0, 3).map(ob => (
                                                        <span key={ob} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold border">
                                                            {ob}
                                                        </span>
                                                    ))}
                                                    {client.active_obligations?.length > 3 && (
                                                        <span className="text-[9px] text-muted-foreground">+{client.active_obligations.length - 3}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEdit(client)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => handleDelete(client.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>

            {/* Cadastro/Edição Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Empresa</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Contábil Ltda" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cnpj">CNPJ</Label>
                                <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-1">
                                <Label>Regime Tributário</Label>
                                <Select value={regime} onValueChange={(v) => setRegime(v as TaxRegime)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TAX_REGIMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-1">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base font-bold">Obrigações Ativas</Label>
                            <div className="grid grid-cols-3 gap-3 rounded-xl border bg-slate-50/50 p-4">
                                {OBLIGATIONS.map(ob => (
                                    <div key={ob} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`ob-${ob}`}
                                            checked={selectedObligations.includes(ob)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedObligations([...selectedObligations, ob]);
                                                else setSelectedObligations(selectedObligations.filter(i => i !== ob));
                                            }}
                                        />
                                        <Label htmlFor={`ob-${ob}`} className="text-xs font-medium cursor-pointer">{ob}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="px-8">{editingClient ? "Atualizar" : "Salvar Cliente"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ImportCSVModal
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
                onSuccess={fetchClients}
            />
        </div>
    );
};

export default Clientes;
