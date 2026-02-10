export function keys(
  hotkeys: readonly string[],
  handler: () => void,
): Record<string, () => void> {
  return Object.fromEntries(hotkeys.map((key) => [key, handler]));
}
