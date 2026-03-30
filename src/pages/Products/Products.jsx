import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  MdDelete, MdContentCopy, MdMoreVert, MdStar,
  MdNewReleases, MdThumbUp, MdFileDownload,
} from "react-icons/md";
import {
  Button, Descriptions, Form, Image, Modal, Popconfirm,
  Select, Spin, Switch, Tabs, Tag, Tooltip, Card,
  Typography, Dropdown, Menu, message,
} from "antd";
import { FaEdit, FaEye } from "react-icons/fa";
import { LockOutlined } from "@ant-design/icons";
import _ from "lodash";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import {
  addproduct, CLIENT_URL, deleteProduct, editProduct,
  getAllCategoryProducts, getAllVendor, getMainCategory,
  getProduct, getSubCategory, getSingleVendor,
} from "../../api";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import CustomTable from "../../components/CustomTable";
import DefaultTile from "../../components/DefaultTile";
import { useForm } from "antd/es/form/Form";
import AddForms from "./AddForms";
import { canEditPage, canDeletePage, isSuperAdmin } from "../../helper/permissionHelper";

const { Title, Text } = Typography;

const STORAGE_KEYS = {
  PAGE_SIZE:    "products_pageSize",
  CURRENT_PAGE: "products_currentPage",
  FILTERS:      "products_filters",
  ACTIVE_TAB:   "products_activeTab",
};

