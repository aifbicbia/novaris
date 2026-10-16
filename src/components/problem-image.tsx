"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";

// The server resolves metadata for this one image. Audit datasets never cross
// this boundary; attribution arrives as already-rendered server content.
export function ProblemImage({
  src,
  alt,
  width,
  height,
  sourceUrl,
  children,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sourceUrl: string;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !src.trim()) {
    return (
      <span className="figure-unavailable" role="status">
        <span className="font-semibold">Figure unavailable</span>
        <span>{alt || "The source image"} could not be loaded.</span>
        <a
          href={sourceUrl.trim() || "#sources"}
          target={sourceUrl.trim() ? "_blank" : undefined}
          rel={sourceUrl.trim() ? "noopener noreferrer" : undefined}
          className="text-link"
        >
          Open the source reference ↗
        </a>
        <span>
          Use the statement source below if the image host is unavailable.
        </span>
      </span>
    );
  }
  return (
    <span className="problem-figure">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open full-size image: ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="h-auto w-auto max-w-full bg-paper"
          style={width ? { width } : undefined}
          loading="lazy"
          decoding="async"
          ref={(image) => {
            // A failed cached request may complete before React hydration.
            if (image?.complete && image.naturalWidth === 0) setFailed(true);
          }}
          onError={() => setFailed(true)}
        />
        <span className="text-link text-xs">View full-size image ↗</span>
      </a>
      {children}
    </span>
  );
}
