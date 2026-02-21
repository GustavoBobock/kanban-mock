
import { supabase } from "./supabaseClient";

export interface Task {
    id: string;
    column_id: string;
    title: string;
    description?: string;
    position: number;
    client_id?: string;
    client_name?: string;
    client_cnpj?: string;
    obligation_type?: string;
    due_date?: string;
    competence?: string;
    priority?: string;
    observations?: string;
}

export interface Column {
    id: string;
    board_id: string;
    title: string;
    position: number;
    taskIds: string[]; // For compatibility with frontend logic
}

export type TaxRegime = 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | 'MEI';

export interface Client {
    id: string;
    user_id: string;
    name: string;
    cnpj?: string;
    tax_regime?: TaxRegime;
    active_obligations: string[];
    email?: string;
    phone?: string;
}

export type NotificationType = 'alerta' | 'vencida' | 'urgente' | 'concluida';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message?: string;
    task_ids?: string[];
    read: boolean;
    created_at: string;
}

export interface Board {
    id: string;
    user_id: string;
    title: string;
    columns: Column[];
    tasks: Task[];
    notifications?: Notification[];
}

export const api = {
    getBoard: async (userId: string): Promise<Board | null> => {
        // 1. Get Board
        let { data: boards, error: boardError } = await supabase
            .from("boards")
            .select("*")
            .eq("user_id", userId)
            .limit(1);

        if (boardError) throw boardError;

        let board = boards?.[0];

        // Create default board if none exists
        if (!board) {
            const { data: newBoard, error: createError } = await supabase
                .from("boards")
                .insert({ user_id: userId, title: "Meu Quadro" })
                .select()
                .single();

            if (createError) throw createError;
            board = newBoard;

            // Create default columns for Accounting
            const { error: colsError } = await supabase.from("columns").insert([
                { board_id: board.id, title: "A Fazer", position: 0 },
                { board_id: board.id, title: "Aguardando Cliente", position: 1 },
                { board_id: board.id, title: "Em Andamento", position: 2 },
                { board_id: board.id, title: "Em Revisão", position: 3 },
                { board_id: board.id, title: "Entregue", position: 4 },
            ]);
            if (colsError) throw colsError;
        }

        // 2. Get Columns
        const { data: columns, error: colsError } = await supabase
            .from("columns")
            .select("*")
            .eq("board_id", board.id)
            .order("position");

        if (colsError) throw colsError;

        // 3. Get Tasks
        const { data: tasks, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .in("column_id", columns.map(c => c.id))
            .order("position");

        if (tasksError) throw tasksError;

        // Transform to frontend structure
        const formattedColumns = columns.map(col => ({
            ...col,
            taskIds: tasks.filter(t => t.column_id === col.id).map(t => t.id)
        }));

        return {
            id: board.id,
            user_id: board.user_id,
            title: board.title,
            columns: formattedColumns,
            tasks: tasks,
        };
    },

    addColumn: async (boardId: string, title: string, position: number) => {
        const { data, error } = await supabase
            .from("columns")
            .insert({ board_id: boardId, title, position })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateColumn: async (columnId: string, updates: Partial<Column>) => {
        const { error } = await supabase
            .from("columns")
            .update(updates)
            .eq("id", columnId);
        if (error) throw error;
    },

    deleteColumn: async (columnId: string) => {
        const { error } = await supabase
            .from("columns")
            .delete()
            .eq("id", columnId);
        if (error) throw error;
    },

    addTask: async (
        columnId: string,
        title: string,
        description?: string,
        position: number = 0,
        extraFields: Partial<Omit<Task, 'id' | 'column_id' | 'title' | 'description' | 'position'>> = {}
    ) => {
        const { data, error } = await supabase
            .from("tasks")
            .insert({ column_id: columnId, title, description, position, ...extraFields })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    deleteTask: async (taskId: string) => {
        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", taskId);
        if (error) throw error;
    },

    moveTask: async (taskId: string, newColumnId: string, newPosition: number) => {
        const { error } = await supabase
            .from("tasks")
            .update({ column_id: newColumnId, position: newPosition })
            .eq("id", taskId);
        if (error) throw error;
    },

    // Clients Methods
    getClients: async (userId: string): Promise<Client[]> => {
        const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("user_id", userId)
            .order("name");
        if (error) throw error;
        return data || [];
    },

    addClient: async (client: Omit<Client, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from("clients")
            .insert(client)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateClient: async (clientId: string, updates: Partial<Client>) => {
        const { error } = await supabase
            .from("clients")
            .update(updates)
            .eq("id", clientId);
        if (error) throw error;
    },

    deleteClient: async (clientId: string) => {
        const { error } = await supabase
            .from("clients")
            .delete()
            .eq("id", clientId);
        if (error) throw error;
    },

    // Notifications Methods
    getNotifications: async (userId: string): Promise<Notification[]> => {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    },

    addNotification: async (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
        const { data, error } = await supabase
            .from("notifications")
            .insert({ ...notification, read: false })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    markAsRead: async (notificationId: string) => {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", notificationId);
        if (error) throw error;
    },

    markAllAsRead: async (userId: string) => {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", userId)
            .eq("read", false);
        if (error) throw error;
    },

    deleteOldNotifications: async (userId: string) => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", userId)
            .lt("created_at", ninetyDaysAgo.toISOString());
        if (error) throw error;
    },
};
