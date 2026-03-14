/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import {
    Button, Card, Collapse, Divider, Form, Image, Input,
    message, Spin, Table, Tag, Typography, Modal, DatePicker,
} from "antd";
import {
    EyeOutlined, DeleteFilled, PlusOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import React, { useState, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import { DndContext } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addproduct, editProduct, uploadImage } from "../../api";
import _ from "lodash";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { formValidation } from "../../helper/formvalidation";

const { Title, Text } = Typography;
const { Panel } = Collapse;

// ─── Helpers ────────────────────────────────────────────────────────────────

const createImageObject = (url, existingId = null) => ({
    _id: existingId || uuidv4(),
    path: url,
    url: url,
    type: 'image',
    uploadedAt: new Date().toISOString()
});

// ─── Sortable Image ──────────────────────────────────────────────────────────

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
            <Image
                src={imageUrl} alt="Product" width={80} height={80}
                className="object-cover rounded border-2 border-dashed border-gray-300"
                preview={{ mask: <div className="flex items-center justify-center gap-1"><EyeOutlined className="text-white" /><span className="text-white text-xs">Preview</span></div> }}
            />
            <button
                type="button"
                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center border-0 cursor-pointer z-20"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(id); }}
            >
                <DeleteFilled className="text-xs" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">Drag</div>
        </div>
    );
};

