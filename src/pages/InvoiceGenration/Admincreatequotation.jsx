import { useEffect, useState, useCallback, useRef } from "react";
import {
  Button, Card, Input, Modal, Select, Tag, Tooltip,
  DatePicker, Divider, Spin, Checkbox, InputNumber,
  Popconfirm, message,
} from "antd";
import {IMAGE_HELPER} from "../../helper/imagehelper";
import {
  EyeOutlined,
  FilePdfOutlined,
  EditOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  SendOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  CopyOutlined,
  SaveOutlined,
  QrcodeOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import CustomTable from "../../components/CustomTable";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

// ── S3 asset URLs (same as OrderDetails) ────────────────────────────────────
const LOGO_URL      = "https://printe.s3.ap-south-1.amazonaws.com/1772440604738-7cil2r3l0nt.png";
const SIGNATURE_URL = "https://printe.s3.ap-south-1.amazonaws.com/1772440641171-qonm118hvz.png";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     color: "default", icon: <FileTextOutlined /> },
  pending:   { label: "Pending",   color: "gold",    icon: <ClockCircleOutlined /> },
  sent:      { label: "Sent",      color: "blue",    icon: <SendOutlined /> },
  accepted:  { label: "Accepted",  color: "green",   icon: <CheckCircleOutlined /> },
  rejected:  { label: "Rejected",  color: "red",     icon: <CloseCircleOutlined /> },
  expired:   { label: "Expired",   color: "orange",  icon: <ClockCircleOutlined /> },
  converted: { label: "Converted", color: "purple",  icon: <SwapOutlined /> },
};

const EMPTY_ITEM = {
  product_id: "", product_name: "", quantity: 1,
  mrp_price: 0, price: 0, size: "", color: "", notes: "",
};

const DEFAULT_FORM = {
  customer_name: "", customer_email: "", customer_phone: "",
  company_name: "", address_line1: "", address_line2: "",
  city: "", state: "", pincode: "", country: "India",
  gst_no: "", delivery_charges: 0, free_delivery: false,
  discount_percentage: 0, valid_days: 30, notes: "",
  terms_and_conditions:
    "Payment due within 30 days of invoice date.\nPrices are subject to change without prior notice.\nDelivery timeline: 7-10 business days after confirmation.",
};

// ── Helper: extract quotations array from any API response shape ─────────────
const extractQuotations = (data) => {
  if (Array.isArray(data?.data?.quotations)) return data.data.quotations;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.quotations)) return data.quotations;
  if (Array.isArray(data)) return data;
  return [];
};

const extractTotal = (data, fallback) => {
  if (typeof data?.data?.total === "number") return data.data.total;
  if (typeof data?.data?.count === "number") return data.data.count;
  if (typeof data?.total === "number") return data.total;
  if (typeof data?.count === "number") return data.count;
  return fallback;
};

// ── Number to words helper ───────────────────────────────────────────────────
const numberToWords = (num) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const thousands = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero Rupees Only";

  const cvt = (n) => {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
    return ones[Math.floor(n / 100)] + " Hundred " + cvt(n % 100);
  };

  let result = "";
  let i = 0;
  let t = Math.floor(num);

  if (t === 0) {
    result = "Zero";
  } else {
    while (t > 0) {
      const c = t % 1000;
      if (c !== 0) result = cvt(c) + thousands[i] + " " + result;
      t = Math.floor(t / 1000);
      i++;
    }
  }

  const paise = Math.round((num - Math.floor(num)) * 100);
  return result.trim() + " Rupees" + (paise > 0 ? " and " + cvt(paise).trim() + " Paise" : "") + " Only";
};

