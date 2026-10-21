import { Redirect } from "expo-router";
import { useProfile } from "@/context/AccessContext";
import { hasTanodAccess } from "@/constants/access";
export default function Index() {
  return (
    <Redirect
      href={
        hasTanodAccess(useProfile())
          ? "/(root)/(tanod-tabs)/map"
          : "/(root)/(tabs)/map"
      }
    />
  );
}
