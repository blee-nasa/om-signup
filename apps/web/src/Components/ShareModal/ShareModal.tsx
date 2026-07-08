import { useEffect } from "react";
import { X } from "lucide-react";
import QRCode from "react-qr-code";
import styles from "./ShareModal.module.css";

const PROD_URL = "https://nasa-om.fly.dev";

export type ShareModalProps = {
  open?: boolean;
  onClose?: () => void;
};

export const ShareModal = ({ open = false, onClose = () => {} }: ShareModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this page"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">Share</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-500 hover:text-gray-800"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className={styles.qrWrap}>
          <QRCode value={PROD_URL} size={192} />
        </div>
        <p className="mt-4 break-all text-center text-sm text-gray-500">{PROD_URL}</p>
      </div>
    </div>
  );
};
