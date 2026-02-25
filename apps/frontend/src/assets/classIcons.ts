const icons = import.meta.glob("/src/assets/class-icons/*.svg", {
  eager: true,
  import: "default",
});

export function getClassIconSrc(
  classNameOrSlug: string,
  specNameOrSlug: string,
): string | undefined {
  const classSlug = classNameOrSlug.replace(/\s+/g, "").toLowerCase();
  const specSlug = specNameOrSlug.replace(/\s+/g, "").toLowerCase();
  const key = `/src/assets/class-icons/classicon_${classSlug}_${specSlug}.svg`;
  return icons[key] as string | undefined;
}
