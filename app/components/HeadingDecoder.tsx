"use client";

import { useEffect } from "react";

/**
 * "Decrypts" page headings: each h1/h2 in .wrap scrambles through random
 * glyphs and resolves left-to-right into its real text. Runs on first load
 * and whenever the router swaps in new headings (MutationObserver).
 *
 * Only text nodes' nodeValue is touched — the nodes React owns stay in
 * place, so later React updates still land on the live DOM.
 */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/\\=";
const SELECTOR = ".wrap h1, .wrap h2";
const SKIP = ".print-only, .od-title";

export default function HeadingDecoder() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const done = new WeakSet<Element>();
    const frames = new Set<number>();
    // text nodes mid-scramble → their real text, so cleanup can restore them
    const pending = new Map<Text, string>();

    function decode(el: Element, delay: number) {
      if (done.has(el) || el.closest(SKIP)) return;
      done.add(el);

      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes: { node: Text; text: string }[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.nodeValue?.trim()) nodes.push({ node, text: node.nodeValue });
      }
      const total = nodes.reduce((n, x) => n + x.text.length, 0);
      if (!total) return;
      for (const { node, text } of nodes) pending.set(node, text);

      const duration = Math.min(900, 280 + total * 22);
      let start = 0;

      const tick = (now: number) => {
        if (!start) start = now + delay;
        const p = Math.max(0, Math.min(1, (now - start) / duration));
        let revealed = Math.floor(p * total);
        for (const { node, text } of nodes) {
          let out = "";
          for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (revealed > 0 || ch === " ") out += ch;
            else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
            revealed--;
          }
          node.nodeValue = out;
        }
        if (p < 1) {
          frames.add(requestAnimationFrame(tick));
        } else {
          for (const { node, text } of nodes) {
            node.nodeValue = text;
            pending.delete(node);
          }
        }
      };
      frames.add(requestAnimationFrame(tick));
    }

    function scan(root: ParentNode) {
      root.querySelectorAll(SELECTOR).forEach((el, i) => decode(el, i * 90));
    }

    scan(document);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(SELECTOR)) decode(n, 0);
          scan(n);
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      frames.forEach((id) => cancelAnimationFrame(id));
      pending.forEach((text, node) => (node.nodeValue = text));
    };
  }, []);

  return null;
}
