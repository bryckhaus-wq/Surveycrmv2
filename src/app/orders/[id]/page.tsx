"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRole } from "@/context/RoleContext";
import { Role } from "@prisma/client";
import { hasFinancialAccess } from "@/lib/rbac";
import {
  ArrowLeft,
  CheckCircle,
  FileCheck,
  MapPin,
  User,
  AlertCircle,
  Save,
  Clock,
  Compass,
  FileText,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Receipt,
  Users,
  Calendar,
  Paperclip,
  Upload,
  ExternalLink,
  Loader2,
  History,
  Mail,
  MessageSquare,
  X,
  Ban,
  Building,
  DollarSign,
  Briefcase,
  Layers,
  Scale,
  PauseCircle,
  Lock,
  Trash2,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";

interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string | null;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
}

interface EmailLogItem {
  id: string;
  subject: string;
  body: string;
  sentTo: string;
  sentAt: string;
  quoteId?: string | null;
  orderId?: string | null;
}

interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  clientType: string;
  defaultInvoiceRules: string | null;
  specialInstructions: string | null;
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
  email?: string;
}

interface SpokeOption {
  id: string;
  name: string;
  shortName: string;
  state?: string | null;
}

interface SurveyTypeOption {
  id: string;
  name: string;
  defaultPrice?: number | string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  clientName: string;
  clientId?: string | null;
  client?: ClientData | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  status:
    | "FIELD_PENDING"
    | "DRAFTING"
    | "REVIEW"
    | "COMPLETED"
    | "CANCELLED"
    | "HOLD_REVIEW"
    | "HOLD_CLIENT"
    | string;
  fieldNotes: string | null;
  orderedBy?: string | null;
  fieldDueDate?: string | null;
  clientDueDate?: string | null;
  internalDueDate?: string | null;
  closingDate?: string | null;
  scheduledDate?: string | null;
  completionDate?: string | null;
  county?: string | null;
  taxParcelId?: string | null;
  lot?: string | null;
  block?: string | null;
  subdivision?: string | null;
  surveyTypeId?: string | null;
  surveyType?: { id: string; name: string } | null;
  surveyTypeCustom?: string | null;
  specialInstructions?: string | null;
  internalDraftingNotes?: string | null;
  isFhaVaLoan?: boolean;
  crewComments?: string | null;
  pointsOfInterest?: string | null;
  surveyPrice?: number;
  miscAmt?: number;
  miscAmtDescription?: string | null;
  discountAmt?: number;
  depositPaid?: number;
  finalPaymentReceived?: number;
  taxRate?: number;
  researcherId?: string | null;
  fieldCrewId?: string | null;
  drafterId?: string | null;
  checkerId?: string | null;
  signingSurveyorId?: string | null;
  assignedUserId?: string | null;
  marketerId?: string | null;
  spokeId?: string | null;
  researcher?: StaffUser | null;
  fieldCrew?: StaffUser | null;
  drafter?: StaffUser | null;
  checker?: StaffUser | null;
  signingSurveyor?: StaffUser | null;
  assignedUser?: StaffUser | null;
  marketer?: StaffUser | null;
  spoke?: { id: string; name: string; shortName: string } | null;
  quoteId?: string | null;
  quote?: {
    id: string;
    quoteNumber: number;
    price: string | number;
    client?: ClientData | null;
  } | null;
  documents: Array<{
    id: string;
    fileName: string;
    docType: string;
    uploadedAt: string;
    s3Key: string;
  }>;
  emailLogs?: EmailLogItem[];
  createdAt: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { role } = useRole();
  const { data: session } = useSession();
  const canViewFinancials = hasFinancialAccess(session?.user?.role || role);

