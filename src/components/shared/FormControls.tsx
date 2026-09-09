"use client";

import {
  Search,
  type LucideIcon
} from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { useId } from "react";

import { cn } from "@/lib/utils/cn";

interface FieldChromeProps {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: (fieldId: string, describedBy: string | undefined) => ReactNode;
}

function FieldChrome({
  label,
  helperText,
  error,
  required,
  children
}: FieldChromeProps) {
  const fieldId = useId();
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="field" htmlFor={fieldId}>
      <span className="field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children(fieldId, describedBy)}
      {helperText ? (
        <span className="field__helper" id={helperId}>
          {helperText}
        </span>
      ) : null}
      {error ? (
        <span className="field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function Input({ label, helperText, error, required, className, ...props }: InputProps) {
  return (
    <FieldChrome label={label} helperText={helperText} error={error} required={required}>
      {(fieldId, describedBy) => (
        <input
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cn("input", className)}
          id={fieldId}
          required={required}
          {...props}
        />
      )}
    </FieldChrome>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function Textarea({
  label,
  helperText,
  error,
  required,
  className,
  ...props
}: TextareaProps) {
  return (
    <FieldChrome label={label} helperText={helperText} error={error} required={required}>
      {(fieldId, describedBy) => (
        <textarea
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cn("textarea", className)}
          id={fieldId}
          required={required}
          {...props}
        />
      )}
    </FieldChrome>
  );
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  helperText,
  error,
  required,
  options,
  placeholder,
  className,
  ...props
}: SelectProps) {
  return (
    <FieldChrome label={label} helperText={helperText} error={error} required={required}>
      {(fieldId, describedBy) => (
        <select
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cn("select", className)}
          id={fieldId}
          required={required}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldChrome>
  );
}

export interface ComboboxProps extends InputProps {
  options: SelectOption[];
}

export function Combobox({ options, label, helperText, error, required, className, ...props }: ComboboxProps) {
  const listId = useId();

  return (
    <FieldChrome label={label} helperText={helperText} error={error} required={required}>
      {(fieldId, describedBy) => (
        <>
          <input
            aria-controls={listId}
            aria-describedby={describedBy}
            aria-expanded="false"
            aria-invalid={Boolean(error)}
            className={cn("input", className)}
            id={fieldId}
            list={listId}
            role="combobox"
            required={required}
            {...props}
          />
          <datalist id={listId}>
            {options.map((option) => (
              <option key={option.value} value={option.label} />
            ))}
          </datalist>
        </>
      )}
    </FieldChrome>
  );
}

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}

export function Checkbox({ label, helperText, className, ...props }: CheckboxProps) {
  const id = useId();

  return (
    <div className="choice-field">
      <input className={cn("checkbox", className)} id={id} type="checkbox" {...props} />
      <label htmlFor={id}>
        <span>{label}</span>
        {helperText ? <small>{helperText}</small> : null}
      </label>
    </div>
  );
}

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}

export function Radio({ label, helperText, className, ...props }: RadioProps) {
  const id = useId();

  return (
    <div className="choice-field">
      <input className={cn("radio", className)} id={id} type="radio" {...props} />
      <label htmlFor={id}>
        <span>{label}</span>
        {helperText ? <small>{helperText}</small> : null}
      </label>
    </div>
  );
}

export interface SwitchProps {
  label: string;
  checked: boolean;
  helperText?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({ label, checked, helperText, disabled, onCheckedChange }: SwitchProps) {
  const id = useId();

  return (
    <div className="switch-field">
      <button
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        className={cn("switch", checked && "switch--checked")}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        role="switch"
        type="button"
      >
        <span />
      </button>
      <div>
        <span className="switch-field__label" id={`${id}-label`}>
          {label}
        </span>
        {helperText ? <small>{helperText}</small> : null}
      </div>
    </div>
  );
}

export function DatePicker(props: Omit<InputProps, "type">) {
  return <Input type="date" {...props} />;
}

export interface DateRangePickerProps {
  label: string;
  startLabel?: string;
  endLabel?: string;
}

export function DateRangePicker({
  label,
  startLabel = "Từ ngày",
  endLabel = "Đến ngày"
}: DateRangePickerProps) {
  return (
    <fieldset className="date-range">
      <legend>{label}</legend>
      <DatePicker label={startLabel} />
      <DatePicker label={endLabel} />
    </fieldset>
  );
}

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
}

export function SearchInput({
  label = "Tìm kiếm",
  icon: Icon = Search,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className="search-input">
      <Icon aria-hidden="true" size={18} />
      <input aria-label={label} className={cn("input", className)} type="search" {...props} />
    </div>
  );
}
