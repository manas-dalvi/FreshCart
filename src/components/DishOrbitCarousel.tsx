"use client";

import { useEffect, useLayoutEffect, useRef, useState, useId, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { IconSearch } from "@/components/Icons";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export type OrbitProductItem = {
  product: Product;
  title: string;
  subtitle: string;
  label: string;
  image: string;
  alt: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  description: string;
  accent: string;
};

export type DishOrbitCarouselProps = {
  items: OrbitProductItem[];
  height?: string;
  loop?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
  onQuickView?: (product: Product) => void;
  className?: string;
};

// #region Helper Math
export function wrapIndex(i: number, n: number): number {
  if (n <= 0) return 0;
  return ((Math.round(i) % n) + n) % n;
}

export function stepDirection(from: number, to: number, n: number): 1 | -1 {
  if (n <= 0) return 1;
  const fwd = (((to - from) % n) + n) % n;
  return fwd <= n - fwd ? 1 : -1;
}

export function scrollSteps(n: number, loop: boolean): number {
  return Math.max(0, loop ? n : n - 1);
}

export function segmentFor(i: number, current: number, n: number, loop: boolean): number {
  return loop && i === 0 && current > n / 2 ? n : i;
}

export function stripStart(index: number, n: number, visible: number): number {
  if (n <= visible) return 0;
  return Math.max(0, Math.min(index - 1, n - visible));
}

export function fitSize(chars: number, max: number, width: number, em: number): number {
  return Math.min(max, width / (Math.max(1, chars) * em));
}

export function arcPath(
  a0: number,
  a1: number,
  cx: number,
  cy: number,
  r: number,
  w: number,
  steps = 48
): string {
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    const h = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.45);
    const c = Math.cos(a);
    const s = Math.sin(a);
    outer.push((cx + c * (r + h)).toFixed(1) + " " + (cy + s * (r + h)).toFixed(1));
    inner.push((cx + c * (r - h)).toFixed(1) + " " + (cy + s * (r - h)).toFixed(1));
  }
  return "M" + outer.join("L") + "L" + inner.reverse().join("L") + "Z";
}

export const ARC_REST = [
  [50, 98],
  [46, 124],
  [60, 126],
  [40, 100],
];

export function arcRest(index: number): number[] {
  return ARC_REST[((index % ARC_REST.length) + ARC_REST.length) % ARC_REST.length];
}

export const ARC_SWEEP = [38, 146];
// #endregion

const ORBIT_X = 299;
const ORBIT_Y = -450;
const ORBIT_R = 650;
const SWING = 50;
const ITEM = 118;
const VISIBLE = 4;

const HIDE_1 = "inset(0% 0% 0% 100%)";
const HIDE_2 = "inset(0% 100% 0% 0%)";
const SHOW = "inset(0% 0% 0% 0%)";

