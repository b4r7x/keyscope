// Provider
export { KeyboardProvider } from "./providers/keyboard-provider.js";
export type { HandlerOptions } from "./providers/keyboard-provider.js";

// Core hooks
export { useKey } from "./hooks/use-key.js";
export type { UseKeyOptions } from "./hooks/use-key.js";
export { useScope } from "./hooks/use-scope.js";

// Navigation hooks
export { useNavigation } from "./hooks/use-navigation.js";
export { useTabNavigation } from "./hooks/use-tab-navigation.js";
export { useFocusZone } from "./hooks/use-focus-zone.js";

// Utilities
export { keys } from "./utils/keys.js";

// Context
export { useOptionalKeyboardContext } from "./context/keyboard-context.js";

// Types
export type { NavigationRole } from "./utils/types.js";
