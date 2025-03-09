const defaultClasses = "w-full pb-3"
const defaultLabelClasses = "block text-xs uppercase font-bold"
const defaultInputClasses = "font-base p-1 border rounded"
const defaultErrorClasses = "text-red-600 text-sm"

export const CustomTextInput = ({ label, name, type = "text", register, error }) => (
  <div className={defaultClasses}>
    <label className={defaultLabelClasses}>{label}</label>
    <input {...register(name)} type={type} className={defaultInputClasses} />
    {error && <p className={defaultErrorClasses}>{error}</p>}
  </div>
);

export const CustomSelect = ({ label, name, options, register, error }) => (
  <div className={defaultClasses}>
    <label className={defaultLabelClasses}>{label}</label>
    <select {...register(name)} className={defaultInputClasses}>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
    {error && <p className={defaultErrorClasses}>{error}</p>}
  </div>
);

export const CustomCheckbox = ({ label, name, register, error }) => (
  <div className={defaultClasses}>
    <label>
      <input type="checkbox" {...register(name)} /> {label}
    </label>
    {error && <p className={defaultErrorClasses}>{error}</p>}
  </div>
);