  const userRole = (session?.user?.role || role) as string;
  const canEditDraftingNotes =
    userRole === "ADMIN" ||
    userRole === "DRAFTER" ||
    userRole === "SIGNING_SURVEYOR";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [spokes, setSpokes] = useState<SpokeOption[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<SurveyTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Edit State
  const [formData, setFormData] = useState({
    spokeId: "",
    surveyTypeId: "",
    surveyType: "",
    orderedBy: "",
    clientEmail: "",
    clientPhone: "",
    specialInstructions: "",
    internalDraftingNotes: "",
    isFhaVaLoan: false,
    clientDueDate: "",
    internalDueDate: "",
    closingDate: "",
    scheduledDate: "",
    fieldDueDate: "",
    completionDate: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    county: "",
    taxParcelId: "",
    lot: "",
    block: "",
    subdivision: "",
    researcherId: "",
    fieldCrewId: "",
    drafterId: "",
    checkerId: "",
    signingSurveyorId: "",
    assignedUserId: "",
    marketerId: "",
    surveyPrice: 0,
    miscAmt: 0,
    miscAmtDescription: "",
    discountAmt: 0,
    depositPaid: 0,
    finalPaymentReceived: 0,
    taxRate: 0,
    pointsOfInterest: "",
    crewComments: "",
    fieldNotes: "",
  });

  // Email Client Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<
    Array<{ id: string; fileName: string; s3Key?: string; docType?: string }>
  >([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);

  // Team Email Modal State
  const [isTeamEmailModalOpen, setIsTeamEmailModalOpen] = useState(false);
  const [selectedStaffEmails, setSelectedStaffEmails] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<
    Array<{ id: string; name: string; email: string; role?: string }>
  >([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [teamEmailSubject, setTeamEmailSubject] = useState("");
  const [teamEmailBody, setTeamEmailBody] = useState("");
  const [selectedTeamAttachments, setSelectedTeamAttachments] = useState<
    Array<{ id: string; fileName: string; s3Key?: string; docType?: string }>
  >([]);
  const [sendingTeamEmail, setSendingTeamEmail] = useState(false);
  const [teamEmailError, setTeamEmailError] = useState<string | null>(null);

  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const populateFormState = (data: OrderDetail) => {
    setFormData({
      spokeId: data.spokeId || data.spoke?.id || "",
      surveyTypeId: data.surveyTypeId || data.surveyType?.id || "",
      surveyType: data.surveyTypeCustom || data.surveyType?.name || "",
      orderedBy: data.orderedBy || "",
      clientEmail: data.client?.email || data.quote?.client?.email || "",
      clientPhone: data.client?.phone || data.quote?.client?.phone || "",
      specialInstructions: data.specialInstructions || "",
      internalDraftingNotes: data.internalDraftingNotes || "",
      isFhaVaLoan: Boolean(data.isFhaVaLoan),
      clientDueDate: formatDateForInput(data.clientDueDate),
      internalDueDate: formatDateForInput(data.internalDueDate),
      closingDate: formatDateForInput(data.closingDate),
      scheduledDate: formatDateForInput(data.scheduledDate),
      fieldDueDate: formatDateForInput(data.fieldDueDate),
      completionDate: formatDateForInput(data.completionDate),
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
      county: data.county || "",
      taxParcelId: data.taxParcelId || "",
      lot: data.lot || "",
      block: data.block || "",
      subdivision: data.subdivision || "",
      researcherId: data.researcherId || "",
      fieldCrewId: data.fieldCrewId || "",
      drafterId: data.drafterId || "",
      checkerId: data.checkerId || "",
      signingSurveyorId: data.signingSurveyorId || "",
      assignedUserId: data.assignedUserId || "",
      marketerId: data.marketerId || "",
      surveyPrice: data.surveyPrice ?? 0,
      miscAmt: data.miscAmt ?? 0,
      miscAmtDescription: data.miscAmtDescription || "",
      discountAmt: data.discountAmt ?? 0,
      depositPaid: data.depositPaid ?? 0,
      finalPaymentReceived: data.finalPaymentReceived ?? 0,
      taxRate: data.taxRate ?? 0,
      pointsOfInterest: data.pointsOfInterest || "",
      crewComments: data.crewComments || "",
      fieldNotes: data.fieldNotes || "",
    });
  };

  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchUsers();
      fetchSpokes();
      fetchSurveyTypes();
      fetchAuditLogs();
    }
  }, [id]);

  // Auto-set Spoke to New York branch if state is NY / New York
  useEffect(() => {
    if (!formData.state || spokes.length === 0) return;
    const st = formData.state.trim().toLowerCase();
    if (st === "ny" || st === "new york") {
      const nySpoke = spokes.find(
        (s) =>
          s.name.toLowerCase().includes("new york") ||
          s.shortName.toLowerCase() === "ny" ||
          (s.state && s.state.toLowerCase() === "ny")
      );
      if (nySpoke && formData.spokeId !== nySpoke.id) {
        setFormData((prev) => ({ ...prev, spokeId: nySpoke.id }));
      }
    }
  }, [formData.state, spokes]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data: OrderDetail = await res.json();
        setOrder(data);
        populateFormState(data);
      } else {
        setError("Failed to load order details.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching the order.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSpokes = async () => {
    try {
      const res = await fetch("/api/admin/spokes");
      if (res.ok) {
        const data = await res.json();
        setSpokes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSurveyTypes = async () => {
    try {
      const res = await fetch("/api/admin/survey-types");
      if (res.ok) {
        const data = await res.json();
        setSurveyTypes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`/api/orders/${id}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveAll = async (extraPayload?: Record<string, any>) => {
    try {
      setSavingOrder(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        ...formData,
        surveyPrice: parseFloat(String(formData.surveyPrice)) || 0,
        miscAmt: parseFloat(String(formData.miscAmt)) || 0,
        miscAmtDescription: formData.miscAmtDescription
          ? formData.miscAmtDescription.trim()
          : null,
        discountAmt: parseFloat(String(formData.discountAmt)) || 0,
        depositPaid: parseFloat(String(formData.depositPaid)) || 0,
        finalPaymentReceived:
          parseFloat(String(formData.finalPaymentReceived)) || 0,
        taxRate: parseFloat(String(formData.taxRate)) || 0,
        ...extraPayload,
      };

      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update order");
      }

      const updated = await res.json();
      setOrder(updated);
      populateFormState(updated);
      fetchAuditLogs();
      setSuccessMessage("Order details saved successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to save order details.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setOrder(updated);
      populateFormState(updated);
      fetchAuditLogs();
      setSuccessMessage(
        `Order status updated to ${newStatus.replace("_", " ")}`
      );
    } catch (err: any) {
      setError(err.message || "Failed to update order status.");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      // Update local state to remove the file instantly from the UI
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: (prev.documents || []).filter((d) => d.id !== docId),
        };
      });
      setSelectedAttachments((prev) => prev.filter((a) => a.id !== docId));
      setSuccessMessage("Document deleted successfully.");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to delete document");
    }
  };

  const parseTemplate = (text: string, currentOrder: OrderDetail) => {
    if (!text) return "";
    const clientName =
      currentOrder.client?.name || currentOrder.clientName || "";
    const clientEmail =
      formData.clientEmail ||
      currentOrder.client?.email ||
      currentOrder.quote?.client?.email ||
      "";
    const clientPhone =
      currentOrder.client?.phone || currentOrder.quote?.client?.phone || "";
    const orderId = currentOrder.orderNumber || currentOrder.id || "";
    const propertyAddress = currentOrder.address || "";
    const surveyType =
      formData.surveyType ||
      currentOrder.surveyTypeCustom ||
      currentOrder.surveyType?.name ||
      "";
    const price = currentOrder.quote?.price
      ? `$${Number(currentOrder.quote.price).toFixed(2)}`
      : "";
    const spokeName = currentOrder.spoke?.name || "";
    const quoteLink =
      currentOrder.quoteId && typeof window !== "undefined"
        ? `${window.location.origin}/quotes/${currentOrder.quoteId}`
        : "";

    return text
      .replace(/{{clientName}}/g, clientName)
      .replace(/{{clientEmail}}/g, clientEmail)
      .replace(/{{clientPhone}}/g, clientPhone)
      .replace(/{{orderId}}/g, orderId)
      .replace(/{{propertyAddress}}/g, propertyAddress)
      .replace(/{{surveyType}}/g, surveyType)
      .replace(/{{price}}/g, price)
      .replace(/{{spokeName}}/g, spokeName)
      .replace(/{{quoteLink}}/g, quoteLink);
  };

  const handleOpenEmailModal = async () => {
    if (!order) return;
    setIsEmailModalOpen(true);
    setEmailModalError(null);
    setSelectedAttachments([]);
    setLoadingTemplate(true);
    try {
      const res = await fetch("/api/admin/templates?type=ORDER_MANUAL_UPDATE");
      if (res.ok) {
        const data = await res.json();
        const parsedSubject = parseTemplate(data.subject || "", order);
        const parsedBody = parseTemplate(data.body || "", order);
        setEmailSubject(parsedSubject);
        setEmailBody(parsedBody);
      } else {
        setEmailSubject(
          `Update regarding your survey project for ${order.address} (Order #${order.orderNumber})`
        );
        setEmailBody(
          `Hello ${order.client?.name || order.clientName},\n\nWe are writing to provide you with an update regarding your survey project for ${order.address}.\n\nOrder Details:\n- Order #: ${order.orderNumber}\n- Survey Type: ${formData.surveyType || order.surveyTypeCustom || order.surveyType?.name}\n- Branch: ${order.spoke?.name || ""}\n\nPlease feel free to reply directly to this email if you have any questions.\n\nBest regards,\nMJS Land Surveying Team`
        );
      }
    } catch (err: any) {
      console.error("Failed to load email template:", err);
      setEmailModalError(
        "Failed to load email template. You may compose manually."
      );
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      setSendingEmail(true);
      setEmailModalError(null);
      const res = await fetch(`/api/orders/${id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody,
          attachments: selectedAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email to client.");
      }

      setIsEmailModalOpen(false);
      setSuccessMessage(data.message || "Email successfully sent to client.");
      fetchOrder();
      fetchAuditLogs();
    } catch (err: any) {
      setEmailModalError(err.message || "Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenTeamEmailModal = async () => {
    if (!order) return;
    setTeamEmailError(null);
    setTeamEmailSubject(
      `[TEAM UPDATE] Order #${order.orderNumber} - ${order.address}`
    );
    setTeamEmailBody(
      `Team,\n\nPlease see the updates and attached documents for Order #${order.orderNumber} (${order.address}).\n\nStatus: ${order.status}\nSurvey Type: ${formData.surveyType || order.surveyTypeCustom || order.surveyType?.name || ""}\nBranch: ${order.spoke?.name || ""}\n\nInternal Notes: ${formData.internalDraftingNotes || "None"}\n\nField Notes: ${formData.fieldNotes || "None"}\n\nThanks!`
    );
    setSelectedTeamAttachments([]);
    setSelectedStaffEmails([]);
    setIsTeamEmailModalOpen(true);

    if (staffList.length === 0) {
      try {
        setLoadingStaff(true);
        const res = await fetch("/api/staff");
        if (res.ok) {
          const data = await res.json();
          setStaffList(data);
        }
      } catch (err) {
        console.error("Failed to load staff list:", err);
      } finally {
        setLoadingStaff(false);
      }
    }
  };

  const handleSendTeamEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (selectedStaffEmails.length === 0) {
      setTeamEmailError("Please select at least one staff member recipient.");
      return;
    }
    try {
      setSendingTeamEmail(true);
      setTeamEmailError(null);
      const res = await fetch(`/api/orders/${id}/team-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: teamEmailSubject,
          body: teamEmailBody,
          staffEmails: selectedStaffEmails,
          attachments: selectedTeamAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send team email.");
      }

      setIsTeamEmailModalOpen(false);
      setSuccessMessage(data.message || "Team email sent successfully.");
      fetchOrder();
      fetchAuditLogs();
    } catch (err: any) {
      setTeamEmailError(err.message || "Failed to send team email.");
    } finally {
      setSendingTeamEmail(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!order) return;
    const recipientEmail =
      order.client?.email ||
      order.quote?.client?.email ||
      formData.clientEmail;

    if (
      !confirm(
        `Send Order Confirmation email to ${recipientEmail || "the client"}?`
      )
    ) {
      return;
    }

    try {
      setSendingConfirmation(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/orders/${id}/send-confirmation`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send order confirmation email.");
      }

      setSuccessMessage(data.message || "Order confirmation email sent successfully.");
      await fetchOrder();
      await fetchAuditLogs();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send order confirmation email.");
    } finally {
      setSendingConfirmation(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-3" />
        <p className="text-sm font-medium">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Order Not Found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          The requested work order could not be located.
        </p>
        <Link
          href="/orders"
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const effectiveClient = order.client || order.quote?.client;

  // Balance Due calculation: (Survey Price + Misc Amt) - (Discount Amt + Deposit Paid + Final Payment Received)
  const numericSurveyPrice = Number(formData.surveyPrice) || 0;
  const numericMiscAmt = Number(formData.miscAmt) || 0;
  const numericDiscountAmt = Number(formData.discountAmt) || 0;
  const numericDepositPaid = Number(formData.depositPaid) || 0;
  const numericFinalPaymentReceived =
    Number(formData.finalPaymentReceived) || 0;
  const balanceDue =
    numericSurveyPrice +
    numericMiscAmt -
    (numericDiscountAmt + numericDepositPaid + numericFinalPaymentReceived);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FIELD_PENDING":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Compass className="w-3.5 h-3.5 mr-1" />
            FIELD PENDING
          </span>
        );
      case "DRAFTING":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Clock className="w-3.5 h-3.5 mr-1" />
            DRAFTING
          </span>
        );
      case "REVIEW":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <FileCheck className="w-3.5 h-3.5 mr-1" />
            SURVEYOR REVIEW
          </span>
        );
      case "HOLD_REVIEW":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <PauseCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
            HOLD - REVIEW
          </span>
        );
      case "HOLD_CLIENT":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700">
            <PauseCircle className="w-3.5 h-3.5 mr-1 text-orange-600" />
            HOLD - CLIENT
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            COMPLETED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Ban className="w-3.5 h-3.5 mr-1" />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/orders"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Order {order.orderNumber}
              </h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Created on {new Date(order.createdAt).toLocaleDateString()}
              {order.quote && ` • Origin Quote #${order.quote.quoteNumber}`}
              {order.spoke && ` • Branch: ${order.spoke.name}`}
            </p>
          </div>
        </div>

        {/* Global Communication Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {order.client?.phone ? (
            <a
              href={`sms:${order.client.phone}`}
              className="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
              Text Client
            </a>
          ) : null}

          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={sendingConfirmation}
            className="inline-flex items-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {sendingConfirmation ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Sending Confirmation...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                Confirm Order
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenEmailModal}
            className="inline-flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
            Email Client
          </button>

          <button
            type="button"
            onClick={handleOpenTeamEmailModal}
            className="inline-flex items-center px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600 dark:text-purple-400" />
            Email Team
          </button>
        </div>

        {/* Floating Save Button */}
        <div className="fixed bottom-8 right-8 z-50 shadow-2xl">
          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={savingOrder}
            className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-2xl transition-all hover:scale-105 focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 cursor-pointer"
          >
            {savingOrder ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Standing Client Instructions & Protocol Banner (if linked) */}
      {effectiveClient &&
        (effectiveClient.specialInstructions ||
          (effectiveClient.defaultInvoiceRules && canViewFinancials)) && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400" />
                Standing Protocols for {effectiveClient.name} (
                {effectiveClient.clientType})
              </span>
              {canViewFinancials && (
                <Link
                  href={`/clients/${effectiveClient.id}`}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Client Profile →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-950 dark:text-amber-100">
              {effectiveClient.defaultInvoiceRules && canViewFinancials && (
                <div className="bg-white/60 dark:bg-slate-900/60 p-2.5 rounded border border-amber-200 dark:border-amber-800/60">
                  <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                    Billing Protocol:
                  </span>
                  {effectiveClient.defaultInvoiceRules}
                </div>
              )}
              {effectiveClient.specialInstructions && (
                <div
                  className={`bg-white/60 dark:bg-slate-900/60 p-2.5 rounded border border-amber-200 dark:border-amber-800/60 ${
                    !canViewFinancials ? "md:col-span-2" : ""
                  }`}
                >
                  <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                    Standing Field / Legal Instructions:
                  </span>
                  {effectiveClient.specialInstructions}
                </div>
              )}
            </div>
          </div>
        )}

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ========================================================================= */}
        {/* COLUMN 1: Property & Legal */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          {/* Card 1A: Job Specifics & Critical Dates */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
              <Compass className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Job Specifics & Dates
            </h2>

            <div className="space-y-3">
              {/* Spoke / Branch Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Operating Branch (Spoke)
                </label>
                <select
                  value={formData.spokeId}
                  onChange={(e) => handleInputChange("spokeId", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Branch / Spoke --</option>
                  {spokes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.shortName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Survey Type Select Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Survey Type
                </label>
                <select
                  value={
                    formData.surveyTypeId ||
                    surveyTypes.find((st) => st.name === formData.surveyType)
                      ?.id ||
                    ""
                  }
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedST = surveyTypes.find(
                      (st) => st.id === selectedId
                    );
                    handleInputChange("surveyTypeId", selectedId);
                    if (selectedST) {
                      handleInputChange("surveyType", selectedST.name);
                      if (
                        !formData.surveyPrice ||
                        formData.surveyPrice === 0
                      ) {
                        handleInputChange(
                          "surveyPrice",
                          Number(selectedST.defaultPrice) || 0
                        );
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Survey Type --</option>
                  {surveyTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}{" "}
                      {st.defaultPrice
                        ? `($${Number(st.defaultPrice).toFixed(2)})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* FHA/VA Loan Checkbox */}
              <div className="pt-1">
                <label className="inline-flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFhaVaLoan}
                    onChange={(e) =>
                      handleInputChange("isFhaVaLoan", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    FHA / VA Loan Survey Required
                  </span>
                </label>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Client Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.clientDueDate}
                    onChange={(e) =>
                      handleInputChange("clientDueDate", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Internal Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.internalDueDate}
                    onChange={(e) =>
                      handleInputChange("internalDueDate", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    value={formData.closingDate}
                    onChange={(e) =>
                      handleInputChange("closingDate", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Scheduled Field Date
                  </label>
                  <input
                    type="date"
                    value={formData.fieldDueDate || formData.scheduledDate}
                    onChange={(e) => {
                      handleInputChange("fieldDueDate", e.target.value);
                      handleInputChange("scheduledDate", e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Special Instructions */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Special Instructions
                </label>
                <textarea
                  rows={3}
                  value={formData.specialInstructions}
                  onChange={(e) =>
                    handleInputChange("specialInstructions", e.target.value)
                  }
                  placeholder="Specific boundary conditions, gate codes, access notes, client requests..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-sans text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 1B: Property Details */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
              <MapPin className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Property & Client Details
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {order.clientName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Ordered By
                  </label>
                  <input
                    type="text"
                    value={formData.orderedBy}
                    onChange={(e) =>
                      handleInputChange("orderedBy", e.target.value)
                    }
                    placeholder="e.g. Closing Officer / Agent Name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Client Email(s) - comma separated
                  </label>
                  <input
                    type="text"
                    value={formData.clientEmail}
                    onChange={(e) =>
                      handleInputChange("clientEmail", e.target.value)
                    }
                    placeholder="client@example.com, closing@example.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) =>
                      handleInputChange("clientPhone", e.target.value)
                    }
                    placeholder="(555) 000-0000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="NY"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Zip
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => handleInputChange("zip", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    County
                  </label>
                  <input
                    type="text"
                    value={formData.county}
                    onChange={(e) =>
                      handleInputChange("county", e.target.value)
                    }
                    placeholder="e.g. Orange"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Tax Parcel ID
                  </label>
                  <input
                    type="text"
                    value={formData.taxParcelId}
                    onChange={(e) =>
                      handleInputChange("taxParcelId", e.target.value)
                    }
                    placeholder="e.g. 29-22-14-0000-00-001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 1C: Legal Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
              <Scale className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Legal Description
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Lot
                  </label>
                  <input
                    type="text"
                    value={formData.lot}
                    onChange={(e) => handleInputChange("lot", e.target.value)}
                    placeholder="e.g. 14"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Block
                  </label>
                  <input
                    type="text"
                    value={formData.block}
                    onChange={(e) =>
                      handleInputChange("block", e.target.value)
                    }
                    placeholder="e.g. B"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Subdivision / Plat Name
                </label>
                <input
                  type="text"
                  value={formData.subdivision}
                  onChange={(e) =>
                    handleInputChange("subdivision", e.target.value)
                  }
                  placeholder="e.g. Whispering Pines Unit 3"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: Process & Accounting */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          {/* Card 2A: Status & Workflow Progression */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
              <Layers className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Status & Workflow
            </h2>

            <div className="space-y-2">
              {[
                {
                  key: "FIELD_PENDING",
                  label: "1. Field Pending",
                  icon: Compass,
                },
                { key: "DRAFTING", label: "2. CAD Drafting", icon: Clock },
                {
                  key: "REVIEW",
                  label: "3. Surveyor Review",
                  icon: FileCheck,
                },
                {
                  key: "HOLD_REVIEW",
                  label: "Hold - Review Pending",
                  icon: PauseCircle,
                },
                {
                  key: "HOLD_CLIENT",
                  label: "Hold - Awaiting Client",
                  icon: PauseCircle,
                },
                {
                  key: "COMPLETED",
                  label: "Completed / Signed Off",
                  icon: CheckCircle2,
                },
              ].map((step) => {
                const isCurrent = order.status === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => handleUpdateStatus(step.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all border ${
                      isCurrent
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/30"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <step.icon className="w-4 h-4" />
                      <span>{step.label}</span>
                    </div>
                    {isCurrent && <CheckCircle className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>

            {/* Prominent Red Cancel Job Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to cancel this order? This will update status to CANCELLED."
                    )
                  ) {
                    handleUpdateStatus("CANCELLED");
                  }
                }}
                className={`w-full flex items-center justify-center space-x-2 p-2.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  order.status === "CANCELLED"
                    ? "bg-rose-700 text-white ring-2 ring-rose-400"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                <Ban className="w-4 h-4" />
                <span>
                  {order.status === "CANCELLED"
                    ? "Job is CANCELLED"
                    : "Cancel Job"}
                </span>
              </button>
            </div>
          </div>

          {/* Card 2B: Staffing & Resource Assignments */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
              <Users className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Staff Assignments
            </h2>

            <div className="space-y-3">
              {/* Researcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Researcher
                </label>
                <select
                  value={formData.researcherId}
                  onChange={(e) =>
                    handleInputChange("researcherId", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned Researcher --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field Crew */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Field Crew
                </label>
                <select
                  value={formData.fieldCrewId}
                  onChange={(e) =>
                    handleInputChange("fieldCrewId", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned Field Crew --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Drafter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  CAD Drafter
                </label>
                <select
                  value={formData.drafterId}
                  onChange={(e) =>
                    handleInputChange("drafterId", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned Drafter --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Checker */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Checker
                </label>
                <select
                  value={formData.checkerId}
                  onChange={(e) =>
                    handleInputChange("checkerId", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned Checker --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Signing Surveyor */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Signing Surveyor
                </label>
                <select
                  value={formData.signingSurveyorId}
                  onChange={(e) =>
                    handleInputChange("signingSurveyorId", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned Signing Surveyor --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Marketer */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Marketer (Commission)
                </label>
                <select
                  value={formData.marketerId}
                  onChange={(e) =>
                    handleInputChange("marketerId", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Marketer / Direct --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2C: Accounting Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
              <DollarSign className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
              Accounting & Pricing
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Survey Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.surveyPrice}
                    onChange={(e) =>
                      handleInputChange("surveyPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Misc Amt ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.miscAmt}
                    onChange={(e) =>
                      handleInputChange("miscAmt", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Misc Amt Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Misc Amt Description
                </label>
                <input
                  type="text"
                  value={formData.miscAmtDescription}
                  onChange={(e) =>
                    handleInputChange("miscAmtDescription", e.target.value)
                  }
                  placeholder="e.g. Tree Location Surcharge, Rush Expedite Fee"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Discount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discountAmt}
                    onChange={(e) =>
                      handleInputChange("discountAmt", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Deposit Paid ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.depositPaid}
                    onChange={(e) =>
                      handleInputChange("depositPaid", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Final Paid ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.finalPaymentReceived}
                    onChange={(e) =>
                      handleInputChange("finalPaymentReceived", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Balance Due Banner */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    balanceDue > 0
                      ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60"
                      : "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-slate-700 dark:text-slate-300">
                      Balance Due
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      (Price + Misc) - (Discount + Deposit + Final Paid)
                    </span>
                  </div>

                  <span
                    className={`text-xl font-bold font-mono tracking-tight ${
                      balanceDue > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    $
                    {balanceDue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Build PDF Invoice Button */}
              <div className="pt-2">
                <a
                  href={`/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Build PDF Invoice</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: Completion & Documents */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          {/* Card 3A: Completion & Field Findings */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
              <CheckCircle className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Completion & Findings
            </h2>

            <div className="space-y-3">
              {/* Completion Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Completion Date
                </label>
                <input
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) =>
                    handleInputChange("completionDate", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Internal Drafting Notes (Permission-Restricted) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                    {!canEditDraftingNotes && (
                      <Lock className="w-3 h-3 mr-1 text-slate-400" />
                    )}
                    Internal Drafting Notes
                  </label>
                  {!canEditDraftingNotes && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/60 rounded border border-amber-200 dark:border-amber-900">
                      Restricted (Drafter/Surveyor/Admin)
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={formData.internalDraftingNotes}
                  disabled={!canEditDraftingNotes}
                  onChange={(e) =>
                    handleInputChange("internalDraftingNotes", e.target.value)
                  }
                  placeholder={
                    canEditDraftingNotes
                      ? "Internal CAD standards, title exceptions, drafting discrepancies..."
                      : "Internal drafting notes restricted to CAD Drafters, Surveyors, and Admins."
                  }
                  className={`w-full p-2.5 rounded-lg text-xs font-sans border transition-colors ${
                    canEditDraftingNotes
                      ? "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed opacity-80"
                  }`}
                />
              </div>

              {/* Points of Interest */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Points of Interest
                </label>
                <textarea
                  rows={3}
                  value={formData.pointsOfInterest}
                  onChange={(e) =>
                    handleInputChange("pointsOfInterest", e.target.value)
                  }
                  placeholder="Key monuments, witness trees, benchmarks, elevation datum, encroachments observed..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-sans text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Crew Comments */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Crew Comments & Field Observations
                </label>
                <textarea
                  rows={3}
                  value={formData.crewComments || formData.fieldNotes}
                  onChange={(e) => {
                    handleInputChange("crewComments", e.target.value);
                    handleInputChange("fieldNotes", e.target.value);
                  }}
                  placeholder="Field conditions, GPS satellite coverage, site obstacles, pins recovered..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-sans text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3B: MinIO / AWS S3 Documents & Uploads */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center uppercase tracking-wider">
                <FileCheck className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                Job Documents ({order.documents?.length || 0})
              </h2>
            </div>

            {/* Document List */}
            {order.documents && order.documents.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {order.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 max-w-[65%]">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {doc.fileName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {doc.docType}
                        </span>{" "}
                        • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        download={doc.fileName}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Download
                      </a>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteDocument(doc.id);
                        }} 
                        className="ml-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                No files or field sheets uploaded yet.
              </p>
            )}

            {/* MinIO / AWS S3 FileUpload Component Dropzone */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <FileUpload
                entityId={order.id}
                entityType="ORDER"
                defaultDocType="FieldSheet"
                allowedDocTypes={["FieldSheet", "FinalSurvey", "Quote"]}
                onUploadSuccess={fetchOrder}
                buttonLabel="Drop file / Upload to Storage"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Audit History */}
      <details className="group bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-8 shadow-sm">
        <summary className="cursor-pointer font-bold flex justify-between items-center text-gray-700 dark:text-slate-300 text-sm">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Audit History ({auditLogs.length})</span>
          </div>
          <span className="group-open:rotate-180 transition-transform text-xs">▼</span>
        </summary>
        <div className="mt-4 space-y-2 text-sm whitespace-pre-wrap">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
              No audit events recorded for this order yet.
            </p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative group">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {log.user?.name || "System"}
                      </span>
                      {log.user?.role && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          {log.user.role.replace("_", " ")}
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto">
                        {new Date(log.createdAt).toLocaleDateString()} at{" "}
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 mt-1 whitespace-pre-wrap font-sans">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Collapsible Email History */}
      <details className="group bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-4 shadow-sm">
        <summary className="cursor-pointer font-bold flex justify-between items-center text-gray-700 dark:text-slate-300 text-sm">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Email History ({order.emailLogs?.length || 0})</span>
          </div>
          <span className="group-open:rotate-180 transition-transform text-xs">▼</span>
        </summary>
        <div className="mt-4 space-y-3 text-sm">
          {!order.emailLogs || order.emailLogs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
              No outgoing emails logged for this order yet.
            </p>
          ) : (
            <div className="space-y-3">
              {order.emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        To: {log.sentTo}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(log.sentAt).toLocaleDateString()} at{" "}
                      {new Date(log.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      {log.subject}
                    </span>
                    <div className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {log.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Email Client Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Email Client Update</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                disabled={sendingEmail}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailModalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{emailModalError}</span>
              </div>
            )}

            {loadingTemplate ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                Loading email template...
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Recipient
                  </span>
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-mono">
                    {formData.clientEmail ||
                      order.client?.email ||
                      order.clientName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Subject Line <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject line..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Message Body <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Enter message for client..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-sans focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                {/* Document Attachments Checkbox Section */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Include Attachments ({order.documents?.length || 0}{" "}
                    Available)
                  </label>
                  {order.documents && order.documents.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 space-y-1">
                      {order.documents.map((doc) => {
                        const isSelected = selectedAttachments.some(
                          (a) => a.id === doc.id
                        );
                        return (
                          <label
                            key={doc.id}
                            className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAttachments((prev) => [
                                    ...prev,
                                    {
                                      id: doc.id,
                                      fileName: doc.fileName,
                                      s3Key: doc.s3Key,
                                      docType: doc.docType,
                                    },
                                  ]);
                                } else {
                                  setSelectedAttachments((prev) =>
                                    prev.filter((a) => a.id !== doc.id)
                                  );
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <div className="flex-1 truncate">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {doc.fileName}
                              </span>
                              <span className="ml-1.5 text-[10px] text-slate-500 uppercase px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded font-mono">
                                {doc.docType}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-1">
                      No documents uploaded to this order yet.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    disabled={sendingEmail}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="inline-flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    {sendingEmail ? "Sending Email..." : "Send Email"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Team Email Modal */}
      {isTeamEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-base">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Internal Team Email</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamEmailModalOpen(false)}
                disabled={sendingTeamEmail}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {teamEmailError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{teamEmailError}</span>
              </div>
            )}

            <form onSubmit={handleSendTeamEmail} className="space-y-4">
              {/* Staff selection checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Select Staff Recipients ({selectedStaffEmails.length} Selected) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStaffEmails(
                          staffList.map((s) => s.email).filter(Boolean)
                        )
                      }
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffEmails([])}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loadingStaff ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-purple-600" />
                    Loading staff directory...
                  </div>
                ) : staffList.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 space-y-1">
                    {staffList.map((member) => {
                      const isChecked = selectedStaffEmails.includes(member.email);
                      return (
                        <label
                          key={member.id}
                          className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStaffEmails((prev) => [
                                  ...prev,
                                  member.email,
                                ]);
                              } else {
                                setSelectedStaffEmails((prev) =>
                                  prev.filter((em) => em !== member.email)
                                );
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                          />
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {member.name}
                            </span>
                            <div className="flex items-center space-x-1.5 ml-2">
                              {member.role && (
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded font-semibold border border-purple-200 dark:border-purple-800/50">
                                  {member.role}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 font-mono">
                                {member.email}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-1">
                    No staff members found.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamEmailSubject}
                  onChange={(e) => setTeamEmailSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={teamEmailBody}
                  onChange={(e) => setTeamEmailBody(e.target.value)}
                  placeholder="Enter message for team members..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-sans focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              {/* Document Attachments Checkbox Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Include Attachments ({order.documents?.length || 0} Available)
                </label>
                {order.documents && order.documents.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 space-y-1">
                    {order.documents.map((doc) => {
                      const isSelected = selectedTeamAttachments.some(
                        (a) => a.id === doc.id
                      );
                      return (
                        <label
                          key={doc.id}
                          className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeamAttachments((prev) => [
                                  ...prev,
                                  {
                                    id: doc.id,
                                    fileName: doc.fileName,
                                    s3Key: doc.s3Key,
                                    docType: doc.docType,
                                  },
                                ]);
                              } else {
                                setSelectedTeamAttachments((prev) =>
                                  prev.filter((a) => a.id !== doc.id)
                                );
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                          />
                          <div className="flex-1 truncate">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {doc.fileName}
                            </span>
                            <span className="ml-1.5 text-[10px] text-slate-500 uppercase px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">
                              {doc.docType}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-1">
                    No documents uploaded to this order yet.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeamEmailModalOpen(false)}
                  disabled={sendingTeamEmail}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTeamEmail}
                  className="inline-flex items-center px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-purple-500 disabled:opacity-50 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  {sendingTeamEmail ? "Sending Team Email..." : "Send Team Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
