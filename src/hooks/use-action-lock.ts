"use client";

import { useMemo, useRef } from "react";

/** Prevent overlapping mutations before React has rendered the disabled state. */
export function useActionLock() {
  const locked = useRef(false);

  return useMemo(() => ({
    acquire() {
      if (locked.current) return false;
      locked.current = true;
      return true;
    },
    release() { locked.current = false; },
    isLocked() { return locked.current; },
  }), []);
}
