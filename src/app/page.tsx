import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFinancialAccess, FIELD_WORKER } from "@/lib/rbac";
import {
  FileText,
  ClipboardList,
  CheckCircle2,
  Plus,
  ArrowRight,
  Compass,
  Clock,
  Building2,
  Wrench,
  MapPin,
  Calendar,
  Navigation,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  const isFieldWorker = userRole === FIELD_WORKER;
  const canViewFinancials = hasFinancialAccess(userRole);

  // Fetch metrics based on role
  const [
    newQuotesCount,
    fieldPendingOrdersCount,
    draftingOrdersCount,
    completedOrdersCount,
    myPendingJobsCount,
    recentOrders,
    settings,
  ] = await Promise.all([
    !isFieldWorker
      ? prisma.quote.count({
          where: { status: "NEW" },
        })
      : Promise.resolve(0),
    prisma.order.count({
      where: { status: "FIELD_PENDING" },
    }),
    prisma.order.count({
      where: { status: "DRAFTING" },
    }),
    prisma.order.count({
      where: { status: "COMPLETED" },
    }),
    isFieldWorker && session?.user?.id
      ? prisma.order.count({
          where: {
            status: "FIELD_PENDING",
            assignedUserId: session.user.id,
          },
        })
      : Promise.resolve(0),
    prisma.order.findMany({
      where: isFieldWorker && session?.user?.id
        ? {
            OR: [
              { status: "FIELD_PENDING" },
              { assignedUserId: session.user.id },
            ],
          }
        : undefined,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        surveyType: true,
        assignedUser: true,
        quote: {
          select: {
            quoteNumber: true,
            price: true,
          },
        },
      },
    }),
    prisma.systemSettings.findFirst(),
  ]);

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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-700 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <span>{isFieldWorker ? "Field Crew Operations" : "Executive Overview"}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {settings?.companyName ? `${settings.companyName} Management Platform` : "Survey Management Platform"}
          </h1>
          <p className="text-slate-300 dark:text-slate-400 text-sm mt-1 max-w-2xl">
            {isFieldWorker
              ? "Access field assignments, inspect property boundaries, record field observations, and view dispatcher routing."
              : "Streamline boundary, topographic, and commercial land survey workflows from customer intake to stamped CAD deliverable."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isFieldWorker ? (
            <>
              <Link
                href="/map"
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition-colors"
              >
                <MapPin className="w-4 h-4 mr-1.5" />
                Routing Map
              </Link>
              <Link
                href="/schedule"
                className="inline-flex items-center px-4 py-2.5 bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 border border-slate-600 dark:border-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                14-Day Schedule
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/quotes/new"
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Quote
              </Link>
              <Link
                href="/orders"
                className="inline-flex items-center px-4 py-2.5 bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 border border-slate-600 dark:border-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <ClipboardList className="w-4 h-4 mr-1.5" />
                Work Orders
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isFieldWorker ? (
          <>
            {/* Field Worker Card 1: My Pending Jobs */}
            <Link
              href="/orders"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">My Assigned Jobs</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors">
                  <Compass className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {myPendingJobsCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assigned specifically to you</p>
            </Link>

            {/* Field Worker Card 2: All Field Pending */}
            <Link
              href="/orders"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Open Field Queue</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 transition-colors">
                  <ClipboardList className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {fieldPendingOrdersCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ready for field measurement</p>
            </Link>

            {/* Field Worker Card 3: Live Routing Map Link */}
            <Link
              href="/map"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Live Routing Map</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center pt-2">
                <span>View Map</span>
                <ArrowRight className="w-4 h-4 ml-1.5 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pinpoint site locations & routes</p>
            </Link>

            {/* Field Worker Card 4: 14-Day Capacity Schedule */}
            <Link
              href="/schedule"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Work Schedule</span>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center pt-2">
                <span>14-Day View</span>
                <ArrowRight className="w-4 h-4 ml-1.5 text-purple-500" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Branch load & scheduled jobs</p>
            </Link>
          </>
        ) : (
          <>
            {/* Metric 1: Quotes where status is NEW */}
            <Link
              href="/quotes"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">New Quotes</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {newQuotesCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Awaiting customer acceptance</p>
            </Link>

            {/* Metric 2: Orders where status is FIELD_PENDING */}
            <Link
              href="/orders"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Field Pending</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 transition-colors">
                  <Compass className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {fieldPendingOrdersCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Field measurements queue</p>
            </Link>

            {/* Metric 3: Orders where status is DRAFTING */}
            <Link
              href="/orders"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">In Drafting</span>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60 transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {draftingOrdersCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">CAD drafting & plat preparation</p>
            </Link>

            {/* Metric 4: Orders where status is COMPLETED */}
            <Link
              href="/orders"
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed Orders</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {completedOrdersCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stamped & delivered to clients</p>
            </Link>
          </>
        )}
      </div>

      {/* Most Recently Created Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isFieldWorker ? "Recent Field Orders" : "Recent Work Orders"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live snapshot of recent orders
            </p>
          </div>
          <Link
            href="/orders"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            View All Orders
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No work orders recorded yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Active orders will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Job Address</th>
                  <th className="py-3.5 px-4">Survey Type</th>
                  <th className="py-3.5 px-4">Assigned Specialist</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {order.clientName}
                      </div>
                      {order.quote && canViewFinancials && order.quote.price && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Quote #{order.quote.quoteNumber} (${Number(order.quote.price).toFixed(2)})
                        </div>
                      )}
                      {order.quote && (!canViewFinancials || !order.quote.price) && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Quote #{order.quote.quoteNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200">{order.address}</div>
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
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{order.assignedUser.name}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{order.assignedUser.role.replace("_", " ")}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>
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
                        Manage
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {canViewFinancials && (
          <Link
            href="/quotes"
            className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Quotes</span>
              <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Proposals & pricing
            </p>
          </Link>
        )}

        <Link
          href="/orders"
          className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
            <ClipboardList className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
            <span>Orders</span>
            <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Field & CAD workflows
          </p>
        </Link>

        <Link
          href="/map"
          className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
            <span>Routing Map</span>
            <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Live dispatch locations
          </p>
        </Link>

        <Link
          href="/schedule"
          className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
            <span>Schedule</span>
            <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            14-Day capacity timeline
          </p>
        </Link>

        <Link
          href="/timesheets"
          className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
            <span>Timesheets</span>
            <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Staff labor logs
          </p>
        </Link>
      </div>
    </div>
  );
}
