import { blanket } from "../access";
import { parsePendingFilters, parseUnpaidFilters, pendingItemsReport, unpaidReport } from "@/lib/accounts/reports";
import type { ExportDataset } from "./types";

/** 2026-11-17 — Accounts reports. Both honour the page's chapter + from/to filters. */
const unpaidMembers: ExportDataset = {
  key: "unpaid-members",
  title: "Unpaid Members",
  skipInAll: true,
  scope: (a) => blanket(a, "accounts:view"),
  async load(_scope, params) {
    const r = await unpaidReport(
      parseUnpaidFilters({ chapterId: params.get("chapterId"), month: params.get("month"), from: params.get("from"), to: params.get("to"), pending: params.get("pending") }),
    );
    return [{ name: r.sheetName, columns: r.columns, rows: r.rows }];
  },
};

const pendingItems: ExportDataset = {
  key: "pending-items",
  title: "Pending Points",
  skipInAll: true,
  scope: (a) => blanket(a, "accounts:view"),
  async load(_scope, params) {
    const r = await pendingItemsReport(
      parsePendingFilters({ chapterId: params.get("chapterId"), assignedTo: params.get("assignedTo"), from: params.get("from"), to: params.get("to"), status: params.get("status") }),
    );
    return [{ name: r.sheetName, columns: r.columns, rows: r.rows }];
  },
};

export const ACCOUNTS_REPORT_DATASETS: ExportDataset[] = [unpaidMembers, pendingItems];
