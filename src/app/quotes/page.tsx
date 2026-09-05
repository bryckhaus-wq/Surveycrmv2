"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Search, FileText, ArrowRight, CheckCircle2, Clock, XCircle, BarChart3 } from "lucide-react";

interface QuoteItem {
  id: string;
  quoteNumber: number;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: string | number;
  status: "NEW" | "WON" | "LOST" | string;
  surveyType: { id: string; name: string };
  csr: { id: string; name: string } | null;
  convertedOrder?: { id: string; orderNumber: string } | null;
  createdAt: string;
}

export default function QuotesPage() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quotes");
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (err) {
      console.error("Failed to load quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteNumber.toString().includes(searchTerm);
    const matchesStatus =
      statusFilter === "ALL" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            NEW
          </span>
        );
      case "WON":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            WON
          </span>
        );
      case "LOST":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3 mr-1" />
            LOST
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Quotes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage survey estimates, client details, and convert won proposals into work orders.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/quotes/reports"
              className="inline-flex items-center justify-center px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <BarChart3 className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              Conversion Reports
            </Link>
          )}
          <Link
            href="/quotes/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create New Quote
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by quote #, client, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
            <p className="text-sm">Loading quotes...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No quotes found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {searchTerm || statusFilter !== "ALL"
                ? "Try adjusting your search filters."
                : "Get started by creating your first survey quote."}
            </p>
            {!searchTerm && statusFilter === "ALL" && (
              <Link
                href="/quotes/new"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Quote
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3.5 px-4">Quote #</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Property Address</th>
                  <th className="py-3.5 px-4">Survey Type</th>
                  <th className="py-3.5 px-4">Assigned CSR</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      #{quote.quoteNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {quote.clientName}
                      </div>
                      {quote.clientEmail && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {quote.clientEmail}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200">{quote.address}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {quote.city}, {quote.state} {quote.zip}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {quote.surveyType?.name || "Standard"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {quote.csr?.name || <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      ${Number(quote.price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(quote.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      {quote.convertedOrder ? (
                        <Link
                          href={`/orders/${quote.convertedOrder.id}`}
                          className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md"
                        >
                          Order {quote.convertedOrder.orderNumber}
                        </Link>
                      ) : null}
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        View Details
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
