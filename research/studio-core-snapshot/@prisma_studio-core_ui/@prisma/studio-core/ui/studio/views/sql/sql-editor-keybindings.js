export function createSqlEditorKeybindings(args) {
    const { runSql } = args;
    return [
        {
            key: "Mod-Enter",
            run: () => {
                runSql();
                return true;
            },
        },
    ];
}
