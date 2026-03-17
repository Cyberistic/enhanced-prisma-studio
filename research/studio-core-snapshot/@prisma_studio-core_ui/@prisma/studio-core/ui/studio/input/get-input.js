import { isObjectType } from "remeda";
import { BooleanInput } from "./BooleanInput";
import { DateInput } from "./DateInput";
import { EnumInput } from "./EnumInput";
import { JsonInput } from "./JsonInput";
import { NumericInput } from "./NumericInput";
import { RawInput } from "./RawInput";
import { TimeInput } from "./TimeInput";
export function getInput(props) {
    const { cell, column, context, onNavigate, onSubmit, showSaveAction } = props;
    const { datatype, isAutoincrement, isComputed, nullable } = column;
    const { format, group, isArray, options } = datatype;
    const readonly = props.readonly || isAutoincrement || isComputed;
    const value = cell.getValue();
    if (isArray || group === "json") {
        return (<JsonInput column={column} context={context} onNavigate={onNavigate} onSubmit={onSubmit} readonly={readonly} showSaveAction={showSaveAction} value={value}/>);
    }
    if (group === "datetime" && format) {
        return (<DateInput column={column} context={context} onNavigate={onNavigate} onSubmit={onSubmit} readonly={readonly} showSaveAction={showSaveAction} value={value}/>);
    }
    if (group === "time" && format) {
        return (<TimeInput column={column} context={context} onNavigate={onNavigate} onSubmit={onSubmit} readonly={readonly} showSaveAction={showSaveAction} value={value}/>);
    }
    if (group === "boolean") {
        return (<BooleanInput column={column} context={context} onNavigate={onNavigate} onSubmit={onSubmit} readonly={readonly} showSaveAction={showSaveAction} value={value}/>);
    }
    if (group === "enum" && (nullable || options?.length > 0)) {
        return (<EnumInput column={column} context={context} onNavigate={onNavigate} onSubmit={onSubmit} options={options} readonly={readonly} showSaveAction={showSaveAction} value={value}/>);
    }
    if (group === "numeric") {
        return (<NumericInput column={column} context={context} onNavigate={onNavigate} onSubmit={onSubmit} readonly={readonly} showSaveAction={showSaveAction} value={value}/>);
    }
    return (<RawInput column={column} context={context} onNavigate={onNavigate} onSubmit={onSubmit} readonly={readonly} showSaveAction={showSaveAction} value={isObjectType(value) ? JSON.stringify(value) : value}/>);
}
