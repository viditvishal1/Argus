"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getVariant } from "@/lib/variants/registry";
import type { VariantDefinition, VariantId } from "@/lib/variants/types";

export const VARIANT_CHANGE_EVENT = "argus:variant-change";

export function useActiveVariant(): { id: VariantId; variant: VariantDefinition } {
  const [id, setId] = useState<VariantId>("world");

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem("argus_variant") as VariantId | null;
      if (saved) setId(saved);
    };
    read();
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<VariantId>).detail;
      if (detail) setId(detail);
      else read();
    };
    window.addEventListener(VARIANT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(VARIANT_CHANGE_EVENT, onChange);
  }, []);

  return { id, variant: getVariant(id) };
}

export function setActiveVariant(id: VariantId, router?: ReturnType<typeof useRouter>) {
  localStorage.setItem("argus_variant", id);
  document.cookie = `argus_variant=${id};path=/;max-age=31536000`;
  window.dispatchEvent(new CustomEvent(VARIANT_CHANGE_EVENT, { detail: id }));
  const v = getVariant(id);
  if (router && v.defaultPath) router.push(v.defaultPath);
}
