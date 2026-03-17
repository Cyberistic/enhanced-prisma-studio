// we're ensuring that keys are type-safe. there is no proper way to achieve it in `nuqs`.
// the `declare module` technique results in adding overloads, not overriding the existing functions.
// eslint-disable-next-line no-restricted-imports
import { useQueryState as useQueryStateOriginal, useQueryStates as useQueryStatesOriginal, } from "nuqs";
// eslint-disable-next-line no-restricted-imports
export * from "nuqs";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function keyMap(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
keyMap) {
    return keyMap;
}
export function urlKeys(urlKeys) {
    return urlKeys;
}
const _BRAND_SYMBOL = Symbol("BRAND_SYMBOL");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useQueryState(key, options) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return useQueryStateOriginal(key, options);
}
/**
 * @see {@link useQueryStatesOriginal}
 */
export function useQueryStates(keyMap, options) {
    return useQueryStatesOriginal(keyMap, options);
}
