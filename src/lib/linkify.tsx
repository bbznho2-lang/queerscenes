import React from "react";

const URL_REGEX = /(\bhttps?:\/\/[^\s<]+[^\s<.,:;!?)\]'"])/gi;

/**
 * Splits text into nodes, converting URLs into clickable anchor tags.
 * Preserves line breaks via whitespace-pre-wrap on the container.
 */
export function linkify(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary hover:text-primary/80 break-all"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
