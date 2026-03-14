/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  MdDelete, MdContentCopy, MdMoreVert, MdStar, MdNewReleases,
  MdThumbUp, MdFileDownload, MdVisibility, MdVisibilityOff,
} from "react-icons/md";
import {
  Button, Descriptions, Form, Image, Modal, Popconfirm, Select,
  Spin, Switch, Table, Tabs, Tag, Tooltip, Card, Typography,
  Dropdown, Menu, message, Input, DatePicker,
} from "antd";
import {
  FaEdit, FaEye, FaFilter, FaLock,
} from "react-icons/fa";
import {
  LockOutlined, ArrowUpOutlined, ArrowDownOutlined,
  PlusOutlined, DeleteFilled, EyeOutlined, SwapOutlined,
  CameraOutlined, UploadOutlined,
} from "@ant-design/icons";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  addproduct, CLIENT_URL, deleteProduct, editProduct,
  getAllCategoryProducts, getAllVendor, getMainCategory,
  getProduct, getSubCategory, getSingleVendor, uploadImage,
} from "../../api";
import {
  ERROR_NOTIFICATION, SUCCESS_NOTIFICATION,
} from "../../helper/notification_helper";
import CustomTable from "../../components/CustomTable";
import DefaultTile from "../../components/DefaultTile";
import { useForm } from "antd/es/form/Form";
import { canEditPage, canDeletePage, isSuperAdmin } from "../../helper/permissionHelper";
import { formValidation } from "../../helper/formvalidation";

const { Title, Text } = Typography;

const STORAGE_KEYS = {
  PAGE_SIZE: "products_pageSize",
  CURRENT_PAGE: "products_currentPage",
  FILTERS: "products_filters",
  ACTIVE_TAB: "products_activeTab",
};

// ─── Device Detection ───────────────────────────────────────────────────────

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (navigator.maxTouchPoints > 1 && window.innerWidth <= 768);
};

// ─── Image Helpers ─────────────────────────────────────────────────────────

const createImageObject = (url, existingId = null) => ({
  _id: existingId || uuidv4(),
  path: url, url, type: "image",
  uploadedAt: new Date().toISOString(),
});

const SortableImage = ({ id, image, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const imageUrl = image.url || image.path || image;
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes} {...listeners}
        className="absolute top-1 left-1 z-20 bg-blue-500 bg-opacity-80 text-white p-1 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 24, height: 24 }}
      >
        <div className="flex items-center justify-center w-full h-full">⠿</div>
      </div>
      <Image src={imageUrl} alt="Product" width={80} height={80}
        className="object-cover rounded border-2 border-dashed border-gray-300"
        preview={{ mask: <span className="text-white text-xs">Preview</span> }}
      />
      <button type="button"
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center border-0 cursor-pointer z-20"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(id); }}
      >
        <DeleteFilled className="text-xs" />
      </button>
    </div>
  );
};

