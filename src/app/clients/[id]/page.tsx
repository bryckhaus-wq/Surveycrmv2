"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  AlertTriangle,
  FileText,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Plus,
} from "lucide-react";

interface QuoteItem {
  id: string;
  quoteNumber: number;
  price: string | number;
  status: string;
  createdAt: string;
  surveyType?: { name: string };
  csr?: { name: string } | null;
}

interface OrderItem {
  id: string;
  orderNumber: string;
  address: string;
  status: string;
  createdAt: string;
  surveyType?: { name: string };
  assignedUser?: { name: string; role: string } | null;
}

interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  clientType: string;
  defaultInvoiceRules: string | null;
  specialInstructions: string | null;
  createdAt: string;
  quotes: QuoteItem[];
  orders: OrderItem[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [clientType, setClientType] = useState("Self Pay");
  const [defaultInvoiceRules, setDefaultInvoiceRules] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const data: ClientDetail = await res.json();
        setClient(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setClientType(data.clientType || "Self Pay");
        setDefaultInvoiceRules(data.defaultInvoiceRules || "");
        setSpecialInstructions(data.specialInstructions || "");
      } else {
        setError("Failed to load client details.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching client.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Client name cannot be blank.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          clientType,
          defaultInvoiceRules: defaultInvoiceRules.trim() || null,
          specialInstructions: specialInstructions.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update client profile.");
      }

      setSuccess("Client profile and billing protocols saved successfully.");
      fetchClient();
    } catch (err: any) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
        <p className="text-sm">Loading client profile...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Client Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">The requested client account could not be found.</p>
        <Link
          href="/clients"
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/clients"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Directory
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {client.name}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {client.clientType}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Account Created: {new Date(client.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href={`/quotes/new`}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Quote for Client
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* Editable Details Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <Building className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Client Profile & Standing Terms
            </h2>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Client / Company Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Account Type
              </label>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Self Pay">Self Pay / Individual Homeowner</option>
                <option value="Commercial Builder">Commercial Builder / General Contractor</option>
                <option value="Title Company">Title & Escrow Company</option>
                <option value="Attorney / Legal">Attorney / Legal Firm</option>
                <option value="Engineering Firm">Engineering / Architecture Firm</option>
                <option value="Municipal / Government">Municipal / Government Entity</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Billing Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="billing@example.com"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Office / Mailing Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Mailing Address"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Invoicing Rules */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Default Invoicing & Billing Rules
              </label>
              <textarea
                rows={3}
                value={defaultInvoiceRules}
                onChange={(e) => setDefaultInvoiceRules(e.target.value)}
                placeholder="e.g. Net 30 billing. Requires PO# on all invoices."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Special Instructions */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Standing Surveyor Field & Legal Special Instructions
              </label>
              <textarea
                rows={3}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Always call site superintendent 24h prior to entry."
                className="w-full p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Historical Quotes & Active Orders Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quotes Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              Quotes ({client.quotes?.length || 0})
            </h3>
          </div>

          {client.quotes && client.quotes.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {client.quotes.map((q) => (
                <div key={q.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div>
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      Quote #{q.quoteNumber}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {q.surveyType?.name || "Survey"} • {new Date(q.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      ${Number(q.price).toFixed(2)}
                    </span>
                    <Link
                      href={`/quotes/${q.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-medium"
                    >
                      View <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-xs text-slate-500 dark:text-slate-400 text-center italic">
              No quotes created for this client yet.
            </p>
          )}
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <ClipboardList className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400" />
              Work Orders ({client.orders?.length || 0})
            </h3>
          </div>

          {client.orders && client.orders.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {client.orders.map((o) => (
                <div key={o.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div>
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {o.orderNumber}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 truncate max-w-xs">
                      {o.address}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded">
                      {o.status}
                    </span>
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-medium"
                    >
                      Job <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-xs text-slate-500 dark:text-slate-400 text-center italic">
              No orders active for this client yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
