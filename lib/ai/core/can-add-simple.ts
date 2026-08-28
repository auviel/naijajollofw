export function canAddWithoutCustomize(
  groups: { required: boolean; minSelect: number }[],
): boolean {
  return groups.every((g) => !g.required && g.minSelect <= 0);
}
