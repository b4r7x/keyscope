type KeyHandler = (event: KeyboardEvent) => void;

interface NormalizedKeyInput<O> {
  handlerMap: Record<string, KeyHandler>;
  options: O | undefined;
}

export function normalizeKeyInput<O>(
  first: string | readonly string[] | Record<string, KeyHandler>,
  second?: KeyHandler | O,
  third?: O,
): NormalizedKeyInput<O> {
  if (typeof first === "string") {
    return { handlerMap: { [first]: second as KeyHandler }, options: third };
  }
  if (Array.isArray(first)) {
    const handler = second as KeyHandler;
    return {
      handlerMap: Object.fromEntries(
        (first as readonly string[]).map((k) => [k, handler]),
      ),
      options: third,
    };
  }
  return {
    handlerMap: first as Record<string, KeyHandler>,
    options: second as O | undefined,
  };
}