const SortableImageList = ({ images, setImages }) => {
  const getId = (img) => img._id || img.path || img;
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oi = images.findIndex(img => getId(img) === active.id);
    const ni = images.findIndex(img => getId(img) === over.id);
    if (oi !== -1 && ni !== -1) setImages(arrayMove(images, oi, ni));
  };
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={images.map(getId)}>
        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg min-h-[5rem] border border-dashed border-gray-300 mt-2">
          {images.map(img => (
            <SortableImage key={getId(img)} id={getId(img)} image={img}
              onRemove={(id) => setImages(images.filter(i => getId(i) !== id))} />
          ))}
          {images.length === 0 && (
            <div className="flex items-center justify-center w-full text-gray-400 text-sm">No images yet</div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
};

// ─── Upload Helper (Mobile-aware) ───────────────────────────────────────────

const UploadHelper = ({ max = 10, setImagePath, image_path = [], label = "Upload Images", fieldKey }) => {
  const [uploading, setUploading] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const processFiles = async (files) => {
    if (!files?.length) return;
    try {
      setUploading(true);
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) { message.warning(`${file.name} is not an image`); continue; }
        if (file.size > 5 * 1024 * 1024) { message.warning(`${file.name} exceeds 5MB`); continue; }
        const fd = new FormData();
        fd.append("image", file);
        const result = await uploadImage(fd);
        const url = _.get(result, "data.data.url", "");
        if (url) uploaded.push(createImageObject(url));
      }
      if (uploaded.length) {
        setImagePath([...(Array.isArray(image_path) ? image_path : []), ...uploaded].slice(0, max));
        message.success(`Uploaded ${uploaded.length} image(s)`);
      }
    } catch {
      message.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e) => {
    await processFiles(e.target.files);
    setShowMobileOptions(false);
  };

  const handleCameraChange = async (e) => {
    await processFiles(e.target.files);
    setShowMobileOptions(false);
  };

  const handleUploadClick = () => {
    if (isMobile) {
      setShowMobileOptions(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div>
      {/* Hidden file inputs */}
      {/* Gallery / File picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="!hidden"
        id={`up-gallery-${fieldKey || "img"}`}
      />
      {/* Camera capture (mobile) */}
      {/* <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
        id={`up-camera-${fieldKey || "img"}`}
      /> */}

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={uploading}
        className="cursor-pointer flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-500 transition-colors bg-gray-50 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? <Spin size="small" /> : <PlusOutlined />}
        {uploading ? "Uploading..." : label}
      </button>

      {/* Mobile bottom sheet — choose Camera or Gallery */}
      {isMobile && showMobileOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowMobileOptions(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-2xl p-4 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <p className="text-center text-gray-700 font-semibold mb-4 text-base">Add Image</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Camera */}
              <label
                htmlFor={`up-camera-${fieldKey || "img"}`}
                className="flex flex-col items-center justify-center gap-2 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 active:scale-95 transition-all"
                onClick={() => setShowMobileOptions(false)}
              >
                <CameraOutlined style={{ fontSize: 32, color: "#2563eb" }} />
                <span className="text-sm font-semibold text-blue-700">Camera</span>
                <span className="text-xs text-blue-400 text-center">Take a new photo</span>
              </label>

              {/* Gallery */}
              <label
                htmlFor={`up-gallery-${fieldKey || "img"}`}
                className="flex flex-col items-center justify-center gap-2 p-5 bg-green-50 border-2 border-green-200 rounded-xl cursor-pointer hover:bg-green-100 active:scale-95 transition-all"
                onClick={() => setShowMobileOptions(false)}
              >
                <UploadOutlined style={{ fontSize: 32, color: "#16a34a" }} />
                <span className="text-sm font-semibold text-green-700">Gallery</span>
                <span className="text-xs text-green-400 text-center">Choose from photos</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileOptions(false)}
              className="mt-4 w-full py-3 text-sm text-gray-500 font-medium rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors border-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image list */}
      {image_path?.length > 0 && (
        <SortableImageList images={image_path} setImages={setImagePath} />
      )}
    </div>
  );
};

// ─── Stock IN Modal ─────────────────────────────────────────────────────────

const StockInModal = ({ open, onClose, product, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (!open) { form.resetFields(); setImages([]); }
  }, [open]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const existingStockInfo = (_.get(product, "stock_info", [])).map(item => ({
        ...item,
        date: item.date ? new Date(item.date).toISOString() : null,
      }));
      const newEntry = {
        _id: uuidv4(),
        add_stock: Number(values.add_stock),
        buy_price: values.buy_price,
        handler_name: values.handler_name,
        location: values.location,
        invoice: values.invoice,
        notes: values.notes,
        stock_images: images.map(img => ({ _id: img._id, path: img.path, url: img.url })),
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
      };
      const updatedStockInfo = [...existingStockInfo, newEntry];
      const existingOut = (_.get(product, "stock_offline", [])).reduce((s, i) => s + (Number(i.stock) || 0), 0);
      const newTotalIn = updatedStockInfo.reduce((s, i) => s + (Number(i.add_stock) || 0), 0);
      const payload = {
        stock_info: updatedStockInfo,
        stock_count: newTotalIn - existingOut,
      };
      const result = await editProduct(payload, product._id);
      SUCCESS_NOTIFICATION(result);
      onSuccess();
      onClose();
    } catch (err) {
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      destroyOnClose
      title={
        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <ArrowUpOutlined style={{ color: "#16a34a" }} />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base">Stock IN</div>
            <div className="text-xs text-gray-500 font-normal">{product?.name}</div>
          </div>
          <Tag color="success" className="ml-auto">
            Current: {_.get(product, "stock_count", 0)}
          </Tag>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item label="Add Stock Quantity" name="add_stock"
            rules={[formValidation("Enter stock quantity")]}
          >
            <Input type="number" placeholder="e.g. 50" className="h-10"
              prefix={<ArrowUpOutlined style={{ color: "#16a34a" }} />} />
          </Form.Item>

          <Form.Item label="Buy Price" name="buy_price"
            rules={[formValidation("Enter buy price")]}
          >
            <Input type="number" placeholder="e.g. 250.00" className="h-10" prefix="₹" />
          </Form.Item>

          <Form.Item label="Handler Name" name="handler_name"
            rules={[formValidation("Enter handler name")]}
          >
            <Input placeholder="Who handled this?" className="h-10" />
          </Form.Item>

          <Form.Item label="Location" name="location">
            <Input placeholder="Warehouse Rack no" className="h-10" />
          </Form.Item>

          <Form.Item label="Date & Time" name="date"
            rules={[formValidation("Select a date")]}
          >
            <DatePicker showTime className="h-10 w-full" format="DD/MM/YYYY h:mm A" />
          </Form.Item>

          <Form.Item label="Invoice No." name="invoice">
            <Input placeholder="INV-001" className="h-10" />
          </Form.Item>

          <Form.Item label="Notes" name="notes" className="md:col-span-2">
            <Input.TextArea placeholder="Any additional notes..." rows={2} />
          </Form.Item>

          <Form.Item label="Stock Images" className="md:col-span-2">
            <UploadHelper
              max={10} setImagePath={setImages} image_path={images}
              label="Upload Images" fieldKey="stock-in"
            />
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
          <Button onClick={onClose} className="rounded-lg px-6">Cancel</Button>
          <Button
            type="primary" htmlType="submit" loading={loading}
            icon={<ArrowUpOutlined />}
            className="rounded-lg px-6 h-10 font-semibold"
            style={{ background: "#16a34a", borderColor: "#16a34a" }}
          >
            Confirm Stock IN
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

// ─── Stock OUT Modal ────────────────────────────────────────────────────────

const StockOutModal = ({ open, onClose, product, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open]);

  const currentStock = _.get(product, "stock_count", 0);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const qty = Number(values.stock);
      if (qty > currentStock) {
        message.error(`Cannot remove ${qty} — only ${currentStock} in stock`);
        return;
      }
      const existingStockOffline = (_.get(product, "stock_offline", [])).map(item => ({
        ...item,
        date: item.date ? new Date(item.date).toISOString() : null,
      }));
      const newEntry = {
        stock: qty,
        handler_name: values.handler_name,
        location: values.location,
        customer_details: values.customer_details,
        notes: values.notes,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
      };
      const updatedStockOffline = [...existingStockOffline, newEntry];
      const totalIn = (_.get(product, "stock_info", [])).reduce((s, i) => s + (Number(i.add_stock) || 0), 0);
      const totalOut = updatedStockOffline.reduce((s, i) => s + (Number(i.stock) || 0), 0);
      const payload = {
        stock_offline: updatedStockOffline,
        stock_count: totalIn - totalOut,
      };
      const result = await editProduct(payload, product._id);
      SUCCESS_NOTIFICATION(result);
      onSuccess();
      onClose();
    } catch (err) {
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={580}
      destroyOnClose
      title={
        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <ArrowDownOutlined style={{ color: "#dc2626" }} />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base">Stock OUT</div>
            <div className="text-xs text-gray-500 font-normal">{product?.name}</div>
          </div>
          <Tag color="error" className="ml-auto">
            Current: {currentStock}
          </Tag>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item label="Remove Stock Quantity" name="stock"
            rules={[
              formValidation("Enter stock quantity"),
              {
                validator: (_, value) =>
                  !value || Number(value) <= currentStock
                    ? Promise.resolve()
                    : Promise.reject(`Max available: ${currentStock}`),
              },
            ]}
          >
            <Input type="number" placeholder="e.g. 10" className="h-10"
              prefix={<ArrowDownOutlined style={{ color: "#dc2626" }} />} />
          </Form.Item>

          <Form.Item label="Handler Name" name="handler_name"
            rules={[formValidation("Enter handler name")]}
          >
            <Input placeholder="Who handled this?" className="h-10" />
          </Form.Item>

          <Form.Item label="Location" name="location">
            <Input placeholder="Warehouse / Store" className="h-10" />
          </Form.Item>

          <Form.Item label="Date & Time" name="date"
            rules={[formValidation("Select a date")]}
          >
            <DatePicker showTime className="h-10 w-full" format="DD/MM/YYYY h:mm A" />
          </Form.Item>

          <Form.Item label="Customer Details" name="customer_details">
            <Input placeholder="Customer details" className="h-10" />
          </Form.Item>

          <Form.Item label="Notes" name="notes" className="md:col-span-2">
            <Input.TextArea placeholder="Reason for removal..." rows={2} />
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
          <Button onClick={onClose} className="rounded-lg px-6">Cancel</Button>
          <Button
            type="primary" htmlType="submit" loading={loading}
            icon={<ArrowDownOutlined />}
            className="rounded-lg px-6 h-10 font-semibold"
            danger
          >
            Confirm Stock OUT
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

// ─── Stock History Modal ────────────────────────────────────────────────────

const StockHistoryModal = ({ open, onClose, product }) => {
  const stockIn = (_.get(product, "stock_info", [])).map((item, i) => ({
    key: `in-${i}`,
    type: "in",
    quantity: item.add_stock,
    buy_price: item.buy_price || "—",
    handler_name: item.handler_name || "—",
    location: item.location || "—",
    invoice: item.invoice || "—",
    notes: item.notes || "—",
    date: item.date ? moment(item.date).format("DD/MM/YYYY h:mm A") : "—",
    images: item.stock_images || [],
  }));

  const stockOut = (_.get(product, "stock_offline", [])).map((item, i) => ({
    key: `out-${i}`,
    type: "out",
    quantity: item.stock,
    handler_name: item.handler_name || "—",
    location: item.location || "—",
    customer_details: item.customer_details || "—",
    notes: item.notes || "—",
    date: item.date ? moment(item.date).format("DD/MM/YYYY h:mm A") : "—",
  }));

  const totalIn = stockIn.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const totalOut = stockOut.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const inColumns = [
    {
      title: "Date & Time", dataIndex: "date", key: "date", width: 145,
      render: (t) => <span className="text-xs text-gray-600">{t}</span>,
    },
    {
      title: "Qty", dataIndex: "quantity", key: "quantity", width: 70, align: "center",
      render: (v) => <span className="font-bold text-green-600 text-sm">+{v || 0}</span>,
    },
    {
      title: "Buy Price", dataIndex: "buy_price", key: "buy_price", width: 90,
      render: (t) => <span className="text-xs">{t !== "—" ? `₹${t}` : "—"}</span>,
    },
    {
      title: "Handler", dataIndex: "handler_name", key: "handler_name",
      render: (t) => <span className="text-xs">{t}</span>,
    },
    {
      title: "Location", dataIndex: "location", key: "location",
      render: (t) => <span className="text-xs">{t}</span>,
    },
    {
      title: "Invoice", dataIndex: "invoice", key: "invoice",
      render: (t) => <span className="text-xs">{t}</span>,
    },
    {
      title: "Notes", dataIndex: "notes", key: "notes",
      render: (t) => <span className="text-xs">{t}</span>,
    },
    {
      title: "Images", dataIndex: "images", key: "images", width: 100,
      render: (imgs) =>
        imgs?.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {imgs.slice(0, 3).map((img, i) => (
              <Image key={i} src={img.url || img.path || img} width={32} height={32}
                className="object-cover rounded" preview />
            ))}
            {imgs.length > 3 && (
              <span className="text-xs text-gray-400 self-center">+{imgs.length - 3}</span>
            )}
          </div>
        ) : <span className="text-xs text-gray-400">—</span>,
    },
  ];

  const outColumns = [
    {
      title: "Date & Time", dataIndex: "date", key: "date", width: 145,
      render: (t) => <span className="text-xs text-gray-600">{t}</span>,
    },
    {
      title: "Qty", dataIndex: "quantity", key: "quantity", width: 70, align: "center",
      render: (v) => <span className="font-bold text-red-600 text-sm">−{v || 0}</span>,
    },
    {
      title: "Handler", dataIndex: "handler_name", key: "handler_name",
      render: (t) => <span className="text-xs">{t}</span>,
    },
    {
      title: "Location", dataIndex: "location", key: "location",
      render: (t) => <span className="text-xs">{t}</span>,
    },
    {
      title: "Customer", dataIndex: "customer_details", key: "customer_details",
      render: (t) => <span className="text-xs">{t}</span>,
    },
    {
      title: "Notes", dataIndex: "notes", key: "notes",
      render: (t) => <span className="text-xs">{t}</span>,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      destroyOnClose
      title={
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <SwapOutlined style={{ color: "#2563eb", fontSize: 16 }} />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base">Stock Movement History</div>
            <div className="text-xs text-gray-500 font-normal">{product?.name}</div>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Tag color="success" icon={<ArrowUpOutlined />} className="font-semibold">
              Total IN: {totalIn}
            </Tag>
            <Tag color="error" icon={<ArrowDownOutlined />} className="font-semibold">
              Total OUT: {totalOut}
            </Tag>
            <Tag color="blue" className="font-semibold">
              Net Stock: {totalIn - totalOut}
            </Tag>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* ── Stock IN Table ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpOutlined style={{ color: "#16a34a", fontSize: 13 }} />
            </div>
            <span className="font-bold text-green-700 text-sm">Stock IN</span>
            <Tag color="success" className="ml-1 text-xs font-semibold">
              {stockIn.length} entries · +{totalIn} units
            </Tag>
          </div>
          <Table
            dataSource={stockIn}
            columns={inColumns}
            size="small"
            scroll={{ x: 600 }}
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            rowClassName={() => "bg-green-50 hover:bg-green-100"}
            locale={{
              emptyText: (
                <div className="py-8 text-gray-400 text-sm text-center">
                  <ArrowUpOutlined style={{ fontSize: 24, color: "#86efac" }} />
                  <div className="mt-2">No stock IN records yet</div>
                </div>
              ),
            }}
          />
        </div>

        {/* ── Stock OUT Table ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDownOutlined style={{ color: "#dc2626", fontSize: 13 }} />
            </div>
            <span className="font-bold text-red-600 text-sm">Stock OUT</span>
            <Tag color="error" className="ml-1 text-xs font-semibold">
              {stockOut.length} entries · −{totalOut} units
            </Tag>
          </div>
          <Table
            dataSource={stockOut}
            columns={outColumns}
            size="small"
            scroll={{ x: 500 }}
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            rowClassName={() => "bg-red-50 hover:bg-red-100"}
            locale={{
              emptyText: (
                <div className="py-8 text-gray-400 text-sm text-center">
                  <ArrowDownOutlined style={{ fontSize: 24, color: "#fca5a5" }} />
                  <div className="mt-2">No stock OUT records yet</div>
                </div>
              ),
            }}
          />
        </div>
      </div>
    </Modal>
  );
};


// ─── Main Component ─────────────────────────────────────────────────────────

const OfflineProduct = () => {
  const { user } = useSelector((state) => state.authSlice);
  const [formStatus, setFormStatus] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [search, setSearch] = useState("");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mainCategory, setMainCategoryData] = useState([]);
  const [filterByProductCategory, setFilterByProductCategory] = useState("");
  const [filterByProductSubcategory, setFilterByProductSubcategory] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [filterByType, setFilterByType] = useState("");
  const [vendorClose, setVendorClose] = useState([]);
  const [subcategoryData, setSubcategoryData] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [cloneModal, setOpenCloneModal] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [subcategoryDataFilter, setSubcategoryDataFilter] = useState([]);
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [productId, setProductId] = useState();
  const [showFilters, setShowFilters] = useState(false);
  const [vendorNames, setVendorNames] = useState({});
  const [vendorsLoading, setVendorsLoading] = useState({});
  const [cloneProductDetails, setCloneProductDetails] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [activeTabKey, setActiveTabKey] = useState("1");
  const [updatingProductId, setUpdatingProductId] = useState(null);

  // Stock modal state
  const [stockInModal, setStockInModal] = useState({ open: false, product: null });
  const [stockOutModal, setStockOutModal] = useState({ open: false, product: null });
  const [stockHistoryModal, setStockHistoryModal] = useState({ open: false, product: null });

  const hasEditPermission = isSuperAdmin(user.role) || canEditPage(user.pagePermissions, "product-details");
  const hasDeletePermission = isSuperAdmin(user.role) || canDeletePage(user.pagePermissions, "product-details");

  const [paginationConfig, setPaginationConfig] = useState(() => {
    const savedPageSize = localStorage.getItem(STORAGE_KEYS.PAGE_SIZE);
    const savedCurrentPage = localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE);
    const savedActiveTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    if (savedActiveTab) setActiveTabKey(savedActiveTab);
    return {
      pageSize: savedPageSize ? parseInt(savedPageSize, 10) : 10,
      currentPage: savedCurrentPage ? parseInt(savedCurrentPage, 10) : 1,
    };
  });

  const [initialFilters] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FILTERS);
    return saved ? JSON.parse(saved) : {};
  });

  const [form] = useForm();

  const savePaginationToStorage = (pageSize, currentPage) => {
    localStorage.setItem(STORAGE_KEYS.PAGE_SIZE, pageSize.toString());
    localStorage.setItem(STORAGE_KEYS.CURRENT_PAGE, currentPage.toString());
  };

  const saveFiltersToStorage = (filters) => {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
  };

  const handlePageSizeChange = (pageSize) => {
    const newPag = { ...paginationConfig, pageSize, currentPage: 1 };
    setPaginationConfig(newPag);
    savePaginationToStorage(pageSize, 1);
  };

  const handlePageChange = (currentPage) => {
    const newPag = { ...paginationConfig, currentPage };
    setPaginationConfig(newPag);
    savePaginationToStorage(newPag.pageSize, currentPage);
  };

  const handleTabChange = (key) => {
    setActiveTabKey(key);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, key);
    if (paginationConfig.currentPage !== 1) handlePageChange(1);
  };

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.category) setFilterByProductCategory(initialFilters.category);
      if (initialFilters.subcategory) setFilterByProductSubcategory(initialFilters.subcategory);
      if (initialFilters.vendor) setVendorFilter(initialFilters.vendor);
      if (initialFilters.type) setFilterByType(initialFilters.type);
      if (initialFilters.visibility) setVisibilityFilter(initialFilters.visibility);
      if (initialFilters.search) setSearch(initialFilters.search);
    }
  }, []);

  useEffect(() => {
    saveFiltersToStorage({
      category: filterByProductCategory,
      subcategory: filterByProductSubcategory,
      vendor: vendorFilter,
      type: filterByType,
      visibility: visibilityFilter,
      search,
    });
  }, [filterByProductCategory, filterByProductSubcategory, vendorFilter, filterByType, visibilityFilter, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getProduct(
        "", search || "", true,
        filterByProductCategory || "", filterByType || "",
        filterByProductSubcategory || "", vendorFilter || "", visibilityFilter || ""
      );
      const data = _.get(result, "data.data", []);
      setTableData(data.reverse());
    } catch (err) {
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOnChangeLabel = async (data, product) => {
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "No permission to modify products" });
      return;
    }
    const pid = _.get(product, "_id", "");
    try {
      setUpdatingProductId(pid);
      setTableData(prev => prev.map(item => item._id === pid ? { ...item, ...data } : item));
      const result = await editProduct(data, pid);
      SUCCESS_NOTIFICATION(result);
      await fetchData();
    } catch (error) {
      setTableData(prev => prev.map(item => item._id === pid ? { ...item, is_visible: !data.is_visible } : item));
      ERROR_NOTIFICATION(error);
    } finally {
      setUpdatingProductId(null);
    }
  };

  // ── Export helpers ────────────────────────────────────────────────────────
  const getVariantImages = (product) => {
    if (!product.variants || !Array.isArray(product.variants)) return [];
    const variantImages = [];
    product.variants.forEach((vg) => {
      if (vg.variant_type === "image_variant" && vg.options) {
        vg.options.forEach((opt) => {
          if (opt.image_names?.length > 0) {
            const imgs = opt.image_names.map(img =>
              typeof img === "object" ? _.get(img, "url", _.get(img, "path", "")) : img
            ).filter(Boolean);
            if (imgs.length > 0) variantImages.push({ variantName: vg.variant_name, optionValue: opt.value, images: imgs });
          }
        });
      }
    });
    return variantImages;
  };

  const getFirstVariantImage = (product) => {
    const vi = getVariantImages(product);
    for (const v of vi) { if (v.images?.length > 0) return v.images[0]; }
    return null;
  };

  const getProductImage = (product) => {
    if (product.images?.length > 0) {
      const fi = product.images[0];
      return typeof fi === "object" ? _.get(fi, "url", _.get(fi, "path", "")) : fi;
    }
    return getFirstVariantImage(product) || "";
  };

  const getProductPrice = (product, priceType = "customer") => {
    const map = { customer: "customer_product_price", dealer: "Deler_product_price", corporate: "corporate_product_price" };
    const field = map[priceType];
    if (product.type === "Stand Alone Product") return product[field] || product.MRP_price || "N/A";
    if (product.type === "Variant Product" || product.type === "Variable Product") {
      if (product.variants_price?.length > 0) {
        const prices = product.variants_price.map(v => parseFloat(v[field] || v.price)).filter(p => !isNaN(p));
        if (prices.length > 0) return Math.min(...prices);
      }
      return product[field] || product.MRP_price || "N/A";
    }
    return "N/A";
  };

  const getTotalStock = (product) => {
    if ((product.type === "Variant Product" || product.type === "Variable Product") && product.variants_price?.length) {
      return product.variants_price.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);
    }
    return product.stock_count || 0;
  };

  const exportToCSV = () => {
    try {
      setExportLoading(true);
      let csv = "data:text/csv;charset=utf-8,";
      const cols = ["S.No", "Product Name", "PRODUCT S.NO", "VENDOR CODE", "Product Code", "Category", "Sub Category", "MRP Price"];
      csv += cols.join(",") + "\r\n";
      tableData.forEach((product, index) => {
        const row = {
          "S.No": index + 1,
          "Product Name": product.name || "N/A",
          "PRODUCT S.NO": product.product_codeS_NO || "N/A",
          "VENDOR CODE": product.Vendor_Code || "N/A",
          "Product Code": product.product_code || "N/A",
          "Category": _.get(product, "category_details.main_category_name", "N/A"),
          "Sub Category": _.get(product, "sub_category_details.sub_category_name", "N/A"),
          "MRP Price": product.MRP_price || "N/A",
        };
        csv += cols.map(c => `"${row[c] || ""}"`).join(",") + "\r\n";
      });
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `products_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      message.success("CSV downloaded");
    } catch { message.error("Export failed"); }
    finally { setExportLoading(false); }
  };




  const onCategoryChange = (value) => {
    setFilterByProductCategory(value); setFilterByProductSubcategory(""); handlePageChange(1);
    setSubcategoryDataFilter(value ? subcategoryData.filter(s => s.select_main_category === value) : []);
  };



  const fetchCategories = async () => {
    try {
      const [mainResult, subResult] = await Promise.all([getMainCategory(), getSubCategory()]);
      setCategoryData(_.get(mainResult, "data.data", []));
      setSubcategoryData(_.get(subResult, "data.data", []));
    } catch (err) { ERROR_NOTIFICATION(err); }
  };

  const fetchMainCategories = async () => {
    try {
      const result = await getAllCategoryProducts();
      setMainCategoryData(_.get(result, "data.data", []));
    } catch (err) { ERROR_NOTIFICATION(err); }
  };




  const getVendorName = useCallback(async (id) => {
    if (!id || vendorNames[id]) return vendorNames[id];
    setVendorsLoading(prev => ({ ...prev, [id]: true }));
    try {
      const vendor = await getSingleVendor(id);
      const name = _.get(vendor, "data.data.business_name", "Unknown Vendor");
      setVendorNames(prev => ({ ...prev, [id]: name })); return name;
    } catch { setVendorNames(prev => ({ ...prev, [id]: "Error" })); return "Error"; }
    finally { setVendorsLoading(prev => ({ ...prev, [id]: false })); }
  }, [vendorNames]);

  const collectVendors = async () => {
    try {
      setLoading(true);
      const result = await getAllVendor();
      setAllVendors(_.get(result, "data.data", []));
    } catch (err) { ERROR_NOTIFICATION(err); }
    finally { setLoading(false); }
  };

  const handleClearFilters = () => {
    setFilterByProductCategory(""); setFilterByProductSubcategory(""); setVendorFilter("");
    setFilterByType(""); setVisibilityFilter(""); setSubcategoryDataFilter([]); setSearch("");
    handlePageChange(1); localStorage.removeItem(STORAGE_KEYS.FILTERS);
  };

  const handleTableChange = (pagination) => {
    if (pagination.current !== paginationConfig.currentPage) handlePageChange(pagination.current);
    if (pagination.pageSize !== paginationConfig.pageSize) handlePageSizeChange(pagination.pageSize);
  };

  const getCurrentTabData = useMemo(() => {
    return activeTabKey === "1"
      ? tableData.filter(r => !r.is_cloned)
      : tableData.filter(r => r.is_cloned);
  }, [tableData, activeTabKey]);

  const processedTableData = useMemo(() => getCurrentTabData.map((item, index) => ({
    ...item,
    serialNumber: index + 1,
    totalStock: getTotalStock(item),
    prices: {
      customerPrice: getProductPrice(item, "customer"),
      dealerPrice: getProductPrice(item, "dealer"),
      corporatePrice: getProductPrice(item, "corporate"),
    },
  })), [getCurrentTabData]);

  const productType = [
    { value: "Stand Alone Product", label: "Stand Alone Product" },
    { value: "Variable Product", label: "Variable Product" },
    { value: "Variant Product", label: "Variant Product" },
  ];

  const visibilityOptions = [
    { value: "", label: "All Products" },
    { value: "true", label: "Visible Only" },
    { value: "false", label: "Hidden Only" },
  ];

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "S.No", dataIndex: "serialNumber", key: "serialNumber",
      align: "center", width: 60, fixed: "left",
      render: (n) => <span className="text-gray-700 font-semibold">{n}</span>,
    },
    {
      title: "Image", dataIndex: "images", width: 120,
      render: (_, record) => {
        const img = getProductImage(record);
        const isVar = record.type === "Variable Product" || record.type === "Variant Product";
        return (
          <div className="flex justify-center">
            {img ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-white shadow hover:shadow-lg transition-all">
                <Image src={img} alt="Product" width="100%" height="100%" className="object-cover w-full h-full" preview />
                {isVar && (
                  <div className="absolute bottom-1 left-1 bg-purple-500 text-white text-xs rounded px-1">Var</div>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-300">
                <span className="text-xs text-gray-400">No Image</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Name", dataIndex: "name", width: 180,
      render: (data, record) => (
        <div className="flex flex-col space-y-1">
          <Tooltip title={data}>
            <span className="font-semibold text-gray-900 text-sm line-clamp-2">{data}</span>
          </Tooltip>
          <span className="text-xs text-gray-500">Code: {record.product_code || "N/A"}</span>
          {record.variants?.length > 0 && (
            <span className="text-xs text-blue-600 font-medium">
              {record.variants.reduce((c, v) => c + (v.options?.length || 0), 0)} variant(s)
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Stock", dataIndex: "totalStock", width: 100, align: "center",
      render: (stock, record) => {
        const status = record.stocks_status || "In Stock";
        return (
          <div className="flex flex-col items-center">
            <span className="font-bold text-gray-900 text-xl">{stock}</span>
            <span className={`text-xs font-medium ${status === "Limited" ? "text-orange-600" : "text-green-600"}`}>{status}</span>
          </div>
        );
      },
    },
    {
      title: "Prices", dataIndex: "prices", width: 190,
      render: (prices, record) => {
        const customerNum = prices.customerPrice !== "N/A" ? parseFloat(prices.customerPrice) : null;
        const dealPrice = customerNum !== null ? (customerNum * 1.18).toFixed(2) : null;
        const mrp = record.MRP_price;
        return (
          <div className="flex flex-col space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">MRP:</span>
              <span className="font-bold">{mrp ? `₹${mrp}` : "N/A"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Customer:</span>
              <span className="font-bold">{prices.customerPrice !== "N/A" ? `₹${prices.customerPrice}` : "N/A"}</span>
            </div>
            <div className="flex justify-between gap-2 border-t border-dashed border-orange-200 pt-1 mt-1">
              <Tooltip title="Customer Price + 18% GST">
                <span className="text-orange-500 font-semibold cursor-help">Deal Price:</span>
              </Tooltip>
              <span className="font-bold text-orange-600">{dealPrice ? `₹${dealPrice}` : "N/A"}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Actions", width: 180, align: "center", fixed: "right",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {hasEditPermission && (
            <Tooltip title={`Stock IN — Current: ${record.stock_count || 0}`}>
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                onClick={() => setStockInModal({ open: true, product: record })}
                style={{
                  background: "#f0fdf4", borderColor: "#16a34a", color: "#16a34a",
                  fontWeight: 600, fontSize: 11, borderRadius: 8,
                }}
              >
                IN
              </Button>
            </Tooltip>
          )}

          {hasEditPermission && (
            <Tooltip title={`Stock OUT — Current: ${record.stock_count || 0}`}>
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                onClick={() => setStockOutModal({ open: true, product: record })}
                style={{
                  background: "#fff1f2", borderColor: "#dc2626", color: "#dc2626",
                  fontWeight: 600, fontSize: 11, borderRadius: 8,
                }}
              >
                OUT
              </Button>
            </Tooltip>
          )}

          <Tooltip title="View stock movement history">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setStockHistoryModal({ open: true, product: record })}
              style={{
                background: "#eff6ff", borderColor: "#2563eb", color: "#2563eb",
                fontWeight: 600, fontSize: 11, borderRadius: 8,
              }}
            >
              History
            </Button>
          </Tooltip>          
        </div>
      ),
    },
  ];

  useEffect(() => { fetchCategories(); fetchMainCategories(); collectVendors(); }, []);

  useEffect(() => {
    fetchData();
    if (!formStatus) setId("");
  }, [search, formStatus, filterByProductCategory, filterByType, filterByProductSubcategory, vendorFilter, visibilityFilter]);

  useEffect(() => {
    if (vendorClose.length > 0) {
      vendorClose.forEach(vendor => { if (!vendorNames[vendor._id]) getVendorName(vendor._id); });
    }
  }, [vendorClose, vendorNames, getVendorName]);

  const paginationProps = {
    current: paginationConfig.currentPage,
    pageSize: paginationConfig.pageSize,
    showSizeChanger: true, showQuickJumper: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
    pageSizeOptions: ["10", "20", "50", "100"],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 p-4 md:p-8 font-sans">
      <DefaultTile
        title="Stock Dashboard" 
        formStatus={formStatus} setFormStatus={setFormStatus} search setSearch={setSearch}
        className="bg-white shadow-2xl rounded-3xl p-6 md:p-8 mb-6 border border-teal-100"
        extra={
          hasEditPermission && (
            <Dropdown
              overlay={
                <Menu className="rounded-xl shadow-xl bg-white border border-gray-100 p-2 min-w-[200px]">
                  <Menu.Item key="all">
                    <Button type="text" icon={<MdFileDownload className="text-green-600" />}
                      onClick={exportToCSV} loading={exportLoading}
                      className="flex items-center text-green-600 hover:bg-green-50 w-full text-left px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      Export All Products
                    </Button>
                  </Menu.Item>
                </Menu>
              }
              trigger={["click"]} placement="bottomRight"
            >
              <Button type="primary" icon={<MdFileDownload />} loading={exportLoading}
                className="bg-teal-600 hover:bg-teal-700 border-none rounded-xl font-semibold px-4 flex items-center shadow-lg"
              >
                Export CSV
              </Button>
            </Dropdown>
          )
        }
      />

      {!hasEditPermission && !hasDeletePermission && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium flex items-center gap-2">
            <LockOutlined /> You have view-only access. Contact an administrator for edit permissions.
          </p>
        </div>
      )}

      <>
        {/* ── Filters ── */}
        <Card className="mb-6 bg-white shadow-xl rounded-3xl border-none" bodyStyle={{ padding: 24 }}>
          <div className="flex justify-between items-center mb-4">
            <Title level={5} className="m-0 flex items-center gap-2 text-gray-900">
              <FaFilter className="text-teal-600" /> Filter Products
            </Title>
            <div className="flex gap-2">
              <Button type="text" onClick={() => setShowFilters(!showFilters)} className="text-teal-600 font-semibold">
                {showFilters ? "▲ Hide" : "▼ Show"}
              </Button>
              <Button onClick={handleClearFilters} className="bg-gray-100 border-none rounded-xl font-semibold">Clear All</Button>
            </div>
          </div>
          <div className={`transition-all duration-500 overflow-hidden ${showFilters ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Text className="text-sm font-semibold text-gray-700 mb-1 block">Category</Text>
                <Select placeholder="Select Category" size="large" className="w-full" allowClear onChange={onCategoryChange} value={filterByProductCategory}>
                  {mainCategory.map(item => <Select.Option key={item._id} value={item._id}>{item.main_category_name}</Select.Option>)}
                </Select>
              </div>
              <div>
                <Text className="text-sm font-semibold text-gray-700 mb-1 block">Sub Category</Text>
                <Select placeholder="Select Sub Category" size="large" className="w-full" allowClear
                  onChange={val => setFilterByProductSubcategory(val)} value={filterByProductSubcategory}
                  disabled={!filterByProductCategory || subcategoryDataFilter.length === 0}
                >
                  {subcategoryDataFilter.map(item => <Select.Option key={item._id} value={item._id}>{item.sub_category_name}</Select.Option>)}
                </Select>
              </div>
              <div>
                <Text className="text-sm font-semibold text-gray-700 mb-1 block">Vendor</Text>
                <Select placeholder="Select Vendor" size="large" className="w-full" allowClear onChange={val => setVendorFilter(val)} value={vendorFilter}>
                  {allVendors.map(item => <Select.Option key={item._id} value={item._id}>{item.vendor_name}</Select.Option>)}
                </Select>
              </div>
              <div>
                <Text className="text-sm font-semibold text-gray-700 mb-1 block">Product Type</Text>
                <Select placeholder="Select Type" size="large" className="w-full" options={productType} allowClear onChange={val => setFilterByType(val)} value={filterByType} />
              </div>
              <div>
                <Text className="text-sm font-semibold text-gray-700 mb-1 block">Visibility</Text>
                <Select placeholder="Visibility" size="large" className="w-full" options={visibilityOptions} allowClear onChange={val => setVisibilityFilter(val)} value={visibilityFilter} />
              </div>
            </div>
          </div>
        </Card>

        {/* ── Table ── */}
        <Card className="bg-white shadow-xl rounded-3xl border-none" bodyStyle={{ padding: 0 }}>
          <Tabs
            destroyInactiveTabPane type="card" size="large"
            className="px-4 md:px-8 pt-4" activeKey={activeTabKey} onChange={handleTabChange}
            items={[
              {
                key: "1",
                label: (
                  <span className="flex items-center font-bold text-gray-900 text-sm">
                    📦 Products
                    <Tag className="ml-2 bg-teal-100 text-teal-800 font-semibold rounded-full px-2 text-xs">
                      {tableData.filter(r => !r.is_cloned).length}
                    </Tag>
                  </span>
                ),
                children: (
                  <CustomTable loading={loading} dataSource={processedTableData} columns={columns}
                    className="rounded-b-3xl" onChange={handleTableChange} pagination={paginationProps} />
                ),
              },
             
            ]}
          />
        </Card>
      </>

      {/* ── Stock IN Popup ── */}
      <StockInModal
        open={stockInModal.open}
        product={stockInModal.product}
        onClose={() => setStockInModal({ open: false, product: null })}
        onSuccess={fetchData}
      />

      {/* ── Stock OUT Popup ── */}
      <StockOutModal
        open={stockOutModal.open}
        product={stockOutModal.product}
        onClose={() => setStockOutModal({ open: false, product: null })}
        onSuccess={fetchData}
      />

      {/* ── Stock History Popup ── */}
      <StockHistoryModal
        open={stockHistoryModal.open}
        product={stockHistoryModal.product}
        onClose={() => setStockHistoryModal({ open: false, product: null })}
      />
    </div>
  );
};

export default OfflineProduct;