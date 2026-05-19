import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface MultiCheckboxOption {
  id: string;
  label: string;
}

interface MultiCheckboxFieldProps {
  id?: string;
  options: MultiCheckboxOption[];
  value: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
}

export function MultiCheckboxField({
  id,
  options,
  value,
  onChange,
  searchPlaceholder,
}: MultiCheckboxFieldProps) {
  const [filter, setFilter] = useState('');
  const scrollable = options.length > 10;
  const visible = scrollable
    ? options.filter(o => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  const toggle = (optionId: string, checked: boolean) => {
    onChange(checked ? [...value, optionId] : value.filter(v => v !== optionId));
  };

  const body = (
    <div className="space-y-2">
      {visible.map(o => {
        const cbId = id ? `${id}_${o.id}` : undefined;
        return (
          <div className="flex items-center gap-2" key={o.id}>
            <Checkbox
              id={cbId}
              checked={value.includes(o.id)}
              onCheckedChange={c => toggle(o.id, !!c)}
            />
            <Label htmlFor={cbId} className="font-normal">{o.label}</Label>
          </div>
        );
      })}
    </div>
  );

  if (!scrollable) return body;

  return (
    <div className="space-y-2">
      <Input
        placeholder={searchPlaceholder ?? 'Search...'}
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      <div className="max-h-[25rem] overflow-y-auto rounded-md border p-2">
        {body}
      </div>
    </div>
  );
}
