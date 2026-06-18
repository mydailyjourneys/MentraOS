import {Image, ImageStyle} from "react-native"

interface LogoProps {
  width?: number
  height?: number
  fill?: string
  colorOverride?: string
}

// MDJ brand mark — the My Daily Journeys globe, replacing the original Mentra
// logo everywhere this component is used (pairing/onboarding headers, etc.).
// resizeMode="contain" keeps the globe's 1:1 aspect inside whatever box the
// caller asks for, so it never distorts. Maya 2026-06-18.
export const MentraLogoStandalone: React.FC<LogoProps> = ({width = 33, height = 16}) => {
  return (
    <Image
      source={require("../../../assets/app-icons/ic_launcher_foreground.png")}
      style={{width: Math.max(width, height), height: Math.max(width, height)} as ImageStyle}
      resizeMode="contain"
    />
  )
}
