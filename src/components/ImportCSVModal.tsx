import { useState } from "react";
import { api, type Client, type TaxRegime } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileDown, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ImportCSVModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ImportCSVModal({ open, onOpenChange, onSuccess }: ImportCSVModalProps) {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                parseCSV(text);
            };
            reader.readAsText(selectedFile);
        }
    };

    const parseCSV = (text: string) => {
        const lines = text.split("\n");
        const result = [];
        // Skip header if it exists (assuming first line is header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const [name, cnpj, regime, email, phone, obligations] = line.split(",");
            result.push({
                name,
                cnpj,
                tax_regime: regime as TaxRegime,
                email,
                phone,
                active_obligations: obligations ? obligations.split(";").map(o => o.trim()) : [],
            });
        }
        setPreview(result);
    };

    const handleImport = async () => {
        if (!preview.length || !user) return;
        setImporting(true);
        try {
            for (const client of preview) {
                await api.addClient({ ...client, user_id: user.id });
            }
            toast.success(`${preview.length} clientes importados com sucesso!`);
            onSuccess();
            onOpenChange(false);
            setFile(null);
            setPreview([]);
        } catch (error) {
            toast.error("Erro durante a importação.");
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const content = "nome,cnpj,regime,email,telefone,obrigacoes\nEmpresa Exemplo,00.000.000/0001-00,Simples Nacional,contato@exemplo.com,(11) 99999-9999,DCTF;PGDAS;Folha de Pagamento";
        const blob = new Blob([content], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "modelo_clientes_contabeis.csv";
        a.click();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Importação de Clientes</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-6">
                        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                                id="csv-upload"
                            />
                            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">Selecione seu arquivo CSV</p>
                                    <p className="text-xs text-muted-foreground mt-1">Clique para procurar ou arraste o arquivo</p>
                                </div>
                            </label>
                        </div>

                        {preview.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Pré-visualização ({preview.length} itens)
                                    </h4>
                                </div>
                                <div className="max-h-48 overflow-y-auto rounded-lg border text-[10px] bg-white">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-2 border-b">Nome</th>
                                                <th className="p-2 border-b">CNPJ</th>
                                                <th className="p-2 border-b">Regime</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.slice(0, 5).map((p, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="p-2 truncate max-w-[120px]">{p.name}</td>
                                                    <td className="p-2 font-mono">{p.cnpj}</td>
                                                    <td className="p-2">{p.tax_regime}</td>
                                                </tr>
                                            ))}
                                            {preview.length > 5 && (
                                                <tr>
                                                    <td colSpan={3} className="p-2 text-center text-muted-foreground italic">
                                                        E mais {preview.length - 5} clientes...
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <Accordion type="single" collapsible className="w-full border rounded-xl overflow-hidden bg-white">
                            <AccordionItem value="help" className="border-0">
                                <AccordionTrigger className="px-4 hover:no-underline hover:bg-slate-50">
                                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                                        <Info className="h-4 w-4 text-primary" />
                                        Ajuda: Como importar?
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 space-y-4 text-xs text-slate-600 leading-relaxed">
                                    <div className="space-y-2">
                                        <p className="font-bold text-slate-900">1. Formato do Arquivo</p>
                                        <p>O arquivo deve ser um CSV separado por vírgulas no formato:</p>
                                        <code className="block bg-slate-900 text-slate-100 p-2 rounded mt-1 overflow-x-auto whitespace-nowrap">
                                            nome,cnpj,regime,email,telefone,obrigacoes
                                        </code>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="font-bold text-slate-900">2. Coluna Obrigações</p>
                                        <p>Liste as obrigações separadas por ponto e vírgula (;). Exemplo:</p>
                                        <code className="block bg-slate-50 border p-2 rounded mt-1">
                                            DCTF;PGDAS;SPED
                                        </code>
                                    </div>

                                    <div className="space-y-2 text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 italic">
                                        <p className="flex items-center gap-1 font-bold">
                                            <AlertCircle className="h-3 w-3" />
                                            Dica do Excel / Google Sheets
                                        </p>
                                        <p>No Excel, use "Salvar como" e selecione "CSV (Separado por vírgulas)". No Google Sheets, vá em "Arquivo" &gt; "Fazer download" &gt; "Valores separados por vírgulas (.csv)".</p>
                                    </div>

                                    <Button variant="outline" size="sm" className="w-full text-[10px] h-8" onClick={downloadTemplate}>
                                        <FileDown className="mr-2 h-3.5 w-3.5" />
                                        Baixar Planilha Modelo
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-slate-100 shadow-xl self-start">
                        <h4 className="text-sm font-bold border-b border-slate-700 pb-2 mb-4">Processo de Importação</h4>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">1</div>
                                <p className="text-xs">Baixe o modelo e preencha seguindo as instruções da lateral.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">2</div>
                                <p className="text-xs">Clique no quadro pontilhado para selecionar o arquivo salvo.</p>
                            </div>
                            <div className="flex gap-3 text-slate-400 italic">
                                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                <p className="text-xs">Confira a pré-visualização e clique em "Iniciar Importação" no rodapé.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={!preview.length || importing} className="min-w-[160px]">
                        {importing ? "Importando..." : "Iniciar Importação"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { Upload } from "lucide-react";
