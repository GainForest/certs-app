"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { GlobeIcon, LockIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseOrganizationDate } from "@/lib/date";

type Visibility = "Public" | "Unlisted";

interface WebsiteEditorModalProps {
  currentUrl: string | null;
  onConfirm: (url: string | null) => void;
}

export function WebsiteEditorModal({
  currentUrl,
  onConfirm,
}: WebsiteEditorModalProps) {
  const { hide, popModal, stack } = useModal();
  const [value, setValue] = useState(currentUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const validate = (url: string): boolean => {
    if (!url) return true; // empty = remove website
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (trimmed && !validate(trimmed)) {
      setError("Please enter a valid URL (e.g. https://yourorg.com)");
      return;
    }
    const normalised = trimmed
      ? trimmed.startsWith("http")
        ? trimmed
        : `https://${trimmed}`
      : null;
    onConfirm(normalised);
    await handleClose();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Website</ModalTitle>
        <ModalDescription>Enter your organization&apos;s website address.</ModalDescription>
      </ModalHeader>

      <div className="py-4 flex flex-col gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleConfirm();
          }}
          placeholder="https://yourorganization.com"
          className="w-full h-10 px-3 text-sm bg-muted/40 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
          autoFocus
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <ModalFooter className="flex justify-end gap-2">
        <Button onClick={handleConfirm}>Save</Button>
        <div className="flex items-center gap-1">
          {value && (
            <Button
              variant="outline"
              onClick={() => {
                setValue("");
                setError(null);
              }}
              className="text-destructive hover:text-destructive flex-1"
            >
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

interface StartDateSelectorModalProps {
  currentDate: string | null;
  onConfirm: (date: string | null) => void;
}

export function StartDateSelectorModal({
  currentDate,
  onConfirm,
}: StartDateSelectorModalProps) {
  const { hide, popModal, stack } = useModal();
  const parsedCurrentDate = parseOrganizationDate(currentDate);
  const [selected, setSelected] = useState<Date | undefined>(
    parsedCurrentDate.state === "valid" && parsedCurrentDate.date
      ? parsedCurrentDate.date
      : undefined,
  );

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleConfirm = async () => {
    const iso = selected ? selected.toISOString().slice(0, 10) : null;
    onConfirm(iso);
    await handleClose();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Founding Date</ModalTitle>
        <ModalDescription>Select the date your organization was founded or began operations.</ModalDescription>
      </ModalHeader>

      <div className="flex justify-center py-2">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          selected={selected}
          onSelect={setSelected}
          hidden={{ after: new Date() }}
          autoFocus
        />
      </div>

      <ModalFooter className="flex justify-end gap-2">
        <Button onClick={handleConfirm}>Confirm</Button>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            onClick={() => setSelected(undefined)}
            className="text-destructive hover:text-destructive flex-1"
            disabled={!selected}
          >
            Clear
          </Button>
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

interface VisibilityOption {
  value: Visibility;
  label: string;
  description: string;
  Icon: typeof GlobeIcon;
}

const OPTIONS: VisibilityOption[] = [
  {
    value: "Public",
    label: "Public",
    description: "Visible to everyone. Appears in organization listings and search results.",
    Icon: GlobeIcon,
  },
  {
    value: "Unlisted",
    label: "Unlisted",
    description: "Only accessible via direct link. Not listed publicly or in search.",
    Icon: LockIcon,
  },
];

interface VisibilitySelectorModalProps {
  current: Visibility;
  onConfirm: (value: Visibility) => void;
}

export function VisibilitySelectorModal({
  current,
  onConfirm,
}: VisibilitySelectorModalProps) {
  const { hide, popModal, stack } = useModal();
  const [selected, setSelected] = useState<Visibility>(current);

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleConfirm = async () => {
    onConfirm(selected);
    await handleClose();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Discoverability</ModalTitle>
        <ModalDescription>Choose who can discover your organization.</ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-2 py-4">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={cn(
              "flex items-start gap-3 w-full px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer",
              selected === opt.value
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:bg-muted/60",
            )}
          >
            <opt.Icon
              className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                selected === opt.value
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  selected === opt.value ? "text-primary" : "text-foreground",
                )}
              >
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {opt.description}
              </p>
            </div>
            {selected === opt.value && (
              <CheckIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>

      <ModalFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm}>Save</Button>
      </ModalFooter>
    </ModalContent>
  );
}
