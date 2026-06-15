/**
 * MDJ native push registration (Android FCM).
 *
 * The traveler app runs inside a WebView, which on Android cannot use the
 * Web Push API. So the native shell registers the device's raw FCM token
 * (via expo-notifications getDevicePushTokenAsync) with the MDJ backend,
 * which then delivers recommendation / briefing notifications via FCM v1.
 *
 * Backend endpoint:
 *   POST https://app.mydailyjourneys.com/api/pwa/register-native-token
 *   body { token, tripId, timezone, label }
 */
import * as Notifications from "expo-notifications"
import {Platform} from "react-native"

const BACKEND = "https://app.mydailyjourneys.com"

// Foreground presentation: show a banner + play sound even while the app
// is open (otherwise FCM only surfaces notifications in the background).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Request permission, get the FCM device token, and register it with the
 * backend. Best-effort — never throws; returns the token or null.
 */
export async function registerMdjPush(tripId: string): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "MDJ",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      })
    }

    let {status} = await Notifications.getPermissionsAsync()
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync()
      status = req.status
    }
    if (status !== "granted") {
      console.warn("[mdjPush] notification permission not granted")
      return null
    }

    const token = await Notifications.getDevicePushTokenAsync()
    const fcm = typeof token.data === "string" ? token.data : JSON.stringify(token.data)

    const res = await fetch(`${BACKEND}/api/pwa/register-native-token`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        token: fcm,
        tripId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        label: `native:${tripId}`,
      }),
    })
    if (!res.ok) {
      console.warn(`[mdjPush] backend register failed: ${res.status}`)
    } else {
      console.log("[mdjPush] FCM token registered for trip", tripId)
    }
    return fcm
  } catch (e) {
    console.warn("[mdjPush] registration failed:", e)
    return null
  }
}

/**
 * Subscribe to notification taps. Calls onUrl with the deep-link URL the
 * push carried (data.url), so the WebView can navigate to the rec / trip.
 * Returns a subscription with .remove().
 */
export function addMdjPushTapListener(onUrl: (url: string) => void) {
  return Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = resp.notification.request.content.data as {url?: string} | undefined
    if (data?.url) onUrl(String(data.url))
  })
}
