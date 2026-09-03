"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileText,
  ClipboardList,
} from "lucide-react";

type TemplateType = "QUOTE_FOLLOW_UP" | "ORDER_MANUAL_UPDATE";

const TEMPLATE_OPTIONS: Array<{
  id: TemplateType;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    id: "QUOTE_FOLLOW_UP",
    label: "Quote Follow-Up",
    description: "Automated 48-hour nurture sent to prospective clients with pending proposals",
    icon: FileText,
  },
  {
    id: "ORDER_MANUAL_UPDATE",
    label: "Order Manual Update",
    description: "Template used by staff when emailing project updates directly from an order page",
    icon: ClipboardList,
  },
];

export default function EmailTemplatesPage() {
  const [templateType, setTemplateType] = useState<TemplateType>("QUOTE_FOLLOW_UP");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplate(templateType);
  }, [templateType]);

  const fetchTemplate = async (type: TemplateType) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/templates?type=${type}`);
      if (!res.ok) throw new Error("Failed to load email template.");
      const data = await res.json();
      setSubject(data.subject || "");
      setBody(data.body || "");
    } catch (err: any) {
      setError(err.message || "Failed to load template.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: templateType, subject, body }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save template.");
      }

      setSuccess(`"${templateType === "QUOTE_FOLLOW_UP" ? "Quote Follow-Up" : "Order Manual Update"}" template saved successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const dynamicVariables = [
    { key: "{{clientName}}", desc: "Full name or organization of the client." },
    { key: "{{clientEmail}}", desc: "Primary email address of the client." },
    { key: "{{clientPhone}}", desc: "Contact phone number on file." },
    { key: "{{orderId}}", desc: "Formatted order number (e.g., YY-####)." },
    { key: "{{propertyAddress}}", desc: "Site or parcel property street address." },
    { key: "{{surveyType}}", desc: "Name of the survey service (e.g., Boundary, Topographic)." },
    { key: "{{price}}", desc: "Quoted or contracted fee for the survey work." },
    { key: "{{spokeName}}", desc: "Regional branch or office handling the project." },
    { key: "{{quoteLink}}", desc: "Direct secure portal URL for proposal review." },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>Email Template Manager</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Configure templates for automated nurture sequences and manual project updates.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchTemplate(templateType)}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
          title="Reload template"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Template Type Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = templateType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTemplateType(opt.id)}
              className={`p-4 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                isSelected
                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm ring-2 ring-blue-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{opt.label}</span>
                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-800 dark:text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic Variables Guide Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Available Dynamic Variables (Subject & Body)</span>
        </div>
        <p className="text-xs text-blue-800 dark:text-blue-300">
          Insert any of the placeholders below into the subject line or message body. When generating or sending an email, they are dynamically replaced with project records:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {dynamicVariables.map((v) => (
            <div
              key={v.key}
              className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900 text-xs space-y-0.5 shadow-2xs"
            >
              <code className="font-mono font-bold text-blue-700 dark:text-blue-300 text-xs">
                {v.key}
              </code>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-snug">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Editing Template
          </label>
          <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 inline-block">
            {templateType}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Subject Line <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Update regarding your survey project for {{propertyAddress}} (Order #{{orderId}})"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Email Body Content <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={13}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Compose message template..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-sans text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/admin"
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            Back to Admin
          </Link>
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving Template..." : "Save Template Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
