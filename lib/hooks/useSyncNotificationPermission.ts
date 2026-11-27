import { useEffect } from 'react'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { getNotificationPermission } from '@/lib/notifications/notificationManager'

/**
 * Syncs the persisted notification permission with the browser's current permission
 * when a permission-dependent UI becomes visible.
 */
export function useSyncNotificationPermission(supported: boolean): void {
  useEffect(() => {
    if (!supported) return

    useNotificationStore.getState().setPermission(getNotificationPermission())
  }, [supported])
}
