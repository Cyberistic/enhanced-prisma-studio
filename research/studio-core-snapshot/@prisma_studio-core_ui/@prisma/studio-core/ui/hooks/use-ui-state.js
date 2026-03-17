import { createCollection, eq, localOnlyCollectionOptions, useLiveQuery, } from "@tanstack/react-db";
import { useCallback, useEffect, useRef, useState } from "react";
import shortUUID from "../lib/short-uuid";
import { useOptionalStudio } from "../studio/context";
import { instrumentTanStackCollectionMutations } from "../studio/tanstack-db-mutation-guard";
const fallbackUiStateCollection = instrumentTanStackCollectionMutations(createCollection(localOnlyCollectionOptions({
    id: "fallback-ui-local-state",
    getKey(item) {
        return item.id;
    },
    initialData: [],
})), { collectionName: "fallback-ui-local-state" });
function cloneValue(value) {
    if (typeof value !== "object" || value == null) {
        return value;
    }
    return structuredClone(value);
}
function resolveUpdater(previous, updater) {
    return typeof updater === "function"
        ? updater(previous)
        : updater;
}
export function useStableUiStateKey(prefix) {
    const keyRef = useRef(null);
    if (!keyRef.current) {
        keyRef.current = `${prefix}:${shortUUID.generate()}`;
    }
    return keyRef.current;
}
export function useUiState(key, initialValue, options = {}) {
    const { cleanupOnUnmount = false } = options;
    const [volatileValue, setVolatileValue] = useState(() => cloneValue(initialValue));
    const previousVolatileKeyRef = useRef(key);
    const studioContext = useOptionalStudio();
    const uiLocalStateCollection = studioContext?.uiLocalStateCollection ??
        fallbackUiStateCollection;
    const { data: stateRow } = useLiveQuery((q) => {
        if (cleanupOnUnmount || !key) {
            return undefined;
        }
        return q
            .from({ item: uiLocalStateCollection })
            .where(({ item }) => eq(item.id, key))
            .select(({ item }) => ({
            id: item.id,
            value: item.value,
        }))
            .findOne();
    }, [cleanupOnUnmount, key, uiLocalStateCollection]);
    useEffect(() => {
        if (!cleanupOnUnmount) {
            return;
        }
        if (previousVolatileKeyRef.current !== key) {
            previousVolatileKeyRef.current = key;
            setVolatileValue(cloneValue(initialValue));
            return;
        }
        // Keep local volatile state aligned when initial value changes
        // while the key remains stable.
        setVolatileValue((previous) => {
            if (Object.is(previous, initialValue)) {
                return previous;
            }
            return cloneValue(initialValue);
        });
    }, [cleanupOnUnmount, initialValue, key]);
    const setVolatileStateValue = useCallback((updater) => {
        setVolatileValue((previous) => cloneValue(resolveUpdater(previous, updater)));
    }, []);
    const resetVolatileStateValue = useCallback(() => {
        setVolatileValue(cloneValue(initialValue));
    }, [initialValue]);
    useEffect(() => {
        if (cleanupOnUnmount) {
            return;
        }
        if (!key) {
            return;
        }
        if (uiLocalStateCollection.has(key)) {
            return;
        }
        uiLocalStateCollection.insert({
            id: key,
            value: cloneValue(initialValue),
        });
    }, [cleanupOnUnmount, initialValue, key, uiLocalStateCollection]);
    const setValue = useCallback((updater) => {
        if (cleanupOnUnmount) {
            setVolatileStateValue(updater);
            return;
        }
        if (!key) {
            return;
        }
        const existing = uiLocalStateCollection.get(key);
        if (!existing) {
            uiLocalStateCollection.insert({
                id: key,
                value: cloneValue(resolveUpdater(cloneValue(initialValue), updater)),
            });
            return;
        }
        uiLocalStateCollection.update(key, (draft) => {
            const previous = draft.value;
            draft.value = cloneValue(resolveUpdater(previous, updater));
        });
    }, [
        cleanupOnUnmount,
        initialValue,
        key,
        setVolatileStateValue,
        uiLocalStateCollection,
    ]);
    const resetValue = useCallback(() => {
        if (cleanupOnUnmount) {
            resetVolatileStateValue();
            return;
        }
        if (!key) {
            return;
        }
        if (!uiLocalStateCollection.has(key)) {
            uiLocalStateCollection.insert({
                id: key,
                value: cloneValue(initialValue),
            });
            return;
        }
        uiLocalStateCollection.update(key, (draft) => {
            draft.value = cloneValue(initialValue);
        });
    }, [
        cleanupOnUnmount,
        initialValue,
        key,
        resetVolatileStateValue,
        uiLocalStateCollection,
    ]);
    return [
        cleanupOnUnmount
            ? volatileValue
            : (stateRow?.value ?? cloneValue(initialValue)),
        setValue,
        resetValue,
    ];
}
