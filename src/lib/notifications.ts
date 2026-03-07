import { api, NotificationType, Task, Notification } from "./api";

const NOTIFICATION_TYPES = {
    OVERDUE: 'overdue' as NotificationType,
    DUE_TODAY: 'due_today' as NotificationType,
    DUE_TOMORROW: 'due_tomorrow' as NotificationType,
    DUE_SOON: 'due_soon' as NotificationType,
};

export async function checkAndGenerateNotifications(userId: string) {
    try {
        const board = await api.getBoard(userId);
        if (!board || !board.tasks || !board.columns) return; // Nenhuma task

        const entregueColId = board.columns.find(c => c.title.toLowerCase() === 'entregue')?.id;

        // Pega as notificações existentes para não duplicar
        const existingNotifs = await api.getNotifications(userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const in3Days = new Date(today);
        in3Days.setDate(today.getDate() + 3);

        const tasksToNotify = board.tasks.filter(t => t.column_id !== entregueColId && t.due_date);

        for (const task of tasksToNotify) {
            const due = new Date(task.due_date + 'T00:00:00');
            let type: NotificationType | null = null;
            let title = "";

            if (due < today) {
                type = NOTIFICATION_TYPES.OVERDUE;
                title = `Atrasada: ${task.title}`;
            } else if (due.getTime() === today.getTime()) {
                type = NOTIFICATION_TYPES.DUE_TODAY;
                title = `Vence hoje: ${task.title}`;
            } else if (due.getTime() === tomorrow.getTime()) {
                type = NOTIFICATION_TYPES.DUE_TOMORROW;
                title = `Vence amanhã: ${task.title}`;
            } else if (due > tomorrow && due <= in3Days) {
                type = NOTIFICATION_TYPES.DUE_SOON;
                title = `Vence em breve: ${task.title}`;
            }

            if (type) {
                // Deduplica por (task_id, type): não cria nova notif se já existe
                // uma NÃO LIDA para o mesmo par — independente de data.
                // Assim tarefas overdue não acumulam 1 notif por dia.
                const alreadyNotified = existingNotifs.some(n =>
                    n.type === type &&
                    n.task_ids?.includes(task.id) &&
                    !n.read
                );

                if (!alreadyNotified) {
                    await api.addNotification({
                        user_id: userId,
                        type,
                        title,
                        message: `O prazo para "${task.title}"${task.client_name ? ` (Cliente: ${task.client_name})` : ''} requer a sua atenção!`,
                        task_ids: [task.id],
                        read: false
                    });
                }
            }
        }
    } catch (error) {
        console.error("Erro ao gerar notificações automáticas:", error);
    }
}