// ── PDF Generation — uses exact OrderDetails HTML design ────────────────────
const generateInvoiceHTML = (record) => {
  const addr  = record.billing_address || {};
  const items = record.cart_items || [];

  const fullAddress = [addr.street, addr.city, addr.state, addr.pincode ? `PINCODE: ${addr.pincode}` : null, addr.country]
    .filter(Boolean).join(", ");

  const itemDetails = items.map((item) => {
    const taxableValue = (item.price || 0) * (item.quantity || 0);
    const taxAmount    = taxableValue * 0.18;
    return { ...item, taxableValue, taxAmount, amount: taxableValue + taxAmount };
  });

  const taxableAmount = itemDetails.reduce((s, i) => s + i.taxableValue, 0);
  const totalTax      = itemDetails.reduce((s, i) => s + i.taxAmount, 0);
  const cgst          = totalTax / 2;
  const sgst          = totalTax / 2;
  const MRP           = items.reduce((s, i) => s + (i.mrp_price || 0), 0);
  const grandTotal    = Math.round(taxableAmount + totalTax + (record.DeliveryCharges || record.delivery_charges || 0));
  const grandSavings  = Number(Math.abs(MRP - grandTotal));

  const invoiceNo  = record.quotation_no || "QT-XXXXX";
  const createdAt  = record.createdAt || new Date().toISOString();

  // Payment status banner — mirrors OrderDetails exactly
  let paymentStatusHTML = "";
  if (record.quotation_status === "accepted") {
    paymentStatusHTML = `<div style="padding:8px;background:#d4edda;border:1px solid #c3e6cb;border-radius:4px;margin-bottom:6px;">
      <p style="margin:0;font-weight:bold;color:#155724;font-size:11px;">Payment Status: <span style="color:#28a745;">Accepted</span></p>
    </div>`;
  } else if (record.quotation_status === "pending" || record.payment_status === "pending") {
    paymentStatusHTML = `<div style="padding:5px;background:#fff3cd;border:1px solid #ffeaa7;border-radius:4px;margin-bottom:6px;">
      <p style="margin:0;font-weight:bold;color:#856404;font-size:11px;">Payment Status: <span style="color:#dc3545;">Pending Payment</span></p>
      <p style="margin:4px 0 0;font-size:10px;">Please complete the payment to process your order</p>
    </div>`;
  }

  return `
<div style="font-family:Arial,sans-serif;position:relative;min-height:1122px;width:794px;box-sizing:border-box;">

  <!-- TOP CONTENT — padding-bottom reserves space for the fixed bottom block -->
  <div style="padding:0 0 320px 0;">

    <!-- Header -->
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:2px;margin-bottom:4px;">
      <div style="display:flex;justify-content:center;">
        <img src="${IMAGE_HELPER.PDF_logo}" style="width:140px;height:40px;object-fit:contain;margin-bottom:2px; background:#0000;" crossorigin="anonymous"/>
      </div>
      <div style="display:flex;justify-content:center;gap:20px;font-size:10px;">
        <p style="margin:0;"><b>Email:</b> <a href="mailto:info@printe.in">info@printe.in</a></p>
        <p style="margin:0;"><b>Website:</b> <a href="http://www.printe.in">www.printe.in</a></p>
      </div>
    </div>

    <!-- Invoice meta -->
    <div style="display:flex;justify-content:space-between;background:#f8f9fa;padding:4px;border-radius:4px;margin-bottom:4px;">
      <div>
        <p style="margin:4px 0;font-size:10px;"><b>Invoice #:</b> ${invoiceNo}</p>
        <p style="margin:4px 0;font-size:10px;"><b>Invoice Date:</b> ${dayjs(createdAt).format("DD MMM YYYY")}</p>
      </div>
      ${(record.quotation_status === "pending" || record.payment_status === "pending") ? `<div style="text-align:right;"><p style="margin:0;font-weight:bold;font-size:12px;color:#ff6b6b;">PAYMENT PENDING</p></div>` : ""}
    </div>

    <!-- Customer + Shipping -->
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <div style="flex:1;">
        <h3 style="font-size:12px;font-weight:bold;margin:0 0 2px;border-bottom:1px solid #ddd;padding-bottom:1px;">Customer Details:</h3>
        <p style="margin:2px 0;font-size:10px;font-weight:bold;">Mr.${addr.name || "Customer Name"}</p>
        <p style="margin:2px 0;font-size:10px;line-height:1.4;width:80%;">${fullAddress}</p>
        <p style="margin:2px 0;font-size:10px;"><b>Phone:</b> ${addr.mobile_number || ""}</p>
        <p style="margin:1px 0;font-size:10px;"><b>Email:</b> ${addr.email || ""}</p>
      </div>
      <div style="flex:1;padding-left:20px;">
        <h3 style="font-size:12px;font-weight:bold;margin:0 0 2px;border-bottom:1px solid #ddd;padding-bottom:2px;">Shipping Details:</h3>
        <p style="margin:2px 0;font-size:10px;"><b>Shipping Method:</b> Standard Delivery</p>
        <p style="margin:2px 0;font-size:10px;"><b>Expected Delivery:</b> 5-7 Business Days</p>
        <p style="margin:2px 0;font-size:10px;"><b>Place of Supply:</b> TRICHY, TAMIL NADU</p>
      </div>
    </div>

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:4px;">
      <thead>
        <tr style="background:#f2c41a;color:#333;">
          <th style="border:1px solid #ddd;padding:2px;text-align:left;width:30px;">#</th>
          <th style="border:1px solid #ddd;padding:2px;text-align:left;">Item</th>
          <th style="border:1px solid #ddd;padding:2px;text-align:right;width:80px;">MRP</th>
          <th style="border:1px solid #ddd;padding:2px;text-align:center;width:60px;">Qty</th>
          <th style="border:1px solid #ddd;padding:2px;text-align:right;width:100px;">Rate / Item</th>
          <th style="border:1px solid #ddd;padding:2px;text-align:right;width:120px;">Tax Amount (18%)</th>
          <th style="border:1px solid #ddd;padding:2px;text-align:right;width:100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemDetails.map((item, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:2px;vertical-align:top;">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:2px;vertical-align:top;">
            <span style="font-weight:bold;text-transform:uppercase;">${item.product_name || "Product"}</span>
            ${item.notes ? `<br/><span style="font-weight:400;text-transform:capitalize;">${item.notes}</span>` : ""}
            ${item.size  ? `<div style="font-size:9px;color:#666;">Size: ${item.size}</div>`  : ""}
            ${item.color ? `<div style="font-size:9px;color:#666;">Color: ${item.color}</div>` : ""}
          </td>
          <td style="border:1px solid #ddd;padding:2px;text-align:right;vertical-align:top;">&#8377; ${(item.mrp_price || 0).toFixed(2)}</td>
          <td style="border:1px solid #ddd;padding:2px;text-align:center;vertical-align:top;">${item.quantity || 0}</td>
          <td style="border:1px solid #ddd;padding:2px;text-align:right;vertical-align:top;">&#8377; ${item.taxableValue.toFixed(2)}</td>
          <td style="border:1px solid #ddd;padding:2px;text-align:right;vertical-align:top;">&#8377; ${item.taxAmount.toFixed(2)}</td>
          <td style="border:1px solid #ddd;padding:2px;text-align:right;vertical-align:top;font-weight:bold;">&#8377; ${item.amount.toFixed(2)}</td>
        </tr>`).join("")}
      </tbody>
    </table>

    <!-- Total in words -->
    <p style="margin:0 0 6px;font-size:11px;font-style:italic;background:#f8f9fa;padding:5px;border-radius:4px;">
      <b>Total amount (in words):</b>&nbsp;INR ${numberToWords(grandTotal)}
    </p>

    <!-- QR + Totals -->
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <div style="flex:1;">
        ${(record.quotation_status === "pending" || record.payment_status === "pending") && record.payment_qr_code ? `
        <div style="border:1px solid #ddd;padding:5px;border-radius:4px;display:inline-block;text-align:center;">
          <h4 style="font-size:11px;font-weight:bold;margin:0 0 6px;">Payment QR Code</h4>
          <img src="${record.payment_qr_code}" style="width:100px;height:100px;margin-bottom:4px;" crossorigin="anonymous"/>
          <p style="margin:0;font-size:9px;font-weight:bold;">Scan to Pay</p>
          <p style="margin:3px 0 0;font-size:8px;color:#666;">Use any UPI app to scan</p>
        </div>` : ""}
      </div>
      <div style="width:380px;">
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <tbody>
            <tr>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;font-weight:bold;">Taxable Amount</td>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;font-weight:bold;">&#8377; ${taxableAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;">CGST 9.0%</td>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;">&#8377; ${cgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;">SGST 9.0%</td>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;">&#8377; ${sgst.toFixed(2)}</td>
            </tr>
            ${(record.DeliveryCharges || record.delivery_charges) ? `
            <tr>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;">Shipping Charges</td>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;">&#8377; ${parseFloat(record.DeliveryCharges || record.delivery_charges || 0).toFixed(2)}</td>
            </tr>` : ""}
            <tr style="color:#1b8755;">
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;"><b>Savings</b></td>
              <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;"><b>&#8377; ${grandSavings.toFixed(2)}</b></td>
            </tr>
            <tr>
              <td style="padding:10px;background:#f8f9fa;font-weight:bold;font-size:13px;">Total Amount</td>
              <td style="padding:10px;background:#f8f9fa;text-align:right;font-weight:bold;font-size:13px;color:#ff6b6b;">&#8377; ${grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div><!-- end top content -->

  <!-- ═══════════════════════════════════════════════════════════
       BOTTOM-PINNED BLOCK — identical to OrderDetails
       ═══════════════════════════════════════════════════════════ -->
  <div style="position:absolute;bottom:0;left:0;right:0;width:794px;background:#fff;">

    ${paymentStatusHTML}

    <!-- Seller Info + Signature -->
    <div style="padding-top:4px;border-top:1px solid #ddd;margin-bottom:4px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="flex:1;">
          <p style="margin:2px 0;font-size:10px;">Seller Information</p>
          <table style="font-size:10px;">
            <tr><td><b>GST NO</b></td><td>: 33AANCP3376Q1ZN</td></tr>
            <tr><td><b>PAN NO</b></td><td>: AANCP3376Q</td></tr>
          </table>
        </div>
        <div style="text-align:center;">
          <p style="font-size:6px;color:#666;margin:2px 0 0;">For PAZHANAM DESIGNS AND CONSTRUCTIONS PRIVATE LIMITED</p>
          <img src="${IMAGE_HELPER.Sign}" style="width:80px;height:auto;transform:rotate(30deg);margin-left:50px;" crossorigin="anonymous"/>
          <p style="font-size:8px;font-weight:bold;margin:0;">Authorized Signature</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top:2px solid #f2c41a;text-align:center;font-size:11px;color:#666;padding-top:4px;">
      <p style="margin:2px 0;">MARKETED BY PAZHANAM DESIGNS AND CONSTRUCTIONS PRIVATE LIMITED</p>
      <p style="margin:2px 0;">#8 Church Colony, Tiruchirappalli, Tamil Nadu - 620017</p>
      <p style="margin:2px 0;">Email: info@printe.in | Customer-care: +91 95856 10000 | Website: www.printe.in</p>
      <div style="background:#444;color:white;padding:8px;margin-top:6px;text-align:center;">
        Powered By <a href="https://www.dmedia.in/" style="color:white;text-decoration:underline;font-weight:bold;">DMEDIA</a>
      </div>
    </div>

  </div><!-- end bottom-pinned block -->