const CSS_STYLES = `
  .dsh-trk { position: relative; width: 100%; }
  .dsh-root {
    position: relative;
    overflow: hidden;
    width: 100%;
    background: #FFFFFF;
    color: #111827;
    container-type: inline-size;
    -webkit-tap-highlight-color: transparent;
  }
  .dsh-root * { box-sizing: border-box; }
  .dsh-canvas {
    position: relative;
    margin: 0 auto;
    width: 1060px;
    height: 520px;
    transform: scale(var(--dsh-s, 1));
    transform-origin: 50% 50%;
  }
  .dsh-arc {
    position: absolute;
    left: 0;
    top: 0;
    width: 1060px;
    height: 520px;
    overflow: visible;
    pointer-events: none;
  }
  .dsh-btn {
    appearance: none;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    padding: 0;
    margin: 0;
    cursor: pointer;
  }
  .dsh-btn:focus-visible {
    outline: 2px solid #1F5A43;
    outline-offset: 3px;
    border-radius: 10px;
  }
  .dsh-pager {
    position: absolute;
    left: 36px;
    top: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 10;
  }
  .dsh-dot {
    width: 14px;
    height: 10px;
    display: grid;
    place-items: center;
    transition: height .45s cubic-bezier(.3,.7,.2,1);
  }
  .dsh-dot i {
    display: block;
    width: 4px;
    height: 4px;
    border-radius: 4px;
    background: #171A18;
    opacity: .35;
    transition: height .45s cubic-bezier(.3,.7,.2,1), opacity .3s, background-color .3s;
  }
  .dsh-dot[aria-current="true"] i {
    height: 24px;
    opacity: 1;
    background: #1F5A43;
  }
  .dsh-dot[aria-current="true"] {
    height: 28px;
  }
  .dsh-plates {
    position: absolute;
    left: 88px;
    top: 76px;
    width: 260px;
    height: 260px;
    touch-action: pan-y;
  }
  .dsh-orbit {
    position: absolute;
    inset: 0;
    transform-origin: 69% -217%;
    visibility: hidden;
    will-change: transform;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dsh-orbit > img {
    display: block;
    width: 250px;
    height: 250px;
    max-width: none;
    object-fit: cover;
    border-radius: 50%;
    user-select: none;
    -webkit-user-drag: none;
    box-shadow: 0 20px 35px -10px rgba(23, 26, 24, 0.25), 0 0 0 8px rgba(255, 255, 255, 0.9);
  }
  .dsh-head {
    position: absolute;
    left: 375px;
    top: 86px;
    width: 380px;
    height: 150px;
  }
  .dsh-hd {
    position: absolute;
    inset: 0;
    visibility: hidden;
  }
  .dsh-eye {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #9A7440;
    margin: 0 0 6px 2px;
    font-family: var(--font-plex-mono), monospace;
  }
  .dsh-t1, .dsh-t2 {
    display: block;
    white-space: nowrap;
    line-height: 1.05;
    text-transform: uppercase;
    margin: 0;
  }
  .dsh-t1 {
    font-family: var(--font-plex-sans), sans-serif;
    font-weight: 500;
    letter-spacing: -.02em;
    color: #111827;
  }
  .dsh-t2 {
    font-family: var(--font-plex-sans), sans-serif;
    font-weight: 800;
    letter-spacing: -.03em;
    margin-top: 4px;
    color: #1F5A43;
  }
  .dsh-acts {
    position: absolute;
    left: 375px;
    top: 256px;
    width: 380px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
  }
  .dsh-card {
    position: absolute;
    left: 795px;
    top: 96px;
    width: 235px;
    padding: 18px 20px 20px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.98);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border: 1px solid #E5E7EB;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
  }
  .dsh-tabs {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 14px;
    border-bottom: 1px solid #E8E5DD;
    padding-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .dsh-tab {
    color: #606863;
    cursor: pointer;
    transition: color .2s;
  }
  .dsh-tab[aria-selected="true"] {
    color: #1F5A43;
    font-weight: 700;
  }
  .dsh-bodies { display: grid; }
  .dsh-body { grid-area: 1/1; visibility: hidden; }
  .dsh-price-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 8px;
    background: #1F5A43;
    color: #FFFFFF;
    font-family: var(--font-plex-mono), monospace;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .dsh-unit-label {
    font-size: 10px;
    opacity: 0.85;
    font-weight: 400;
  }
  .dsh-meta-name {
    font-size: 15px;
    font-weight: 700;
    color: #171A18;
    margin: 0 0 2px;
    line-height: 1.2;
  }
  .dsh-meta-cat {
    font-size: 11px;
    color: #9A7440;
    font-weight: 600;
    margin: 0 0 10px;
  }
  .dsh-desc {
    font-size: 12px;
    line-height: 1.45;
    color: #3A403C;
    margin: 0;
    min-height: 48px;
  }
  .dsh-spec-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    min-height: 48px;
    font-size: 11px;
  }
  .dsh-spec-item {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    border-bottom: 1px dashed #E0DDD5;
  }
  .dsh-spec-label { color: #606863; }
  .dsh-spec-val { font-weight: 600; color: #171A18; }
  .dsh-stock-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    font-size: 11px;
    font-weight: 600;
  }
  .dsh-stock-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .dsh-strip {
    position: absolute;
    left: 88px;
    top: 366px;
    width: 600px;
    height: 122px;
    display: flex;
    align-items: center;
  }
  .dsh-arrow {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    color: #111827;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
    transition: all .2s;
    flex: none;
  }
  .dsh-arrow:hover {
    background: #1F5A43;
    color: #FFFFFF;
    border-color: #1F5A43;
  }
  .dsh-arrow svg {
    width: 12px;
    height: 14px;
    fill: currentColor;
  }
  .dsh-win {
    position: relative;
    width: ${ITEM * VISIBLE}px;
    height: 122px;
    overflow: hidden;
    flex: none;
    margin: 0 10px;
    -webkit-mask-image: linear-gradient(90deg, #000 85%, transparent);
    mask-image: linear-gradient(90deg, #000 85%, transparent);
  }
  .dsh-track {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    transition: transform .6s cubic-bezier(.65,0,.35,1);
  }
  .dsh-th {
    width: ${ITEM}px;
    height: 122px;
    display: flex;
    justify-content: center;
    padding-top: 4px;
  }
  .dsh-th .dsh-btn {
    width: 88px;
    height: 112px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 6px;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid transparent;
    transition: all .35s;
  }
  .dsh-th .dsh-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: #E5E7EB;
  }
  .dsh-th .dsh-btn[aria-current="true"] {
    background: #FFFFFF;
    border-color: #1F5A43;
    box-shadow: 0 8px 20px -8px rgba(31, 90, 67, 0.25);
  }
  .dsh-th img {
    width: 52px;
    height: 52px;
    max-width: none;
    object-fit: cover;
    border-radius: 50%;
    box-shadow: 0 4px 8px rgba(0,0,0,.1);
    transition: transform .35s;
  }
  .dsh-th .dsh-btn[aria-current="true"] img {
    transform: scale(1.1);
  }
  .dsh-th span {
    font-size: 10px;
    line-height: 1.25;
    text-align: center;
    font-weight: 600;
    color: #171A18;
    max-width: 80px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .dsh-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  /* Responsive Stacking for Tablet & Mobile (<= 920px) */
  @container (max-width: 920px) {
    .dsh-root {
      min-height: auto !important;
    }
    .dsh-canvas {
      position: relative;
      left: auto;
      top: auto;
      width: 100%;
      height: auto;
      transform: none !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 16px 28px;
    }
    .dsh-arc {
      width: 140%;
      height: 280px;
      left: -20%;
      top: -20px;
    }
    .dsh-pager {
      position: static;
      flex-direction: row;
      margin-bottom: 12px;
    }
    .dsh-dot[aria-current="true"] {
      height: 14px;
      width: 28px;
    }
    .dsh-dot[aria-current="true"] i {
      height: 4px;
      width: 24px;
    }
    .dsh-plates {
      position: relative;
      left: auto;
      top: auto;
      width: 190px;
      height: 190px;
      margin: 0 auto;
    }
    .dsh-orbit > img {
      width: 180px;
      height: 180px;
    }
    .dsh-head {
      position: relative;
      left: auto;
      top: auto;
      width: 100%;
      height: auto;
      min-height: 60px;
      margin-top: 12px;
      text-align: center;
    }
    .dsh-hd {
      position: relative;
      text-align: center;
    }
    .dsh-t1, .dsh-t2 {
      white-space: normal;
    }
    .dsh-t1 { font-size: 18px !important; }
    .dsh-t2 { font-size: 22px !important; margin-top: 2px; }
    .dsh-acts {
      position: relative;
      left: auto;
      top: auto;
      margin-top: 14px;
      width: 100%;
      max-width: 340px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .dsh-acts button {
      width: 100%;
      justify-content: center;
    }
    @container (min-width: 500px) and (max-width: 920px) {
      .dsh-acts {
        flex-direction: row;
        max-width: 400px;
        gap: 12px;
      }
      .dsh-acts button {
        flex: 1;
      }
    }
    .dsh-card {
      position: relative;
      left: auto;
      top: auto;
      width: 100%;
      max-width: 360px;
      margin-top: 16px;
    }
    .dsh-strip {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dsh-track, .dsh-dot, .dsh-dot i, .dsh-th .dsh-btn, .dsh-th img {
      transition: none !important;
    }
  }
`;

