// Hebrew locale for the MDJ build. Inherits the full English translation and
// overrides the screens MDJ clients actually see (the glasses pairing flow)
// with natural, plural/neutral Hebrew. Anything not overridden falls back to
// English automatically. Maya 2026-06-18.
import en from "./en"

const he = {
  ...en,
  pairing: {
    ...en.pairing,
    selectModel: "בחירת דגם",
    pairingGuide: "מדריך חיבור",
    pairing: "מתחבר…",
    needMoreHelp: "צריכים עוד עזרה?",
    glassesBooting: "המשקפיים מתחילות לפעול…",
    simulatedGlassesDescription: "משקפיים מדומות מאפשרות להפעיל את האפליקציה גם בלי משקפיים פיזיות.",
    permissionRequired: "נדרשת הרשאה",
    bluetoothPermissionRequiredTitle: "נדרשת הרשאה",
    bluetoothPermissionRequiredMessage: "נדרשת הרשאת בלוטות' כדי להתחבר למשקפיים",
    bluetoothPermissionRequiredMessageAlt:
      "נדרשת הרשאת בלוטות' כדי להתחבר למשקפיים החכמות.\n\nכדאי גם לוודא שהבלוטות' מופעל בהגדרות המכשיר.",
    errorTitle: "שגיאה",
    permissionsError: "בקשת ההרשאות הנדרשות נכשלה",
    connectionIssueTitle: "בעיית חיבור",
    connectionIssueMessage: "לא ניתן להתחבר למשקפיים — בדקו את הגדרות הבלוטות' והמיקום",
    bluetoothPermissionPreviouslyDenied:
      "נדרשות הרשאות בלוטות', אך הן נדחו בעבר. כדי להמשיך, אפשרו אותן בהגדרות.",
    openSettings: "פתחו הגדרות",
    scanningForGlasses: "מחפש משקפיים…",
    scanningForGlassesModel: "מחפש את המשקפיים שלכם…",
    scanningForGlasses2: "ודאו שהמשקפיים בטווח.",
    preorderNow: "להזמנה מוקדמת",
    buyNow: "לרכישה",
    preorderNowShipMessage: "נשלח בדצמבר 2025",
    goHome: "לדף הבית",
    getSupport: "קבלת תמיכה",
    pairingFailed: "החיבור נכשל",
    instructions: "הוראות",
    g1Ready: "המשיכו לחיבור",
    g1NotReady: "הנורה הכתומה מהבהבת",
    success: "הצליח!",
    glassesConnected: "המשקפיים מחוברות.",
    needHelpPairing: "צריכים עזרה בחיבור?",
    btClassicConnected: "שמע המשקפיים חובר בהצלחה",
    btClassicDisconnected: "שמע המשקפיים נותק",
    btClassicDisconnectedMessage:
      "המשקפיים מחוברות לאפליקציה, אך התקן השמע בבלוטות' אינו מחובר.",
    powerOn: "הדלקה",
    poweredOn: "המשך",
  },
  pairingGuide: {
    ...en.pairingGuide,
    mentraLivePreorder: "המשקפיים החכמות — חוו ראיית מחשב ישירות מהמשקפיים שלכם.",
  },
  pairingGuides: {
    ...en.pairingGuides,
    LIVE: {
      ...en.pairingGuides.LIVE,
      step1: "ודאו שהמשקפיים טעונות במלואן ומופעלות.",
      step2: "ודאו שהמשקפיים נמצאות במצב חיבור.",
      step3: "ודאו שאף אפליקציה אחרת אינה מחוברת כרגע למשקפיים.",
      step4: "נסו להפעיל מחדש את המשקפיים.",
      step5: "ודאו שהבלוטות' בטלפון מופעל.",
    },
  },
  connectivity: {
    ...en.connectivity,
    bluetoothRequiredTitle: "נדרש בלוטות'",
    bluetoothRequiredMessage:
      "כדי להתחבר למשקפיים יש צורך בבלוטות'. אנא הפעילו אותו בהגדרות המכשיר ונסו שוב.",
    locationPermissionRequiredTitle: "נדרשת הרשאת מיקום",
    locationPermissionRequiredMessage:
      "באנדרואיד נדרשת הרשאת מיקום כדי לחפש משקפיים. אנא אשרו אותה בהגדרות ונסו שוב.",
    locationServicesRequiredTitle: "נדרשים שירותי מיקום",
    locationServicesRequiredMessage:
      "שירותי המיקום מושבתים. אנא הפעילו אותם בהגדרות המכשיר ונסו שוב.",
  },
}

export default he
