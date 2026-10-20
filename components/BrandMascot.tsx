import { Image } from "expo-image";
import React from "react";

const poses = {
  error: require("../assets/images/404.png"),
  login: require("../assets/images/login.png"),
  normal: require("../assets/images/normal pose.png"),
  success: require("../assets/images/sucess.png"),
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
