import { Store } from './base';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationsState {
  notifications: NotificationItem[];
}

const initialState: NotificationsState = {
  notifications: [],
};

export class NotificationsStore extends Store<NotificationsState> {
  constructor() {
    super(initialState);
  }

  addNotification(type: NotificationItem['type'], message: string): void {
    const newNotification: NotificationItem = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.setState((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));
  }

  markAsRead(id: string): void {
    this.setState((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  }

  markAllAsRead(): void {
    this.setState((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  }

  clearNotifications(): void {
    this.setState({ notifications: [] });
  }

  getUnreadCount(): number {
    return this.getState().notifications.filter((n) => !n.read).length;
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const notificationsStore = new NotificationsStore();
