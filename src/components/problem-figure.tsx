import "server-only";
import { ProblemImage } from "@/components/problem-image";
import figureNotes from "@/data/figure-notices.json";
import figureRecords from "@/data/problem-figures.json";
import imageDimensions from "@/data/image-assets.json";
import pendingRecords from "@/data/figure-review-pending.json";

const textOnlyFigures = new Set(figureNotes);
const figures = new Map(figureRecords.map((figure) => [figure.src, figure]));
const dimensions: Record<string, { width: number; height: number }> =
  imageDimensions;
const pending = new Map(
  (
    pendingRecords as Array<{
      src: string;
      reason: string;
      sourceUrl: string;
      heading: string;
    }>
  ).map((entry) => [entry.src, entry]),
);

export function ProblemFigure({ src, alt }: { src: string; alt: string }) {
  const figure = figures.get(src);
  const size = dimensions[src];
  const review = pending.get(src);
  const description = figure?.alt ?? alt;
  if (review) {
    return (
      <span
        className="figure-unavailable"
        role="note"
        data-figure-review-src={src}
      >
        <span className="font-semibold">{review.heading}</span>
        <span>{review.reason}</span>
        <a
          href={review.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          Open the original statement ↗
        </a>
      </span>
    );
  }
  if (textOnlyFigures.has(src)) {
    return (
      <span
        className="figure-unavailable"
        role="note"
        data-figure-note-src={src}
      >
        <span className="font-semibold">
          View the original diagram at its source
        </span>
        <span>
          This archived image contains a text-only note. Use the statement
          source below to see the original diagram before attempting the
          problem.
        </span>
        <a href="#sources" className="text-link">
          Go to source references ↓
        </a>
      </span>
    );
  }
  if (!src.trim()) {
    return (
      <span className="figure-unavailable" role="note">
        <span className="font-semibold">Figure unavailable</span>
        <span>The statement does not provide a usable image address.</span>
        <a href="#sources" className="text-link">
          Go to source references ↓
        </a>
      </span>
    );
  }
  return (
    <ProblemImage
      key={src}
      src={src}
      alt={description}
      width={size?.width}
      height={size?.height}
      sourceUrl={figure?.sourceUrl ?? src}
    >
      {figure && (
        <span className="problem-figure-credit">
          {figure.credit}{" "}
          <a
            href={figure.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Source &amp; attribution ↗
          </a>
        </span>
      )}
    </ProblemImage>
  );
}