export default function DishOrbitCarousel({
  items,
  height = "600px",
  loop = true,
  autoplay = true,
  autoplayInterval = 4000,
  onQuickView,
  className,
}: DishOrbitCarouselProps) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<"overview" | "details">("overview");
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resetTick, setResetTick] = useState(0);

  const resetAutoplay = useCallback(() => {
    setResetTick((t) => t + 1);
  }, []);

  const styleId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const orbits = useRef<(HTMLDivElement | null)[]>([]);
  const heads = useRef<(HTMLDivElement | null)[]>([]);
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const arcRef = useRef<SVGPathElement | null>(null);
  const arc = useRef({ a0: 0, a1: 0 });
  const shown = useRef(-1);
  const dirRef = useRef<1 | -1>(1);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reducedRef = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const { addToCart, getItemQuantity } = useCart();

  // Responsive scale factor for desktop (w > 920)
  useIsomorphicLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      if (w <= 920) {
        el.style.setProperty("--dsh-s", "1");
      } else {
        const s = Math.min((w - 32) / 1060, 1.15);
        el.style.setProperty("--dsh-s", String(Math.max(0.85, s)));
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reduced motion preference listener
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      reducedRef.current = mq.matches;
      setReducedMotion(mq.matches);
    };
    updateMotion();
    mq.addEventListener("change", updateMotion);
    return () => mq.removeEventListener("change", updateMotion);
  }, []);

  // Document visibility listener (pause autoplay when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Hover & Focus listeners on root container to reliably pause/resume autoplay
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onEnter = () => setIsHovered(true);
    const onLeave = () => setIsHovered(false);
    const onFocusIn = () => setIsFocused(true);
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node)) {
        setIsFocused(false);
      }
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // GSAP Orbit swap animation
  useIsomorphicLayoutEffect(() => {
    if (n === 0) return;
    const from = shown.current;
    const to = index;

    const parts = (i: number) => {
      const head = heads.current[i];
      return {
        orbit: orbits.current[i],
        head,
        eye: head ? head.querySelector(".dsh-eye") : null,
        t1: head ? head.querySelector(".dsh-t1") : null,
        t2: head ? head.querySelector(".dsh-t2") : null,
        body: bodies.current[i],
      };
    };

    const drawArc = () => {
      arcRef.current?.setAttribute(
        "d",
        arcPath(arc.current.a0, arc.current.a1, ORBIT_X, ORBIT_Y, ORBIT_R, 118)
      );
    };

    const rest = arcRest(to);
    const tint = items[to] ? items[to].accent : "#1F5A43";

    if (tlRef.current) tlRef.current.progress(1).kill();
    const b = parts(to);

    // Initial mount or reduced motion
    if (from === -1 || from === to || reducedRef.current) {
      for (let i = 0; i < n; i++) {
        if (i !== to) {
          const p = parts(i);
          gsap.set([p.orbit, p.head, p.body], { autoAlpha: 0 });
        }
      }
      gsap.set([b.orbit, b.head, b.body, b.eye], { autoAlpha: 1, rotation: 0, y: 0 });
      gsap.set(b.t1, { clipPath: SHOW });
      gsap.set(b.t2, { clipPath: SHOW });
      arc.current.a0 = rest[0];
      arc.current.a1 = rest[1];
      drawArc();
      if (arcRef.current) gsap.set(arcRef.current, { fill: tint });
      shown.current = to;
      return;
    }

    const a = parts(from);
    const d = dirRef.current;
    const tl = gsap.timeline({
      onComplete: () => {
        tlRef.current = null;
      },
    });
    tlRef.current = tl;

    // Plate orbital swing
    tl.to(a.orbit, { rotation: SWING * d, duration: 0.62, ease: "power2.in" }, 0)
      .set(a.orbit, { autoAlpha: 0, rotation: 0 }, 0.62)
      .fromTo(
        b.orbit,
        { autoAlpha: 1, rotation: -SWING * d },
        { rotation: 0, duration: 0.95, ease: "power3.out" },
        0.3
      );

    // Title wipe
    tl.to(a.t1, { clipPath: HIDE_1, duration: 0.42, ease: "power2.in" }, 0)
      .to(a.t2, { clipPath: HIDE_2, duration: 0.42, ease: "power2.in" }, 0.06)
      .to(a.eye, { autoAlpha: 0, duration: 0.25 }, 0)
      .set(a.head, { autoAlpha: 0 }, 0.5)
      .set(b.head, { autoAlpha: 1 }, 0.5)
      .fromTo(
        b.eye,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
        0.55
      )
      .fromTo(b.t1, { clipPath: HIDE_1 }, { clipPath: SHOW, duration: 0.7, ease: "power3.out" }, 0.55)
      .fromTo(b.t2, { clipPath: HIDE_2 }, { clipPath: SHOW, duration: 0.7, ease: "power3.out" }, 0.62);

    // Details Card cross-fade and stagger
    tl.to(a.body, { autoAlpha: 0, y: -6, duration: 0.3, ease: "power1.in" }, 0.05)
      .set(b.body, { autoAlpha: 1, y: 0 }, 0.4);
    if (b.body) {
      tl.fromTo(
        b.body.children,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power2.out" },
        0.4
      );
    }

    // Arc stretch and color morph
    tl.to(
      arc.current,
      { a0: ARC_SWEEP[0], a1: ARC_SWEEP[1], duration: 0.6, ease: "power2.inOut", onUpdate: drawArc },
      0
    ).to(
      arc.current,
      { a0: rest[0], a1: rest[1], duration: 0.85, ease: "power3.out", onUpdate: drawArc },
      0.6
    );
    if (arcRef.current) {
      tl.to(arcRef.current, { fill: tint, duration: 1.1, ease: "power1.inOut" }, 0.1);
    }

    shown.current = to;
  }, [index, n, items]);

  useEffect(() => {
    return () => {
      tlRef.current?.kill();
    };
  }, []);

  const go = useCallback(
    (to: number, dir?: 1 | -1) => {
      resetAutoplay();
      if (n < 2) return;
      const next = wrapIndex(to, n);
      if (next === index) return;
      dirRef.current = dir ?? stepDirection(index, next, n);
      setIndex(next);
    },
    [index, n, resetAutoplay]
  );

  const step = useCallback(
    (d: 1 | -1) => {
      go(index + d, d);
    },
    [go, index]
  );

  // Autoplay rotation: automatically advances every autoplayInterval (default 4000ms)
  // Pauses on hover, focus, reduced motion, or tab hidden. Loops sequentially back to start.
  useEffect(() => {
    if (!autoplay || n < 2 || isHovered || isFocused || reducedMotion || !isVisible) {
      return;
    }
    if (!loop && index >= n - 1) {
      return;
    }

    const timer = setTimeout(() => {
      const next = wrapIndex(index + 1, n);
      dirRef.current = 1;
      setIndex(next);
    }, autoplayInterval);

    return () => {
      clearTimeout(timer);
    };
  }, [
    autoplay,
    autoplayInterval,
    index,
    isHovered,
    isFocused,
    reducedMotion,
    isVisible,
    n,
    loop,
    resetTick,
  ]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    resetAutoplay();
    setIsHovered(true);
    swipe.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsHovered(false);
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.4) {
      step(dx < 0 ? 1 : -1);
    }
  };

  if (n === 0) return null;

  const currentItem = items[index];
  const start = stripStart(index, n, VISIBLE);
  const cartQty = currentItem ? getItemQuantity(currentItem.product.id) : 0;
  const isOutOfStock = currentItem ? currentItem.stock <= 0 : false;

  return (
    <div
      ref={rootRef}
      className={`dsh-root ${className || ""}`}
      style={{ minHeight: height }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Groceries Carousel"
      tabIndex={0}
      data-hovered={isHovered ? "true" : "false"}
      data-focused={isFocused ? "true" : "false"}
      data-index={index}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
    >
      <style key={styleId}>{CSS_STYLES}</style>

      <div className="dsh-canvas">
        {/* Orbital SVG Arc */}
        <svg className="dsh-arc" viewBox="0 0 1060 520" aria-hidden="true">
          <path ref={arcRef} style={{ opacity: 0.32 }} />
        </svg>

        {/* Pager Indicator Dots */}
        <div className="dsh-pager" role="tablist" aria-label="Select grocery">
          {items.map((it, i) => (
            <button
              key={it.product.id}
              type="button"
              role="tab"
              className="dsh-btn dsh-dot"
              aria-selected={i === index}
              aria-current={i === index ? "true" : undefined}
              aria-label={it.subtitle}
              onClick={() => go(i)}
            >
              <i />
            </button>
          ))}
        </div>

        {/* Orbiting Plates */}
        <div
          className="dsh-plates"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipe.current = null;
            setIsHovered(false);
          }}
        >
          {items.map((it, i) => (
            <div
              key={it.product.id}
              ref={(el) => {
                orbits.current[i] = el;
              }}
              className="dsh-orbit"
              aria-hidden={i !== index}
            >
              <img
                src={it.image}
                alt={it.alt || it.subtitle}
                width={250}
                height={250}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Wipe-in Headlines */}
        <div className="dsh-head" aria-live="polite">
          {items.map((it, i) => (
            <div
              key={it.product.id}
              ref={(el) => {
                heads.current[i] = el;
              }}
              className="dsh-hd"
              aria-hidden={i !== index}
            >
              <p className="dsh-eye">Seasonal Spotlight • #{i + 1}</p>
              <h2 style={{ margin: 0, font: "inherit" }}>
                <span
                  className="dsh-t1"
                  style={{
                    fontSize: fitSize(it.title.length, 34, 370, 0.54) + "px",
                  }}
                >
                  {it.title}
                </span>
                <span
                  className="dsh-t2"
                  style={{
                    fontSize: fitSize(it.subtitle.length, 44, 370, 0.62) + "px",
                  }}
                >
                  {it.subtitle}
                </span>
              </h2>
            </div>
          ))}
        </div>

        {/* Direct Cart and View Actions */}
        <div className="dsh-acts">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => {
              resetAutoplay();
              if (currentItem) {
                addToCart(currentItem.product);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap ${
              isOutOfStock
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-[#1F5A43] hover:bg-[#174533] text-white hover:shadow-md"
            }`}
          >
            <span>
              {isOutOfStock
                ? "Out of Stock"
                : `Add to Cart — ₹${currentItem.price.toFixed(2)}`}
            </span>
            {cartQty > 0 && (
              <span className="bg-[#174533] text-emerald-200 text-xs px-2 py-0.5 rounded-full font-mono">
                {cartQty} in cart
              </span>
            )}
          </button>

          {onQuickView && currentItem && (
            <button
              type="button"
              onClick={() => {
                resetAutoplay();
                onQuickView(currentItem.product);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <IconSearch className="w-3.5 h-3.5 text-gray-500" />
              <span>Quick View</span>
            </button>
          )}
        </div>

        {/* Details Card */}
        <div className="dsh-card">
          <div className="dsh-tabs" role="tablist" aria-label="Product tabs">
            <button
              type="button"
              role="tab"
              className="dsh-btn dsh-tab"
              aria-selected={tab === "overview"}
              onClick={() => {
                resetAutoplay();
                setTab("overview");
              }}
            >
              Overview
            </button>
            <button
              type="button"
              role="tab"
              className="dsh-btn dsh-tab"
              aria-selected={tab === "details"}
              onClick={() => {
                resetAutoplay();
                setTab("details");
              }}
            >
              Specs
            </button>
          </div>

          <div className="dsh-bodies">
            {items.map((it, i) => (
              <div
                key={it.product.id}
                ref={(el) => {
                  bodies.current[i] = el;
                }}
                className="dsh-body"
                aria-hidden={i !== index}
              >
                <div className="dsh-price-badge">
                  <span>₹{it.price.toFixed(2)}</span>
                  <span className="dsh-unit-label">/ {it.unit}</span>
                </div>

                <p className="dsh-meta-name">{it.subtitle}</p>
                <p className="dsh-meta-cat">{it.category}</p>

                {tab === "overview" ? (
                  <p className="dsh-desc">
                    {it.description || "Farm-fresh quality grocery, delivered direct to your kitchen table."}
                  </p>
                ) : (
                  <ul className="dsh-spec-list">
                    <li className="dsh-spec-item">
                      <span className="dsh-spec-label">Unit</span>
                      <span className="dsh-spec-val">{it.unit}</span>
                    </li>
                    <li className="dsh-spec-item">
                      <span className="dsh-spec-label">Stock</span>
                      <span className="dsh-spec-val font-mono">{it.stock} units</span>
                    </li>
                    <li className="dsh-spec-item">
                      <span className="dsh-spec-label">Category</span>
                      <span className="dsh-spec-val">{it.category}</span>
                    </li>
                  </ul>
                )}

                <div className="dsh-stock-status">
                  <span
                    className="dsh-stock-dot"
                    style={{ background: it.stock > 0 ? "#1F5A43" : "#C53030" }}
                  />
                  <span style={{ color: it.stock > 0 ? "#1F5A43" : "#C53030" }}>
                    {it.stock > 0 ? `${it.stock} available in inventory` : "Currently sold out"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="dsh-strip">
          <button
            type="button"
            className="dsh-btn dsh-arrow"
            aria-label="Previous grocery item"
            onClick={() => step(-1)}
          >
            <svg viewBox="0 0 12 16" aria-hidden="true">
              <path d="M11 0v16L0 8z" />
            </svg>
          </button>

          <div className="dsh-win">
            <div
              className="dsh-track"
              style={{ transform: `translateX(${-start * ITEM}px)` }}
            >
              {items.map((it, i) => (
                <div key={it.product.id} className="dsh-th">
                  <button
                    type="button"
                    className="dsh-btn"
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => go(i)}
                  >
                    <img
                      src={it.image}
                      alt=""
                      width={52}
                      height={52}
                      draggable={false}
                    />
                    <span>{it.label}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="dsh-btn dsh-arrow"
            aria-label="Next grocery item"
            onClick={() => step(1)}
          >
            <svg viewBox="0 0 12 16" aria-hidden="true">
              <path d="M1 0v16l11-8z" />
            </svg>
          </button>
        </div>
      </div>

      <p className="dsh-sr" aria-live="polite">
        {currentItem
          ? `Product ${index + 1} of ${n}: ${currentItem.title} ${currentItem.subtitle}`
          : ""}
      </p>
    </div>
  );
}
