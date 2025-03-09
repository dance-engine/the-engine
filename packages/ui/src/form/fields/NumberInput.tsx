interface NumberInputProps {
  label: string;
  name: string;
  register: any;
  error?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, name, register, error }) => (
  <div className="flex flex-col">
    <label className="font-semibold capitalize">{label}</label>
    <input {...register(name)} type="number" className="border p-2 rounded-md" />
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

export default NumberInput;
