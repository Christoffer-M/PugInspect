import React from "react";
import { Anchor, ActionIcon, Image } from "@mantine/core";

type ExternalLinkIconProps = {
  href: string;
  icon: React.ReactNode;
  label?: string;
  size?: number;
};

export const ExternalLinkIcon: React.FC<ExternalLinkIconProps> = ({
  href,
  icon,
  label = "Open external link",
  size = 36,
}) => (
  <Anchor
    component="a"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    size={`${size}px`}
  >
    <ActionIcon variant="subtle" size={size} aria-label={label}>
      <Image src={icon} h={size} w={size} fit="contain" />
    </ActionIcon>
  </Anchor>
);
