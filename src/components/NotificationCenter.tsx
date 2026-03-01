import { useState, useEffect, useCallback } from "react";
import {
    Bell,
    Check,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    Trash2,
    Calendar,
    ChevronRight
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";
import { api, type Notification, type NotificationType } from "@/lib/api";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isBefore, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { checkAndGenerateNotifications } from "@/lib/notifications";

export const NotificationCenter = ({ boardTasks = [] }: { boardTasks?: any[] }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.getNotifications(user.id);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        // Solicitar permissão de notificação nativa
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        // Supabase Realtime - Opcional, mas podemos simular com polling se preferir
        // Para fins deste exercício, vamos usar o check de automação
    }, [fetchNotifications]);

    // Lógica de Automação (Ao carregar e a cada 60 minutos)
    useEffect(() => {
        if (!user) return;

        const runAutomations = async () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const day = now.getDay();
            const isBusinessDay = day >= 1 && day <= 5;
            const dateStr = format(now, "yyyy-MM-dd");

            // Roda a checagem que valida overdue, soon, today (ignora tarefas entregues etc)
            await checkAndGenerateNotifications(user.id);
            fetchNotifications();

            // Lógica isolada para envios de Resumo (08:00 e 17:00 em dias úteis)
            if (isBusinessDay) {
                const lastCheck08 = localStorage.getItem(`last_check_08_${user.id}`);
                if (hours === 8 && minutes === 0 && lastCheck08 !== dateStr) {
                    const todayTasks = boardTasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));
                    if (todayTasks.length > 0) {
                        await sendNotification('alerta', "Resumo da Manhã", `${todayTasks.length} vencem hoje.`, todayTasks.map(t => t.id));
                    }
                    localStorage.setItem(`last_check_08_${user.id}`, dateStr);
                }

                const lastCheck17 = localStorage.getItem(`last_check_17_${user.id}`);
                if (hours === 17 && minutes === 0 && lastCheck17 !== dateStr) {
                    const overdue = boardTasks.filter(t => t.due_date && isBefore(parseISO(t.due_date), startOfDay(now))).length;
                    if (overdue > 0) {
                        await sendNotification('alerta', "Resumo do Fim do Dia", `Você tem ${overdue} atrasadas.`, []);
                    }
                    localStorage.setItem(`last_check_17_${user.id}`, dateStr);
                }
            }
        };

        // Roda na montagem (usuário entrou)
        runAutomations();

        // Timer de 60 minutos em ms, e loop 1 seg para pegar 08h e 17h precisos
        const checkTimer = setInterval(runAutomations, 60000);

        return () => clearInterval(checkTimer);
    }, [user, boardTasks, fetchNotifications]);

    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        if (open && user) {
            await checkAndGenerateNotifications(user.id);
            fetchNotifications();
        }
    };

    const sendNotification = async (type: NotificationType, title: string, message: string, taskIds?: string[]) => {
        if (!user) return;
        try {
            await api.addNotification({
                user_id: user.id,
                type,
                title,
                message,
                task_ids: taskIds,
                read: false
            });

            // Notificação Nativa
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title, { body: message });
            }

            fetchNotifications();
        } catch (error) {
            console.error("Erro ao enviar notificação:", error);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.markAsRead(id);
            fetchNotifications();
        } catch (error) {
            toast.error("Erro ao marcar como lida.");
        }
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await api.markAllAsRead(user.id);
            fetchNotifications();
            toast.success("Todas as notificações lidas!");
        } catch (error) {
            toast.error("Erro ao marcar todas como lidas.");
        }
    };

    const deleteOld = async () => {
        if (!user) return;
        try {
            await api.deleteOldNotifications(user.id);
            fetchNotifications();
            toast.success("Histórico antigo limpo.");
        } catch (error) {
            toast.error("Erro ao limpar histórico.");
        }
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'vencida':
            case 'overdue': return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'due_today': return <Clock className="h-5 w-5 text-yellow-500" />;
            case 'due_tomorrow': return <Calendar className="h-5 w-5 text-orange-500" />;
            case 'due_soon': return <Clock className="h-5 w-5 text-blue-500" />;
            case 'urgente': return <Clock className="h-5 w-5 text-amber-500" />;
            case 'concluida': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            default: return <Bell className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-white/80 hover:text-white hover:bg-white/10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 hover:bg-red-600 border-2 border-[#1E3A8A]"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col border-l shadow-2xl">
                <SheetHeader className="p-6 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between mb-1">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            Central de Avisos
                        </SheetTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold italic">
                            Acompanhe suas obrigações
                        </p>
                        <div className="flex gap-2">
                            <Button variant="link" size="sm" onClick={handleMarkAllRead} className="text-[10px] h-auto p-0 text-primary font-bold">
                                Marcar todas como lidas
                            </Button>
                            <span className="text-slate-200">|</span>
                            <Button variant="link" size="sm" onClick={deleteOld} className="text-[10px] h-auto p-0 text-muted-foreground">
                                Limpar
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Bell className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 font-bold mb-1">Tudo em dia!</h3>
                                <p className="text-slate-500 text-sm">Você não tem notificações recentes.</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                                    className={`
                                        group relative flex gap-4 p-5 border-b transition-all cursor-pointer
                                        ${!notif.read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-white hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="mt-1">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-sm font-bold leading-none ${!notif.read ? 'text-primary' : 'text-slate-800'}`}>
                                                {notif.title}
                                            </h4>
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {format(parseISO(notif.created_at), "HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed pr-2">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {format(parseISO(notif.created_at), "dd 'de' MMM", { locale: ptBR })}
                                            </span>
                                            {notif.task_ids && notif.task_ids.length > 0 && (
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                                                    Ver Tarefas <ChevronRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {!notif.read && (
                                        <div className="absolute top-5 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-slate-50/80">
                    <p className="text-[10px] text-center text-muted-foreground italic">
                        Notificações são mantidas por 90 dias.
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
};
