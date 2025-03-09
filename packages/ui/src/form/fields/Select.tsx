interface SelectProps {
  label: string;
  name: string;
  options: string[];
  register: any;
  error?: string;
}

const Select: React.FC<SelectProps> = ({ label, name, options, register, error }) => (
  <div className="flex flex-col">
    <label className="font-semibold capitalize">{label}</label>
    <select {...register(name)} className="border p-2 rounded-md">
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

export default Select;
