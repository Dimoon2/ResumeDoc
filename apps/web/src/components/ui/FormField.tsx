import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leadingIcon?: ReactNode;
}

// forwardRef permite que React Hook Form gestione el foco y la validación del input.
const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, leadingIcon, id, ...inputProps },
  ref,
) {
  const inputId = id ?? inputProps.name;

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <div className={`input-wrap ${error ? "input-error" : ""}`}>
        {leadingIcon && <span className="input-icon">{leadingIcon}</span>}
        <input
          id={inputId}
          ref={ref}
          {...inputProps}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      {error && <span className="field-error" id={`${inputId}-error`}>{error}</span>}
    </div>
  );
});

export default FormField;
