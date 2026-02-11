/**
 * Mock storage layer — simulates backend with localStorage.
 * IMPORTANT: passwords are stored in plain text FOR MOCK PURPOSES ONLY.
 * This is NOT production-safe. It's a simulation.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  /** Mock only — never do this in production */
  passwordMock: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
}

export interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

export interface Board {
  id: string;
  userId: string;
  columns: Column[];
  tasks: Task[];
}

export interface Session {
  userId: string;
}

const KEYS = {
  users: "kanban_users",
  session: "kanban_session",
  boards: "kanban_boards",
} as const;

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ——— Users ———

export function getUsers(): User[] {
  const raw = localStorage.getItem(KEYS.users);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users: User[]) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

export function registerUser(name: string, email: string, password: string): { ok: boolean; error?: string } {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "Este email já está cadastrado." };
  }
  const user: User = { id: generateId(), name, email: email.toLowerCase(), passwordMock: password };
  users.push(user);
  saveUsers(users);
  return { ok: true };
}

export function loginUser(email: string, password: string): { ok: boolean; error?: string; user?: User } {
  const users = getUsers();
  const user = users.find((u) => u.email === email.toLowerCase() && u.passwordMock === password);
  if (!user) return { ok: false, error: "Email ou senha inválidos." };
  setSession({ userId: user.id });
  return { ok: true, user };
}

// ——— Session ———

export function getSession(): Session | null {
  const raw = localStorage.getItem(KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(session: Session) {
  localStorage.setItem(KEYS.session, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEYS.session);
}

export function getCurrentUser(): User | null {
  const session = getSession();
  if (!session) return null;
  return getUsers().find((u) => u.id === session.userId) ?? null;
}

// ——— Board ———

function getBoards(): Board[] {
  const raw = localStorage.getItem(KEYS.boards);
  return raw ? JSON.parse(raw) : [];
}

function saveBoards(boards: Board[]) {
  localStorage.setItem(KEYS.boards, JSON.stringify(boards));
}

function createSeedBoard(userId: string): Board {
  const tasks: Task[] = [
    { id: generateId(), title: "Configurar ambiente", description: "Instalar dependências e rodar o projeto" },
    { id: generateId(), title: "Criar componentes base" },
    { id: generateId(), title: "Implementar drag and drop" },
    { id: generateId(), title: "Revisar código", description: "Code review antes do deploy" },
  ];

  const columns: Column[] = [
    { id: generateId(), title: "A Fazer", taskIds: [tasks[0].id, tasks[1].id] },
    { id: generateId(), title: "Em Progresso", taskIds: [tasks[2].id] },
    { id: generateId(), title: "Feito", taskIds: [tasks[3].id] },
  ];

  return { id: generateId(), userId, columns, tasks };
}

export function getUserBoard(userId: string): Board {
  const boards = getBoards();
  let board = boards.find((b) => b.userId === userId);
  if (!board) {
    board = createSeedBoard(userId);
    boards.push(board);
    saveBoards(boards);
  }
  return board;
}

export function saveBoard(board: Board) {
  const boards = getBoards();
  const idx = boards.findIndex((b) => b.id === board.id);
  if (idx >= 0) boards[idx] = board;
  else boards.push(board);
  saveBoards(boards);
}

// ——— Board mutations ———

export function addColumn(board: Board, title: string): Board {
  const col: Column = { id: generateId(), title, taskIds: [] };
  board.columns.push(col);
  saveBoard(board);
  return { ...board };
}

export function removeColumn(board: Board, columnId: string): Board {
  const col = board.columns.find((c) => c.id === columnId);
  if (col) {
    // Remove tasks that belong to this column
    board.tasks = board.tasks.filter((t) => !col.taskIds.includes(t.id));
  }
  board.columns = board.columns.filter((c) => c.id !== columnId);
  saveBoard(board);
  return { ...board };
}

export function renameColumn(board: Board, columnId: string, title: string): Board {
  const col = board.columns.find((c) => c.id === columnId);
  if (col) col.title = title;
  saveBoard(board);
  return { ...board };
}

export function addTask(board: Board, columnId: string, title: string, description?: string): Board {
  const task: Task = { id: generateId(), title, description };
  board.tasks.push(task);
  const col = board.columns.find((c) => c.id === columnId);
  if (col) col.taskIds.push(task.id);
  saveBoard(board);
  return { ...board };
}

export function removeTask(board: Board, taskId: string): Board {
  board.tasks = board.tasks.filter((t) => t.id !== taskId);
  board.columns.forEach((col) => {
    col.taskIds = col.taskIds.filter((id) => id !== taskId);
  });
  saveBoard(board);
  return { ...board };
}

export function moveTask(board: Board, taskId: string, fromColId: string, toColId: string, toIndex: number): Board {
  const fromCol = board.columns.find((c) => c.id === fromColId);
  const toCol = board.columns.find((c) => c.id === toColId);
  if (!fromCol || !toCol) return board;

  fromCol.taskIds = fromCol.taskIds.filter((id) => id !== taskId);
  toCol.taskIds.splice(toIndex, 0, taskId);
  saveBoard(board);
  return { ...board };
}
