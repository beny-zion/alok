"use client";

import { useState, useMemo } from "react";
import { X, ChevronsUpDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

interface FreeMultiComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
  placeholder?: string;
  addLabel?: string;
  emptyLabel?: string;
  className?: string;
}

export function FreeMultiCombobox({
  value,
  onChange,
  options,
  placeholder = "בחר או הקלד...",
  addLabel = "הוסף",
  emptyLabel = "אין אפשרויות",
  className,
}: FreeMultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allOptions = useMemo(() => {
    const merged = Array.from(new Set([...options, ...value]));
    return merged.sort((a, b) => a.localeCompare(b, "he"));
  }, [options, value]);

  const queryTrim = query.trim();
  const queryExists = queryTrim
    ? allOptions.some((o) => o.toLowerCase() === queryTrim.toLowerCase())
    : true;

  const toggle = (item: string) => {
    if (value.includes(item)) onChange(value.filter((v) => v !== item));
    else onChange([...value, item]);
  };

  const addNew = () => {
    if (!queryTrim || queryExists) return;
    if (!value.includes(queryTrim)) onChange([...value, queryTrim]);
    setQuery("");
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
              className="w-full justify-between min-h-9 h-auto py-1.5 text-right"
            >
              <div className="flex flex-wrap gap-1 flex-1">
                {value.length === 0 ? (
                  <span className="text-muted-foreground text-sm">{placeholder}</span>
                ) : (
                  value.map((v) => (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(v);
                      }}
                    >
                      {v}
                      <X className="size-3" />
                    </Badge>
                  ))
                )}
              </div>
              <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
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
                    onSelect={() => toggle(opt)}
                    data-checked={value.includes(opt)}
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
