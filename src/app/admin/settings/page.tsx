"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Palette,
  Image as ImageIcon,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
} from "lucide-react";

interface SystemSettingsData {
  id: string;
  companyName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  themeColor: string;
  updatedAt?: string;
}

export default function WhiteLabelSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsData>({
    id: "default",
    companyName: "Survey CRM",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    themeColor: "#0f172a",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        throw new Error("Failed to load system settings");
      }
      const data = await res.json();
      setSettings({
        id: data.id || "default",
        companyName: data.companyName || "Survey CRM",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        logoUrl: data.logoUrl || "",
        themeColor: data.themeColor || "#0f172a",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SystemSettingsData, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      setError(null);

      const presignRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "image/png",
          folder: "branding",
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Failed to obtain upload authorization");
      }

      const { uploadUrl, s3Key } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/png",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Direct upload to storage failed");
      }

      // Construct accessible URL from S3 key or direct endpoint
      const finalLogoUrl = `/api/documents/branding/${s3Key.split("/").pop()}` || uploadUrl.split("?")[0];
      setSettings((prev) => ({
        ...prev,
        logoUrl: uploadUrl.split("?")[0],
      }));

      setSuccessMessage("Logo image uploaded successfully. Click Save to persist.");
    } catch (err: any) {
      console.error("Logo upload error:", err);
      setError(err.message || "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      const data = await res.json();
      setSettings({
        id: data.id || "default",
        companyName: data.companyName || "Survey CRM",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        logoUrl: data.logoUrl || "",
        themeColor: data.themeColor || "#0f172a",
      });
      setSuccessMessage("White-label system settings saved successfully.");
    } catch (err: any) {
      console.error("Save settings error:", err);
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-sm font-medium">Loading white-label configurations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Admin
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              White-Label Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize your company branding, invoice headers, and theme appearance.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{successMessage}</div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            Company Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Company / Firm Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={settings.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                placeholder="e.g. MJS Land Surveying, PLLC"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Official Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Official Contact Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Office / Billing Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Business Ave, Suite 100, City, ST 12345"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Branding & Visual Theme */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <Palette className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            Branding & Visual Theme
          </h2>

          <div className="space-y-4">
            {/* Logo Configuration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Company Logo URL / File
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={settings.logoUrl || ""}
                    onChange={(e) => handleInputChange("logoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png or uploaded storage path"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <label className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer transition-colors whitespace-nowrap">
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Upload Logo Image
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingLogo}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {settings.logoUrl && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Preview:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.logoUrl}
                    alt="Logo preview"
                    className="max-h-10 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Theme Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Brand Accent / Navigation Theme Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.themeColor}
                  onChange={(e) => handleInputChange("themeColor", e.target.value)}
                  className="w-12 h-10 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={settings.themeColor}
                  onChange={(e) => handleInputChange("themeColor", e.target.value)}
                  placeholder="#0f172a"
                  className="w-36 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 font-mono focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div
                  className="h-10 px-4 rounded-lg flex items-center text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: settings.themeColor }}
                >
                  Preview Color
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Settings...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save White-Label Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
