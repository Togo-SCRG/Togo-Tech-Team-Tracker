"use client";

import { useEffect, useState } from "react";

function loadOrder(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function mergeOrder<T>(items: T[], getId: (item: T) => string, order: string[]): T[] {
  const remaining = new Map(items.map((item) => [getId(item), item]));
  const result: T[] = [];
  for (const id of order) {
    const item = remaining.get(id);
    if (item) {
      result.push(item);
      remaining.delete(id);
    }
  }
  // anything not in the saved order (new rows) keeps its natural position, appended at the end
  for (const item of items) {
    if (remaining.has(getId(item))) result.push(item);
  }
  return result;
}

// Lets a user drag rows into whatever order makes sense to them. Purely a
// local display preference (localStorage) — not shared with anyone else,
// and never sent to the server.
export function useDragReorder<T>(items: T[], getId: (item: T) => string, storageKey: string) {
  const [order, setOrder] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setOrder(loadOrder(storageKey));
  }, [storageKey]);

  const ordered = mergeOrder(items, getId, order);

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = ordered.map(getId);
    const withoutDragged = ids.filter((id) => id !== fromId);
    const targetIndex = withoutDragged.indexOf(toId);
    if (targetIndex === -1) return;
    withoutDragged.splice(targetIndex, 0, fromId);
    setOrder(withoutDragged);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(withoutDragged));
    } catch {
      // ignore — reordering just won't persist across visits
    }
  }

  function dragHandleProps(id: string) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
      },
      onDragEnd: () => setDraggedId(null),
    };
  }

  function dropTargetProps(id: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData("text/plain") || draggedId;
        if (fromId) reorder(fromId, id);
      },
    };
  }

  return { ordered, dragHandleProps, dropTargetProps, draggedId };
}
