"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SPRING = {
  type: "spring" as const,
  stiffness: 130.4,
  damping: 14.5,
  mass: 1,
};

interface FormAuthProps {
  input: (props: React.ComponentProps<"input">) => React.ReactNode;
  submit: (props: React.ComponentProps<"button">) => React.ReactNode;
}

export const FormAuth = ({ input, submit }: FormAuthProps) => {
  const { user, loading, refreshUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courierId = user?.id ?? "";
  const canCopy =
    Boolean(courierId) && typeof navigator !== "undefined" && Boolean(navigator.clipboard);

  useEffect(() => {
    if (!loading && !user) {
      void refreshUser();
    }
  }, [loading, user, refreshUser]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async () => {
    setError(null);

    if (!courierId) {
      await refreshUser();
      setError("We couldn't find your courier ID yet. Give us another moment.");
      return;
    }

    if (!canCopy) {
      setError("Copy isn't supported on this device. Select the ID manually instead.");
      return;
    }

    try {
      await navigator.clipboard.writeText(courierId);
      setCopied(true);
    } catch (copyError) {
      console.error("Failed to copy courier ID", copyError);
      setError("We couldn't copy the ID. Try selecting and copying it yourself.");
    }
  };

  return (
    <div className="relative pt-10 lg:pt-12 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="text-left"
      >
        <p className="text-white/80 text-sm">
          Email and password login have flown south for the winter. Every visitor now receives a courier ID automatically when
          they arrive at Honk. Copy yours below to link another device or keep it handy for support.
        </p>
      </motion.div>

      <div className="space-y-3">
        <label htmlFor="courier-id" className="sr-only">
          Courier ID
        </label>
        <div className="relative">
          {input({
            id: "courier-id",
            value: courierId,
            readOnly: true,
            onChange: () => {},
            placeholder: loading ? "Generating your courier ID…" : "Your courier ID appears here",
            "aria-live": "polite",
            "aria-label": "Courier ID",
          })}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            {submit({
              type: "button",
              onClick: handleCopy,
              disabled: loading || !courierId,
              title: courierId ? "Copy courier ID" : "Courier ID not ready yet",
              "aria-label": courierId ? "Copy courier ID" : "Courier ID not ready yet",
            })}
          </div>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: copied ? 1 : error ? 1 : 0, y: copied || error ? 0 : 8 }}
        transition={SPRING}
        className={cn(
          "text-sm font-medium",
          copied ? "text-emerald-200" : "text-red-200",
          copied || error ? "block" : "hidden"
        )}
        aria-live="polite"
      >
        {copied ? "Courier ID copied to your clipboard!" : error}
      </motion.div>
    </div>
  );
};
