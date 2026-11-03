import { logoutUser } from '../src/helpers/auth';
import {
  getServerNotifications,
  markNotificationAsReadServer,
  getLatestNotifications,
} from '../src/helpers/notificationV2';
import ai from '../src/helpers/ai';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/helpers/ai', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('../src/helpers/notification', () => ({
  getFcmToken: jest.fn().mockResolvedValue('mock_fcm_token_123'),
}));

describe('API Integration Guide Specifications (v4.0)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Logout API (POST /api/logout)', () => {
    it('dispatches POST /api/logout with device_token and clears local storage', async () => {
      ai.post.mockResolvedValueOnce({ data: { error: false, msg: 'Successfully logged out' } });

      const setCtxMock = jest.fn();
      const navMock = {
        getParent: jest.fn(() => ({ dispatch: jest.fn() })),
      };

      await logoutUser(navMock, setCtxMock);

      // Verify POST logout called with device token
      expect(ai.post).toHaveBeenCalledWith('logout', expect.objectContaining({
        device_token: 'mock_fcm_token_123',
      }));

      // Verify AsyncStorage multiRemove was called
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['user', 'is_guest', 'auth_token']),
      );

      // Verify setCtx was invoked to reset state
      expect(setCtxMock).toHaveBeenCalled();
    });

    it('safely completes local logout even if POST /api/logout returns error or network rejection', async () => {
      ai.post.mockRejectedValueOnce(new Error('Network error / 404'));

      const setCtxMock = jest.fn();
      const navMock = { getParent: jest.fn() };

      await expect(logoutUser(navMock, setCtxMock)).resolves.not.toThrow();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });

  describe('2. Notification APIs', () => {
    it('markNotificationAsReadServer marks a single notification as read (POST /api/notifications)', async () => {
      ai.post.mockResolvedValueOnce({
        data: { error: false, msg: 'Notification marked as read', marked_id: 105, unread_count: 1 },
      });

      const success = await markNotificationAsReadServer(105);
      expect(success).toBe(true);
      expect(ai.post).toHaveBeenCalledWith('notifications', { islem: 'read', id: 105 });
    });

    it('markNotificationAsReadServer marks all notifications as read when id is 0', async () => {
      ai.post.mockResolvedValueOnce({
        data: { error: false, msg: 'All marked as read', marked_id: 0 },
      });

      const success = await markNotificationAsReadServer(0);
      expect(success).toBe(true);
      expect(ai.post).toHaveBeenCalledWith('notifications', { islem: 'read', id: 0, all: true });
    });

    it('getLatestNotifications calls GET /api/notifications-latest with limit', async () => {
      ai.get.mockResolvedValueOnce({
        data: {
          error: false,
          limit: 5,
          total: 2,
          unread_count: 1,
          notifications: [{ id: 101, baslik: 'Dispatched' }],
        },
      });

      const res = await getLatestNotifications(5);
      expect(ai.get).toHaveBeenCalledWith('notifications-latest', { params: { limit: 5 } });
      expect(res.notifications).toHaveLength(1);
      expect(res.unreadCount).toBe(1);
    });

    it('getServerNotifications supports unreadOnly parameter (?unread=1)', async () => {
      ai.get.mockResolvedValueOnce({
        data: {
          error: false,
          notifications: [{ id: 105, baslik: 'Unread Alert', okundu: 0 }],
        },
      });

      const res = await getServerNotifications(0, { unreadOnly: true });
      expect(ai.get).toHaveBeenCalledWith('notifications', { params: { unread: 1 } });
      expect(res).toHaveLength(1);
    });
  });
});

