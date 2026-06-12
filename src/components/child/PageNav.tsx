/**
 * Page navigation: a compact top-bar cluster (prev, dots, next) so the
 * worksheet itself stays untouched chrome-free. Icon-only, 56px+ targets,
 * arrows disabled at the ends; the dots show where you are without text.
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
    <div className="page-nav">
      <button
        type="button"
        className="top-button"
        aria-label="previous page"
        disabled={currentPage <= 1}
        onClick={() => onNavigate(currentPage - 1)}
      >
        <ChevronLeft aria-hidden />
      </button>
      {pageCount <= MAX_DOTS && (
        <div className="page-nav__dots" aria-hidden>
          {Array.from({ length: pageCount }, (_, i) => (
            <span
              key={i}
              className={`page-nav__dot${i + 1 === currentPage ? ' page-nav__dot--active' : ''}`}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        className="top-button"
        aria-label="next page"
        disabled={currentPage >= pageCount}
        onClick={() => onNavigate(currentPage + 1)}
      >
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}
