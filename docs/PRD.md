# PRD – App Kanban (Mock Data Only)

Crie um aplicativo do tipo **Kanban**.  
A ideia é que o usuário possa dar títulos às colunas e depois ter a possibilidade de **arrastar tarefas** entre elas.

O aplicativo deve conter apenas **dados mock**, sem backend real.

---

## Prompt Base

Crie um app Kanban com apenas dados mock:

- Sem backend  
- Sem banco de dados  
- Sem autenticação real  

---

## Telas e Rotas (Obrigatório)

1. `/login`
2. `/cadastro`
3. `/kanban` (tela principal)

---

## Requisitos Gerais

- Utilizar **mock data**
- Utilizar **persistência local** (ex: `localStorage`)
- Simular:
  - usuários
  - sessão
  - dados do Kanban
- NÃO criar integrações externas (APIs, Firebase, n8n, etc)
- Estruturar componentes de forma limpa e reutilizável
- UI simples e responsiva

---

## 1) Tela `/cadastro`

### Campos (obrigatórios)

- Nome
- Email
- Senha

### Validações

- Email válido
- Senha mínima de 6 caracteres

### Ao cadastrar

- Salvar usuário no mock (ex: `localStorage.users`)
- Redirecionar para `/login`

### Links

- "Já tenho conta" → `/login`

### Guardrails

- Não criar backend
- Não armazenar senha como se fosse real  
  (Pode salvar para mock, mas deixar claro no código/comentário que é simulação)

---

## 2) Tela `/login`

### Campos

- Email
- Senha

### Regras

- Validar contra usuários do mock

### Se login OK

- Criar sessão mock (ex: `localStorage.session = { userId }`)
- Redirecionar para `/kanban`

### Links

- "Criar conta" → `/cadastro`

---

## 3) Tela `/kanban`

### Funcionalidade Principal

O usuário pode:

- Criar colunas com título editável  
  (ex: "A Fazer", "Em Progresso", "Feito")

- Criar tarefas

- Arrastar e soltar tarefas entre colunas (**drag and drop**)

### Cada tarefa deve ter

- `id`
- `título`
- `descrição` (opcional)

### Persistência

- Movimentações devem atualizar estado
- Persistir tudo no mock (`localStorage`)

---

## UI Mínima Sugerida

### Top Bar

- Título: **Meu Kanban**
- Botão: Nova coluna
- Botão: Nova tarefa
- Botão: Sair (limpa sessão mock e volta para `/login`)

### Colunas

- Layout horizontal
- Scroll se necessário

Cada coluna deve ter:

- Título editável
- Contador de cards
- Botão remover (com confirmação)

### Cards / Tarefas

Cada card deve ter:

- Título
- Descrição (opcional)
- Botão/menu remover

---

## Regras e Validações

- Não permitir coluna sem título (mínimo 1 caractere)

Ao deletar coluna, implementar regra simples:

Escolher UMA opção:

- Mover tarefas para a primeira coluna  
**ou**
- Apagar tarefas junto (com confirmação)

Implementar a opção mais simples e consistente.

---

## Estado e Mock Data (Obrigatório)

### Modelos sugeridos

```js
User {
  id,
  name,
  email,
  passwordMock
}

Board {
  id,
  userId,
  columns: Column[],
  tasks: Task[]
}

Column {
  id,
  title,
  taskIds: string[]
}

Task {
  id,
  title,
  description?
}

