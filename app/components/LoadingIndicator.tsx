import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";

type LoadingIndicatorProps = {
  size?: "small" | "large";
  color?: string;
  style?: object;
};

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = "large",
  color = "rgba(255, 255, 255, 0.5)",
  style = {},
}) => (
  <View style={[styles.container, style]}>
    <ActivityIndicator size={size} color={color} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
});

export default LoadingIndicator;
