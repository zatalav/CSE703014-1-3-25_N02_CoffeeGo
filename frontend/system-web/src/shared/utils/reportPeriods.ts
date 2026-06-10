export type ReportPeriod = "today" | "week" | "month" | "quarter" | "year";

export const rollingReportPeriods: Array<{ id: ReportPeriod; label: string }> = [
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "7 ngày" },
  { id: "month", label: "30 ngày" },
];

export const reportPeriodLabels: Record<ReportPeriod, string> = {
  today: "Hôm nay",
  week: "7 ngày",
  month: "30 ngày",
  quarter: "Quý",
  year: "Năm",
};

const periodDays: Record<ReportPeriod, number> = {
  today: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

export type DateRange = {
  fromDate: string;
  toDate: string;
  days: number;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function rangeForPeriod(period: ReportPeriod, now = new Date()): DateRange {
  const days = periodDays[period];
  const to = startOfDay(now);
  const from = addDays(to, -(days - 1));
  return {
    fromDate: formatDateParam(from),
    toDate: formatDateParam(to),
    days,
  };
}

export function queryForPeriod(period: ReportPeriod) {
  const range = rangeForPeriod(period);
  return `fromDate=${range.fromDate}&toDate=${range.toDate}`;
}

export function parseReportDate(value?: string | null) {
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const vietnamese = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vietnamese) {
    return new Date(Number(vietnamese[3]), Number(vietnamese[2]) - 1, Number(vietnamese[1]));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isDateInRange(value: string | null | undefined, range: DateRange) {
  const date = parseReportDate(value);
  if (!date) return false;
  const day = startOfDay(date).getTime();
  const from = parseReportDate(range.fromDate)?.getTime() ?? 0;
  const to = parseReportDate(range.toDate)?.getTime() ?? 0;
  return day >= from && day <= to;
}

export function periodTitle(period: ReportPeriod) {
  if (period === "today") return "hôm nay";
  if (period === "week") return "7 ngày gần nhất";
  if (period === "month") return "30 ngày gần nhất";
  if (period === "quarter") return "90 ngày gần nhất";
  return "365 ngày gần nhất";
}
