interface DateInputProps {
  label: string;
  name: string;
  register: any;
  error?: string;
}

const DateInput: React.FC<DateInputProps> = ({ label, name, register, error }) => (
  <div className="flex flex-col">
    <label className="font-semibold capitalize">{label}</label>
    <input {...register(name)} type="date" className="border p-2 rounded-md" />
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

export default DateInput;
