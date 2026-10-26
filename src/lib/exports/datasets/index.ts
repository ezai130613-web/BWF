import { MEMBERSHIP_DATASETS } from "./membership";
import { MEETING_DATASETS } from "./meetings";
import { PAYMENT_DATASETS } from "./payments";
import { VISITOR_DATASETS } from "./visitors";
import { ACTIVITY_DATASETS } from "./activity";
import { WEBSITE_DATASETS } from "./website";
import type { ExportDataset } from "./types";

export type { ExportDataset } from "./types";

/** Every admin download, in "Download all data" sheet order. Served at /api/admin/exports/<key>. */
export const EXPORT_DATASETS: ExportDataset[] = [
  ...MEMBERSHIP_DATASETS,
  ...MEETING_DATASETS,
  ...PAYMENT_DATASETS,
  ...VISITOR_DATASETS,
  ...ACTIVITY_DATASETS,
  ...WEBSITE_DATASETS,
];

export function findExportDataset(key: string): ExportDataset | undefined {
  return EXPORT_DATASETS.find((d) => d.key === key);
}
