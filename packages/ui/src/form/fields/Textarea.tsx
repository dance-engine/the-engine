interface TextareaProps {
  label: string;
  name: string;
  register: any;
  error?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, name, register, error }) => (
  <div className="flex flex-col">
    <label className="font-semibold capitalize">{label}</label>
    <textarea {...register(name)} className="border p-2 rounded-md h-24" />
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

export default Textarea;
