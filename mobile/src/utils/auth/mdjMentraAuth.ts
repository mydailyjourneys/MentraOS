/**
 * MDJ: invisible per-trip MentraOS account.
 *
 * The CLIENT should only ever log in ONCE — to the MDJ travel web app inside
 * the WebView. They must never see MentraOS's own login. MentraOS still needs
 * an account to link the glasses to the cloud (that's how the live guide
 * reaches the glasses), so we derive a hidden, per-trip MentraOS account and
 * sign into it silently in the background.
 *
 * auth.mentra.glass is the PUBLIC MentraOS cloud (we don't control it): there
 * is no anonymous auth and signup requires email confirmation. So the very
 * first time a trip's account is used, signUp() sends ONE verification email
 * to Maya's inbox (the account email is a +alias of her address). Maya
 * confirms it once; from then on every launch signs in silently.
 *
 * Security note: these accounts only route glasses audio / run the guide app —
 * no payment or personal data — so a deterministic, app-derived password is an
 * acceptable trade-off for the zero-touch client experience.
 */
import mentraAuth from "./authClient"

// Must match MDJ_TRIP_ID in app/mdj.tsx. Production will resolve the logged-in
// client's real trip id; for now the test trip.
const MDJ_TRIP_ID = "test-vietnam"

// Embedded salt so the derived password isn't a plain string. Low-value
// routing accounts only (see file header).
const MDJ_MENTRA_SALT = "Vng7-mdjGuide-2026"

function deriveCreds(tripId: string): {email: string; password: string} {
  return {
    email: `mayadalal1+mdj-${tripId}@gmail.com`,
    password: `MDJ_${tripId}_${MDJ_MENTRA_SALT}`,
  }
}

// Guards so a re-run of the init screen can't loop or re-trigger signup.
let attempted = false
let reroutes = 0

/**
 * Loop guard for index.tsx: returns how many times we've re-routed to "/" to
 * let a freshly-created session propagate. Caller should only re-route while
 * this is <= 1, otherwise fail open to /mdj.
 */
export function mdjNoteReroute(): number {
  reroutes += 1
  return reroutes
}

/**
 * Put a MentraOS session in place WITHOUT showing the client any MentraOS UI.
 * Returns true if a session now exists.
 *
 * - If a session already exists (e.g. on a re-run), returns true.
 * - Otherwise signs in with the trip's hidden account. If that fails (account
 *   not created / not yet confirmed), fires signUp() so the one-time
 *   verification email is sent to Maya, and returns false for this launch.
 *
 * Fail-open: never throws. On any error the caller simply opens /mdj — the
 * travel app is fully usable without glasses.
 */
export async function mdjEnsureMentraSession(): Promise<boolean> {
  try {
    if (attempted) {
      const existing = await mentraAuth.getSession()
      return !existing.is_error() && !!existing.value
    }
    attempted = true

    const creds = deriveCreds(MDJ_TRIP_ID)

    const signin = await mentraAuth.signInWithPassword(creds)
    if (!signin.is_error()) {
      return true
    }

    // Account likely doesn't exist yet, or its email isn't confirmed. Create
    // it (best-effort) so the verification email reaches Maya; this launch
    // continues without a guide session, the next launch will sign in.
    console.log("[MDJ] silent Mentra sign-in failed, attempting signUp:", signin.error)
    await mentraAuth.signUp(creds)
  } catch (e) {
    console.warn("[MDJ] mdjEnsureMentraSession error (continuing without guide session):", e)
  }
  return false
}
