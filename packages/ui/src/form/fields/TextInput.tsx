interface TextInputProps {
  label: string;
  name: string;
  register: any;
  error?: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, name, register, error }) => (
  <div className="flex flex-col">
    <label className="font-semibold capitalize">{label}</label>
    <input {...register(name)} type="text" className="border p-2 rounded-md" />
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

export default TextInput;
