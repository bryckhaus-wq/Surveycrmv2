"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRole } from "@/context/RoleContext";
import { Role } from "@prisma/client";
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Building,
} from "lucide-react";

interface ClientItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  clientType: string;
  defaultInvoiceRules: string | null;
  specialInstructions: string | null;
  createdAt: string;
  _count?: {
    quotes: number;
    orders: number;
  };
}

export default function AdminClientsPage() {
  const { role } = useRole();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (role === Role.ADMIN) {
      fetchClients();
    }
  }, [role]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to load clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadMessage({ type: "error", text: "Please select a CSV file first." });
      return;
    }

    try {
      setUploading(true);
      setUploadMessage(null);

      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/admin/clients/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import legacy clients.");
      }

      setUploadMessage({
        type: "success",
        text: data.message || `Successfully imported ${data.count} client(s).`,
      });

      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await fetchClients();
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      setUploadMessage({
        type: "error",
        text: err.message || "An unexpected error occurred during import.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (role !== Role.ADMIN) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Access Restricted</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The Admin Client Management panel is restricted to the <span className="font-semibold text-slate-900 dark:text-slate-100">ADMIN</span> role.
        </p>
      </div>
    );
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.address && client.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      typeFilter === "ALL" || client.clientType === typeFilter;

    return matchesSearch && matchesType;
  });

  const getClientTypeBadge = (type: string) => {
    switch (type) {
      case "Commercial Builder":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "Title Company":
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Attorney / Legal":
        return "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Engineering Firm":
        return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>Admin Client Management & Legacy Import</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Manage client records, import legacy accounts via CSV, and review billing protocols.
            </p>
          </div>
        </div>

        <Link
          href="/clients/new"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Client
        </Link>
      </div>

      {/* Bulk Import Legacy Clients (CSV) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bulk Import Legacy Clients (CSV)
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Upload a legacy client CSV file to migrate client records into the system. Duplicates with matching emails or names will be skipped automatically.
        </p>

        {uploadMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
              uploadMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {uploadMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setUploadFile(file);
              setUploadMessage(null);
            }}
            className="block w-full sm:w-auto text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800/50"
          />

          <button
            type="submit"
            disabled={uploading || !uploadFile}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Uploading & Processing...
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Upload CSV
              </>
            )}
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by client name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Account Types</option>
            <option value="Self Pay">Self Pay</option>
            <option value="Commercial Builder">Commercial Builder</option>
            <option value="Title Company">Title Company</option>
            <option value="Attorney / Legal">Attorney / Legal</option>
            <option value="Engineering Firm">Engineering Firm</option>
          </select>
        </div>
      </div>

      {/* Clients Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
            <p className="text-sm">Loading client directory...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No clients found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {searchTerm || typeFilter !== "ALL"
                ? "Try adjusting your search criteria."
                : "Add your first client to start streamlined quoting and billing."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3.5 px-4">Client Name</th>
                  <th className="py-3.5 px-4">Account Type</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Standing Instructions / Rules</th>
                  <th className="py-3.5 px-4">Activity</th>
                  <th className="py-3.5 px-4">Date Added</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {client.name}
                      </div>
                      {client.address && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {client.address}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getClientTypeBadge(
                          client.clientType
                        )}`}
                      >
                        {client.clientType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {client.email && (
                        <div className="text-slate-700 dark:text-slate-300 flex items-center mb-0.5">
                          <Mail className="w-3 h-3 mr-1 text-slate-400" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="text-slate-600 dark:text-slate-400 flex items-center">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {client.phone}
                        </div>
                      )}
                      {!client.email && !client.phone && (
                        <span className="text-slate-400 italic">No contact info</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {client.specialInstructions ? (
                        <div className="flex items-start space-x-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded border border-amber-200 dark:border-amber-800/60">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span className="truncate">{client.specialInstructions}</span>
                        </div>
                      ) : client.defaultInvoiceRules ? (
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {client.defaultInvoiceRules}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Standard protocols</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {client._count?.quotes || 0}
                      </span>{" "}
                      quotes •{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {client._count?.orders || 0}
                      </span>{" "}
                      orders
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        Client Profile
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
