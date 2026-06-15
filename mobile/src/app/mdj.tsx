/**
 * MDJ Travel Guide — embedded travel app screen.
 *
 * Full-screen WebView that loads the MDJ traveler web app
 * (itinerary + Supabase login + glasses-media tab). This is the MDJ
 * home content that sits ON TOP of the (forked) MentraOS glasses
 * engine: the client opens one app, logs in, and sees their trip —
 * while the native glasses pairing/connection runs underneath.
 *
 * Self-contained: does not use the Mentra miniapp token handshake
 * (that is for cloud miniapps registered in Mentra's store). The MDJ
 * web app handles its own auth.
 */
import {useRef, useState} from "react"
import {View, ActivityIndicator, BackHandler, Platform} from "react-native"
import {WebView} from "react-native-webview"
import {useFocusEffect} from "expo-router"
import {useCallback} from "react"

const MDJ_APP_URL = "https://app.mydailyjourneys.com"

export default function MdjTravelScreen() {
  const webRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)

  // Android hardware back: navigate inside the web app first.
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
    <View style={{flex: 1, backgroundColor: "#EC700B"}}>
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
  )
}
