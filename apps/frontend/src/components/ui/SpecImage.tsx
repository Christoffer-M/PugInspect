import { Image } from "@mantine/core";
import { getClassIconSrc } from "../../assets/classIcons";

type SpecImageProps = {
  className: string;
  spec: string;
};

export function SpecImage({ className, spec }: SpecImageProps) {
  const src = getClassIconSrc(className, spec);
  return (
    <Image
      h={22}
      w={22}
      fit="contain"
      radius="xs"
      alt={`${className} ${spec}`}
      src={src}
    />
  );
}
