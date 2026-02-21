
import { supabase } from "./supabaseClient";

export interface Task {
    id: string;
    column_id: string;
    title: string;
    description?: string;
    position: number;
}

export interface Column {
    id: string;
    board_id: string;
    title: string;
    position: number;
    taskIds: string[]; // For compatibility with frontend logic
}

export interface Board {
    id: string;
    user_id: string;
    title: string;
    columns: Column[];
    tasks: Task[];
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

            // Create default columns
            const { error: colsError } = await supabase.from("columns").insert([
                { board_id: board.id, title: "A Fazer", position: 0 },
                { board_id: board.id, title: "Em Progresso", position: 1 },
                { board_id: board.id, title: "Feito", position: 2 },
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

    addTask: async (columnId: string, title: string, description?: string, position: number = 0) => {
        const { data, error } = await supabase
            .from("tasks")
            .insert({ column_id: columnId, title, description, position })
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

    // Helper to reorder tasks in a column (if needed locally or strictly)
    // For now we just update positions
};
