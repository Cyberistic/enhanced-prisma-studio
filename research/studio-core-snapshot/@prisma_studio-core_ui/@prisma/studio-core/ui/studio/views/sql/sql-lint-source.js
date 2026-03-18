export function createSqlLintSource(args) {
  const { lintSql, schemaVersion } = args;
  const state = {
    abortController: null,
    requestId: 0,
  };
  const source = async (view) => {
    const sql = view.state.doc.toString();
    if (sql.trim().length === 0) {
      state.abortController?.abort();
      state.abortController = null;
      return [];
    }
    state.abortController?.abort();
    const abortController = new AbortController();
    state.abortController = abortController;
    const requestId = state.requestId + 1;
    state.requestId = requestId;
    const [error, result] = await lintSql(
      {
        schemaVersion,
        sql,
      },
      { abortSignal: abortController.signal },
    );
    if (abortController.signal.aborted || state.requestId !== requestId) {
      return [];
    }
    if (error) {
      return [
        {
          from: 0,
          message: error.message,
          severity: "warning",
          source: "studio",
          to: Math.min(1, sql.length),
        },
      ];
    }
    return result.diagnostics.map((diagnostic) => clampDiagnostic(diagnostic, sql.length));
  };
  return {
    dispose() {
      state.abortController?.abort();
      state.abortController = null;
    },
    source,
  };
}
function clampDiagnostic(diagnostic, sqlLength) {
  if (sqlLength <= 0) {
    return {
      ...diagnostic,
      from: 0,
      to: 0,
    };
  }
  const maxFrom = Math.max(sqlLength - 1, 0);
  const from = clamp(diagnostic.from, 0, maxFrom);
  const to = clamp(Math.max(diagnostic.to, from + 1), from + 1, sqlLength);
  return {
    ...diagnostic,
    from,
    to,
  };
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
