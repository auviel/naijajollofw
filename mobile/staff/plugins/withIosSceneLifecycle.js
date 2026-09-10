/**
 * Expo SDK 57 prebuild still generates AppDelegate-owned UIWindow startup.
 * iOS 27 / Xcode 27 require UIScene lifecycle (TN3187). Without a SceneDelegate
 * class matching UIApplicationSceneManifest, the app launches to a blank screen.
 *
 * This plugin writes SceneDelegate.swift into the Xcode target and moves React
 * Native startup out of AppDelegate — matching Expo main's template.
 */
const { IOSConfig, withAppDelegate } = require("expo/config-plugins");

const SCENE_DELEGATE_SWIFT = `internal import Expo
import React

/**
 UIScene life cycle is required by the iOS 27 SDK (TN3187). Expo SDK 57's published
 template still starts React Native from AppDelegate; this mirrors the SceneDelegate
 that landed on Expo main until a patch release ships ExpoAppSceneDelegate.
 */
@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    let browsingWebActivity = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.mergedLaunchOptions(
        base: appDelegate.launchOptions,
        url: connectionOptions.urlContexts.first?.url,
        userActivity: browsingWebActivity
      )
    )

    Self.route(urlContexts: connectionOptions.urlContexts)
    connectionOptions.userActivities.forEach { Self.route(userActivity: $0) }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    Self.route(urlContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    Self.route(userActivity: userActivity)
  }

  private static func mergedLaunchOptions(
    base: [UIApplication.LaunchOptionsKey: Any]?,
    url: URL?,
    userActivity: NSUserActivity?
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    var launchOptions = base ?? [:]
    if let url {
      let urlKey = UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")
      launchOptions[urlKey] = url
    }
    if let userActivity {
      let userActivityDictionaryKey = UIApplication.LaunchOptionsKey(
        rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey"
      )
      launchOptions[userActivityDictionaryKey] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }
    return launchOptions.isEmpty ? nil : launchOptions
  }

  private static func route(urlContexts: Set<UIOpenURLContext>) {
    for context in urlContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      options[.openInPlace] = context.options.openInPlace
      _ = ExpoAppDelegateSubscriberManager.application(
        UIApplication.shared,
        open: context.url,
        options: options
      )
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  private static func route(userActivity: NSUserActivity) {
    _ = ExpoAppDelegateSubscriberManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`;

function withSceneAwareAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error(
        "withIosSceneLifecycle expects a Swift AppDelegate (Expo SDK 57+)."
      );
    }

    let contents = cfg.modResults.contents;

    if (!contents.includes("var launchOptions:")) {
      contents = contents.replace(
        "var window: UIWindow?\n",
        "var window: UIWindow?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n"
      );
    }

    if (!contents.includes("self.launchOptions = launchOptions")) {
      contents = contents.replace(
        "didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil\n  ) -> Bool {\n",
        "didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil\n  ) -> Bool {\n    self.launchOptions = launchOptions\n\n"
      );
    }

    const windowBlock =
      /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n\s*withModuleName: "main",\s*\n\s*in: window,\s*\n\s*launchOptions: launchOptions\)\s*\n#endif\s*\n/;

    if (windowBlock.test(contents)) {
      contents = contents.replace(
        windowBlock,
        `// Window + React Native start in SceneDelegate (required by iOS 27 / Xcode 27 SDK).\n`
      );
    } else if (
      contents.includes("factory.startReactNative(") &&
      contents.includes("UIWindow(frame:")
    ) {
      contents = contents.replace(
        /#if os\(iOS\) \|\| os\(tvOS\)[\s\S]*?#endif\n/,
        `// Window + React Native start in SceneDelegate (required by iOS 27 / Xcode 27 SDK).\n`
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withIosSceneLifecycle(config) {
  config = IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    filePath: "SceneDelegate.swift",
    contents: SCENE_DELEGATE_SWIFT,
    overwrite: true,
  });
  config = withSceneAwareAppDelegate(config);
  return config;
}

module.exports = withIosSceneLifecycle;
