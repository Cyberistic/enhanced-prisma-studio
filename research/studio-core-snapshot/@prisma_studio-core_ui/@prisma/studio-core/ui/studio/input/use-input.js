import { useStableUiStateKey, useUiState } from "../../hooks/use-ui-state";
export function useInput(props) {
    const { initialValue, stateKey } = props;
    const fallbackKey = useStableUiStateKey("studio-input");
    const resolvedKey = stateKey ?? fallbackKey;
    const [value, setValue] = useUiState(resolvedKey, initialValue ?? "", { cleanupOnUnmount: true });
    const handleOnChange = (event) => {
        setValue(event.target.value);
    };
    return { handleOnChange, value, setValue };
}
