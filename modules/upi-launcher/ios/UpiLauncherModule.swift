import ExpoModulesCore

internal final class UpiPayNotSupportedOnIosException: Exception {
  override var reason: String {
    "UPI payments on iOS are launched via Linking.openURL from JS (see iosLauncher.ts), not this native module."
  }
}

/**
 * iOS has no cross-app mechanism to wait for a result from an arbitrary
 * custom-URL-scheme app the way Android's `startActivityForResult` does, so
 * this app deliberately does NOT route iOS payments through a native module —
 * `iosLauncher.ts` opens the deep link directly via React Native's
 * `Linking.openURL` and infers completion from the app returning to the
 * foreground plus an explicit user confirmation.
 *
 * This module only exposes the one thing iOS *can* answer natively:
 * whether any app is registered to handle the `upi://pay` scheme at all,
 * which `Linking.canOpenURL` in RN itself already covers — this exists as a
 * belt-and-suspenders equivalent kept symmetrical with the Android module's
 * `hasUpiApp`, and to keep both platforms exposing the same JS surface.
 */
public class UpiLauncherModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UpiLauncher")

    AsyncFunction("hasUpiApp") { () -> Bool in
      guard let url = URL(string: "upi://pay") else { return false }
      return await MainActor.run {
        UIApplication.shared.canOpenURL(url)
      }
    }

    AsyncFunction("pay") { (_ uri: String) -> Void in
      throw UpiPayNotSupportedOnIosException()
    }
  }
}
