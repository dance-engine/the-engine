export const CustomTextInput = ({ label, name, type = "text", register, error }) => (
  <div>
    <label>{label}</label>
    <input {...register(name)} type={type} />
    {error && <p>{error}</p>}
  </div>
);

export const CustomSelect = ({ label, name, options, register, error }) => (
  <div>
    <label>{label}</label>
    <select {...register(name)}>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
    {error && <p>{error}</p>}
  </div>
);

export const CustomCheckbox = ({ label, name, register, error }) => (
  <div>
    <label>
      <input type="checkbox" {...register(name)} /> {label}
    </label>
    {error && <p>{error}</p>}
  </div>
);