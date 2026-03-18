import { Checkbox } from "@/ui/components/ui/checkbox";
import { useStableUiStateKey, useUiState } from "@/ui/hooks/use-ui-state";
import { DEFAULT_BOOLEAN } from "../../../data/defaults";
import { Label } from "../../components/ui/label";
import { usePopoverActions } from "../../components/ui/popover-cell";
import { InputActions } from "./InputActions";
export function BooleanInput(props) {
  const { column, context, onNavigate, onSubmit, readonly, showSaveAction, value } = props;
  const { defaultValue, fkColumn, isRequired } = column;
  const indeterminateValue = context === "insert" && defaultValue != null ? undefined : null;
  const valueWithDefaults =
    value == null ? (isRequired && !fkColumn ? DEFAULT_BOOLEAN : "indeterminate") : Boolean(value);
  const inputStateKey = useStableUiStateKey("boolean-input");
  const [inputValue, setInputValue] = useUiState(inputStateKey, valueWithDefaults, {
    cleanupOnUnmount: true,
  });
  const { handleCancel, handleKeyDown, handleSave } = usePopoverActions({
    onNavigate,
    onSave: () => {
      if (inputValue === valueWithDefaults) {
        return false;
      }
      onSubmit(inputValue === "indeterminate" ? indeterminateValue : inputValue);
      return true;
    },
  });
  return (
    <div onKeyDown={handleKeyDown}>
      <div className="flex flex-row items-center h-(--studio-cell-height) gap-4 py-0 px-2">
        <Checkbox
          aria-checked={inputValue === "indeterminate" ? "mixed" : inputValue}
          aria-disabled={readonly}
          checked={inputValue}
          disabled={readonly}
          id="boolean-input"
          onCheckedChange={() =>
            setInputValue((prev) => (!isRequired && prev === true ? "indeterminate" : !prev))
          }
        />
        <Label htmlFor="boolean-input">
          {inputValue === "indeterminate"
            ? indeterminateValue === null
              ? "NULL"
              : "(default value)"
            : String(inputValue)}
        </Label>
      </div>
      <InputActions
        disabled={readonly}
        onCancel={handleCancel}
        onSave={handleSave}
        showSave={showSaveAction}
      />
    </div>
  );
}
