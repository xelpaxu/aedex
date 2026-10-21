import { useTheme } from "@/context/ThemeContext";
import Svg, { Circle, Path, Rect, Text } from "react-native-svg";

/** Offline style sample: never requests tiles or displays provider error images. */
export default function StreetMapPreview() {
  const { isDark } = useTheme();
  const bg = isDark ? "#101C1C" : "#F3F4F4";
  const block = isDark ? "#1C2B2B" : "#E2E5E5";
  const road = isDark ? "#526463" : "#FFFFFF";
  const edge = isDark ? "#293D3C" : "#CFD4D4";
  const label = isDark ? "#C0CECC" : "#505B5B";
  const roads = "M-20 30L260 86 M-20 101L260 157 M20-20L-14 150 M92-20L58 150 M168-20L134 150 M244-20L210 150";
  return <Svg width="100%" height="100%" viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" accessible={false}>
    <Rect width="240" height="140" fill={bg} />
    <Path d="M-15 122Q40 78 69 110T149 103T260 108L260 160H-15Z" fill={isDark ? "#172D30" : "#D6DDDF"} />
    <Rect x="23" y="40" width="30" height="30" rx="3" fill={block} transform="rotate(11 38 55)" />
    <Rect x="102" y="53" width="32" height="30" rx="3" fill={block} transform="rotate(11 118 68)" />
    <Rect x="174" y="68" width="31" height="29" rx="3" fill={block} transform="rotate(11 189 82)" />
    <Rect x="47" y="0" width="28" height="24" rx="3" fill={block} transform="rotate(11 61 12)" />
    <Rect x="117" y="7" width="31" height="30" rx="3" fill={block} transform="rotate(11 132 22)" />
    <Path d={roads} fill="none" stroke={edge} strokeWidth="11" />
    <Path d={roads} fill="none" stroke={road} strokeWidth="8" />
    <Path d="M-20 30L260 86" fill="none" stroke={isDark ? "#A0ADAA" : "#FFFFFF"} strokeWidth="12" />
    <Text x="94" y="48" fill={label} fontSize="9" fontWeight="600" transform="rotate(11 94 48)">Main Street</Text>
    <Text x="157" y="118" fill={label} fontSize="8">Riverside</Text>
    <Circle cx="76" cy="49" r="6" fill={isDark ? "#42B8AD" : "#0F766E"} stroke={road} strokeWidth="2" />
  </Svg>;
}
