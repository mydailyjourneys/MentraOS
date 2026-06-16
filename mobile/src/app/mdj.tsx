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
import {useAppStatusStore, useStart} from "@mentra/island"

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
  const guideStartedRef = useRef(false)

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

  // Auto-start the MDJ voice guide MiniApp once the app list loads (so the
  // glasses session activates and "היי מאיה" + story narration work). Runs
  // once; skips if the guide is already running.
  useEffect(() => {
    if (guideStartedRef.current) return
    const guide = Array.isArray(apps) ? apps.find((a: any) => a?.packageName === MDJ_GUIDE_PKG) : null
    if (!guide) return // app list not loaded yet — effect re-runs when it updates
    guideStartedRef.current = true
    if (!guide.running) {
      try {
        startApplet(guide)
      } catch (e) {
        console.warn("[mdj] guide auto-start failed:", e)
      }
    }
  }, [apps, startApplet])

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
