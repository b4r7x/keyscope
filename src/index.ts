// Provider
export { KeyboardProvider } from "./providers/keyboard-provider";
export type { HandlerOptions } from "./providers/keyboard-provider";

// Core hooks
export { useKey } from "./hooks/use-key";
export { useZoneKeys } from "./hooks/use-zone-keys";
export type { UseZoneKeysOptions } from "./hooks/use-zone-keys";
export { useScope } from "./hooks/use-scope";

// Navigation hooks
export { useNavigation } from "./hooks/use-navigation";
export { useTabNavigation } from "./hooks/use-tab-navigation";
export { useFocusZone } from "./hooks/use-focus-zone";

// Utilities
export { keys } from "./utils/keys";

// Types
export type { NavigationRole } from "./utils/types";
