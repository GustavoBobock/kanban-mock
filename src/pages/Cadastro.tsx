import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "@/lib/mock-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

const Cadastro = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const validate = (): string | null => {
    if (!name.trim()) return "Nome é obrigatório.";
    if (!email.trim()) return "Email é obrigatório.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Email inválido.";
    if (password.length < 6) return "Senha deve ter no mínimo 6 caracteres.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    const result = registerUser(name.trim(), email.trim(), password);
    if (!result.ok) {
      setError(result.error ?? "Erro ao cadastrar.");
      return;
    }
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <UserPlus className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-card-foreground">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comece a organizar suas tarefas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="bg-background/60"
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="bg-background/60"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full font-semibold shadow-md shadow-primary/25">
            Cadastrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Cadastro;
