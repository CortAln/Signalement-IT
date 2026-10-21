"use client";

import { useEffect } from "react";

const QUEUE_KEY = "sit_offline_queue";

type QueuedReport = Record<string, unknown> & { queuedAt: number };

export function readQueue(): QueuedReport[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function enqueueReport(payload: Record<string, unknown>) {
  const queue = readQueue();
  queue.push({ ...payload, queuedAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Tente de vider la file d'attente hors-ligne. Retourne le nombre d'envois réussis. */
export async function flushQueue(): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;
  const remaining: QueuedReport[] = [];
  let sent = 0;
  for (const item of queue) {
    const { queuedAt, ...payload } = item;
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) sent++;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return sent;
}

/**
 * Enregistre le service worker (PWA installable) et rejoue la file
 * d'attente des signalements dès que la connexion revient.
 */
export default function PwaClient() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onOnline = () => {
      flushQueue().then((n) => {
        if (n > 0 && "vibrate" in navigator) navigator.vibrate?.(80);
      });
    };
    window.addEventListener("online", onOnline);
    // Tentative de flush au chargement (cas d'un envoi mis en file puis app fermée)
    if (navigator.onLine) flushQueue().catch(() => {});
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
