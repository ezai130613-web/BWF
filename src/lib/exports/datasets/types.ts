import type { ExportAccess, ExportScope } from "../access";
import type { ExportSheet } from "../workbook";

/**
 * One downloadable dataset — usually one admin page. `scope` decides who may
 * download it (and how far: all chapters or one); `load` builds the sheets,
 * honouring the page's own filters from the query string. Loaders must
 * apply `scope` to every query themselves — never trust a chapterId from
 * the query string without effectiveChapterId().
 */
export type ExportDataset = {
  key: string;
  /** Used for the file name and the "Download all data" workbook. */
  title: string;
  scope: (access: ExportAccess) => ExportScope | null;
  load: (scope: ExportScope, params: URLSearchParams) => Promise<ExportSheet[]>;
  /** Left out of "Download all data" (e.g. per-record drill-downs). Default: included. */
  skipInAll?: boolean;
};
