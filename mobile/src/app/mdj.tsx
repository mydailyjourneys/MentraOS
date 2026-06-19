/**
 * MDJ Travel Guide — embedded travel app screen.
 *
 * Full-screen WebView that loads the MDJ traveler web app. A top safe-area
 * strip keeps the web header out from under the status bar / camera cutout
 * so the title is never covered.
 */
import {useRef, useState, useCallback, useEffect} from "react"
import {View, ActivityIndicator, BackHandler, Platform, StatusBar} from "react-native"
import {WebView} from "react-native-webview"
import {SafeAreaView} from "react-native-safe-area-context"
import {useFocusEffect} from "expo-router"
import {registerMdjPush, addMdjPushTapListener} from "@/effects/mdjPush"
import {useAppStatusStore, useStart, useStop} from "@mentra/island"
import BluetoothSdk from "@mentra/bluetooth-sdk"
import {useGlassesStore, isGlassesConnected} from "@/stores/glasses"
import {SETTINGS, useSetting} from "@/stores/settings"
import {useNavigationStore} from "@/stores/navigation"

// The MDJ voice guide MiniApp — auto-started in the background so "היי מאיה"
// and story narration work while the traveler is in this WebView, without
// the user having to open the Mentra app-management screen first.
const MDJ_GUIDE_PKG = "com.mydailyjourneys.guide"

// Test trip for now; production will resolve the logged-in client's own trip.
const MDJ_TRIP_ID = "test-vietnam"
const MDJ_BACKEND = "https://app.mydailyjourneys.com"
const MDJ_APP_URL = `${MDJ_BACKEND}/?trip=${MDJ_TRIP_ID}`

// Dark strip behind the status bar (time / battery / camera cutout) so the
// app content starts cleanly below it.
const STATUS_BAR_BG = "#141414"

export default function MdjTravelScreen() {
  const webRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)

  // Live list of the user's MentraOS apps + the start function, so we can
  // auto-start the guide MiniApp in the background.
  const apps = useAppStatusStore((s: any) => s.apps)
  const startApplet = useStart()
  const stopApplet = useStop()

  // Live glasses connection state, so we can auto-connect the paired glasses.
  const glassesConnection = useGlassesStore((s: any) => s.connection)
  const connectTriedRef = useRef(false)

  // Whether the user has ever paired glasses. If not, we skip ALL glasses
  // logic (auto-connect, guide auto-start) so users without glasses are
  // never bothered with connection attempts or "GLASSES REQUIRED" popups.
  const [defaultWearable] = useSetting(SETTINGS.default_wearable.key)
  const hasGlasses = !!defaultWearable

  // Bridge: the web app's Settings posts "mdj:open-pairing" to start the
  // one-time glasses pairing flow (MentraOS's proven /pairing flow).
  const handleWebMessage = useCallback((event: any) => {
    const data = event?.nativeEvent?.data
    if (data === "mdj:open-pairing") {
      useNavigationStore.getState().push("/pairing/select-glasses-model")
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (canGoBack && webRef.current) {
          webRef.current.goBack()
          return true
        }
        return false
      })
      return () => sub.remove()
    }, [canGoBack]),
  )

  // Register for native push (Android FCM) on mount, and route notification
  // taps into the WebView (deep-link to the rec / trip the push carried).
  useEffect(() => {
    registerMdjPush(MDJ_TRIP_ID)
    const sub = addMdjPushTapListener((url) => {
      const full = url.startsWith("http") ? url : `${MDJ_BACKEND}${url}`
      webRef.current?.injectJavaScript(`window.location.href=${JSON.stringify(full)};true;`)
    })
    return () => sub.remove()
  }, [])

  // GLASSES-ONLY guide lifecycle. The voice guide listens through a
  // MICROPHONE, so it must run ONLY while the glasses are ACTUALLY CONNECTED —
  // never merely "paired". Otherwise MentraOS falls back to the PHONE mic and
  // the guide keeps a session open and listens 24/7 (a privacy problem, and
  // the cause of the unprompted morning narration). So:
  //   glasses connected    → start the guide (glasses mic + speaker drive it)
  //   glasses disconnected  → stop the guide, so the phone mic/speaker are
  //                           never used for background listening.
  useEffect(() => {
    if (!hasGlasses) return // never paired → nothing to manage
    const guide = Array.isArray(apps) ? apps.find((a: any) => a?.packageName === MDJ_GUIDE_PKG) : null
    if (!guide) return // app list not loaded yet — effect re-runs when it updates
    const connected = !!(glassesConnection && isGlassesConnected(glassesConnection))
    if (connected) {
      if (!guide.running) {
        try {
          startApplet(guide)
        } catch (e) {
          console.warn("[mdj] guide auto-start failed:", e)
        }
      }
    } else if (guide.running) {
      // Glasses not connected → ensure the guide is NOT running, so the phone
      // mic is never used for continuous background listening.
      try {
        stopApplet(guide.packageName)
      } catch (e) {
        console.warn("[mdj] guide auto-stop failed:", e)
      }
    }
  }, [apps, glassesConnection, startApplet, stopApplet, hasGlasses])

  // Auto-connect the paired glasses on launch. The fork skips Mentra's
  // connection screen, so without this the glasses never link to the app
  // and the guide gets no session. Give the core a few seconds to connect
  // on its own first; if still not connected, trigger connectDefault() once.
  useEffect(() => {
    if (connectTriedRef.current) return
    if (!hasGlasses) {
      connectTriedRef.current = true
      return // no glasses paired → never attempt to connect
    }
    if (glassesConnection && isGlassesConnected(glassesConnection)) {
      connectTriedRef.current = true
      return
    }
    const t = setTimeout(() => {
      if (connectTriedRef.current) return
      const conn = useGlassesStore.getState().connection
      if (conn && isGlassesConnected(conn)) {
        connectTriedRef.current = true
        return
      }
      connectTriedRef.current = true
      try {
        BluetoothSdk.connectDefault().catch((e: any) => console.warn("[mdj] connectDefault failed:", e))
      } catch (e) {
        console.warn("[mdj] connectDefault threw:", e)
      }
    }, 4000)
    return () => clearTimeout(t)
  }, [glassesConnection, hasGlasses])

  return (
    <SafeAreaView edges={["top"]} style={{flex: 1, backgroundColor: STATUS_BAR_BG}}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_BAR_BG} translucent={false} />
      <View style={{flex: 1, backgroundColor: "#ffffff"}}>
        <WebView
          ref={webRef}
          source={{uri: MDJ_APP_URL}}
          style={{flex: 1}}
          // Pose as a normal Chrome browser so Google OAuth doesn't reject the
          // sign-in with "disallowed_useragent" (Google blocks embedded WebViews).
          userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(s) => setCanGoBack(s.canGoBack)}
          onMessage={handleWebMessage}
        />
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EC700B",
            }}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
