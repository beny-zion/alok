"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface FreeComboboxProps {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  addLabel?: string;
  emptyLabel?: string;
  clearable?: boolean;
  className?: string;
}

export function FreeCombobox({
  value,
  onChange,
  options,
  placeholder = "בחר או הקלד...",
  addLabel = "הוסף",
  emptyLabel = "אין אפשרויות",
  clearable = true,
  className,
}: FreeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allOptions = useMemo(() => {
    const merged = Array.from(new Set([...(value ? [value] : []), ...options]));
    return merged.sort((a, b) => a.localeCompare(b, "he"));
  }, [options, value]);

  const queryTrim = query.trim();
  const queryExists = queryTrim
    ? allOptions.some((o) => o.toLowerCase() === queryTrim.toLowerCase())
    : true;

  const select = (item: string) => {
    onChange(item);
    setQuery("");
    setOpen(false);
  };

  const addNew = () => {
    if (!queryTrim || queryExists) return;
    onChange(queryTrim);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={(props) => (
            <Button
              {...props}
              variant="outline"
              role="combobox"
              className="w-full justify-between h-9 text-right"
            >
              <span className={value ? "" : "text-muted-foreground text-sm"}>
                {value || placeholder}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {clearable && value && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange("");
                    }}
                    className="size-4 text-muted-foreground hover:text-red-500 inline-flex items-center justify-center"
                  >
                    <X className="size-3.5" />
                  </span>
                )}
                <ChevronsUpDown className="size-4 opacity-50" />
              </span>
            </Button>
          )}
        />
        <PopoverContent className="w-[--anchor-width] p-0 min-w-[260px]" align="start">
          <Command shouldFilter={true}>
            <CommandInput
              placeholder="חיפוש / הוספה..."
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter" && queryTrim && !queryExists) {
                  e.preventDefault();
                  addNew();
                }
              }}
            />
            <CommandList>
              {allOptions.length === 0 && !queryTrim && (
                <CommandEmpty>{emptyLabel}</CommandEmpty>
              )}
              <CommandGroup>
                {allOptions.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => select(opt)}
                    data-checked={value === opt}
                  >
                    <span>{opt}</span>
                  </CommandItem>
                ))}
                {queryTrim && !queryExists && (
                  <CommandItem value={`__add__${queryTrim}`} onSelect={addNew}>
                    <Plus className="size-3.5" />
                    <span>
                      {addLabel} &quot;{queryTrim}&quot;
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
