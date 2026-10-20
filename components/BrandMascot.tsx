import { Image } from "expo-image";
import React from "react";

const poses = {
  login: require("../assets/images/branding/login.webp"),
  normal: require("../assets/images/branding/normal.webp"),
  success: require("../assets/images/branding/success.webp"),
};

/** Decorative artwork; surrounding text carries the screen's meaning. */
export default function BrandMascot({
  pose = "normal",
  size = 104,
}: {
  pose?: keyof typeof poses;
  size?: number;
}) {
  return (
    <Image
      source={poses[pose]}
      style={{ width: size, height: size, flexShrink: 0 }}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
