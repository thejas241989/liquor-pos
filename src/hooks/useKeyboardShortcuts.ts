import { useEffect } from 'react';

interface UseKeyboardShortcutProps {
  key: string;
  callback: () => void;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  enabled?: boolean;
}

export const useKeyboardShortcut = ({
  key,
  callback,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  enabled = true
}: UseKeyboardShortcutProps) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlPressed = ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const isShiftPressed = shiftKey ? event.shiftKey : !event.shiftKey;
      const isAltPressed = altKey ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        isCtrlPressed &&
        isShiftPressed &&
        isAltPressed
      ) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ctrlKey, shiftKey, altKey, enabled]);
};

export const useEscapeKey = (callback: () => void, enabled = true) => {
  useKeyboardShortcut({
    key: 'Escape',
    callback,
    enabled
  });
};
