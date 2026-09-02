"use client";

import React, { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Clock,
  ClipboardList,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ShieldAlert,
} from "lucide-react";

export default function AdminDataHubPage() {
  const [exportingOrders, setExportingOrders] = useState(false);
  const [exportingTimesheets, setExportingTimesheets] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExportOrders = async () => {
    try {
      setExportingOrders(true);
      const res = await fetch("/api/admin/export/orders");
      if (!res.ok) throw new Error("Failed to fetch completed orders for export.");
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        alert("No completed orders found to export.");
        return;
      }

      // Generate worksheet & workbook via xlsx
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Completed Orders");
      XLSX.writeFile(wb, "Completed_Orders.xlsx");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to export orders.");
    } finally {
      setExportingOrders(false);
    }
  };

  const handleExportTimesheets = async () => {
    try {
      setExportingTimesheets(true);
      const res = await fetch("/api/admin/export/timesheets");
      if (!res.ok) throw new Error("Failed to fetch timesheets for export.");
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        alert("No timesheets found to export.");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Timesheets");
      XLSX.writeFile(wb, "Timesheets.xlsx");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to export timesheets.");
    } finally {
      setExportingTimesheets(false);
    }
  };

  const handleImportClients = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedJson = XLSX.utils.sheet_to_json(ws);

        if (!Array.isArray(parsedJson) || parsedJson.length === 0) {
          throw new Error("No client data rows found in the selected file.");
        }

        const res = await fetch("/api/admin/import/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedJson),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to import clients.");
        }

        setImportSuccess(
          `Success: Imported ${result.count} client record(s) out of ${result.totalParsed} parsed row(s).`
        );
      } catch (err: any) {
        console.error(err);
        setImportError(err.message || "Failed to parse and import spreadsheet.");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      setImportError("Error reading the local file.");
      setImporting(false);
      e.target.value = "";
    };

    reader.readAsBinaryString(file);
  };

  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        "Client Name": "Apex Commercial Builders LLC",
        "Client Email": "accounting@apexbuilders.com",
        "Client Phone": "(713) 555-0199",
        "Client Address": "1200 Texas Ave, Suite 400, Houston, TX 77002",
        "Client Type": "Commercial Builder",
        "Default Invoice Rules": "Net 30. Require PO# on invoices.",
        "Special Instructions": "Notify Site Superintendent 24h before field crew arrival.",
      },
      {
        "Client Name": "Lone Star Title & Escrow",
        "Client Email": "closing@lonestartitle.com",
        "Client Phone": "(512) 555-8822",
        "Client Address": "800 Congress Ave, Austin, TX 78701",
        "Client Type": "Title Company",
        "Default Invoice Rules": "Payment due at closing (POC). Include GF#.",
        "Special Instructions": "Deliver certified digital plat with electronic seal.",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Template");
    XLSX.writeFile(wb, "Sample_Client_Import_Template.xlsx");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>Data & Accounting Hub</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export completed order ledgers, payroll timesheets, and bulk import legacy clients
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {importSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{importSuccess}</div>
        </div>
      )}

      {importError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{importError}</div>
        </div>
      )}

      {/* SECTION 1: EXPORT DATA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Accounting & Payroll Data Exports
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Card 1: Completed Orders */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <ClipboardList className="w-4 h-4 text-emerald-500" />
                <span>Completed Orders Ledger</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Download a clean `.xlsx` spreadsheet of all delivered and sealed survey work orders, including pricing, property addresses, client info, and regional branch IDs for QuickBooks reconciliation.
              </p>
            </div>

            <button
              onClick={handleExportOrders}
              disabled={exportingOrders}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {exportingOrders ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating Spreadsheet...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export Completed Orders (.xlsx)
                </>
              )}
            </button>
          </div>

          {/* Export Card 2: Timesheets */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>Staff Timesheet & Labor Log</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Download all recorded hours logged across Field, CAD Drafting, and Administrative tasks. Perfect for employee payroll verification and job cost accounting.
              </p>
            </div>

            <button
              onClick={handleExportTimesheets}
              disabled={exportingTimesheets}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {exportingTimesheets ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating Spreadsheet...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export Timesheets (.xlsx)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: BULK IMPORT CLIENTS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bulk Import Legacy Clients
            </h2>
          </div>

          <button
            onClick={handleDownloadSampleTemplate}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Download Sample Excel Template
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Upload your existing client rolodex or accounting customer list in Excel (`.xlsx`, `.xls`) or CSV (`.csv`) format. Duplicate records with identical names are safely skipped.
        </p>

        {/* Upload Dropzone */}
        <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-center space-y-3">
          <UploadCloud className="w-10 h-10 text-blue-500 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Select or drop your client spreadsheet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports .xlsx, .xls, and .csv files
            </p>
          </div>

          <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors">
            {importing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Parsing & Importing Records...
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Choose Excel / CSV File
              </>
            )}
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportClients}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
