import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (password.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.");
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        toast.success("Senha redefinida com sucesso!");
        setTimeout(() => {
            navigate("/login", { replace: true });
        }, 2000);
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)' }}>
            <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-8 shadow-2xl backdrop-blur-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                        <KeyRound className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-card-foreground">Nova senha</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Escolha sua nova senha de acesso</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova senha</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            className="bg-background/60"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            className="bg-background/60"
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button type="submit" className="w-full font-semibold shadow-md shadow-primary/25" disabled={loading}>
                        {loading ? "Redefinindo..." : "Redefinir senha"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
