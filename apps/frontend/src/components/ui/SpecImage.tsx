import { Box } from "@mantine/core";
import { getClassIconSrc } from "../../assets/classIcons";

type SpecImageProps = {
  className: string;
  spec: string;
};

export function SpecImage({ className, spec }: SpecImageProps) {
  const src = getClassIconSrc(className, spec);
  return (
    <Box style={{
      width: 22, height: 22, flexShrink: 0,
      borderRadius: "var(--mantine-radius-xs)",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
    }}>
      <img
        src={src}
        alt={`${className} ${spec}`}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    </Box>
  );
}
