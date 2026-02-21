import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!email) {
            setError("Por favor, insira seu email.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        toast.success("Link de recuperação enviado! Verifique seu email.");
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)' }}>
            <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-8 shadow-2xl backdrop-blur-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                        <Mail className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-card-foreground">Recuperar senha</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link para o seu email</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            className="bg-background/60"
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button type="submit" className="w-full font-semibold shadow-md shadow-primary/25" disabled={loading}>
                        {loading ? "Enviando..." : "Enviar link"}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/login" className="inline-flex items-center text-sm font-semibold text-primary hover:underline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para o login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