</div>`;
};

// ── PDF download using jsPDF + html2canvas (same as OrderDetails) ────────────
const downloadPDF = async (record, setPdfLoading) => {
  if (setPdfLoading) setPdfLoading((prev) => ({ ...prev, [record._id]: true }));

  try {
    const pdf = new jsPDF("p", "pt", "a4");
    const options = {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: false,
      backgroundColor: "#FFFFFF",
      quality: 1.2,
    };

    const tempContainer = document.createElement("div");
    tempContainer.style.cssText =
      "position:absolute;left:-9999px;width:794px;font-family:Arial,sans-serif;background:#fff;";
    document.body.appendChild(tempContainer);

    const el = document.createElement("div");
    el.innerHTML = generateInvoiceHTML(record);
    tempContainer.appendChild(el);

    const canvas   = await html2canvas(el, options);
    const imgData  = canvas.toDataURL("image/jpeg", 0.8);
    const imgWidth = pdf.internal.pageSize.getWidth() - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "JPEG", 20, 20, imgWidth, imgHeight);

    document.body.removeChild(tempContainer);
    pdf.save(`Invoice_${record.quotation_no || "quotation"}.pdf`, { compression: true });
    message.success("PDF downloaded successfully");
  } catch (error) {
    console.error("PDF generation error:", error);
    message.error("Failed to generate PDF. Please try again.");
  } finally {
    if (setPdfLoading) setPdfLoading((prev) => ({ ...prev, [record._id]: false }));
  }
};

// ─────────────────────────────────────────────────────────────────────────────

const Admincreatequotation = () => {

  // ── list state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(false);
  const [quotations, setQuotations]     = useState([]);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateRange, setDateRange]       = useState(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(10);
  const [pdfLoading, setPdfLoading]     = useState({});

  // ── create modal state ─────────────────────────────────────────────────────
  const [formModal, setFormModal]     = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formError, setFormError]     = useState("");
  const [copied, setCopied]           = useState(false);
  const [formData, setFormData]       = useState({ ...DEFAULT_FORM });
  const [cartItems, setCartItems]     = useState([{ ...EMPTY_ITEM }]);

  // ── status modal state ─────────────────────────────────────────────────────
  const [statusModal, setStatusModal]     = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [newStatus, setNewStatus]         = useState(null);
  const [updating, setUpdating]           = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const collectQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: pageSize });
      if (search)         params.append("search", search);
      if (statusFilter)   params.append("status", statusFilter);
      if (dateRange?.[0]) params.append("from", dayjs(dateRange[0]).toISOString());
      if (dateRange?.[1]) params.append("to",   dayjs(dateRange[1]).toISOString());

      const res  = await fetch(`http://localhost:8080/api/quotation/admin/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      const data = await res.json();
      const rows = extractQuotations(data);
      setQuotations(rows);
      setTotal(extractTotal(data, rows.length));
    } catch (err) {
      ERROR_NOTIFICATION({ message: err.message || "Failed to load quotations" });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, dateRange]);

  useEffect(() => { collectQuotations(); }, [collectQuotations]);
  useEffect(() => { setPage(1); }, [search, statusFilter, dateRange, pageSize]);

  // ── create helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM });
    setCartItems([{ ...EMPTY_ITEM }]);
    setFormError("");
  };

  const handleOpenCreate = () => { resetForm(); setFormSuccess(null); setFormModal(true); };
  const handleFormCancel = () => { setFormModal(false); resetForm(); };
  const handleInputChange = (name, value) =>
    setFormData(prev => ({ ...prev, [name]: value }));

  const handleCartItemChange = (index, field, value) =>
    setCartItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: ["quantity", "price", "mrp_price"].includes(field)
          ? parseFloat(value) || 0 : value,
      };
      return updated;
    });

  const addCartItem    = () => setCartItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeCartItem = (i) => {
    if (cartItems.length > 1) setCartItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const calculateTotals = () => {
    const subtotal      = cartItems.reduce((s, it) => s + it.quantity * it.price, 0);
    const discountAmt   = subtotal * ((parseFloat(formData.discount_percentage) || 0) / 100);
    const afterDiscount = subtotal - discountAmt;
    const tax           = afterDiscount * 0.18;
    const delivery      = formData.free_delivery ? 0 : parseFloat(formData.delivery_charges) || 0;
    return { subtotal, discountAmt, afterDiscount, tax, delivery, total: afterDiscount + tax + delivery };
  };

  const handleCreateSubmit = async () => {
    setFormLoading(true);
    setFormError("");
    try {
      const validItems = cartItems.filter(it => it.product_name && it.quantity > 0 && it.price > 0);
      if (!validItems.length) throw new Error("Please add at least one valid product");

      const { subtotal, discountAmt, afterDiscount, tax, delivery, total } = calculateTotals();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(formData.valid_days || 30));

      const payload = {
        customer_name:        formData.customer_name,
        customer_email:       formData.customer_email,
        customer_phone:       formData.customer_phone,
        company_name:         formData.company_name,
        billing_address: {
          name:          formData.customer_name,
          email:         formData.customer_email,
          mobile_number: formData.customer_phone,
          company:       formData.company_name,
          street:        [formData.address_line1, formData.address_line2].filter(Boolean).join(", "),
          landmark:      formData.address_line2,
          city:          formData.city,
          state:         formData.state,
          pincode:       formData.pincode,
          country:       formData.country,
          address_type:  "billing",
        },
        cart_items:           validItems,
        gst_no:               formData.gst_no,
        delivery_charges:     formData.free_delivery ? 0 : parseFloat(formData.delivery_charges) || 0,
        free_delivery:        formData.free_delivery,
        discount_percentage:  parseFloat(formData.discount_percentage || 0),
        subtotal, discount_amount: discountAmt, taxable_amount: afterDiscount,
        tax_amount: tax, total_amount: total,
        valid_until:          validUntil.toISOString(),
        notes:                formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        admin_id:             "675be0febb62992beaa0b1c0",
      };

      const res  = await fetch("http://localhost:8080/api/quotation/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create quotation");

      SUCCESS_NOTIFICATION({ message: "Quotation created successfully!" });
      setFormModal(false);
      resetForm();
      setFormSuccess({
        quotation_no:   data.data.quotation_no,
        quotation_link: data.data.qr_url || data.data.quotation_link,
        pdf_link:       data.data.pdf_link,
        total_amount:   data.data.total_amount,
        valid_until:    data.data.valid_until,
        _record:        data.data,
      });
      collectQuotations();
    } catch (err) {
      setFormError(err.message || "Failed to create quotation");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── PDF download handler ──────────────────────────────────────────────────
  const handleDownloadPDF = async (record) => {
    await downloadPDF(record, setPdfLoading);
  };

  // ── status modal ───────────────────────────────────────────────────────────
  const openStatusModal = (record) => {
    setSelectedQuote(record);
    setNewStatus(record.quotation_status || "draft");
    setStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === selectedQuote?.quotation_status) { setStatusModal(false); return; }
    try {
      setUpdating(true);
      await fetch(
        `http://localhost:8080/api/quotation/${selectedQuote.quotation_no}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      SUCCESS_NOTIFICATION({ message: "Status updated successfully" });
      setStatusModal(false);
      setSelectedQuote(null);
      collectQuotations();
    } catch (err) {
      ERROR_NOTIFICATION({ message: err.message || "Failed to update status" });
    } finally {
      setUpdating(false);
    }
  };

  const totals = calculateTotals();

  // ── columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "S.No",
      render: (_, __, idx) => (
        <div className="text-center font-semibold text-gray-600">
          {(page - 1) * pageSize + idx + 1}
        </div>
      ),
      width: 65, align: "center",
    },
    {
      title: "Quotation No",
      dataIndex: "quotation_no",
      render: (no) => (
        <Tag color="blue" className="font-mono font-semibold text-xs px-2">
          {no || "—"}
        </Tag>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => {
        const addr = record.billing_address || {};
        return (
          <div>
            <div className="font-medium text-gray-800 text-sm">{addr.name || "—"}</div>
            <div className="text-xs text-gray-500">{addr.email || "—"}</div>
            <div className="text-xs text-gray-400">{addr.mobile_number || ""}</div>
            {record.company_name && (
              <div className="text-xs text-gray-400 italic">{record.company_name}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Address",
      key: "address",
      render: (_, record) => {
        const addr = record.billing_address || {};
        return (
          <div className="text-xs text-gray-600" style={{ maxWidth: 160 }}>
            <div className="truncate">{addr.street || "—"}</div>
            <div>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}</div>
          </div>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      render: (d) => (
        <span className="text-gray-600 text-sm whitespace-nowrap">
          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      title: "Valid Until",
      dataIndex: "valid_until",
      render: (d, record) => {
        const isExpired = record.quotation_status !== "converted" && d && new Date(d) < new Date();
        return (
          <div>
            <div className={`text-sm whitespace-nowrap ${isExpired ? "text-red-500 font-semibold" : "text-gray-600"}`}>
              {d ? dayjs(d).format("DD MMM YYYY") : "—"}
            </div>
            {isExpired && <div className="text-xs text-red-400">Expired</div>}
          </div>
        );
      },
    },
    {
      title: "Items",
      dataIndex: "cart_items",
      align: "center",
      width: 70,
      render: (items) => (
        <Tag color="geekblue" className="font-semibold">{items?.length || 0}</Tag>
      ),
    },
    {
      title: "Total Amount",
      dataIndex: "total_amount",
      render: (amt) => (
        <div className="font-bold text-gray-900 whitespace-nowrap">
          ₹{parseFloat(amt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "quotation_status",
      render: (status, record) => {
        const isExpired = status !== "converted" && record.valid_until && new Date(record.valid_until) < new Date();
        const key = (isExpired && status === "pending") ? "expired" : (status || "draft");
        const cfg = STATUS_CONFIG[key] || STATUS_CONFIG.draft;
        return <Tag color={cfg.color} icon={cfg.icon} className="font-medium">{cfg.label}</Tag>;
      },
    },
    {
      title: "Actions",
      width: 240,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Tooltip title="View Quotation">
            <a href={record.qr_url || `/quotation/view/${record.quotation_no}`} target="_blank" rel="noreferrer">
              <Button icon={<EyeOutlined />} size="small" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                View
              </Button>
            </a>
          </Tooltip>

          <Tooltip title="Download Invoice PDF">
            <Button
              icon={<FilePdfOutlined />}
              size="small"
              loading={!!pdfLoading[record._id]}
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleDownloadPDF(record)}
            >
              PDF
            </Button>
          </Tooltip>

          {record.quotation_status !== "converted" && (
            <Tooltip title="Update Status">
              <Button
                icon={<EditOutlined />} size="small"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => openStatusModal(record)}
              >
                Status
              </Button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Card
        title={
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Quotation Management</h2>
            <div className="flex items-center gap-2">
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined spin={loading} />} onClick={collectQuotations} />
              </Tooltip>
              <Button
                type="primary" icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Create Quotation
              </Button>
            </div>
          </div>
        }
        className="rounded-lg shadow-sm border-0"
      >
        {/* ── Filters ── */}
        <div className="mb-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Input.Search
              placeholder="Search name, email, quotation no…"
              allowClear
              onSearch={(val) => { setSearch(val); setPage(1); }}
              onChange={(e) => { if (!e.target.value) { setSearch(""); setPage(1); } }}
              className="w-64"
              size="large"
            />
            <Select
              placeholder="Filter by Status"
              allowClear
              onChange={(val) => { setStatusFilter(val || null); setPage(1); }}
              size="large"
              className="w-44"
            >
              {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (
                <Option key={key} value={key}>
                  <Tag color={color} className="font-medium">{label}</Tag>
                </Option>
              ))}
            </Select>
            <RangePicker
              size="large"
              onChange={(dates) => { setDateRange(dates || null); setPage(1); }}
              placeholder={["From Date", "To Date"]}
              className="w-60"
            />
          </div>
          <div className="text-sm text-gray-500">
            Total Quotations: <span className="font-semibold text-gray-800">{total}</span>
          </div>
        </div>

        {/* ── Table ── */}
        <CustomTable
          dataSource={quotations}
          loading={loading}
          columns={columns}
          scroll={{ x: 1400 }}
          rowKey={(record) => record._id || record.quotation_no}
          rowClassName="hover:bg-gray-50"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "25", "50"],
            showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} quotations`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      {/* ════ SUCCESS MODAL ════ */}
      <Modal
        open={!!formSuccess}
        onCancel={() => setFormSuccess(null)}
        footer={
          <Button type="primary" onClick={() => setFormSuccess(null)} className="bg-blue-500">Done</Button>
        }
        title={
          <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
            <CheckCircleOutlined /> Quotation Created Successfully!
          </div>
        }
        width={500}
      >
        {formSuccess && (
          <div className="space-y-3 text-sm text-gray-700 mt-2">
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Quotation No</span>
                <Tag color="blue" className="font-mono font-semibold">{formSuccess.quotation_no}</Tag>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-bold text-gray-900">₹{parseFloat(formSuccess.total_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valid Until</span>
                <span className="font-medium">
                  {formSuccess.valid_until ? dayjs(formSuccess.valid_until).format("DD MMM YYYY") : "—"}
                </span>
              </div>
            </div>
            {formSuccess.quotation_link && (
              <div>
                <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <QrcodeOutlined /> Quotation Link
                </p>
                <div className="flex gap-2">
                  <Input value={formSuccess.quotation_link} readOnly size="small" className="flex-1" />
                  <Button
                    size="small"
                    icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                    onClick={() => handleCopy(formSuccess.quotation_link)}
                    className={copied ? "text-green-600 border-green-400" : ""}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
            <Button
              icon={<FilePdfOutlined />}
              type="primary"
              danger
              className="w-full mt-1"
              loading={!!pdfLoading[formSuccess._record?._id]}
              onClick={() => {
                if (formSuccess._record) {
                  downloadPDF(formSuccess._record, setPdfLoading);
                }
              }}
            >
              Download PDF
            </Button>
          </div>
        )}
      </Modal>

      {/* ════ CREATE MODAL ════ */}
      <Modal
        open={formModal}
        onCancel={handleFormCancel}
        footer={null}
        title={
          <div className="text-lg font-semibold flex items-center gap-2">
            <FileTextOutlined className="text-blue-500" /> Create New Quotation
          </div>
        }
        width={900}
        destroyOnClose
        styles={{ body: { maxHeight: "80vh", overflowY: "auto", padding: "24px" } }}
      >
        <Spin spinning={formLoading}>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          {/* Customer */}
          <Divider className="my-3">
            <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
              <UserOutlined /> Customer Information
            </span>
          </Divider>
          <div className="grid grid-cols-2 gap-4 mb-2">
            {[
              { label: "Customer Name *", key: "customer_name", placeholder: "John Doe", prefix: <UserOutlined className="text-gray-400" /> },
              { label: "Company Name",    key: "company_name",  placeholder: "Acme Corp (optional)", prefix: <ShopOutlined className="text-gray-400" /> },
              { label: "Email Address *", key: "customer_email", placeholder: "john@example.com", prefix: <MailOutlined className="text-gray-400" /> },
              { label: "Phone Number *",  key: "customer_phone", placeholder: "9876543210", prefix: <PhoneOutlined className="text-gray-400" />, maxLength: 10 },
            ].map(({ label, key, placeholder, prefix, maxLength }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                <Input
                  prefix={prefix} placeholder={placeholder}
                  value={formData[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  maxLength={maxLength}
                  className="h-10"
                />
              </div>
            ))}
          </div>

          {/* Address */}
          <Divider className="my-3">
            <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
              <EnvironmentOutlined /> Billing Address
            </span>
          </Divider>
          <div className="space-y-3 mb-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Address Line 1 *</label>
              <Input placeholder="Flat / Door No, Building Name" value={formData.address_line1}
                onChange={(e) => handleInputChange("address_line1", e.target.value)} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Address Line 2</label>
              <Input placeholder="Street, Area, Landmark" value={formData.address_line2}
                onChange={(e) => handleInputChange("address_line2", e.target.value)} className="h-10" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "City *",    key: "city" },
                { label: "State *",   key: "state" },
                { label: "Pincode *", key: "pincode", maxLength: 6 },
                { label: "Country",   key: "country" },
              ].map(({ label, key, maxLength }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                  <Input placeholder={label.replace(" *", "")} value={formData[key]}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    maxLength={maxLength} className="h-10" />
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <Divider className="my-3">
            <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
              <ShoppingCartOutlined /> Quotation Items
            </span>
          </Divider>
          <div className="space-y-3 mb-2">
            {cartItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
                    <Input placeholder="Product name" value={item.product_name} size="small"
                      onChange={(e) => handleCartItemChange(idx, "product_name", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Specs</label>
                    <Input placeholder="e.g. custom text" value={item.notes} size="small"
                      onChange={(e) => handleCartItemChange(idx, "notes", e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Qty *</label>
                    <InputNumber min={1} value={item.quantity} size="small" className="w-full"
                      onChange={(val) => handleCartItemChange(idx, "quantity", val)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">MRP (₹)</label>
                    <InputNumber min={0} value={item.mrp_price} size="small" className="w-full" prefix="₹"
                      onChange={(val) => handleCartItemChange(idx, "mrp_price", val)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Price *</label>
                    <InputNumber min={0} value={item.price} size="small" className="w-full" prefix="₹"
                      onChange={(val) => handleCartItemChange(idx, "price", val)} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total</label>
                    <div className="text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded px-2 py-1">
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Popconfirm title="Remove item?" onConfirm={() => removeCartItem(idx)}
                      disabled={cartItems.length === 1} okText="Yes" cancelText="No">
                      <Button icon={<DeleteOutlined />} size="small" danger
                        disabled={cartItems.length === 1} className="w-full" />
                    </Popconfirm>
                  </div>
                </div>
                {item.mrp_price > 0 && item.price > 0 && item.mrp_price > item.price && (
                  <p className="mt-1 text-xs text-green-600 font-medium">
                    Discount: ₹{(item.mrp_price - item.price).toFixed(2)}{" "}
                    ({Math.round(((item.mrp_price - item.price) / item.mrp_price) * 100)}% off)
                  </p>
                )}
              </div>
            ))}
            <Button icon={<PlusOutlined />} onClick={addCartItem} className="w-full border-dashed">
              Add Item
            </Button>
          </div>

          {/* Additional Details */}
          <Divider className="my-3">
            <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
              <TagOutlined /> Additional Details
            </span>
          </Divider>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">GST Number</label>
              <Input placeholder="22AAAAA0000A1Z5" maxLength={15} value={formData.gst_no}
                onChange={(e) => handleInputChange("gst_no", e.target.value)} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Overall Discount (%)</label>
              <InputNumber min={0} max={100} value={formData.discount_percentage} className="w-full h-10" suffix="%"
                onChange={(val) => handleInputChange("discount_percentage", val)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Valid For (Days)</label>
              <InputNumber min={1} max={365} value={formData.valid_days} className="w-full h-10"
                onChange={(val) => handleInputChange("valid_days", val)} />
              <p className="text-xs text-gray-400 mt-1">
                Valid until: {(() => { const d = new Date(); d.setDate(d.getDate() + parseInt(formData.valid_days || 30)); return dayjs(d).format("DD MMM YYYY"); })()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Charges (₹)</label>
              <InputNumber min={0} value={formData.delivery_charges} disabled={formData.free_delivery}
                className="w-full h-10" prefix="₹"
                onChange={(val) => handleInputChange("delivery_charges", val)} />
              <Checkbox checked={formData.free_delivery} className="mt-2 font-medium text-gray-700"
                onChange={(e) => handleInputChange("free_delivery", e.target.checked)}>
                Free Delivery
              </Checkbox>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes (Internal)</label>
            <TextArea rows={2} placeholder="Internal notes..." value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Terms & Conditions</label>
            <TextArea rows={3} value={formData.terms_and_conditions} className="font-mono text-xs"
              onChange={(e) => handleInputChange("terms_and_conditions", e.target.value)} />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800 mb-3">
              <FileTextOutlined className="text-blue-500" /> Quotation Summary
            </div>
            <div className="space-y-1 text-sm">
              {[
                { label: "Subtotal", value: `₹${totals.subtotal.toFixed(2)}` },
                ...(totals.discountAmt > 0 ? [{ label: `Discount (${formData.discount_percentage}%)`, value: `- ₹${totals.discountAmt.toFixed(2)}`, green: true }] : []),
                { label: "Taxable Amount", value: `₹${totals.afterDiscount.toFixed(2)}` },
                { label: "Tax (18% GST)", value: `₹${totals.tax.toFixed(2)}` },
                { label: "Delivery", value: `₹${totals.delivery.toFixed(2)}` },
              ].map(({ label, value, green }) => (
                <div key={label} className={`flex justify-between ${green ? "text-green-700" : "text-gray-700"}`}>
                  <span>{label}:</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
              <Divider className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-bold text-gray-900">Total Amount:</span>
                <span className="font-bold text-blue-600">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button onClick={handleFormCancel} className="h-10 px-6 font-medium">Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleCreateSubmit} loading={formLoading}
              className="h-10 px-6 font-medium bg-blue-500 hover:bg-blue-600 border-0 shadow-sm">
              Create Quotation
            </Button>
          </div>
        </Spin>
      </Modal>

      {/* ════ STATUS MODAL ════ */}
      <Modal
        open={statusModal}
        onCancel={() => { setStatusModal(false); setSelectedQuote(null); setNewStatus(null); }}
        footer={null}
        title={
          <div className="text-lg font-semibold flex items-center gap-2">
            <EditOutlined className="text-blue-500" /> Update Quotation Status
          </div>
        }
        width={420}
        destroyOnClose
      >
        <Spin spinning={updating}>
          {selectedQuote && (
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Quotation</p>
                <p className="font-mono font-semibold text-blue-600">{selectedQuote.quotation_no}</p>
                <p className="text-sm text-gray-700 mt-1">{selectedQuote.billing_address?.name || "—"}</p>
                <p className="text-xs text-gray-500">{selectedQuote.billing_address?.email || ""}</p>
              </div>
              <Divider className="my-3">
                <span className="text-gray-500 text-sm font-medium">Select New Status</span>
              </Divider>
              <div className="space-y-2 mb-6">
                {Object.entries(STATUS_CONFIG).map(([key, { label, color, icon }]) => (
                  <div key={key} onClick={() => setNewStatus(key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      newStatus === key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      newStatus === key ? "border-blue-500" : "border-gray-300"
                    }`}>
                      {newStatus === key && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <Tag color={color} icon={icon} className="font-medium mb-0">{label}</Tag>
                    {selectedQuote.quotation_status === key && (
                      <span className="text-xs text-gray-400 ml-auto">current</span>
                    )}
                  </div>
                ))}
              </div>
              <Divider className="my-3" />
              <div className="flex gap-3 justify-end">
                <Button onClick={() => { setStatusModal(false); setSelectedQuote(null); }} className="h-10 px-6 font-medium">
                  Cancel
                </Button>
                <Button type="primary" onClick={handleStatusUpdate}
                  disabled={!newStatus || newStatus === selectedQuote.quotation_status}
                  loading={updating}
                  className="h-10 px-6 font-medium bg-blue-500 hover:bg-blue-600 border-0 shadow-sm">
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default Admincreatequotation;