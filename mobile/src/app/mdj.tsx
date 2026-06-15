/**
 * MDJ Travel Guide — embedded travel app screen.
 *
 * Full-screen WebView that loads the MDJ traveler web app. A top safe-area
 * strip keeps the web header out from under the status bar / camera cutout
 * so the title is never covered.
 */
import {useRef, useState, useCallback} from "react"
import {View, ActivityIndicator, BackHandler, Platform, StatusBar} from "react-native"
import {WebView} from "react-native-webview"
import {SafeAreaView} from "react-native-safe-area-context"
import {useFocusEffect} from "expo-router"

// Test trip for now; production will resolve the logged-in client's own trip.
const MDJ_APP_URL = "https://app.mydailyjourneys.com/?trip=test-vietnam"

// Dark strip behind the status bar (time / battery / camera cutout) so the
// app content starts cleanly below it.
const STATUS_BAR_BG = "#141414"

export default function MdjTravelScreen() {
  const webRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)

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

  return (
    <SafeAreaView edges={["top"]} style={{flex: 1, backgroundColor: STATUS_BAR_BG}}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_BAR_BG} translucent={false} />
      <View style={{flex: 1, backgroundColor: "#ffffff"}}>
        <WebView
          ref={webRef}
          source={{uri: MDJ_APP_URL}}
          style={{flex: 1}}
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
