"use client";

import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";

interface FileUploadProps {
  entityId: string;
  entityType: "QUOTE" | "ORDER";
  defaultDocType?: "Quote" | "FieldSheet" | "FinalSurvey";
  onUploadSuccess?: () => void;
  allowedDocTypes?: Array<"Quote" | "FieldSheet" | "FinalSurvey">;
  buttonLabel?: string;
}

export default function FileUpload({
  entityId,
  entityType,
  defaultDocType = "Quote",
  onUploadSuccess,
  allowedDocTypes,
  buttonLabel,
}: FileUploadProps) {
  const [docType, setDocType] = useState<string>(defaultDocType);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typesToOffer = allowedDocTypes || ["Quote", "FieldSheet", "FinalSurvey"];

  const handleUpload = async (file: File) => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      // 1. Request presigned upload URL
      const folder = entityType === "QUOTE" ? `quotes/${entityId}` : `orders/${entityId}`;
      const urlRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          folder,
          entityId,
          entityType,
        }),
      });

      if (!urlRes.ok) {
        const errData = await urlRes.json();
        throw new Error(errData.error || "Failed to generate presigned upload URL.");
      }

      const { uploadUrl, s3Key } = await urlRes.json();

      // 2. Perform direct PUT fetch request to S3 / MinIO
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`S3 direct upload failed with status ${uploadRes.status}`);
      }

      // 3. Save Document record to PostgreSQL via API
      const docPayload = {
        fileName: file.name,
        s3Key,
        mimeType: file.type || "application/octet-stream",
        docType,
        quoteId: entityType === "QUOTE" ? entityId : null,
        orderId: entityType === "ORDER" ? entityId : null,
      };

      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docPayload),
      });

      if (!docRes.ok) {
        const errData = await docRes.json();
        throw new Error(errData.error || "Failed to save document metadata in database.");
      }

      setSuccess(`Successfully uploaded ${file.name}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      console.error("File upload error:", err);
      setError(err.message || "An error occurred during file upload. Please check MinIO/S3 connection.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Doc type selector if multiple allowed */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Upload Attachment
        </label>
        {typesToOffer.length > 1 && (
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Type:</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typesToOffer.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
            : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id={`file-upload-${entityId}`}
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300">
            <label
              htmlFor={`file-upload-${entityId}`}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {buttonLabel || "Click to browse"}
            </label>{" "}
            or drag and drop here
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            PDF, DWG, DXF, PNG, JPG, or TIFF (Direct MinIO S3 streaming)
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center space-x-2 text-xs text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
