import { Colors, Radii } from "@naijajollof/ui";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

export function TurnstileField({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
}) {
  const html = useMemo(
    () => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; }
      #widget { display: flex; justify-content: center; padding-top: 4px; }
    </style>
  </head>
  <body>
    <div id="widget"></div>
    <script>
      function post(token) {
        window.ReactNativeWebView.postMessage(token || "");
      }
      function render() {
        if (!window.turnstile) return;
        window.turnstile.render("#widget", {
          sitekey: ${JSON.stringify(siteKey)},
          theme: "light",
          callback: post,
          "expired-callback": function () { post(""); },
          "error-callback": function () { post(""); }
        });
      }
      if (window.turnstile) render();
      else window.addEventListener("load", render);
    </script>
  </body>
</html>`,
    [siteKey],
  );

  function onMessage(event: WebViewMessageEvent) {
    const token = event.nativeEvent.data?.trim();
    onToken(token ? token : null);
  }

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://naijajollofw.ca" }}
        onMessage={onMessage}
        javaScriptEnabled
        automaticallyAdjustContentInsets={false}
        scrollEnabled={false}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 78,
    borderRadius: Radii.sm,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  web: {
    backgroundColor: "transparent",
    height: 78,
  },
});
