export class AdapterError extends Error {
    adapterSource;
    query;
}
export function createAdapterError(args) {
    const { adapterSource, error, query } = args;
    const adapterError = error;
    adapterError.adapterSource = adapterSource;
    adapterError.query = query;
    return [adapterError];
}
