// src/contexts/NotificationContext.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "./NotificationContext";

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

describe("NotificationContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("should start with empty notifications", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("should add a notification", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: "info",
        title: "Test Notification",
        message: "This is a test",
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe("Test Notification");
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });

  it("should mark notification as read", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: "info",
        title: "Test",
        message: "Test message",
      });
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.markAsRead(notificationId);
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("should mark all as read", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ type: "info", title: "Test 1", message: "Message 1" });
      result.current.addNotification({ type: "success", title: "Test 2", message: "Message 2" });
    });

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it("should remove a notification", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ type: "info", title: "Test", message: "Message" });
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("should clear all notifications", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ type: "info", title: "Test 1", message: "Message 1" });
      result.current.addNotification({ type: "error", title: "Test 2", message: "Message 2" });
    });

    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("should show and dismiss toasts", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showToast({
        type: "success",
        title: "Success!",
        message: "Operation completed",
        duration: 1000,
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe("Success!");

    // Advance timers to auto-dismiss
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(result.current.toasts).toHaveLength(0);

    vi.useRealTimers();
  });

  it("should manually dismiss toast", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.showToast({
        type: "info",
        title: "Test Toast",
        duration: 0, // No auto-dismiss
      });
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismissToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});
