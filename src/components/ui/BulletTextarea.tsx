"use client";

import { useRef } from "react";
import { List } from "lucide-react";
import { Textarea } from "@/components/ui/Input";

const BULLET = "• ";

export function BulletTextarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function setValueAndCursor(newValue: string, cursor: number) {
    onChange(newValue);
    requestAnimationFrame(() => ref.current?.setSelectionRange(cursor, cursor));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;
    const cursor = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;

    if (e.key === "Enter") {
      const lineEnd = value.indexOf("\n", cursor);
      const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
      if (!currentLine.startsWith(BULLET)) return;

      e.preventDefault();
      if (currentLine.trim() === BULLET.trim()) {
        // Empty bullet — exit the list instead of adding another one.
        setValueAndCursor(value.slice(0, lineStart) + value.slice(cursor), lineStart);
      } else {
        const insertion = "\n" + BULLET;
        setValueAndCursor(value.slice(0, cursor) + insertion + value.slice(cursor), cursor + insertion.length);
      }
      return;
    }

    if (e.key === "Backspace" && value.slice(lineStart, cursor) === BULLET) {
      e.preventDefault();
      setValueAndCursor(value.slice(0, lineStart) + value.slice(cursor), lineStart);
    }
  }

  function insertBullet() {
    const el = ref.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    const needsNewline = cursor > lineStart && value.slice(lineStart, cursor).trim().length > 0;
    const insertion = (needsNewline ? "\n" : "") + BULLET;
    setValueAndCursor(value.slice(0, cursor) + insertion + value.slice(cursor), cursor + insertion.length);
    el.focus();
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pr-9 resize-y min-h-[4.5rem]"
      />
      <button
        type="button"
        onClick={insertBullet}
        title="Add bullet point"
        className="absolute top-2 right-2 text-togo-faint hover:text-togo-blue transition-colors"
      >
        <List size={14} />
      </button>
    </div>
  );
}
