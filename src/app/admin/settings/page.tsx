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
  FileText,
  Globe,
  ExternalLink,
  Plus,
  Compass,
  Tag,
  Trash2,
} from "lucide-react";

interface LeadSourceData {
  id: string;
  name: string;
  isActive: boolean;
  _count?: {
    quotes: number;
  };
}

interface CountyLinkData {
  id: string;
  county: string;
  state: string | null;
  label: string;
  url: string;
  createdAt: string;
}

interface SystemSettingsData {
  id: string;
  companyName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  themeColor: string;
  proposalTerms?: string | null;
  quoteEmailSubject?: string | null;
  quoteEmailTemplate?: string | null;
  orderConfirmEmailSubject?: string | null;
  orderConfirmEmailTemplate?: string | null;
  updatedAt?: string;
}

export default function CompanyProfileSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsData>({
    id: "default",
    companyName: "Survey CRM",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    themeColor: "#0f172a",
    proposalTerms: "",
    quoteEmailSubject: "",
    quoteEmailTemplate: "",
    orderConfirmEmailSubject: "",
    orderConfirmEmailTemplate: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lead Sources State
  const [leadSources, setLeadSources] = useState<LeadSourceData[]>([]);
  const [newLeadSourceName, setNewLeadSourceName] = useState("");
  const [creatingLeadSource, setCreatingLeadSource] = useState(false);

  // County Links State
  const [countyLinks, setCountyLinks] = useState<CountyLinkData[]>([]);
  const [newCounty, setNewCounty] = useState("");
  const [newState, setNewState] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creatingCountyLink, setCreatingCountyLink] = useState(false);
  const [countyCsvFile, setCountyCsvFile] = useState<File | null>(null);
  const [importingCountyCsv, setImportingCountyCsv] = useState(false);
  const [countyCsvMessage, setCountyCsvMessage] = useState<string | null>(null);
  const [countyCsvError, setCountyCsvError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchLeadSources();
    fetchCountyLinks();
  }, []);

  const fetchLeadSources = async () => {
    try {
      const res = await fetch("/api/admin/lead-sources");
      if (res.ok) {
        const data = await res.json();
        setLeadSources(data);
      }
    } catch (err) {
      console.error("Failed to load lead sources:", err);
    }
  };

  const fetchCountyLinks = async () => {
    try {
      const res = await fetch("/api/admin/county-links");
      if (res.ok) {
        const data = await res.json();
        setCountyLinks(data);
      }
    } catch (err) {
      console.error("Failed to load county links:", err);
    }
  };

  const handleCreateLeadSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadSourceName.trim()) return;

    try {
      setCreatingLeadSource(true);
      setError(null);
      const res = await fetch("/api/admin/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeadSourceName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create lead source");
      }

      setNewLeadSourceName("");
      await fetchLeadSources();
      setSuccessMessage("Lead source created successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to add lead source.");
    } finally {
      setCreatingLeadSource(false);
    }
  };

  const handleCreateCountyLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounty.trim() || !newLabel.trim() || !newUrl.trim()) {
      setError("Please fill out all required County Link fields.");
      return;
    }

    try {
      setCreatingCountyLink(true);
      setError(null);
      const res = await fetch("/api/admin/county-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          county: newCounty.trim(),
          state: newState.trim().toUpperCase() || null,
          label: newLabel.trim(),
          url: newUrl.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create county link");
      }

      setNewCounty("");
      setNewState("");
      setNewLabel("");
      setNewUrl("");
      await fetchCountyLinks();
      setSuccessMessage("County portal link created successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to add county link.");
    } finally {
      setCreatingCountyLink(false);
    }
  };

  const handleUploadCountyCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countyCsvFile) return;

    try {
      setImportingCountyCsv(true);
      setCountyCsvError(null);
      setCountyCsvMessage(null);

      const formData = new FormData();
      formData.append("file", countyCsvFile);

      const res = await fetch("/api/admin/county-links/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import CSV");
      }

      setCountyCsvMessage(data.message || `Successfully imported ${data.count} county link records.`);
      setCountyCsvFile(null);
      await fetchCountyLinks();
    } catch (err: any) {
      setCountyCsvError(err.message || "Failed to import county links CSV.");
    } finally {
      setImportingCountyCsv(false);
    }
  };

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
        proposalTerms: data.proposalTerms || "",
        quoteEmailSubject: data.quoteEmailSubject || "",
        quoteEmailTemplate: data.quoteEmailTemplate || "",
        orderConfirmEmailSubject: data.orderConfirmEmailSubject || "",
        orderConfirmEmailTemplate: data.orderConfirmEmailTemplate || "",
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
        proposalTerms: data.proposalTerms || "",
        quoteEmailSubject: data.quoteEmailSubject || "",
        quoteEmailTemplate: data.quoteEmailTemplate || "",
        orderConfirmEmailSubject: data.orderConfirmEmailSubject || "",
        orderConfirmEmailTemplate: data.orderConfirmEmailTemplate || "",
      });
      setSuccessMessage("Company profile settings saved successfully.");
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
        <p className="text-sm font-medium">Loading company profile configurations...</p>
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
              Company Profile
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

        {/* Proposal Terms and Conditions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            Proposal Terms and Conditions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These default terms and conditions will automatically appear at the bottom of generated Quote Proposals.
          </p>
          <div>
            <textarea
              rows={8}
              value={settings.proposalTerms || ""}
              onChange={(e) => handleInputChange("proposalTerms", e.target.value)}
              placeholder="Enter standard contract terms, payment timelines, property access requirements, copyright notices, etc."
              className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono leading-relaxed text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Email Communication Templates */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <Mail className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
            Email Templates
          </h2>

          {/* Quote Email Template */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Quote Email Subject
              </label>
              <input
                type="text"
                value={settings.quoteEmailSubject || ""}
                onChange={(e) => handleInputChange("quoteEmailSubject", e.target.value)}
                placeholder="Survey Proposal from {{companyName}} - Quote #{{quoteNumber}}"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Quote Email Template
              </label>
              <textarea
                rows={6}
                value={settings.quoteEmailTemplate || ""}
                onChange={(e) => handleInputChange("quoteEmailTemplate", e.target.value)}
                placeholder="Dear {{clientName}},\n\nPlease find attached the official Survey Proposal for your project at {{address}} (Quote #{{quoteNumber}}).\n\nInvestment: {{priceDue}}\nEstimated Completion: {{estimatedCompletion}}\nFile #: {{clientFileNumber}}\n\nBest regards,\nSurvey Team"
                className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono leading-relaxed text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex flex-wrap gap-1 items-center">
                <span>Available placeholders:</span>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;clientName&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;quoteNumber&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;address&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;priceDue&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;estimatedCompletion&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;clientFileNumber&#125;&#125;</code>
              </div>
            </div>
          </div>

          {/* Order Confirmation Template */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Order Confirmation Subject
              </label>
              <input
                type="text"
                value={settings.orderConfirmEmailSubject || ""}
                onChange={(e) => handleInputChange("orderConfirmEmailSubject", e.target.value)}
                placeholder="Order Confirmation: {{orderNumber}} - {{address}}"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Order Confirmation Template
              </label>
              <textarea
                rows={6}
                value={settings.orderConfirmEmailTemplate || ""}
                onChange={(e) => handleInputChange("orderConfirmEmailTemplate", e.target.value)}
                placeholder="Dear {{clientName}},\n\nYour work order #{{orderNumber}} for {{address}} has been confirmed and placed into our active project schedule.\n\nBalance Due: {{priceDue}}\nEstimated Completion: {{estimatedCompletion}}\nFile #: {{clientFileNumber}}\n\nThank you for your business!"
                className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono leading-relaxed text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex flex-wrap gap-1 items-center">
                <span>Available placeholders:</span>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;clientName&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;orderNumber&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;address&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;priceDue&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;estimatedCompletion&#125;&#125;</code>
                <code className="px-1 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded font-mono text-[10px]">&#123;&#123;clientFileNumber&#125;&#125;</code>
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
                Save Company Profile
              </>
            )}
          </button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* LEAD SOURCES MANAGEMENT */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Lead Acquisition Sources
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Define marketing and inbound channels (e.g. Google Ads, Realtor Referral, Title Office, Direct Mail) for quote tracking.
        </p>

        {/* Add Lead Source Form */}
        <form onSubmit={handleCreateLeadSource} className="flex gap-2">
          <input
            type="text"
            value={newLeadSourceName}
            onChange={(e) => setNewLeadSourceName(e.target.value)}
            placeholder="e.g. Realtor Referral, Google Search, Title Company"
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creatingLeadSource || !newLeadSourceName.trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {creatingLeadSource ? "Adding..." : "Add Source"}
          </button>
        </form>

        {/* Lead Source List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {leadSources.map((ls) => (
            <div
              key={ls.id}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-center justify-between text-xs"
            >
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {ls.name}
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full">
                {ls._count?.quotes ?? 0} Quotes
              </span>
            </div>
          ))}
          {leadSources.length === 0 && (
            <div className="col-span-full p-4 text-center text-xs text-slate-400 italic">
              No lead sources added yet. Add your first marketing channel above.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COUNTY PROPERTY PORTALS & LINKS */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            County GIS & Property Appraiser Portals
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add county-level research links (Property Appraiser, Clerk of Court, GIS Maps) that will automatically appear when inspecting quotes in that county.
        </p>

        {/* Add County Link Form */}
        <form onSubmit={handleCreateCountyLink} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              County Name *
            </label>
            <input
              type="text"
              required
              value={newCounty}
              onChange={(e) => setNewCounty(e.target.value)}
              placeholder="e.g. Orange"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              State (Optional)
            </label>
            <input
              type="text"
              maxLength={2}
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              placeholder="FL"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs uppercase text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Portal Label *
            </label>
            <input
              type="text"
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Property Appraiser"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Portal URL *
            </label>
            <input
              type="url"
              required
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://ocpafl.org"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={creatingCountyLink}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {creatingCountyLink ? "Saving Link..." : "Save County Link"}
            </button>
          </div>
        </form>

        {/* Bulk Import CSV Section */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Bulk Import County Links via CSV
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload a spreadsheet with column headers: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">State</code>, <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">County</code>, <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">URL</code> (and optional <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">Label</code>).
          </p>

          {countyCsvError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{countyCsvError}</span>
            </div>
          )}
          {countyCsvMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{countyCsvMessage}</span>
            </div>
          )}

          <form onSubmit={handleUploadCountyCsv} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="file"
              accept=".csv"
              disabled={importingCountyCsv}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCountyCsvFile(file);
                setCountyCsvError(null);
                setCountyCsvMessage(null);
              }}
              className="flex-1 text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950/60 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
            />
            <button
              type="submit"
              disabled={importingCountyCsv || !countyCsvFile}
              className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            >
              {importingCountyCsv ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload & Import CSV
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing County Links Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5">County</th>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5">Portal Label</th>
                <th className="px-4 py-2.5">URL / Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {countyLinks.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                    {link.county}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {link.state || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">
                    {link.label}
                  </td>
                  <td className="px-4 py-2.5">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs"
                    >
                      {link.url}
                      <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                    </a>
                  </td>
                </tr>
              ))}
              {countyLinks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">
                    No county portal links configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