// ─── Checkbox CSS ─────────────────────────────────────────────────────────────
const CB_STYLES = `
  .pcb {
    appearance: none; -webkit-appearance: none;
    width: 16px; height: 16px; min-width: 16px;
    border: 2px solid #0d9488; border-radius: 3px;
    background: #fff; cursor: pointer;
    position: relative; display: block; margin: 0 auto;
    transition: background 0.12s, border-color 0.12s;
  }
  .pcb:hover { border-color: #0f766e; background: #f0fdfa; }
  .pcb:checked { background: #0d9488; border-color: #0d9488; }
  .pcb:checked::after {
    content: ""; position: absolute;
    left: 3px; top: 0px; width: 5px; height: 9px;
    border: 2.5px solid #fff; border-top: none; border-left: none;
    transform: rotate(43deg);
  }
  .pcb:indeterminate { background: #0d9488; border-color: #0d9488; }
  .pcb:indeterminate::after {
    content: ""; position: absolute;
    left: 2px; top: 5px; width: 8px; height: 2px; background: #fff;
  }
  .pcb:focus-visible { outline: 2px solid #5eead4; outline-offset: 2px; }
  .prod-row-sel td { background-color: #f0fdfa !important; }
  .prod-row-sel:hover td { background-color: #ccfbf1 !important; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const loadImageAsDataURL = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    fetch(url, { mode: "cors", cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => {
        const rd = new FileReader();
        rd.onloadend = () => resolve(rd.result || null);
        rd.onerror   = () => tryImg();
        rd.readAsDataURL(blob);
      })
      .catch(() => tryImg());
    function tryImg() {
      const img = new window.Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width  = img.naturalWidth  || 200;
          c.height = img.naturalHeight || 200;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve(c.toDataURL("image/jpeg", 0.85));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
    }
  });

const getVariantImages = (product) => {
  if (!product.variants || !Array.isArray(product.variants)) return [];
  const out = [];
  product.variants.forEach((vg) => {
    if (vg.variant_type === "image_variant" && vg.options) {
      vg.options.forEach((opt) => {
        if (opt.image_names?.length > 0) {
          const imgs = opt.image_names
            .map((img) => typeof img === "object" ? _.get(img, "url", _.get(img, "path", "")) : img)
            .filter(Boolean);
          if (imgs.length > 0)
            out.push({ variantName: vg.variant_name, optionValue: opt.value, images: imgs });
        }
      });
    }
  });
  return out;
};

const getProductImage = (product) => {
  if (product.images?.length > 0) {
    const f = product.images[0];
    return typeof f === "object" ? _.get(f, "url", _.get(f, "path", "")) : f;
  }
  for (const v of getVariantImages(product)) { if (v.images?.length > 0) return v.images[0]; }
  return "";
};

const getProductPrice = (product, priceType = "customer") => {
  const MAP   = { customer: "customer_product_price", dealer: "Deler_product_price", corporate: "corporate_product_price" };
  const field = MAP[priceType];
  if (product.type === "Stand Alone Product") return product[field] || product.MRP_price || "N/A";
  if (product.type === "Variant Product" || product.type === "Variable Product") {
    if (product.variants_price?.length > 0) {
      const ps = product.variants_price
        .map((v) => { const p = v[field] || v.price; return p ? parseFloat(p) : null; })
        .filter((p) => p !== null && !isNaN(p));
      if (ps.length > 0) return Math.min(...ps);
    }
    return product[field] || product.MRP_price || "N/A";
  }
  return "N/A";
};

const getTotalStock = (product) => {
  if ((product.type === "Variant Product" || product.type === "Variable Product") && product.variants_price?.length > 0)
    return product.variants_price.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);
  return product.stock_count || 0;
};

const getDaysNeeded = (product) => {
  const stock = product.totalStock ?? getTotalStock(product);
  const prod  = parseInt(product.production_time  || product.Production_time  || 0);
  const arr   = parseInt(product.stock_arrangement_time || product.Stock_Arrangement_time || 0);
  const days  = stock === 0 ? prod + arr : prod;
  return days === 0 ? "1 Day" : `${days} Day${days !== 1 ? "s" : ""}`;
};

// ─── HeaderCheckbox ───────────────────────────────────────────────────────────
const HeaderCheckbox = ({ checked, indeterminate, onChange }) => {
  const ref              = useRef(null);
  const checkedRef       = useRef(checked);
  const indeterminateRef = useRef(indeterminate);

  checkedRef.current       = checked;
  indeterminateRef.current = indeterminate;

  useEffect(() => {
    if (!ref.current) return;
    ref.current.checked       = checkedRef.current;
    ref.current.indeterminate = indeterminateRef.current;
  });

  return (
    <input
      ref={ref}
      type="checkbox"
      className="pcb"
      defaultChecked={false}
      onChange={(e) => onChange(e.target.checked)}
      title="Select / deselect all on this page"
    />
  );
};

// ─── RowCheckbox ──────────────────────────────────────────────────────────────
const RowCheckbox = ({ checked, onChange }) => (
  <input
    type="checkbox"
    className="pcb"
    checked={checked}
    onChange={onChange}
  />
);

// ═════════════════════════════════════════════════════════════════════════════
const Products = () => {
  const { user } = useSelector((s) => s.authSlice);

  const [formStatus, setFormStatus]       = useState(false);
  const [id, setId]                       = useState("");
  const [loading, setLoading]             = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [activeTabKey, setActiveTabKey]   = useState(
    () => localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) || "1"
  );

  const [tableData, setTableData]                   = useState([]);
  const [mainCategory, setMainCategoryData]         = useState([]);
  const [categoryData, setCategoryData]             = useState([]);
  const [subcategoryData, setSubcategoryData]       = useState([]);
  const [subcategoryDataFilter, setSubcategoryDataFilter] = useState([]);
  const [allVendors, setAllVendors]                 = useState([]);
  const [vendorClose, setVendorClose]               = useState([]);
  const [vendorNames, setVendorNames]               = useState({});
  const [vendorsLoading, setVendorsLoading]         = useState({});

  const [search, setSearch]                         = useState("");
  const [filterByProductCategory, setFilterByProductCategory]       = useState("");
  const [filterByProductSubcategory, setFilterByProductSubcategory] = useState("");
  const [vendorFilter, setVendorFilter]             = useState("");
  const [filterByType, setFilterByType]             = useState("");
  const [visibilityFilter, setVisibilityFilter]     = useState("");
  const [minPrice, setMinPrice]                     = useState("");
  const [maxPrice, setMaxPrice]                     = useState("");

  const [cloneModal, setOpenCloneModal]             = useState(false);
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [productId, setProductId]                   = useState();
  const [cloneProductDetails, setCloneProductDetails] = useState([]);

  const [paginationConfig, setPaginationConfig] = useState(() => ({
    pageSize:    localStorage.getItem(STORAGE_KEYS.PAGE_SIZE)    ? parseInt(localStorage.getItem(STORAGE_KEYS.PAGE_SIZE), 10)    : 10,
    currentPage: localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE) ? parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE), 10) : 1,
  }));

  // ── Selection ───────────────────────────────────────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState([]);
  const selectedKeysSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const toggleKey = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return [...next];
    });
  }, []);

  const toggleAll = useCallback((keys, forceOn) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (forceOn) keys.forEach((k) => next.add(k));
      else         keys.forEach((k) => next.delete(k));
      return [...next];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedKeys([]), []);

  const [form] = useForm();

  const hasEditPermission   = isSuperAdmin(user.role) || canEditPage(user.pagePermissions,   "product-details");
  const hasDeletePermission = isSuperAdmin(user.role) || canDeletePage(user.pagePermissions, "product-details");

  // ── Restore filters ─────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FILTERS);
    if (!saved) return;
    try {
      const f = JSON.parse(saved);
      if (f.category)    setFilterByProductCategory(f.category);
      if (f.subcategory) setFilterByProductSubcategory(f.subcategory);
      if (f.vendor)      setVendorFilter(f.vendor);
      if (f.type)        setFilterByType(f.type);
      if (f.visibility)  setVisibilityFilter(f.visibility);
      if (f.search)      setSearch(f.search);
      if (f.minPrice)    setMinPrice(f.minPrice);
      if (f.maxPrice)    setMaxPrice(f.maxPrice);
    } catch { }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify({
      category:    filterByProductCategory,
      subcategory: filterByProductSubcategory,
      vendor:      vendorFilter,
      type:        filterByType,
      visibility:  visibilityFilter,
      search, minPrice, maxPrice,
    }));
  }, [filterByProductCategory, filterByProductSubcategory, vendorFilter, filterByType, visibilityFilter, search, minPrice, maxPrice]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const savePag = (ps, cp) => {
    localStorage.setItem(STORAGE_KEYS.PAGE_SIZE,    String(ps));
    localStorage.setItem(STORAGE_KEYS.CURRENT_PAGE, String(cp));
  };
  const handlePageSizeChange = (ps) => { setPaginationConfig((p) => ({ ...p, pageSize: ps, currentPage: 1 })); savePag(ps, 1); };
  const handlePageChange     = (cp) => { setPaginationConfig((p) => ({ ...p, currentPage: cp })); savePag(paginationConfig.pageSize, cp); };
  const handleTabChange      = (key) => {
    setActiveTabKey(key);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, key);
    clearSelection();
    if (paginationConfig.currentPage !== 1) handlePageChange(1);
  };
  const handleTableChange = (pagination) => {
    if (pagination.current  !== paginationConfig.currentPage) handlePageChange(pagination.current);
    if (pagination.pageSize !== paginationConfig.pageSize)    handlePageSizeChange(pagination.pageSize);
  };

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getProduct(
        "", search || "", true,
        filterByProductCategory || "", filterByType || "",
        filterByProductSubcategory || "", vendorFilter || "", visibilityFilter || ""
      );
      setTableData(_.get(result, "data.data", []).reverse());
    } catch (err) { ERROR_NOTIFICATION(err); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const [mr, sr] = await Promise.all([getMainCategory(), getSubCategory()]);
      setCategoryData(_.get(mr, "data.data", []));
      setSubcategoryData(_.get(sr, "data.data", []));
    } catch (err) { ERROR_NOTIFICATION(err); }
  };

  const fetchMainCategories = async () => {
    try { setMainCategoryData(_.get(await getAllCategoryProducts(), "data.data", [])); }
    catch (err) { ERROR_NOTIFICATION(err); }
  };

  const collectVendors = async () => {
    try { setLoading(true); setAllVendors(_.get(await getAllVendor(), "data.data", [])); }
    catch (err) { ERROR_NOTIFICATION(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); fetchMainCategories(); collectVendors(); }, []);
  useEffect(() => { fetchData(); if (!formStatus) setId(""); }, [search, formStatus, filterByProductCategory, filterByType, filterByProductSubcategory, vendorFilter, visibilityFilter]);

  // ── Processed data ───────────────────────────────────────────────────────────
  const currentTabData = useMemo(() =>
    tableData.filter((r) => activeTabKey === "1" ? !r.is_cloned : r.is_cloned),
    [tableData, activeTabKey]
  );

  const processedTableData = useMemo(() => {
    return currentTabData
      .filter((item) => {
        const price = parseFloat(item.MRP_price) || 0;
        const min   = minPrice !== "" ? parseFloat(minPrice) : null;
        const max   = maxPrice !== "" ? parseFloat(maxPrice) : null;
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
        return true;
      })
      .map((item, index) => ({
        ...item,
        serialNumber: index + 1,
        totalStock:   getTotalStock(item),
        _isSelected:  selectedKeysSet.has(item._id),
        prices: {
          customerPrice:  getProductPrice(item, "customer"),
          dealerPrice:    getProductPrice(item, "dealer"),
          corporatePrice: getProductPrice(item, "corporate"),
        },
        seo_url: item.seo_url || "",
      }));
  }, [currentTabData, minPrice, maxPrice, selectedKeysSet]);

  const allSel  = useMemo(() => processedTableData.length > 0 && processedTableData.every(r => selectedKeysSet.has(r._id)), [processedTableData, selectedKeysSet]);
  const someSel = useMemo(() => !allSel && processedTableData.some(r => selectedKeysSet.has(r._id)),                          [allSel, processedTableData, selectedKeysSet]);

  const allProductIdsRef = useRef([]);
  useEffect(() => { allProductIdsRef.current = processedTableData.map(r => r._id); }, [processedTableData]);

  const selectedRows = useMemo(() => processedTableData.filter((r) => r._isSelected), [processedTableData]);

  // ── Filter helpers ───────────────────────────────────────────────────────────
  const onCategoryChange = (value) => {
    setFilterByProductCategory(value);
    setFilterByProductSubcategory("");
    handlePageChange(1);
    setSubcategoryDataFilter(value ? subcategoryData.filter((s) => s.select_main_category === value) : []);
  };
  const onCloneCategoryChange = (value) => {
    setSubcategoryDataFilter(value ? subcategoryData.filter((s) => s.select_main_category === value) : []);
    form.setFieldValue("sub_category_details", undefined);
  };
  const handleClearFilters = () => {
    setFilterByProductCategory(""); setFilterByProductSubcategory(""); setVendorFilter("");
    setFilterByType(""); setVisibilityFilter(""); setMinPrice(""); setMaxPrice("");
    setSubcategoryDataFilter([]); setSearch(""); clearSelection(); handlePageChange(1);
    localStorage.removeItem(STORAGE_KEYS.FILTERS);
  };

  // ── Product actions ──────────────────────────────────────────────────────────
  const handleOnChangeLabel = async (data, product) => {
    if (!hasEditPermission) { ERROR_NOTIFICATION({ message: "No edit permission" }); return; }
    const pid = _.get(product, "_id", "");
    try {
      setUpdatingProductId(pid);
      setTableData((prev) => prev.map((item) => item._id === pid ? { ...item, ...data } : item));
      SUCCESS_NOTIFICATION(await editProduct(data, pid));
      await fetchData();
    } catch (err) {
      setTableData((prev) => prev.map((item) => item._id === pid ? { ...item, is_visible: !data.is_visible } : item));
      ERROR_NOTIFICATION(err);
    } finally { setUpdatingProductId(null); }
  };

  const handleUpdate = (data) => {
    if (!hasEditPermission) { ERROR_NOTIFICATION({ message: "No edit permission" }); return; }
    setId(data); setFormStatus(true);
  };
  const handleDelete = async (data) => {
    if (!hasDeletePermission) { ERROR_NOTIFICATION({ message: "No delete permission" }); return; }
    try { SUCCESS_NOTIFICATION(await deleteProduct(JSON.stringify({ product_id: data._id, is_cloned: data.is_cloned }))); await fetchData(); }
    catch (err) { ERROR_NOTIFICATION(err); }
  };
  const handleView = (data) => window.open(`https://www.printe.in/product/${_.get(data, "seo_url", "")}`);

  // ── Clone ─────────────────────────────────────────────────────────────────────
  const handleOpenModal = (productData) => {
    if (!hasEditPermission) { ERROR_NOTIFICATION({ message: "No permission" }); return; }
    const product = { ...productData }; delete product.category_details; delete product.sub_category_details;
    setSelectedProductData(product); setProductId(product._id); delete product._id; setOpenCloneModal(true);
  };
  const handleCloseModal = () => { form.resetFields(); setCloneProductDetails([]); setSelectedProductData(null); setOpenCloneModal(false); };
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...cloneProductDetails,
        parent_product_id: _.get(cloneProductDetails, "_id", ""),
        is_cloned:         true,
        category_details:  values.category_details,
        sub_category_details: values.sub_category_details,
      };
      delete payload._id;
      SUCCESS_NOTIFICATION(await addproduct(payload));
      form.resetFields(); await fetchData(); setCloneProductDetails([]); setOpenCloneModal(false);
    } catch (err) { ERROR_NOTIFICATION(err); }
    finally { setLoading(false); }
  };

  // ── Vendor resolver ──────────────────────────────────────────────────────────
  const getVendorName = useCallback(async (vid) => {
    if (!vid || vendorNames[vid]) return vendorNames[vid] || null;
    setVendorsLoading((p) => ({ ...p, [vid]: true }));
    try {
      const name = _.get(await getSingleVendor(vid), "data.data.business_name", "Unknown Vendor");
      setVendorNames((p) => ({ ...p, [vid]: name })); return name;
    } catch { setVendorNames((p) => ({ ...p, [vid]: "Error" })); return "Error"; }
    finally { setVendorsLoading((p) => ({ ...p, [vid]: false })); }
  }, [vendorNames]);

  useEffect(() => { vendorClose.forEach((v) => { if (!vendorNames[v._id]) getVendorName(v._id); }); }, [vendorClose, vendorNames, getVendorName]);

  // ── CSV helpers ───────────────────────────────────────────────────────────────
  const buildCSV = (cols, rows) => {
    let csv = "data:text/csv;charset=utf-8,";
    csv += cols.map((c) => `"${c.label}"`).join(",") + "\r\n";
    rows.forEach((row) => { csv += cols.map((c) => `"${row[c.key] || ""}"`).join(",") + "\r\n"; });
    return csv;
  };
  const dlCSV = (content, filename) => {
    const a = document.createElement("a"); a.href = encodeURI(content); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const exportToCSV = () => {
    if (!hasEditPermission) return;
    try {
      setExportLoading(true);
      const cols = [
        { label: "S.No", key: "s_no" }, { label: "Product Name", key: "product_name" },
        { label: "PRODUCT S.NO", key: "product_serial_no" }, { label: "VENDOR CODE", key: "vendor_code" },
        { label: "Product Code", key: "product_code" }, { label: "Category", key: "category" },
        { label: "Sub Category", key: "sub_category" }, { label: "MRP Price", key: "mrp_price" },
      ];
      dlCSV(buildCSV(cols, tableData.map((p, i) => ({
        s_no: i + 1, product_name: p.name || "N/A", product_serial_no: p.product_codeS_NO || "N/A",
        vendor_code: p.Vendor_Code || "N/A", product_code: p.product_code || "N/A",
        category: _.get(p, "category_details.main_category_name", "N/A"),
        sub_category: _.get(p, "sub_category_details.sub_category_name", "N/A"),
        mrp_price: p.MRP_price || "N/A",
      }))), `products_export_${new Date().toISOString().split("T")[0]}.csv`);
      message.success("CSV downloaded");
    } catch { message.error("Failed"); } finally { setExportLoading(false); }
  };

  const exportFilteredToCSV = () => {
    if (!hasEditPermission || tableData.length === 0) { if (tableData.length === 0) message.warning("No products"); return; }
    try {
      setExportLoading(true);
      const cols = [
        { label: "S.No", key: "s_no" }, { label: "Product Name", key: "product_name" },
        { label: "PRODUCT S.NO", key: "product_serial_no" }, { label: "VENDOR CODE", key: "vendor_code" },
        { label: "Product Code", key: "product_code" }, { label: "Product Type", key: "product_type" },
        { label: "Category", key: "category" }, { label: "Sub Category", key: "sub_category" },
        { label: "Total Stock", key: "total_stock" }, { label: "Stock Status", key: "stock_status" },
        { label: "Customer Price", key: "customer_price" }, { label: "Dealer Price", key: "dealer_price" },
        { label: "Corporate Price", key: "corporate_price" }, { label: "Vendors", key: "vendors" },
        { label: "Visibility", key: "visibility" },
      ];
      dlCSV(buildCSV(cols, tableData.map((p, i) => {
        const cp = getProductPrice(p, "customer"); const dp = getProductPrice(p, "dealer"); const crp = getProductPrice(p, "corporate");
        return {
          s_no: i + 1, product_name: p.name || "N/A", product_serial_no: p.product_codeS_NO || "N/A",
          vendor_code: p.Vendor_Code || "N/A", product_code: p.product_code || "N/A", product_type: p.type || "N/A",
          category: _.get(p, "category_details.main_category_name", "N/A"),
          sub_category: _.get(p, "sub_category_details.sub_category_name", "N/A"),
          total_stock: getTotalStock(p), stock_status: p.stocks_status || "N/A",
          customer_price: cp !== "N/A" ? `Rs.${cp}` : "N/A", dealer_price: dp !== "N/A" ? `Rs.${dp}` : "N/A",
          corporate_price: crp !== "N/A" ? `Rs.${crp}` : "N/A",
          vendors: p.vendor_details?.map((v) => v.business_name || "Unknown").join(", ") || "No Vendor",
          visibility: p.is_visible ? "Visible" : "Hidden",
        };
      })), `filtered_products_${new Date().toISOString().split("T")[0]}.csv`);
      message.success(`CSV with ${tableData.length} products downloaded`);
    } catch { message.error("Failed"); } finally { setExportLoading(false); }
  };

  const exportAllToCSV = async () => {
    if (!hasEditPermission) return;
    try {
      setExportLoading(true);
      const all = _.get(await getProduct("", "", false, "", "", "", "", ""), "data.data", []);
      if (all.length === 0) { message.warning("No products"); return; }
      const cols = [
        { label: "S.No", key: "s_no" }, { label: "Product ID", key: "pid" },
        { label: "Product Name", key: "name" }, { label: "Product Code", key: "code" },
        { label: "Category", key: "cat" }, { label: "Sub Category", key: "subcat" },
        { label: "Total Stock", key: "stock" }, { label: "Customer Price", key: "cp" },
        { label: "Dealer Price", key: "dp" }, { label: "MRP Price", key: "mrp" },
        { label: "Visibility", key: "vis" },
      ];
      dlCSV(buildCSV(cols, all.map((p, i) => ({
        s_no: i + 1, pid: p._id, name: p.name || "N/A", code: p.product_code || "N/A",
        cat: _.get(p, "category_details.main_category_name", "N/A"),
        subcat: _.get(p, "sub_category_details.sub_category_name", "N/A"),
        stock: getTotalStock(p), cp: getProductPrice(p, "customer"), dp: getProductPrice(p, "dealer"),
        mrp: p.MRP_price || "N/A", vis: p.is_visible ? "Visible" : "Hidden",
      }))), `all_products_${new Date().toISOString().split("T")[0]}.csv`);
      message.success(`All ${all.length} products exported`);
    } catch { message.error("Failed"); } finally { setExportLoading(false); }
  };

 
  const exportToPDF = async (onlySelected = false, min = minPrice, max = maxPrice) => {
    if (!hasEditPermission) return;
    try {
      setExportLoading(true);

      let toExport = processedTableData;
      
      if (onlySelected) {
        if (selectedKeys.length === 0) { message.warning("Select at least one product"); return; }
        toExport = selectedRows;
      }
      if (toExport.length === 0) { message.warning("No products"); return; }

      // ── STEP 1: Save to DB first ──────────────────────────────────────────
      let catalogUrl = "https://printe.in"; // fallback if DB save fails
      try {
        const { data } = await axios.post("https://api.printe.in/api/pdf-exports", {
          products: toExport.map((p) => ({
            _id:                 p._id,
            name:                p.name,
            product_code:        p.product_code,
            product_codeS_NO:    p.product_codeS_NO,
            category_details:    p.category_details,
            sub_category_details: p.sub_category_details,
            MRP_price:           p.MRP_price,
            prices:              p.prices,
            totalStock:          p.totalStock,
            is_visible:          p.is_visible,
            type:                p.type,
            gst:                 p.gst,
            HSNcode_time:        p.HSNcode_time,
            HSN_code:            p.HSN_code,
            stocks_status:       p.stocks_status,
            image_url:           p.images.length > 0 ? p.images : p.variants[0]?.options[0]?.image_names || [],
            DaysNeeded:            getDaysNeeded(p),
            product_url:          `${CLIENT_URL}/product/${p.seo_url || p._id}`,
          })),
          export_type: onlySelected ? "selected" : "all",
          min_price:   min,
          max_price:   max,
          filename:    onlySelected
            ? `selected_products_${new Date().toISOString().split("T")[0]}.pdf`
            : `products_${new Date().toISOString().split("T")[0]}.pdf`,
          status: "success",
        });
        const exportId = data?.data?._id;
        if (exportId) {
          catalogUrl = `${window.location.origin}/product-catalog/${exportId}`;
        }
      } catch (dbErr) {
        console.warn("[exportToPDF] DB save failed:", dbErr?.message);
      }

      // ── STEP 2: Generate PDF ──────────────────────────────────────────────
      message.loading({ content: "Preparing PDF...", key: "pdfk" });

      const imgCache = {};
      await Promise.all(
        toExport.map(async (p) => {
          const u = getProductImage(p);
          if (u) imgCache[p._id] = await loadImageAsDataURL(u);
        })
      );
      message.destroy("pdfk");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const PW = 210, PH = 297, M = 8;

      const COL = {
        listNo: { x: M,        w: 12 },
        name:   { x: M + 12,   w: 45 },
        gst:    { x: M + 57,   w: 11 },
        image:  { x: M + 68,   w: 28 },
        price:  { x: M + 96,   w: 48 },
        days:   { x: M + 144,  w: 18 },
        hsn:    { x: M + 162,  w: 18 },
        stock:  { x: M + 180,  w: 14 },
      };

      const HDR_H = 20;
      const COL_H = 10;
      const RH    = 28;

      const hasFilter = min != null && max != null && min !== "" && max !== "";

      // ── Header ─────────────────────────────────────────────────────────────
      const drawHdr = () => {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, PW, HDR_H, "F");

        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, PW, 1.5, "F");

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const titleText = hasFilter
          ? `Price range Between ${min} - ${max}  |  Qty > 15  |  GST extra on below prices`
          : `All Products  |  GST extra on below prices`;
        doc.text(titleText, PW / 2, 9, { align: "center" });

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(242, 196, 2);
        const prefix    = "Set your own Prices now in 1 click: ";
        const linkLabel = "Click Here";
        const fullText  = prefix + linkLabel;
        const fullW     = doc.getTextWidth(fullText);
        const startX    = PW / 2 - fullW / 2;
        doc.text(fullText, PW / 2, 16, { align: "center" });
        const linkX = startX + doc.getTextWidth(prefix);
        const linkW = doc.getTextWidth(linkLabel);
        doc.setDrawColor(242, 196, 2);
        doc.setLineWidth(0.2);
        doc.line(linkX, 16.6, linkX + linkW, 16.6);
        doc.link(linkX, 13, linkW, 4, { url: catalogUrl }); // ← dynamic catalog URL
      };

      // ── Column header ───────────────────────────────────────────────────────
      const drawColHdr = (y) => {
        doc.setFillColor(245, 245, 245);
        doc.rect(M, y, PW - M * 2, COL_H, "F");
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.rect(M, y, PW - M * 2, COL_H);

        let cx = M;
        Object.values(COL).forEach((c) => {
          cx += c.w;
          if (cx < PW - M) { doc.setDrawColor(200, 200, 200); doc.line(cx, y, cx, y + COL_H); }
        });

        const headers = [
          { k: "listNo", l: ["List", "No"] },
          { k: "name",   l: ["Product Name"] },
          { k: "gst",    l: ["GST"] },
          { k: "image",  l: ["Image"] },
          { k: "price",  l: ["Price"] },
          { k: "days",   l: ["Days", "Needed"] },
          { k: "hsn",    l: ["HSN", "Code"] },
          { k: "stock",  l: ["Stock", "Status"] },
        ];

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");

        headers.forEach(({ k, l }) => {
          const c  = COL[k];
          const cx = c.x + c.w / 2;
          if (l.length === 1) {
            doc.text(l[0], cx, y + COL_H / 2 + 1,   { align: "center" });
          } else {
            doc.text(l[0], cx, y + COL_H / 2 - 0.8, { align: "center" });
            doc.text(l[1], cx, y + COL_H / 2 + 3,   { align: "center" });
          }
        });
      };

      // ── Data row ────────────────────────────────────────────────────────────
      const drawRow = (p, idx, y) => {
        const bg = idx % 2 === 0 ? [255, 255, 255] : [250, 251, 251];
        doc.setFillColor(...bg);
        doc.rect(M, y, PW - M * 2, RH, "F");
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.2);
        doc.rect(M, y, PW - M * 2, RH);

        let cx = M;
        Object.values(COL).forEach((c) => {
          cx += c.w;
          if (cx < PW - M) { doc.setDrawColor(220, 220, 220); doc.line(cx, y, cx, y + RH); }
        });

        const midY = y + RH / 2;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);

        // List No
        doc.setFontSize(7);
        doc.text(
          p.product_codeS_NO || String(idx + 1),
          COL.listNo.x + COL.listNo.w / 2, midY,
          { align: "center", baseline: "middle" }
        );

        // Product Name
        doc.setFontSize(6.5);
        doc.text(
          doc.splitTextToSize(p.name || "N/A", COL.name.w - 2),
          COL.name.x + 1.5, y + 5
        );

        // GST
        doc.setFontSize(7);
        doc.text(
          p.gst ? `${p.gst}%` : "18%",
          COL.gst.x + COL.gst.w / 2, midY,
          { align: "center", baseline: "middle" }
        );

        // Image
        const allImgUrls = [];
        if (p.images?.length > 0) {
          p.images.slice(0, 3).forEach((img) => {
            const u = typeof img === "object" ? img.url || img.path || "" : img;
            if (u) allImgUrls.push(u);
          });
        }
        const ix   = COL.image.x + 1;
        const iy   = y + 2;
        const iw   = COL.image.w - 2;
        const ih   = RH - 4;
        const imgd = imgCache[p._id];
        if (imgd) {
          try {
            doc.addImage(imgd, "JPEG", ix, iy, iw, ih);
            if (allImgUrls[0]) doc.link(ix, iy, iw, ih, { url: allImgUrls[2] || allImgUrls[0] });
          } catch {
            doc.setFillColor(240, 240, 240); doc.rect(ix, iy, iw, ih, "F");
            doc.setTextColor(160, 160, 160); doc.setFontSize(5.5);
            doc.text("No Image", ix + iw / 2, iy + ih / 2, { align: "center", baseline: "middle" });
            doc.setTextColor(40, 40, 40);
          }
        } else {
          doc.setFillColor(0, 0, 0); doc.rect(ix, iy, iw, ih, "F");
          doc.setTextColor(160, 160, 160); doc.setFontSize(5.5);
          doc.text("No Image", ix + iw / 2, iy + ih / 2, { align: "center", baseline: "middle" });
          doc.setTextColor(40, 40, 40);
        }

        // Price box
        const gstRate     = parseFloat(p.gst) || 18;
        const custRaw     = p.prices?.customerPrice;
        const mrpVal      = p.MRP_price ? `${p.MRP_price}` : "—";
        const custNum     = custRaw && custRaw !== "N/A" ? parseFloat(custRaw) : parseFloat(p.MRP_price);
        const custWithGst = !isNaN(custNum) ? `${(custNum * (1 + gstRate / 100)).toFixed(0)}` : "—";

        const bx = COL.price.x + 1.5, bw = COL.price.w - 3;
        const ch = 6, by = midY - ch;
        const lw = 11, cw = (bw - lw) / 2;

        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.rect(bx, by, bw, ch * 2);
        doc.line(bx, by + ch, bx + bw, by + ch);
        doc.line(bx + lw, by, bx + lw, by + ch * 2);
        doc.line(bx + lw + cw, by, bx + lw + cw, by + ch * 2);

        doc.setFontSize(5.5);
        doc.setTextColor(80, 80, 80);
        doc.text("",             bx + lw / 2,             by + ch / 2 + 1, { align: "center" });
        doc.text("MRP",          bx + lw + cw / 2,        by + ch / 2 + 1, { align: "center" });
        doc.text(`+${gstRate}%`, bx + lw + cw + cw / 2,   by + ch / 2 + 1, { align: "center" });

        doc.setFontSize(5.5);
        doc.setTextColor(80, 80, 80);
        doc.text("Price", bx + lw / 2, by + ch + ch / 2 + 1, { align: "center" });

        doc.setFontSize(6);
        doc.setTextColor(40, 40, 40);
        doc.text(mrpVal, bx + lw + cw / 2, by + ch + ch / 2 + 1, { align: "center" });

        doc.setTextColor(13, 148, 136);
        doc.setFont("helvetica", "bold");
        doc.text(custWithGst, bx + lw + cw + cw / 2, by + ch + ch / 2 + 1, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);

        // Days Needed
        doc.setFontSize(6.5);
        doc.text(getDaysNeeded(p), COL.days.x + COL.days.w / 2, midY, { align: "center", baseline: "middle" });

        // HSN Code
        doc.setFontSize(6.5);
        doc.text(String(p.HSNcode_time || p.HSN_code || "N/A"), COL.hsn.x + COL.hsn.w / 2, midY, { align: "center", baseline: "middle" });

        // Stock Status
        const ss      = p.stock_count > 0 ? "In Stock" : "Out of Stock";
        const inStock = ss.toLowerCase().includes("in");
        doc.setTextColor(inStock ? 22 : 185, inStock ? 163 : 28, inStock ? 74 : 28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.text(ss, COL.stock.x + COL.stock.w / 2, midY, { align: "center", baseline: "middle" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
      };

      // ── Render pages ────────────────────────────────────────────────────────
      const rowsPerPage = Math.max(1, Math.floor((PH - HDR_H - COL_H - 12) / RH));
      const totalPages  = Math.ceil(toExport.length / rowsPerPage);

      for (let pg = 0; pg < totalPages; pg++) {
        if (pg > 0) doc.addPage();
        drawHdr();
        drawColHdr(HDR_H);
        const start = pg * rowsPerPage;
        const end   = Math.min(start + rowsPerPage, toExport.length);
        let rowY    = HDR_H + COL_H;
        for (let i = start; i < end; i++) { drawRow(toExport[i], i, rowY); rowY += RH; }
      }

      const filename = onlySelected
        ? `selected_products_${new Date().toISOString().split("T")[0]}.pdf`
        : `products_${new Date().toISOString().split("T")[0]}.pdf`;

      doc.save(filename);
      message.success(`PDF with ${toExport.length} product(s) downloaded`);

    } catch (err) {
      console.error(err);
      message.error("PDF export failed");
    } finally {
      setExportLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TABLE COLUMNS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const buildColumns = useCallback((isCloneTab) => {
    const checkboxCol = {
      key: "cb", align: "center", width: 48, fixed: "left",
      title: (
        <HeaderCheckbox
          checked={allSel}
          indeterminate={someSel}
          onChange={(checked) => toggleAll(allProductIdsRef.current, checked)}
        />
      ),
      render: (_, record) => (
        <RowCheckbox checked={record._isSelected} onChange={() => toggleKey(record._id)} />
      ),
    };

    const dataCols = [
      {
        title: "S.No", dataIndex: "serialNumber", key: "sno", align: "center", width: 70, fixed: "left",
        render: (v) => <span className="text-gray-700 font-semibold">{v}</span>,
      },
      {
        title: "Product S.No", dataIndex: "product_codeS_NO", align: "center", width: 120,
        render: (v) => (
          <Tooltip title={v || "N/A"}>
            <Tag className="font-semibold bg-blue-100 text-blue-800 border-blue-200 rounded-full px-3 py-1 text-xs">{v || "N/A"}</Tag>
          </Tooltip>
        ),
      },
      {
        title: "Vendor Code", dataIndex: "Vendor_Code", align: "center", width: 120,
        render: (v) => (
          <Tooltip title={v || "N/A"}>
            <Tag className="font-semibold bg-purple-100 text-purple-800 border-purple-200 rounded-full px-3 py-1 text-xs">{v || "N/A"}</Tag>
          </Tooltip>
        ),
      },
      ...(!isCloneTab && activeTabKey === "1" && hasEditPermission ? [{
        title: "Clone", align: "center", width: 80,
        render: (data) => (
          <Tooltip title="Clone Product">
            <div
              onClick={() => { setCloneProductDetails(data); handleOpenModal(data); }}
              className="text-2xl text-teal-600 cursor-pointer hover:text-teal-800 transition-transform hover:scale-125 flex justify-center"
            >
              <MdContentCopy />
            </div>
          </Tooltip>
        ),
      }] : []),
      ...(isSuperAdmin(user.role) || hasEditPermission ? [{
        title: "Visibility", align: "center", width: 100, dataIndex: "is_visible",
        render: (isVisible, record) => (
          <Tooltip title={isVisible ? "Visible" : "Hidden"}>
            <Switch
              size="small" checked={isVisible}
              onChange={(checked) => handleOnChangeLabel({ is_visible: checked }, record)}
              loading={updatingProductId === record._id}
              disabled={!hasEditPermission}
              className={`${isVisible ? "bg-green-600" : "bg-gray-300"}`}
            />
          </Tooltip>
        ),
      }] : []),
      {
        title: "Image", dataIndex: "images", width: 180,
        render: (_, record) => {
          const img    = getProductImage(record);
          const varImgs = getVariantImages(record);
          const isVar  = record.type === "Variable Product" || record.type === "Variant Product";
          return (
            <div className="flex justify-center">
              {img ? (
                <div className="relative w-36 h-36 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-md hover:shadow-xl transition-all">
                  <Image
                    src={img} alt="Product" width="100%" height="100%"
                    className="object-cover w-full h-full" preview
                    fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzkzYTNiMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=="
                  />
                  {varImgs.length > 0 && (
                    <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{varImgs.length}</div>
                  )}
                  {isVar && (
                    <div className="absolute bottom-1 left-1 bg-purple-500 text-white text-xs rounded-full px-1">Var</div>
                  )}
                </div>
              ) : (
                <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-300">
                  <span className="text-xs text-gray-500 text-center px-1">No Image</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Name", dataIndex: "name", width: 200,
        render: (data, record) => {
          const vc = record.variants ? record.variants.reduce((c, v) => c + (v.options?.length || 0), 0) : 0;
          return (
            <div className="flex flex-col space-y-1">
              <Tooltip title={data}><span className="font-semibold text-gray-900 text-sm line-clamp-2">{data}</span></Tooltip>
              <span className="text-xs text-gray-500">Code: {record.product_code || "N/A"}</span>
              {vc > 0 && <span className="text-xs text-blue-600 font-medium">{vc} variant(s)</span>}
            </div>
          );
        },
      },
      {
        title: "Type", dataIndex: "type", width: 150,
        render: (type) => {
          const c = {
            "Stand Alone Product": "bg-green-100 text-green-800 border-green-200",
            "Variable Product":    "bg-blue-100 text-blue-800 border-blue-200",
            "Variant Product":     "bg-purple-100 text-purple-800 border-purple-200",
          };
          return <Tag className={`font-semibold rounded-full px-3 py-1 text-xs border ${c[type] || "bg-orange-100 text-orange-800 border-orange-200"}`}>{type}</Tag>;
        },
      },
      {
        title: "Category", dataIndex: "category_details", width: 150,
        render: (data) => (
          <Tooltip title={_.get(data, "main_category_name", "")}>
            <Tag className="font-semibold bg-teal-100 text-teal-800 border-teal-200 rounded-full px-3 py-1 text-xs">
              {_.get(data, "main_category_name", "N/A")}
            </Tag>
          </Tooltip>
        ),
      },
      {
        title: "Stock", dataIndex: "totalStock", width: 100, align: "center",
        render: (stock, record) => {
          const ss = record.stocks_status || "In Stock";
          return (
            <div className="flex flex-col items-center">
              <span className="font-semibold text-gray-900 text-lg">{stock}</span>
              <span className={`text-xs font-medium ${ss === "Limited" ? "text-orange-600" : "text-green-600"}`}>{ss}</span>
            </div>
          );
        },
      },
      {
        title: "Prices", dataIndex: "prices", width: 180,
        render: (prices) => (
          <div className="flex flex-col space-y-1">
            {[
              { label: "Corporate", key: "corporatePrice" },
              { label: "Dealer",    key: "dealerPrice" },
              { label: "Customer",  key: "customerPrice" },
            ].map(({ label, key }) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-600">{label}:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {prices[key] !== "N/A" ? `Rs.${prices[key]}` : "N/A"}
                </span>
              </div>
            ))}
          </div>
        ),
      },
      {
        title: "Vendor", align: "center", width: 120, dataIndex: "vendor_details",
        render: (data) => (
          <div className="flex justify-center">
            {data?.length > 0
              ? <Tag onClick={() => setVendorClose(data)} className="cursor-pointer bg-purple-100 text-purple-800 font-semibold hover:bg-purple-200 rounded-full px-3 py-1 border-purple-200 text-xs">View ({data.length})</Tag>
              : <Tag className="bg-gray-100 text-gray-600 font-semibold rounded-full px-3 py-1 border-gray-200 text-xs">None</Tag>}
          </div>
        ),
      },
      {
        title: "Status", align: "center", width: 150,
        render: (record) => (
          <div className="flex flex-col space-y-2">
            {[
              { field: "new_product",         label: "New",         icon: hasEditPermission ? <MdNewReleases /> : <LockOutlined />, ac: "bg-blue-600 text-white border-blue-600" },
              { field: "popular_product",     label: "Popular",     icon: hasEditPermission ? <MdThumbUp />    : <LockOutlined />, ac: "bg-green-600 text-white border-green-600" },
              { field: "recommended_product", label: "Recommended", icon: hasEditPermission ? <MdStar />       : <LockOutlined />, ac: "bg-amber-600 text-white border-amber-600" },
            ].map(({ field, label, icon, ac }) => (
              <Tooltip key={field} title={hasEditPermission ? label : "No permission"}>
                <Button
                  size="small"
                  type={record[field] ? "primary" : "default"}
                  icon={icon}
                  onClick={() => handleOnChangeLabel({ [field]: !record[field] }, record)}
                  loading={updatingProductId === record._id}
                  disabled={!hasEditPermission}
                  className={`flex items-center justify-center w-full text-xs ${record[field] ? ac : "bg-gray-100 text-gray-600 border-gray-300"}`}
                >
                  {label}
                </Button>
              </Tooltip>
            ))}
          </div>
        ),
      },
      {
        title: "Actions", width: 100, align: "center", fixed: "right",
        render: (data) => (
          <Dropdown
            overlay={
              <Menu className="rounded-xl shadow-2xl bg-white border border-gray-100 p-2 min-w-[120px]">
                {hasEditPermission && !_.get(data, "is_cloned", false) && (
                  <Menu.Item key="edit">
                    <Button type="text" icon={<FaEdit className="text-teal-600" />} onClick={() => handleUpdate(data)} className="flex items-center text-teal-600 hover:bg-teal-50 w-full text-left px-3 py-2 rounded-lg font-medium text-xs">Edit</Button>
                  </Menu.Item>
                )}
                {hasDeletePermission && (
                  <Menu.Item key="delete">
                    <Popconfirm title="Delete Product" description="Are you sure?" onConfirm={() => handleDelete(data)} okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
                      <Button type="text" icon={<MdDelete className="text-red-600" />} className="flex items-center text-red-600 hover:bg-red-50 w-full text-left px-3 py-2 rounded-lg font-medium text-xs">Delete</Button>
                    </Popconfirm>
                  </Menu.Item>
                )}
                <Menu.Item key="view">
                  <Button type="text" icon={<FaEye className="text-green-600" />} onClick={() => handleView(data)} className="flex items-center text-green-600 hover:bg-green-50 w-full text-left px-3 py-2 rounded-lg font-medium text-xs">View</Button>
                </Menu.Item>
              </Menu>
            }
            trigger={["click"]} placement="bottomRight"
          >
            <Button type="text" icon={<MdMoreVert className="text-gray-600" />} className="hover:text-teal-600 transition-colors" />
          </Dropdown>
        ),
      },
    ];

    return [checkboxCol, ...dataCols];
  }, [allSel, someSel, activeTabKey, hasEditPermission, hasDeletePermission, updatingProductId, toggleKey, toggleAll, user.role]);

  const columnsTab1 = useMemo(() => buildColumns(false), [buildColumns]);
  const columnsTab2 = useMemo(() => buildColumns(true),  [buildColumns]);

  const rowClassName = useCallback((record) => record._isSelected ? "prod-row-sel" : "", []);

  // ── Export menu ───────────────────────────────────────────────────────────────
  const exportMenu = (
    <Menu className="rounded-xl shadow-2xl bg-white border border-gray-100 p-2 min-w-[220px]">
      <Menu.Item key="all">
        <Button type="text" icon={<MdFileDownload className="text-green-600" />} onClick={exportAllToCSV} loading={exportLoading} className="flex items-center text-green-600 hover:bg-green-50 w-full text-left px-3 py-2 rounded-lg font-medium text-sm">Export All Products (CSV)</Button>
      </Menu.Item>
      <Menu.Item key="filtered">
        <Button type="text" icon={<MdFileDownload className="text-blue-600" />} onClick={exportFilteredToCSV} loading={exportLoading} disabled={tableData.length === 0} className="flex items-center text-blue-600 hover:bg-blue-50 w-full text-left px-3 py-2 rounded-lg font-medium text-sm">Export Filtered (CSV)</Button>
      </Menu.Item>
      <Menu.Item key="current">
        <Button type="text" icon={<MdFileDownload className="text-teal-600" />} onClick={exportToCSV} loading={exportLoading} className="flex items-center text-teal-600 hover:bg-teal-50 w-full text-left px-3 py-2 rounded-lg font-medium text-sm">Export Current View (CSV)</Button>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="pdf"
        disabled={processedTableData.length === 0}
        onClick={() => exportToPDF(false, minPrice, maxPrice)}
        icon={<MdFileDownload className="text-red-600" />}
        className="text-red-600 font-medium text-sm px-3 py-2 rounded-lg"
      >
        Download as PDF (All)
      </Menu.Item>
      <Menu.Item
        key="pdf-sel"
        disabled={selectedKeys.length === 0}
        onClick={() => exportToPDF(true, minPrice, maxPrice)}
        icon={<MdFileDownload className="text-orange-600" />}
        className="text-orange-600 font-medium text-sm px-3 py-2 rounded-lg"
      >
        Download Selected PDF{" "}
        {selectedKeys.length > 0 && (
          <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-bold rounded-full px-2 py-0.5">{selectedKeys.length}</span>
        )}
      </Menu.Item>
    </Menu>
  );

  const paginationProps = {
    current:         paginationConfig.currentPage,
    pageSize:        paginationConfig.pageSize,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal:       (total, range) => `${range[0]}-${range[1]} of ${total} items`,
    pageSizeOptions: ["10", "20", "50", "100"],
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 p-4 md:p-8 font-sans">
      <style>{CB_STYLES}</style>

      <DefaultTile
        title="Products Dashboard" add={hasEditPermission} addText="New Product"
        formStatus={formStatus} setFormStatus={setFormStatus} search setSearch={setSearch}
        className="bg-white shadow-2xl rounded-3xl p-6 md:p-8 mb-6 md:mb-8 border border-teal-100"
        extra={hasEditPermission && (
          <Dropdown overlay={exportMenu} trigger={["click"]} placement="bottomRight">
            <Button
              type="primary" icon={<MdFileDownload className="text-white" />}
              loading={exportLoading}
              className="bg-teal-600 hover:bg-teal-700 border-none rounded-xl font-semibold px-4 flex items-center shadow-lg"
            >
              Export
            </Button>
          </Dropdown>
        )}
      />

      {!hasEditPermission && !hasDeletePermission && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium flex items-center gap-2">
            <LockOutlined /> View-only access. Contact an admin for edit permissions.
          </p>
        </div>
      )}

      {formStatus ? (
        <AddForms fetchData={fetchData} setFormStatus={setFormStatus} id={id} setId={setId} className="bg-white shadow-2xl rounded-3xl p-6 md:p-8 border border-teal-100" />
      ) : (
        <>
          {/* ── Filter bar ── */}
          <div className="mb-6 bg-white rounded-2xl shadow-md border border-gray-100 px-6 py-4 flex flex-wrap items-end gap-6">
            {/* Search */}
            <div className="flex flex-col gap-1 min-w-[180px] flex-1">
              <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Search</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  type="text" placeholder="Name, code, category..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 placeholder-gray-400 text-gray-800 transition"
                />
              </div>
            </div>

            {/* Price Range */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Price Range</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                    className="w-24 pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 placeholder-gray-400 text-gray-800 transition"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">₹</span>
                </div>
                <span className="text-gray-400 font-medium">–</span>
                <div className="relative">
                  <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-24 pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 placeholder-gray-400 text-gray-800 transition"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">₹</span>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Category</span>
              <select
                value={filterByProductCategory}
                onChange={(e) => onCategoryChange(e.target.value || "")}
                className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-gray-800 transition appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px" }}
              >
                <option value="">All Categories</option>
                {mainCategory.map((item) => <option key={item._id} value={item._id}>{item.main_category_name}</option>)}
              </select>
            </div>

            {/* Sub Category */}
            {filterByProductCategory && subcategoryDataFilter.length > 0 && (
              <div className="flex flex-col gap-1 min-w-[160px]">
                <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Sub Category</span>
                <select
                  value={filterByProductSubcategory}
                  onChange={(e) => setFilterByProductSubcategory(e.target.value || "")}
                  className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-gray-800 transition appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px" }}
                >
                  <option value="">All Sub Categories</option>
                  {subcategoryDataFilter.map((item) => <option key={item._id} value={item._id}>{item.sub_category_name}</option>)}
                </select>
              </div>
            )}

            {/* Stock */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Stock</span>
              <select
                value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-gray-800 transition appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px" }}
              >
                <option value="">All Stock</option>
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>

            {/* Vendor */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Vendor</span>
              <select
                value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-gray-800 transition appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px" }}
              >
                <option value="">All Vendors</option>
                {allVendors.map((item) => <option key={item._id} value={item._id}>{item.vendor_name}</option>)}
              </select>
            </div>

            {/* Clear */}
            <div className="flex flex-col justify-end ml-auto">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition whitespace-nowrap"
              >
                <span className="text-base leading-none">×</span> Clear
              </button>
            </div>
          </div>

          {/* ── Selection bar ── */}
          {selectedKeys.length > 0 && (
            <div className="mb-4 flex items-center justify-between bg-teal-50 border border-teal-200 rounded-2xl px-5 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="bg-teal-600 text-white text-xs font-bold rounded-full px-3 py-1">{selectedKeys.length} selected</span>
                <span className="text-teal-700 font-medium text-sm">product{selectedKeys.length !== 1 ? "s" : ""} ready for PDF export</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="small" type="primary" icon={<MdFileDownload />}
                  onClick={() => exportToPDF(true)}
                  loading={exportLoading}
                  className="bg-teal-600 hover:bg-teal-700 border-none rounded-lg font-semibold text-xs flex items-center"
                >
                  Download Selected PDF
                </Button>
                <Button size="small" onClick={clearSelection} className="bg-gray-200 hover:bg-gray-300 border-none rounded-lg font-semibold text-xs">
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* ── Table card ── */}
          <Card className="bg-white shadow-2xl rounded-3xl border-none overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Tabs
              type="card" size="large"
              className="px-4 md:px-8 pt-4 md:pt-6"
              activeKey={activeTabKey}
              onChange={handleTabChange}
              items={[
                {
                  key: "1",
                  label: (
                    <span className="flex items-center text-gray-900 font-extrabold text-sm md:text-base">
                      <span className="mr-2">📦</span> Products
                      <Tag className="ml-2 bg-teal-100 text-teal-800 font-semibold rounded-full px-2 py-0.5 text-xs">
                        {activeTabKey === "1" ? processedTableData.length : tableData.filter((r) => !r.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading} dataSource={processedTableData} columns={columnsTab1}
                      rowKey="_id" rowClassName={rowClassName} scroll={{ x: 1200 }}
                      className="rounded-b-3xl" onChange={handleTableChange} pagination={paginationProps}
                    />
                  ),
                },
                {
                  key: "2",
                  label: (
                    <span className="flex items-center text-gray-900 font-extrabold text-sm md:text-base">
                      <MdContentCopy className="mr-2 text-teal-600" /> Cloned Products
                      <Tag className="ml-2 bg-green-100 text-green-800 font-semibold rounded-full px-2 py-0.5 text-xs">
                        {activeTabKey === "2" ? processedTableData.length : tableData.filter((r) => r.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading} dataSource={processedTableData} columns={columnsTab2}
                      rowKey="_id" rowClassName={rowClassName} scroll={{ x: 1100 }}
                      className="rounded-b-3xl" onChange={handleTableChange} pagination={paginationProps}
                    />
                  ),
                },
              ]}
            />
          </Card>

          {/* ── Vendor modal ── */}
          <Modal
            title={<span className="text-xl font-extrabold text-gray-900">Vendor Details</span>}
            open={!_.isEmpty(vendorClose)} footer={null} onCancel={() => setVendorClose([])}
            bodyStyle={{ padding: "24px" }} width={600}
          >
            <div className="max-h-96 overflow-y-auto">
              <Descriptions layout="vertical" bordered column={1}>
                {vendorClose.map((res, idx) => (
                  <Descriptions.Item key={idx} label={<p className="font-semibold text-gray-700">Vendor {idx + 1}</p>}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-900 mr-3">{vendorNames[res._id] || "Loading..."}</span>
                        {vendorsLoading[res._id] && <Spin size="small" />}
                      </div>
                      <Link to={`/vendor_details/${res._id}`} target="_blank" className="text-teal-600 hover:text-teal-800 font-semibold text-sm">View Details →</Link>
                    </div>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </div>
          </Modal>

          {/* ── Clone modal ── */}
          {hasEditPermission && (
            <Modal
              title={<span className="text-xl font-extrabold text-gray-900">Clone Product</span>}
              open={cloneModal} onCancel={handleCloseModal} footer={null}
              bodyStyle={{ padding: "24px" }} width={500}
            >
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item
                  label={<span className="text-sm font-semibold text-gray-700">Category</span>}
                  name="category_details" rules={[{ required: true, message: "Please select a category!" }]}
                >
                  <Select placeholder="Select Product Category" className="w-full" onChange={onCloneCategoryChange}>
                    {categoryData
                      .filter((r) => r._id !== _.get(cloneProductDetails, "category_details._id", ""))
                      .map((item) => <Select.Option key={item._id} value={item._id}>{item.main_category_name}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item
                  label={<span className="text-sm font-semibold text-gray-700">Sub Category</span>}
                  name="sub_category_details" rules={[{ required: true, message: "Please select a sub-category!" }]}
                >
                  <Select
                    placeholder="Select Sub Category" className="w-full"
                    disabled={!form.getFieldValue("category_details") || subcategoryDataFilter.length === 0}
                  >
                    {subcategoryDataFilter.map((item) => <Select.Option key={item._id} value={item._id}>{item.sub_category_name}</Select.Option>)}
                  </Select>
                </Form.Item>
                <Form.Item className="mb-0">
                  <div className="flex justify-end gap-4">
                    <Button onClick={handleCloseModal} className="bg-gray-200 hover:bg-gray-300 border-none rounded-xl font-semibold px-6">Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={loading} className="bg-teal-600 hover:bg-teal-700 border-none rounded-xl font-semibold px-6">Clone Product</Button>
                  </div>
                </Form.Item>
              </Form>
            </Modal>
          )}
        </>
      )}
    </div>
  );
};

export default Products;