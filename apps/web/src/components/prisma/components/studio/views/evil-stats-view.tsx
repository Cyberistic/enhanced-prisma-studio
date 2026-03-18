import type { Adapter } from "@enhanced-prisma-studio/studio-core/data";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "../../error-boundary";
import { StudioHeader } from "../studio-header";

type IntrospectionResult = Exclude<Awaited<ReturnType<Adapter["introspect"]>>[1], undefined>;
type SchemaTables = IntrospectionResult["schemas"][string]["tables"];
type SchemaTable = SchemaTables[string];

// pie = donut | pie-full = filled pie | bar = vertical columns | bar-h = horizontal bars
// radial = radial bar arcs | radar = spider/radar | line = line chart
type ChartType = "pie" | "pie-full" | "bar" | "bar-h" | "radial" | "radar" | "line";
type ChartMode = "distribution" | "top-related" | "time-series";

type ChartProps = {
  adapter: Adapter;
  schemaTables: SchemaTables;
  type: ChartType;
  table: string;
  column: string;
  title: string;
  limit?: number;
  mode?: ChartMode;
  relationLabelColumn?: string;
  timeBucket?: "day" | "month";
};

type ChartDatum = {
  label: string;
  value: number;
  fill: string;
};

type ChartQueryPlan =
  | {
      sql: string;
    }
  | {
      error: string;
    };

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function normalizeIdentifier(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveIdentifier(requested: string, available: readonly string[]) {
  if (available.includes(requested)) {
    return requested;
  }

  const lowerRequested = requested.toLowerCase();
  const caseInsensitiveMatch = available.find(
    (candidate) => candidate.toLowerCase() === lowerRequested,
  );

  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  const normalized = normalizeIdentifier(requested);
  const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
  const plural = normalized.endsWith("s") ? normalized : `${normalized}s`;
  const normalizedCandidates = new Set([normalized, singular, plural]);

  const normalizedMatch = available.find((candidate) => {
    return normalizedCandidates.has(normalizeIdentifier(candidate));
  });

  return normalizedMatch ?? null;
}

function resolveTableName(schemaTables: SchemaTables, tableName: string) {
  return resolveIdentifier(tableName, Object.keys(schemaTables));
}

function resolveColumnName(schemaTable: SchemaTable, columnName: string) {
  return resolveIdentifier(columnName, Object.keys(schemaTable.columns));
}

function getSafeLimit(limit: number | undefined, fallback: number) {
  if (!Number.isFinite(limit)) {
    return fallback;
  }

  return Math.max(1, Math.min(50, Math.round(limit ?? fallback)));
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toDisplayLabel(value: unknown) {
  if (value == null) {
    return "(null)";
  }

  const raw = String(value);
  const normalized = raw.trim().toLowerCase();

  if (normalized === "1" || normalized === "true") {
    return "true";
  }

  if (normalized === "0" || normalized === "false") {
    return "false";
  }

  return raw.length > 0 ? raw : "(empty)";
}

function normalizeData(rows: Record<string, unknown>[]) {
  const groupedValues = new Map<string, number>();

  for (const row of rows) {
    const value = toNumber(row.value);
    if (value == null) {
      continue;
    }

    const label = toDisplayLabel(row.label);
    groupedValues.set(label, (groupedValues.get(label) ?? 0) + value);
  }

  return Array.from(groupedValues.entries()).map(([label, value], index) => ({
    fill: CHART_COLORS[index % CHART_COLORS.length],
    label,
    value,
  }));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildQueryPlan(props: Omit<ChartProps, "adapter">): ChartQueryPlan {
  const {
    column,
    limit,
    mode = "distribution",
    relationLabelColumn,
    schemaTables,
    table,
    timeBucket = "day",
  } = props;
  const resolvedTableName = resolveTableName(schemaTables, table);

  if (!resolvedTableName) {
    return { error: `Table "${table}" was not found in the current schema.` };
  }

  const resolvedTable = schemaTables[resolvedTableName];
  if (!resolvedTable) {
    return { error: `Table "${table}" metadata is unavailable.` };
  }

  const resolvedColumnName = resolveColumnName(resolvedTable, column);
  if (!resolvedColumnName) {
    return {
      error: `Column "${column}" was not found on table "${resolvedTableName}".`,
    };
  }

  const quotedTable = quoteIdentifier(resolvedTableName);
  const quotedColumn = quoteIdentifier(resolvedColumnName);

  if (mode === "top-related") {
    const sourceColumn = resolvedTable.columns[resolvedColumnName];
    const fkTable = sourceColumn?.fkTable;
    const fkColumn = sourceColumn?.fkColumn;

    if (!fkTable || !fkColumn) {
      return {
        error: `Column "${resolvedColumnName}" is not a relation column and cannot build related stats.`,
      };
    }

    const resolvedForeignTableName = resolveTableName(schemaTables, fkTable);
    if (!resolvedForeignTableName) {
      return {
        error: `Related table "${fkTable}" was not found in the current schema.`,
      };
    }

    const foreignTable = schemaTables[resolvedForeignTableName];
    if (!foreignTable) {
      return {
        error: `Related table "${resolvedForeignTableName}" metadata is unavailable.`,
      };
    }

    const relatedLabelCandidate = relationLabelColumn ?? "name";
    const resolvedRelatedLabelColumn =
      resolveColumnName(foreignTable, relatedLabelCandidate) ??
      resolveColumnName(foreignTable, fkColumn) ??
      fkColumn;
    const quotedRelatedLabelColumn = quoteIdentifier(resolvedRelatedLabelColumn);
    const quotedForeignTable = quoteIdentifier(resolvedForeignTableName);
    const quotedForeignColumn = quoteIdentifier(fkColumn);
    const safeLimit = getSafeLimit(limit, 5);

    return {
      sql: `select coalesce(cast(related.${quotedRelatedLabelColumn} as text), cast(source.${quotedColumn} as text), '(null)') as label, count(*) as value from ${quotedTable} source left join ${quotedForeignTable} related on source.${quotedColumn} = related.${quotedForeignColumn} group by 1 order by value desc limit ${safeLimit};`,
    };
  }

  if (mode === "time-series") {
    const safeLimit = getSafeLimit(limit, 14);
    const datePattern = timeBucket === "month" ? "%Y-%m" : "%Y-%m-%d";

    return {
      sql: `select coalesce(strftime('${datePattern}', ${quotedColumn}), '(unknown)') as label, count(*) as value from ${quotedTable} where ${quotedColumn} is not null group by 1 order by 1 asc limit ${safeLimit};`,
    };
  }

  const safeLimit = getSafeLimit(limit, 10);

  return {
    sql: `select coalesce(cast(${quotedColumn} as text), '(null)') as label, count(*) as value from ${quotedTable} group by 1 order by value desc limit ${safeLimit};`,
  };
}

function Chart(props: ChartProps) {
  const {
    adapter,
    column,
    limit,
    mode,
    relationLabelColumn,
    schemaTables,
    table,
    timeBucket,
    title,
    type,
  } = props;
  const queryPlan = useMemo(
    () =>
      buildQueryPlan({
        column,
        limit,
        mode,
        relationLabelColumn,
        schemaTables,
        table,
        timeBucket,
        title,
        type,
      }),
    [column, limit, mode, relationLabelColumn, schemaTables, table, timeBucket, title, type],
  );
  const [data, setData] = useState<ChartDatum[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if ("error" in queryPlan) {
      setData([]);
      setErrorMessage(queryPlan.error);
      return;
    }

    const { sql } = queryPlan;
    const abortController = new AbortController();
    let disposed = false;

    async function loadData() {
      setErrorMessage(null);

      const [error, result] = await adapter.raw({ sql }, { abortSignal: abortController.signal });

      if (disposed) {
        return;
      }

      if (error) {
        const isAbortError = error instanceof Error && error.name === "AbortError";
        if (!isAbortError) {
          setData([]);
          setErrorMessage(getErrorMessage(error));
        }
        return;
      }

      const rows = (result?.rows ?? []) as Record<string, unknown>[];
      setData(normalizeData(rows));
      setErrorMessage(null);
    }

    void loadData();

    return () => {
      disposed = true;
      abortController.abort();
    };
  }, [adapter, queryPlan]);

  return (
    <Card className="border border-border/70 bg-card/80 shadow-none">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-40 min-h-0 px-2 pb-3">
        {errorMessage ? (
          <div className="flex h-full items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 px-3 text-center text-xs text-destructive">
            {errorMessage}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-border/70 bg-muted/20 text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="h-full w-full">
            {type === "pie" ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={36}
                    outerRadius={58}
                    paddingAngle={2}
                    stroke="transparent"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : type === "pie-full" ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={0}
                    outerRadius={60}
                    paddingAngle={1}
                    stroke="transparent"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : type === "radial" ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={data}
                  innerRadius={16}
                  outerRadius={72}
                  barSize={10}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, Math.max(...data.map((d) => d.value))]}
                    tick={false}
                  />
                  <RadialBar
                    dataKey="value"
                    background={{ fill: "var(--muted)/20" }}
                    cornerRadius={4}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </RadialBar>
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : type === "radar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  />
                  <Radar
                    dataKey="value"
                    fill="var(--chart-1)"
                    fillOpacity={0.4}
                    stroke="var(--chart-1)"
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: "var(--chart-1)" }}
                  />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : type === "bar-h" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ left: 4, right: 16, top: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                    width={80}
                  />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : type === "line" ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    minTickGap={20}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    width={24}
                  />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "var(--chart-3)" }}
                    activeDot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              /* bar — vertical columns */
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    minTickGap={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    width={24}
                  />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EvilStatsView(props: {
  adapter: Adapter;
  isNavigationOpen: boolean;
  isIntrospecting: boolean;
  onToggleNavigation: () => void;
  schemaTables: SchemaTables;
  schema: string;
  table: string | null;
}) {
  const { adapter, isNavigationOpen, onToggleNavigation, schema, schemaTables, table } = props;
  const tableCount = Object.keys(schemaTables).length;

  return (
    <ErrorBoundary>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
        <StudioHeader isNavigationOpen={isNavigationOpen} onToggleNavigation={onToggleNavigation}>
          <div className="text-xs text-muted-foreground">
            EvilStats · schema: <span className="font-mono text-foreground/80">{schema}</span>
            <span className="mx-1 text-foreground/40">·</span>
            active table: <span className="font-mono text-foreground/80">{table ?? "none"}</span>
            <span className="mx-1 text-foreground/40">·</span>
            introspected tables: <span className="font-mono text-foreground/80">{tableCount}</span>
          </div>
        </StudioHeader>

        <div className="flex-1 min-h-0 overflow-auto p-3">
          <div className="grid min-h-0 gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Todos */}
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="pie"
              table="todos"
              column="completed"
              title="Completion Rate"
              limit={6}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="radial"
              table="todos"
              column="priority"
              title="Priority Distribution"
              limit={6}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="bar-h"
              mode="top-related"
              table="todos"
              column="userId"
              relationLabelColumn="name"
              title="Todos by Author"
              limit={8}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="radar"
              mode="top-related"
              table="todos"
              column="projectId"
              relationLabelColumn="name"
              title="Todos by Project"
              limit={8}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="line"
              mode="time-series"
              table="todos"
              column="dueDate"
              timeBucket="day"
              title="Upcoming Due Dates"
              limit={14}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="bar"
              mode="time-series"
              table="todos"
              column="createdAt"
              timeBucket="month"
              title="Todo Creation by Month"
              limit={12}
            />

            {/* Users */}
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="pie-full"
              table="users"
              column="role"
              title="User Roles"
              limit={6}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="line"
              mode="time-series"
              table="users"
              column="createdAt"
              timeBucket="month"
              title="User Growth"
              limit={12}
            />

            {/* Projects */}
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="bar"
              table="projects"
              column="status"
              title="Project Status"
              limit={6}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="radial"
              table="projects"
              column="status"
              title="Project Health"
              limit={6}
            />

            {/* Comments */}
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="bar-h"
              mode="top-related"
              table="comments"
              column="userId"
              relationLabelColumn="name"
              title="Top Commenters"
              limit={8}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="line"
              mode="time-series"
              table="comments"
              column="createdAt"
              timeBucket="day"
              title="Comment Frequency"
              limit={21}
            />

            {/* Tags */}
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="radar"
              mode="top-related"
              table="todoTags"
              column="tagId"
              relationLabelColumn="name"
              title="Tag Usage (Radar)"
              limit={8}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="pie"
              mode="top-related"
              table="todoTags"
              column="tagId"
              relationLabelColumn="name"
              title="Tag Distribution"
              limit={5}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="bar-h"
              mode="top-related"
              table="comments"
              column="todoId"
              relationLabelColumn="title"
              title="Most Discussed Todos"
              limit={5}
            />
            <Chart
              adapter={adapter}
              schemaTables={schemaTables}
              type="pie-full"
              mode="top-related"
              table="todos"
              column="projectId"
              relationLabelColumn="name"
              title="Work Distribution"
              limit={8}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