const SortableImageList = ({ images, setImages, title = "" }) => {
    const getId = (img) => img._id || img.path || img;

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIndex = images.findIndex(img => getId(img) === active.id);
        const newIndex = images.findIndex(img => getId(img) === over.id);
        if (oldIndex !== -1 && newIndex !== -1) setImages(arrayMove(images, oldIndex, newIndex));
    };

    return (
        <div className="space-y-3">
            {title && <label className="text-gray-600 text-sm font-medium block">{title} ({images.length})</label>}
            <DndContext onDragEnd={handleDragEnd}>
                <SortableContext items={images.map(getId)}>
                    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg min-h-[8rem] border border-dashed border-gray-300">
                        {images.map(img => (
                            <SortableImage
                                key={getId(img)} id={getId(img)} image={img}
                                onRemove={(id) => setImages(images.filter(i => getId(i) !== id))}
                            />
                        ))}
                        {images.length === 0 && (
                            <div className="flex items-center justify-center w-full h-32 text-gray-500">
                                No images uploaded yet.
                            </div>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

// ─── Upload Helper ───────────────────────────────────────────────────────────

const UploadHelper = ({ multiple = true, max = 10, setImagePath, image_path = [], label = "Upload Images", current_key }) => {
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e) => {
        try {
            setLoading(true);
            const files = e.target.files;
            if (!files?.length) return;
            const uploaded = [];
            for (const file of files) {
                if (!file.type.startsWith('image/')) { message.warning(`${file.name} is not an image`); continue; }
                if (file.size > 5 * 1024 * 1024) { message.warning(`${file.name} is too large (max 5MB)`); continue; }
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
        } catch { message.error('Upload failed'); }
        finally { setLoading(false); e.target.value = ''; }
    };

    return (
        <div className="flex flex-col gap-4">
            <input type="file" accept="image/*" onChange={handleUpload} multiple={multiple}
                className="hidden" id={`upload-${current_key || 'imgs'}`} />
            <label htmlFor={`upload-${current_key || 'imgs'}`}
                className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors bg-gray-50"
            >
                <div className="flex flex-col items-center gap-2">
                    <PlusOutlined className="text-2xl text-gray-400" />
                    <span className="text-gray-600 font-medium">{label}</span>
                    <span className="text-sm text-gray-500">Max {max} • PNG/JPG/JPEG • 5MB each</span>
                    {loading && <Spin size="small" />}
                </div>
            </label>
            {image_path?.length > 0 && (
                <SortableImageList images={image_path} setImages={setImagePath} title="Uploaded Images" />
            )}
        </div>
    );
};

// ─── Stock IN Entry Card ─────────────────────────────────────────────────────

const StockInCard = ({ field, remove, image_path, setImagePath }) => {
    const { key, name, ...restField } = field;
    return (
        <Card size="small" key={key} className="relative"
            style={{ borderLeft: '4px solid #52c41a', background: '#f6ffed' }}
        >
            <Tag color="success" icon={<ArrowUpOutlined />} className="mb-3">Stock IN</Tag>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                <Form.Item label="Add Stock" {...restField} name={[name, "add_stock"]}
                    rules={[formValidation("Enter stock quantity")]} className="mb-0">
                    <Input type="number" placeholder="Quantity" className="h-10" />
                </Form.Item>
                <Form.Item label="Buy Price" {...restField} name={[name, "buy_price"]}
                    rules={[formValidation("Enter buy price")]} className="mb-0">
                    <Input type="number" placeholder="Price" className="h-10" />
                </Form.Item>
                <Form.Item label="Handler Name" {...restField} name={[name, "handler_name"]}
                    rules={[formValidation("Enter handler name")]} className="mb-0">
                    <Input placeholder="Handler name" className="h-10" />
                </Form.Item>
                <Form.Item label="Location" {...restField} name={[name, "location"]} className="mb-0">
                    <Input placeholder="Location" className="h-10" />
                </Form.Item>
                <Form.Item label="Date & Time" {...restField} name={[name, "date"]}
                    rules={[formValidation("Select a date")]} className="mb-0">
                    <DatePicker showTime className="h-10 w-full" format="DD/MM/YYYY h:mm A" />
                </Form.Item>
                <Form.Item label="Invoice" {...restField} name={[name, "invoice"]} className="mb-0">
                    <Input placeholder="Invoice" className="h-10" />
                </Form.Item>
                <Form.Item label="Note" {...restField} name={[name, "notes"]} className="mb-0">
                    <Input.TextArea placeholder="Notes" rows={2} />
                </Form.Item>
                <Form.Item label="Stock Images" name="stock_images" className="mb-0">
                    <UploadHelper multiple max={10} setImagePath={setImagePath}
                        image_path={image_path} label="Upload Images" current_key={`in-${name}`} />
                </Form.Item>
            </div>
            <Button type="text" danger icon={<DeleteFilled />} onClick={() => remove(name)}
                className="absolute top-2 right-2" />
        </Card>
    );
};

// ─── Stock OUT Entry Card ────────────────────────────────────────────────────

const StockOutCard = ({ field, remove }) => {
    const { key, name, ...restField } = field;
    return (
        <Card size="small" key={key} className="relative"
            style={{ borderLeft: '4px solid #ff4d4f', background: '#fff2f0' }}
        >
            <Tag color="error" icon={<ArrowDownOutlined />} className="mb-3">Stock OUT</Tag>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                <Form.Item label="Remove Stock" {...restField} name={[name, "stock"]}
                    rules={[formValidation("Enter stock quantity")]} className="mb-0">
                    <Input type="number" placeholder="Quantity" className="h-10" />
                </Form.Item>
                <Form.Item label="Handler Name" {...restField} name={[name, "handler_name"]}
                    rules={[formValidation("Enter handler name")]} className="mb-0">
                    <Input placeholder="Handler name" className="h-10" />
                </Form.Item>
                <Form.Item label="Location" {...restField} name={[name, "location"]} className="mb-0">
                    <Input placeholder="Location" className="h-10" />
                </Form.Item>
                <Form.Item label="Date & Time" {...restField} name={[name, "date"]}
                    rules={[formValidation("Select a date")]} className="mb-0">
                    <DatePicker showTime className="h-10 w-full" format="DD/MM/YYYY h:mm A" />
                </Form.Item>
                <Form.Item label="Invoice" {...restField} name={[name, "invoice"]} className="mb-0">
                    <Input placeholder="Invoice" className="h-10" />
                </Form.Item>
                <Form.Item label="Note" {...restField} name={[name, "notes"]} className="mb-0">
                    <Input.TextArea placeholder="Notes" rows={2} />
                </Form.Item>
            </div>
            <Button type="text" danger icon={<DeleteFilled />} onClick={() => remove(name)}
                className="absolute top-2 right-2" />
        </Card>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const Stockform = ({ fetchData, setFormStatus, id, setId }) => {
    const [form] = Form.useForm();
    const [image_path, setImagePath] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalUnitVisible, setModalUnitVisible] = useState(false);

    const handleUnitOk = useCallback(() => setModalUnitVisible(false), []);
    const handleUnitCancel = useCallback(() => setModalUnitVisible(false), []);

    // ── History table data ───────────────────────────────────────────────────

    const historyData = useMemo(() => {
        const inRows = (id?.stock_info || []).map((item, i) => ({
            key: `in-${i}`,
            type: "in",
            quantity: item.add_stock,
            date: item.date ? moment(item.date).format("DD/MM/YYYY h:mm A") : "",
            buy_price: item.buy_price || "",
            invoice: item.invoice || "",
            location: item.location || "",
            handler_name: item.handler_name || "",
            note: item.notes || "",
        }));

        const outRows = (id?.stock_offline || []).map((item, i) => ({
            key: `out-${i}`,
            type: "out",
            quantity: item.stock,
            date: item.date ? moment(item.date).format("DD/MM/YYYY h:mm A") : "",
            buy_price: "",
            invoice: item.invoice || "",
            location: item.location || "",
            handler_name: item.handler_name || "",
            note: item.notes || "",
        }));

        // Sort combined by original index (newest existing first is optional)
        return [...inRows, ...outRows].sort((a, b) => (a.date < b.date ? 1 : -1));
    }, [id]);

    const historyColumns = [
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            render: (type) =>
                type === "in"
                    ? <Tag color="success" icon={<ArrowUpOutlined />}>Stock IN</Tag>
                    : <Tag color="error" icon={<ArrowDownOutlined />}>Stock OUT</Tag>,
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            render: (val, record) => (
                <span style={{ color: record.type === "out" ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                    {record.type === "out" ? `−${val || 0}` : `+${val || 0}`}
                </span>
            ),
        },
        { title: "Date & Time", dataIndex: "date", key: "date", render: (t) => t || "N/A" },
        { title: "Buy Price", dataIndex: "buy_price", key: "buy_price", render: (t) => t || "—" },
        { title: "Invoice", dataIndex: "invoice", key: "invoice", render: (t) => t || "N/A" },
        { title: "Location", dataIndex: "location", key: "location", render: (t) => t || "N/A" },
        { title: "Handler", dataIndex: "handler_name", key: "handler_name", render: (t) => t || "N/A" },
        { title: "Note", dataIndex: "note", key: "note", render: (t) => t || "N/A" },
    ];

    // ── Summary counts ───────────────────────────────────────────────────────

    const totalIn = (id?.stock_info || []).reduce((s, i) => s + (Number(i.add_stock) || 0), 0);
    const totalOut = (id?.stock_offline || []).reduce((s, i) => s + (Number(i.stock) || 0), 0);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleFinish = async (values) => {
        try {
            setLoading(true);

            // stock_info (IN) — merge existing + new
            const existingStockIn = (id ? _.get(id, "stock_info", []) : []).map((item) => ({
                ...item,
                date: item.date ? new Date(item.date).toISOString() : null,
            }));
            const newStockIn = (values.stock_info || []).map((item) => ({
                ...item,
                date: item.date ? item.date.toISOString() : null,
            }));
            values.stock_info = [...existingStockIn, ...newStockIn];

            // stock_offline (OUT) — merge existing + new
            const existingStockOut = (id ? _.get(id, "stock_offline", []) : []).map((item) => ({
                ...item,
                date: item.date ? new Date(item.date).toISOString() : null,
            }));
            const newStockOut = (values.stock_offline || []).map((item) => ({
                ...item,
                date: item.date ? item.date.toISOString() : null,
            }));
            values.stock_offline = [...existingStockOut, ...newStockOut];

            // Recalculate stock_count
            const allIn = values.stock_info.reduce((s, i) => s + (Number(i.add_stock) || 0), 0);
            const allOut = values.stock_offline.reduce((s, i) => s + (Number(i.stock) || 0), 0);
            values.stock_count = allIn - allOut;

            // Images
            values.images = image_path.map(img => ({
                _id: img._id, path: img.path, url: img.url,
                type: img.type || 'image', uploadedAt: img.uploadedAt
            }));

            const result = id
                ? await editProduct(values, id?._id)
                : await addproduct(values);

            SUCCESS_NOTIFICATION(result);
            form.resetFields();
            setImagePath([]);
            setFormStatus(false);
            fetchData();
        } catch (err) {
            console.error("Form submission error:", err);
            ERROR_NOTIFICATION(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Spin spinning={loading}>
            <div className="bg-gray-50 min-h-screen">
                <Card bordered={false}
                    style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "12px", background: "white" }}
                >
                    <div className="flex justify-between px-5 items-center mb-6">
                        <div>
                            <Title level={2} style={{ color: "#2c3e50", marginBottom: "8px" }}>
                                {id ? "Edit Product" : "Add New Product"}
                            </Title>
                            <Text type="secondary">
                                {id ? "Update the product details below" : "Fill in the details below to add a new product"}
                            </Text>
                        </div>
                    </div>

                    <Form form={form} layout="vertical" onFinish={handleFinish}>
                        <Collapse defaultActiveKey={["stock"]} expandIconPosition="end" className="custom-collapse">

                            {/* ── Stock Panel ── */}
                            <Panel
                                key="stock"
                                header={
                                    <div className="flex md:flex-row flex-col justify-between items-center gap-2">
                                        <span className="text-lg font-semibold">Stock Information</span>
                                        <div className="flex gap-3 items-center">
                                            <Tag color="success" icon={<ArrowUpOutlined />}>Total In: {totalIn}</Tag>
                                            <Tag color="error" icon={<ArrowDownOutlined />}>Total Out: {totalOut}</Tag>
                                            <Tag color="blue">Current Stock: <strong>{_.get(id, "stock_count", 0)}</strong></Tag>
                                        </div>
                                    </div>
                                }
                            >
                                <div className="mt-2 space-y-6">

                                    {/* ── Stock IN ── */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ArrowUpOutlined style={{ color: '#52c41a' }} />
                                            <h3 className="font-semibold text-green-700 m-0">Stock IN</h3>
                                        </div>
                                        <Form.List name="stock_info">
                                            {(fields, { add, remove }) => (
                                                <>
                                                    <Button
                                                        onClick={() => add()}
                                                        icon={<ArrowUpOutlined />}
                                                        className="mb-4 h-10"
                                                        style={{ background: '#f6ffed', borderColor: '#52c41a', color: '#52c41a', fontWeight: 600 }}
                                                    >
                                                        Add Stock In
                                                    </Button>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {fields.map((field) => (
                                                            <StockInCard
                                                                key={field.key} field={field} remove={remove}
                                                                image_path={image_path} setImagePath={setImagePath}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </Form.List>
                                    </div>

                                    <Divider style={{ borderColor: '#e5e7eb' }} />

                                    {/* ── Stock OUT ── */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                                            <h3 className="font-semibold text-red-600 m-0">Stock OUT</h3>
                                        </div>
                                        <Form.List name="stock_offline">
                                            {(fields, { add, remove }) => (
                                                <>
                                                    <Button
                                                        onClick={() => add()}
                                                        icon={<ArrowDownOutlined />}
                                                        className="mb-4 h-10"
                                                        style={{ background: '#fff2f0', borderColor: '#ff4d4f', color: '#ff4d4f', fontWeight: 600 }}
                                                    >
                                                        Add Stock Out
                                                    </Button>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {fields.map((field) => (
                                                            <StockOutCard key={field.key} field={field} remove={remove} />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </Form.List>
                                    </div>

                                    {/* ── History Table ── */}
                                    {historyData.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">Movement History</h3>
                                            <Table
                                                bordered
                                                dataSource={historyData}
                                                columns={historyColumns}
                                                pagination={false}
                                                scroll={{ x: true }}
                                                className="custom-table"
                                                rowClassName={(r) => r.type === "out" ? "bg-red-50" : "bg-green-50"}
                                            />
                                        </div>
                                    )}

                                </div>
                            </Panel>

                        </Collapse>

                        <Divider />

                        <Form.Item className="my-6">
                            <Button block htmlType="submit" type="primary" size="large"
                                loading={loading} className="h-12 text-lg">
                                {id ? "Update Product" : "Add Product"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>

            {/* ── Unit Modal ── */}
            <Modal
                title="Unit Configuration"
                visible={modalUnitVisible}
                onOk={handleUnitOk}
                onCancel={handleUnitCancel}
                width={800}
                footer={[
                    <Button key="cancel" onClick={handleUnitCancel}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={handleUnitOk}>Save Configuration</Button>,
                ]}
            >
                <Form form={form} layout="vertical">
                    <Form.List name="unit_splitup">
                        {(fields, { add, remove }) => (
                            <>
                                <Button onClick={() => add()} icon={<PlusOutlined />} className="h-10 mb-4">Add Unit</Button>
                                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Card size="small" key={key} className="relative">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                                <Form.Item label="Unit" {...restField} name={[name, "Unit"]}
                                                    rules={[formValidation("Enter a Unit")]} className="mb-0">
                                                    <Input placeholder="Enter Unit" className="h-10" />
                                                </Form.Item>
                                                <Form.Item label="Measurement" {...restField} name={[name, "Measurement"]}
                                                    rules={[formValidation("Enter a Measurement")]} className="mb-0">
                                                    <Input placeholder="Enter Measurement" className="h-10" />
                                                </Form.Item>
                                                <Button type="text" danger icon={<DeleteFilled />}
                                                    onClick={() => remove(name)} className="absolute top-2 right-2" />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>

            <style jsx>{`
                :global(.custom-collapse .ant-collapse-header) { align-items: center !important; font-weight: 600; }
                :global(.custom-table .ant-table-thead > tr > th) { background-color: #fafafa; font-weight: 600; }
            `}</style>
        </Spin>
    );
};

export default Stockform;