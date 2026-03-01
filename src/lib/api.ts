
import { supabase } from "./supabaseClient";

export interface TaskNote {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    images?: string[];
    created_at: string;
    updated_at: string;
}

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
    notes_count?: number;
    images_count?: number;
    last_note_at?: string;
    last_note_content?: string;
    last_note_image?: string;
    created_at: string;
}

export interface Column {
    id: string;
    board_id: string;
    title: string;
    position: number;
    taskIds: string[]; // For compatibility with frontend logic
}

export type TaxRegime = 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | 'MEI' | 'Autônomo';

export interface Client {
    id: string;
    user_id: string;
    name: string;
    cnpj?: string;
    tax_regime?: TaxRegime;
    active_obligations: string[];
    contact_name?: string;
    email?: string;
    phone?: string;
    deleted_at?: string | null;
    _reactivated?: boolean;
}

export type NotificationType = 'alerta' | 'vencida' | 'urgente' | 'concluida' | 'overdue' | 'due_today' | 'due_tomorrow' | 'due_soon';

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

        // 3. Get Tasks with counts
        const { data: tasks, error: tasksError } = await supabase
            .from("tasks")
            .select(`
                *,
                notes_count:task_notes(count),
                task_notes(updated_at, images, content)
            `)
            .in("column_id", columns.map(c => c.id))
            .order("position");

        if (tasksError) throw tasksError;

        const safeColumns = columns || [];
        const transformedTasks = (tasks || []).map(task => {
            const notes = (task.task_notes as any[]) || [];
            const notesCount = (task.notes_count as any)?.[0]?.count || 0;
            const imagesCount = notes.reduce((acc, note) => acc + (note.images?.length || 0), 0);

            const sortedNotes = [...notes].sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            const lastNote = sortedNotes[0];

            return {
                ...task,
                notes_count: notesCount,
                images_count: imagesCount,
                last_note_at: lastNote?.updated_at,
                last_note_content: lastNote?.content,
                last_note_image: lastNote?.images?.[0]
            };
        });

        // Transform to frontend structure
        const formattedColumns = safeColumns.map(col => ({
            ...col,
            taskIds: transformedTasks.filter(t => t.column_id === col.id).map(t => t.id)
        }));

        return {
            id: board.id,
            user_id: board.user_id,
            title: board.title,
            columns: formattedColumns,
            tasks: transformedTasks,
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
            .is("deleted_at", null)
            .order("name");
        if (error) throw error;
        return data || [];
    },

    addClient: async (client: Omit<Client, 'id' | 'created_at'>) => {
        if (client.cnpj) {
            const { data: updated } = await supabase
                .from('clients')
                .update({ ...client, deleted_at: null })
                .eq('cnpj', client.cnpj)
                .not('deleted_at', 'is', null)
                .select()
                .maybeSingle();

            if (updated) {
                return { ...updated, _reactivated: true };
            }
        }

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
            .update({ deleted_at: new Date().toISOString() })
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

    addNotification: async (notification: Omit<Notification, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from("notifications")
            .insert(notification)
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

    // Task Notes Methods
    getTaskNotes: async (taskId: string): Promise<TaskNote[]> => {
        const { data, error } = await supabase
            .from("task_notes")
            .select("*")
            .eq("task_id", taskId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    },

    addTaskNote: async (taskId: string, userId: string, content: string, images: string[] = []) => {
        const { data, error } = await supabase
            .from("task_notes")
            .insert({ task_id: taskId, user_id: userId, content, images })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateTaskNote: async (noteId: string, updates: Partial<TaskNote>) => {
        const { error } = await supabase
            .from("task_notes")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", noteId);
        if (error) throw error;
    },

    deleteTaskNote: async (noteId: string) => {
        const { error } = await supabase
            .from("task_notes")
            .delete()
            .eq("id", noteId);
        if (error) throw error;
    },

    uploadTaskImage: async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `tasks/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('task-images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('task-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
