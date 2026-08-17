import { create } from "zustand";




const devFill = true;

const useNotificationStore = create(set => ({
    notifications: [],
    addNotification: notification =>
        set(state => ({
        notifications: [...state.notifications, notification],
        }),
    ),
    removeNotification: id =>
        set(state => ({
        notifications: state.notifications.filter(n => n.id !== id),
        }),
    ),
    clearNotifications: () => set({notifications: []}),

    syncNotifications: notifications =>
        set({notifications}),
    }),
);

export default useNotificationStore;

