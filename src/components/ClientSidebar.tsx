import { useState } from "react";
import { type Client } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Search, Users, Copy, MessageCircle, Building2, Phone, Mail, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ClientSidebarProps {
    clients: Client[];
}

export function ClientSidebar({ clients }: ClientSidebarProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.contact_name && c.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cnpj && c.cnpj.includes(searchTerm))
    );

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
    };

    const openWhatsApp = (phone: string) => {
        // Remove tudo que não for número
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length >= 10) {
            window.open(`https://wa.me/55${cleanPhone}`, "_blank");
        } else {
            toast.error("Número de telefone inválido para WhatsApp");
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
                    <Users className="mr-2 h-4 w-4" />
                    Contatos (Lista)
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-0 flex flex-col">
                <div className="p-6 pb-2 border-b bg-slate-50">
                    <SheetHeader className="mb-4">
                        <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                            <Users className="h-5 w-5 text-primary" />
                            Contatos Rápidos
                        </SheetTitle>
                        <SheetDescription>
                            Busque os dados dos clientes sem sair do Kanban.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, contato ou CNPJ/CPF..."
                            className="pl-9 h-10 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    {filteredClients.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            Nenhum cliente encontrado.
                        </div>
                    ) : (
                        filteredClients.map(client => (
                            <div key={client.id} className="bg-white p-4 rounded-xl border shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-1.5 leading-tight">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            {client.name}
                                        </h3>
                                        {client.contact_name && (
                                            <p className="text-sm font-medium text-slate-600 mt-1 pl-5">
                                                Responsável: <span className="text-slate-800">{client.contact_name}</span>
                                            </p>
                                        )}
                                    </div>
                                    {client.tax_regime && (
                                        <Badge variant="secondary" className="font-semibold text-[10px] uppercase bg-blue-50 text-blue-700 hover:bg-blue-100">
                                            {client.tax_regime}
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4 pt-4 border-t border-slate-100">
                                    {client.phone && (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Phone className="h-3.5 w-3.5" />
                                                <span className="font-medium">{client.phone}</span>
                                            </div>
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary" onClick={() => copyToClipboard(client.phone!, "Telefone")}>
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-green-600" onClick={() => openWhatsApp(client.phone!)}>
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {client.email && (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2 text-slate-600 truncate mr-2">
                                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{client.email}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => copyToClipboard(client.email!, "E-mail")}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {client.cnpj && (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <FileText className="h-3.5 w-3.5" />
                                                <span className="font-mono text-xs">{client.cnpj}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(client.cnpj!, "CNPJ/CPF")}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
