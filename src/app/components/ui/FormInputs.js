import { cn } from "./utils";

export const NumberInput = ({
  label,
  value,
  onChange,
  error,
  placeholder = "0",
  required,
}) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    <input
      type="number"
      min="0"
      value={value ?? ""}
      onChange={(e) => {
        const val = e.target.value.replace(/[^0-9]/g, "");
        onChange(val === "" ? "" : parseInt(val, 10));
      }}
      placeholder={placeholder}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        error
          ? "border-destructive focus-visible:ring-destructive"
          : "border-input"
      )}
    />
    {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
  </div>
);

export const TextInput = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  required,
}) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        error
          ? "border-destructive focus-visible:ring-destructive"
          : "border-input"
      )}
    />
    {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
  </div>
);

export const SelectInput = ({
  label,
  value,
  onChange,
  options = [],
  error,
  placeholder,
  required,
  disabled = false,
}) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        error ? "border-destructive" : "border-input",
        disabled ? "opacity-60 cursor-not-allowed" : ""
      )}
    >
      <option value="" disabled>
        {placeholder || "Pilih..."}
      </option>
      {options.map((opt) => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
    {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
  </div>
);
