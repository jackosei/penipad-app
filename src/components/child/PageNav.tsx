/**
 * Page navigation arrows. Icon-only, 56px+ targets, disabled at the ends.
 * Page position is conveyed by dots (visual, not text) so a pre-reader can
 * see where they are in the book.
 */
import type { JSX } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PageNavProps = {
  currentPage: number;
  pageCount: number;
  onNavigate: (pageNumber: number) => void;
};

const MAX_DOTS = 12;

export function PageNav({ currentPage, pageCount, onNavigate }: PageNavProps): JSX.Element | null {
  if (pageCount <= 1) return null;

  return (
    <>
      <button
        type="button"
        className="page-nav page-nav--prev"
        aria-label="previous page"
        disabled={currentPage <= 1}
        onClick={() => onNavigate(currentPage - 1)}
      >
        <ChevronLeft aria-hidden />
      </button>
      <button
        type="button"
        className="page-nav page-nav--next"
        aria-label="next page"
        disabled={currentPage >= pageCount}
        onClick={() => onNavigate(currentPage + 1)}
      >
        <ChevronRight aria-hidden />
      </button>
      {pageCount <= MAX_DOTS && (
        <div className="page-dots" aria-hidden>
          {Array.from({ length: pageCount }, (_, i) => (
            <span
              key={i}
              className={`page-dots__dot${i + 1 === currentPage ? ' page-dots__dot--active' : ''}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
