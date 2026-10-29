# Puente con la página web cuando el WebView no admite addWebMessageListener.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
