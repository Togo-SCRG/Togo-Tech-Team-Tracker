"use client";

import { Modal } from "@/components/ui/Modal";

// Browsers render PDFs (and images/text) natively in an iframe, but not
// Office formats — those get routed through Microsoft's Office Online
// viewer, which just needs a URL it can fetch (works fine with a
// temporary signed URL, as long as it's still valid when the viewer loads).
const OFFICE_EXTENSIONS = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function PrdPreviewModal({
  open,
  onClose,
  fileName,
  fileUrl,
}: {
  open: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl: string;
}) {
  const isOfficeDoc = OFFICE_EXTENSIONS.includes(getExtension(fileName));
  const embedSrc = isOfficeDoc
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    : fileUrl;

  return (
    <Modal open={open} onClose={onClose} title={fileName} className="max-w-4xl">
      <div className="h-[75vh]">
        <iframe src={embedSrc} title={fileName} className="w-full h-full rounded-md border border-togo-border" />
      </div>
    </Modal>
  );
}
