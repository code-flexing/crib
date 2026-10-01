"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/Modal";

type RestrictedActionModalProps = { message: string | null; onClose: () => void };

export function RestrictedActionModal({ message, onClose }: RestrictedActionModalProps) {
  const titleId = useId();
  return (
    <Modal open={Boolean(message)} onClose={onClose} titleId={titleId}>
      <h2 id={titleId} className="text-xl font-medium text-safecrib-black">Action unavailable</h2>
      <p className="mt-3 text-sm leading-6 text-black/65">{message}</p>
      <button type="button" onClick={onClose} className="mt-6 rounded-[3px] bg-safecrib-green px-5 py-3 text-sm font-medium text-safecrib-white hover:bg-[#0a5f47]">Close</button>
    </Modal>
  );
}