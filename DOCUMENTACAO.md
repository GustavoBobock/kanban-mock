# Documentação do Projeto: Kanban Mock + Supabase

Este documento serve como um guia técnico do que foi implementado e como replicar esta estrutura para projetos futuros.

---

## 🚀 Stack Tecnológica

- **Frontend**: React (Vite) + TypeScript
- **Estilização**: Tailwind CSS + Shadcn UI
- **Backend/Banco de Dados**: Supabase (PostgreSQL + Auth)
- **Gerenciamento de Estado/Dados**: TanStack Query (React Query)
- **Drag & Drop**: @dnd-kit

---

## 🏗️ Estrutura do Projeto

```text
src/
├── components/     # Componentes UI (Shadcn) e de negócio (Kanban)
├── contexts/       # Contextos globais (ex: Autenticação)
├── hooks/          # Hooks customizados para lógica reutilizável
├── lib/            # Configurações de clientes (Supabase, API)
├── pages/          # Páginas da aplicação (Login, Kanban, etc.)
└── test/           # Testes de integração e unidade
```

---

## 🔑 Autenticação (Supabase Auth)

Implementamos um fluxo completo de autenticação:
1.  **Cadastro**: Cria usuário no Supabase e aciona uma `trigger` no SQL para criar um perfil na tabela `public.profiles`.
2.  **Login**: Autenticação via Email/Senha.
3.  **Recuperação de Senha**: 
    - Link "Esqueci minha senha" na tela de login.
    - Página `ForgotPassword` para solicitar o link.
    - Página `ResetPassword` para definir a nova senha (via link de redirecionamento).
4.  **Contexto**: O `auth-context.tsx` gerencia o estado global do usuário logado.

---

## 📊 Banco de Dados (SQL - Supabase)

O arquivo `supabase_schema.sql` contém a estrutura necessária:
- **profiles**: Dados estendidos do usuário.
- **boards**: Quadros Kanban.
- **columns**: Colunas dos quadros.
- **tasks**: Tarefas dentro das colunas.

### Segurança (RLS - Row Level Security)
Todas as tabelas possuem políticas de RLS ativas para garantir que um usuário **só veja e edite seus próprios dados**.

---

## 🔄 Como Replicar para Próximos Projetos

Para criar um novo projeto com esta base:

### 1. Setup Inicial
- Inicie um projeto Vite com React e TS.
- Instale as dependências: `lucide-react`, `sonner`, `@supabase/supabase-js`, `react-router-dom`.
- Configure o Shadcn UI: `npx shadcn-ui@latest init`.

### 2. Configuração Supabase
- Crie um novo projeto no Dashboard do Supabase.
- Execute o conteúdo do `supabase_schema.sql` no **SQL Editor** do Supabase.
- No Dashboard do Supabase, vá em **Authentication -> URL Configuration** e configure a "Site URL" para o seu domínio (ex: `http://localhost:5173`).

### 3. Variáveis de Ambiente
Crie um arquivo `.env` com as chaves:
```env
VITE_SUPABASE_URL=SUA_URL_AQUI
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
```

---

## 🛠️ Melhorias Futuras
- [ ] Adicionar Temas (Dark/Light Mode).
- [ ] Implementar busca de tarefas.
- [ ] Adicionar labels coloridas nas tarefas.
- [ ] Upload de anexos via Supabase Storage.
