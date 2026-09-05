"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRole } from "@/context/RoleContext";
import { Role } from "@prisma/client";
import { hasFinancialAccess } from "@/lib/rbac";
import {
  Search,
  ClipboardList,
  ArrowRight,
  Clock,
  Compass,
  FileCheck,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";

interface OrderItem {
  id: string;
  orderNumber: string;
  clientName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: "FIELD_PENDING" | "DRAFTING" | "REVIEW" | "COMPLETED" | string;
  surveyType: { id: string; name: string };
  assignedUser: { id: string; name: string; role: string } | null;
  quote?: { id: string; quoteNumber: number; price: string | number } | null;
  createdAt: string;
}

interface OrderMetadata {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export default function OrdersPage() {
  const { role } = useRole();
  const { data: session } = useSession();
  const canViewFinancials = hasFinancialAccess(session?.user?.role || role);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [metadata, setMetadata] = useState<OrderMetadata>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 25,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchOrders(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  const fetchOrders = async (page: number, status: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        status: status,
      });

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
          setMetadata(data.metadata);
        } else if (Array.isArray(data)) {
          setOrders(data);
          setMetadata({
            totalCount: data.length,
            totalPages: 1,
            currentPage: 1,
            limit: 25,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= metadata.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Role-based visibility filtering
  const roleFilteredOrders = orders.filter((order) => {
    if (role === Role.FIELD_WORKER) {
      return order.status === "FIELD_PENDING";
    }
    if (role === Role.DRAFTER) {
      return order.status === "DRAFTING";
    }
    if (role === Role.SIGNING_SURVEYOR) {
      return order.status === "REVIEW" || order.status === "COMPLETED";
    }
    // ADMIN and CSR see all orders
    return true;
  });

  const finalFilteredOrders = roleFilteredOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FIELD_PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Compass className="w-3 h-3 mr-1" />
            FIELD PENDING
          </span>
        );
      case "DRAFTING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Clock className="w-3 h-3 mr-1" />
            DRAFTING
          </span>
        );
      case "REVIEW":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <FileCheck className="w-3 h-3 mr-1" />
            REVIEW
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            COMPLETED
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
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Work Orders
            </h1>
            <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md font-mono font-medium border border-slate-300 dark:border-slate-700">
              Role View: {role.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Track survey projects across Field Work, CAD Drafting, Surveyor Review, and Final Delivery.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          {role === Role.ADMIN && (
            <Link
              href="/orders/reports"
              className="inline-flex items-center justify-center px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <BarChart3 className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              Order Reports
            </Link>
          )}
        </div>
      </div>

      {/* Role notice banner if filtered */}
      {(role === Role.FIELD_WORKER || role === Role.DRAFTER || role === Role.SIGNING_SURVEYOR) && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 flex items-center text-xs text-blue-900 dark:text-blue-300 font-medium">
          <Filter className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span>
            Displaying tasks assigned to your role ({role.replace("_", " ")}).
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search order #, client, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {(role === Role.ADMIN || role === Role.CSR) && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="FIELD_PENDING">FIELD PENDING</option>
              <option value="DRAFTING">DRAFTING</option>
              <option value="REVIEW">REVIEW</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
            <p className="text-sm">Loading work orders...</p>
          </div>
        ) : finalFilteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No orders found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {role !== Role.ADMIN && role !== Role.CSR
                ? `There are currently no active jobs in the queue for ${role.replace("_", " ")}.`
                : "Convert quotes into orders to populate your active workload."}
            </p>
            {(role === Role.ADMIN || role === Role.CSR) && (
              <Link
                href="/quotes"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Go to Quotes
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Job Location</th>
                  <th className="py-3.5 px-4">Survey Type</th>
                  <th className="py-3.5 px-4">Assigned Specialist</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {finalFilteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {order.clientName}
                      </div>
                      {order.quote && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          From Quote #{order.quote.quoteNumber}
                          {canViewFinancials && order.quote.price ? ` ($${Number(order.quote.price).toFixed(2)})` : ""}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200">
                        {order.address}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {order.city}, {order.state} {order.zip}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {order.surveyType?.name || "Standard Survey"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {order.assignedUser ? (
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {order.assignedUser.name}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            {order.assignedUser.role}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 italic">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        Manage Job
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && metadata.totalCount > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing Page <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{metadata.totalPages}</span> ({metadata.totalCount} total orders)
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </button>

              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                {currentPage} / {metadata.totalPages}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= metadata.totalPages}
                className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
