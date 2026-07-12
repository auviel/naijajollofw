"use client";

import { useEffect } from "react";

type LockSnapshot = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
  scrollY: number;
};

let lockCount = 0;
let snapshot: LockSnapshot | null = null;

function lockBody() {
  const body = document.body;
  if (lockCount === 0) {
    const scrollY = window.scrollY;
    const scrollbarGap =
      window.innerWidth - document.documentElement.clientWidth;
    snapshot = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      scrollY,
    };
    // position:fixed + top offset stops iOS rubber-band behind sheets;
    // overflow:hidden alone is not enough on Safari.
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }
  }
  lockCount += 1;
}

function unlockBody() {
  if (lockCount === 0) {
    return;
  }
  lockCount -= 1;
  if (lockCount > 0 || !snapshot) {
    return;
  }
  const body = document.body;
  const { scrollY, ...styles } = snapshot;
  snapshot = null;
  body.style.overflow = styles.overflow;
  body.style.position = styles.position;
  body.style.top = styles.top;
  body.style.left = styles.left;
  body.style.right = styles.right;
  body.style.width = styles.width;
  body.style.paddingRight = styles.paddingRight;
  window.scrollTo(0, scrollY);
}

/** Locks document scroll while `locked` is true. Safe to nest across modals. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }
    lockBody();
    return () => unlockBody();
  }, [locked]);
}
