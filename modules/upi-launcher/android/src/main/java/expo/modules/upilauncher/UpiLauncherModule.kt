package expo.modules.upilauncher

import android.app.Activity
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** Arbitrary but fixed request code identifying our UPI intent among any other
 * activity results the host activity might receive. */
private const val UPI_REQUEST_CODE = 4201

/** Typed result handed back to JS — see `UpiLauncher.types.ts` for the mirrored shape. */
class UpiPaymentResult(
  @Field val status: String,
  @Field val txnId: String? = null,
  @Field val responseCode: String? = null,
  @Field val approvalRefNo: String? = null,
  @Field val rawResponse: String? = null
) : Record

/**
 * Launches a `upi://pay` intent via `startActivityForResult` and resolves once
 * the chosen UPI app returns control to this app, decoding its result. This is
 * what lets the payment-progress screen auto-advance to the next split on
 * Android without asking the user to manually confirm each one — the one
 * capability that isn't available through plain `Linking`/deep-linking, and
 * the reason this app ships a small owned native module instead of relying on
 * JS-only APIs for the whole payment flow.
 */
class UpiLauncherModule : Module() {
  // A payment is in flight for at most one Promise at a time: the JS
  // orchestrator's own duplicate-launch guard (see paymentMachine.ts) never
  // starts a second split before the first resolves, but this is a defensive
  // backstop against a stray double-call from JS.
  private var pendingPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("UpiLauncher")

    AsyncFunction("hasUpiApp") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "No current activity to resolve UPI apps against.", null)
        return@AsyncFunction
      }
      val probeIntent = Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"))
      val resolved = activity.packageManager.queryIntentActivities(probeIntent, 0)
      promise.resolve(resolved.isNotEmpty())
    }

    AsyncFunction("pay") { uri: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "No current activity to launch the UPI app from.", null)
        return@AsyncFunction
      }

      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
      val resolveInfos = activity.packageManager.queryIntentActivities(intent, 0)
      if (resolveInfos.isEmpty()) {
        promise.reject("ERR_NO_UPI_APP", "No UPI app is installed on this device.", null)
        return@AsyncFunction
      }

      if (pendingPromise != null) {
        promise.reject("ERR_PAYMENT_IN_PROGRESS", "Another UPI payment is already in progress.", null)
        return@AsyncFunction
      }

      pendingPromise = promise
      try {
        // Deliberately does NOT set a specific package on the intent, so the OS
        // shows its normal chooser of every installed UPI app — the app must
        // never hardcode or default to a single UPI provider.
        activity.startActivityForResult(intent, UPI_REQUEST_CODE)
      } catch (e: Exception) {
        pendingPromise = null
        promise.reject("ERR_LAUNCH_FAILED", "Could not launch a UPI app for this payment.", e)
      }
    }

    OnActivityResult { _: Activity, payload ->
      if (payload.requestCode != UPI_REQUEST_CODE) return@OnActivityResult
      val promise = pendingPromise ?: return@OnActivityResult
      pendingPromise = null

      if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
        // The user backed out of the UPI app (system back button, task switch
        // away and never returning to complete it) without it ever reporting
        // a result — this is a clean cancellation, not a failure.
        promise.resolve(UpiPaymentResult(status = "CANCELLED"))
        return@OnActivityResult
      }

      // Per the NPCI UPI Linking Specification, a UPI app returns its result
      // as a single "response" string extra in `key=value&key=value...` form
      // — not as individual typed Intent extras — so this is parsed the same
      // defensively-tolerant way `parseUpiUri.ts` parses an incoming deep
      // link: never throw, never assume every key is present.
      val response = payload.data?.getStringExtra("response")
      if (response.isNullOrBlank()) {
        promise.resolve(UpiPaymentResult(status = "SUBMITTED", rawResponse = response))
        return@OnActivityResult
      }

      val fields = response
        .split("&")
        .mapNotNull { pair ->
          val parts = pair.split("=", limit = 2)
          if (parts.size == 2) parts[0].trim().lowercase() to parts[1].trim() else null
        }
        .toMap()

      val statusField = (fields["status"] ?: fields["txnstatus"])?.uppercase()
      val mappedStatus = when (statusField) {
        "SUCCESS" -> "SUCCESS"
        "FAILURE", "FAILED" -> "FAILURE"
        "SUBMITTED" -> "SUBMITTED"
        // An unrecognized or missing status is treated as ambiguous (SUBMITTED),
        // never silently mapped to SUCCESS — a parsing gap must never be
        // mistaken for a confirmed payment.
        else -> "SUBMITTED"
      }

      promise.resolve(
        UpiPaymentResult(
          status = mappedStatus,
          txnId = fields["txnid"],
          responseCode = fields["responsecode"] ?: fields["code"],
          approvalRefNo = fields["approvalrefno"] ?: fields["txnref"],
          rawResponse = response
        )
      )
    }
  }
}
