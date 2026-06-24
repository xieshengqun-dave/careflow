import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { typography } from "./careflow-tokens";

export const fontsToLoad = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

const WEIGHT_TO_FAMILY: Record<string, string> = {
  "400": "PlusJakartaSans_400Regular",
  "500": "PlusJakartaSans_500Medium",
  "600": "PlusJakartaSans_600SemiBold",
  "700": "PlusJakartaSans_700Bold",
  "800": "PlusJakartaSans_800ExtraBold",
};

export function fontFamily(weight: string | number = "400"): string {
  return WEIGHT_TO_FAMILY[String(weight)] ?? WEIGHT_TO_FAMILY["400"]!;
}

type TypeToken = Exclude<keyof typeof typography, "fontFamily">;

/** Returns a RN-ready text style ({ fontFamily, fontSize, letterSpacing }) for a token from theme.typography. */
export function textStyle(token: TypeToken) {
  const t = typography[token];
  return {
    fontFamily: fontFamily(t.fontWeight),
    fontSize: t.fontSize,
    letterSpacing: "letterSpacing" in t ? t.letterSpacing : undefined,
  };
}
