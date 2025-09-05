import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Button,
  DatePicker,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
  message,
  Card,
  Input,
  Divider,
  Progress,
  Avatar,
  Badge,
  Steps,
  Form,
  Upload,
  Rate,
  Row,
  Col,
  Statistic,
  List,
  Descriptions,
} from "antd";
import {
  FiArrowRight,
  FiCheck,
  FiDownload,
  FiEye,
  FiFilter,
  FiSearch,
  FiTruck,
  FiUser,
  FiUsers,
  FiDollarSign,
  FiPackage,
  FiBox,
  FiClipboard,
  FiStar,
  FiCalendar,
  FiClock,
  FiFile,
  FiShoppingBag,
  FiTrendingUp,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  collectallorders,
  updateorderstatus,
  getSingleVendor,
  getAllVendor,
  uploadImage,
  updateDesign,
  assignVendorToOrder,
} from "../../api";
import _ from "lodash";
import moment from "moment";
import * as XLSX from "xlsx";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Step } = Steps;
const { TextArea } = Input;

const Orders = () => {
   // State management
  const { user } = useSelector((state) => state.authSlice);
  const [orderData, setOrderData] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState([]);
  const [orderStatus, setOrderStatus] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDesignModalVisible, setIsDesignModalVisible] = useState(false);
  const [isQualityModalVisible, setIsQualityModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [designForm] = Form.useForm();
  const [qualityForm] = Form.useForm();
  const navigation = useNavigate();
  const userRole = JSON.parse(localStorage.getItem("userprofile")) || {};

  // Status flow configuration
  const statusFlow = [
    { key: "1", label: "placed", color: "#ff4d4f", icon: <FiPackage /> },
    {
      key: "2",
      label: "accounting team",
      color: "#1890ff",
      icon: <FiDollarSign />,
    },
    { key: "3", label: "designing team", color: "#722ed1", icon: <FiUsers /> },
    { key: "4", label: "production team", color: "#faad14", icon: <FiBox /> },
    {
      key: "5",
      label: "quality check",
      color: "#13c2c2",
      icon: <FiClipboard />,
    },
    { key: "6", label: "packing team", color: "#52c41a", icon: <FiPackage /> },
    { key: "7", label: "delivery team", color: "#52c41a", icon: <FiTruck /> },
    { key: "8", label: "completed", color: "#52c41a", icon: <FiCheck /> },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  // Filter orders based on active tab and search
  useEffect(() => {
    let filtered = orderData;

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter((order) => order.order_status === activeTab);
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(
        (order) =>
          order.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
          _.get(order, "user_details[0].name", "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          _.get(order, "user_details[0].email", "")
            .toLowerCase()
            .includes(search.toLowerCase())
      );
    }

    // Filter by status
    if (orderStatus) {
      filtered = filtered.filter((order) => order.order_status === orderStatus);
    }

    // Filter by date
    if (dateFilter && dateFilter.length === 2) {
      const startDate = moment(dateFilter[0]).startOf("day");
      const endDate = moment(dateFilter[1]).endOf("day");

      filtered = filtered.filter((order) => {
        const orderDate = moment(order.createdAt);
        return orderDate.isBetween(startDate, endDate, null, "[]");
      });
    }

    setFilteredOrders(filtered);
  }, [orderData, activeTab, search, orderStatus, dateFilter]);

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const searchData = {
        search,
        date_filter: dateFilter,
        order_status: orderStatus,
      };
      const result = await collectallorders(JSON.stringify(searchData));
      setOrderData(_.get(result, "data.data", []));
    } catch (err) {
      console.error("Error fetching orders:", err);
      message.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus, additionalData = {}) => {
    try {
      await updateorderstatus({
        order_id: orderId,
        order_status: newStatus,
        member_id: userRole._id,
        ...additionalData,
      });
      return true;
    } catch (err) {
      console.error("Error updating status:", err);
      return false;
    }
  };

  // Handle status transition
  const handleStatusChange = async (orderId, currentStatus) => {
    const currentIndex = statusFlow.findIndex(
      (item) => item.label === currentStatus
    );
    const nextStatus = statusFlow[currentIndex + 1]?.label;

    if (!nextStatus) {
      message.info("Order is already in the final status");
      return;
    }

    // Special handling for design team
    if (currentStatus === "designing team") {
      setCurrentOrder(orderData.find((order) => order._id === orderId));
      setIsDesignModalVisible(true);
      return;
    }

    // Special handling for quality check team
    if (currentStatus === "quality check") {
      setCurrentOrder(orderData.find((order) => order._id === orderId));
      setIsQualityModalVisible(true);
      return;
    }

    const success = await updateOrderStatus(orderId, nextStatus);
    if (success) {
      setOrderData((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, order_status: nextStatus } : order
        )
      );
      message.success(`Order forwarded to '${nextStatus}'`);
    } else {
      message.error("Failed to forward order");
    }
  };

  const calculateDesignTime = (startTime, endTime) => {
    const start = moment(startTime);
    const end = moment(endTime);
    const durationMs = end.diff(start);

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  // Handle design submission
  const handleDesignSubmit = async (values) => {
    console.log(values)
    try {
      setLoading(true);

      // Upload design file if exists
      let designFileUrl = null;
      if (values.design_file && values.design_file.fileList.length > 0) {
        const formData = new FormData();
        formData.append("image", values.design_file.fileList[0].originFileObj);
        const uploadResult = await uploadImage(formData);
        designFileUrl = uploadResult.data.url;
      }

      const success = await updateDesign(
        currentOrder._id,
        designFileUrl,
        calculateDesignTime(values.design_start_time, values.design_end_time)
      );

      if (success) {
        setOrderData((prev) =>
          prev.map((order) =>
            order._id === currentOrder._id
              ? {
                  ...order,
                  order_status: "production team",
                  design_start_time: values.design_start_time.format(),
                  design_end_time: values.design_end_time.format(),
                  design_file: designFileUrl,
                }
              : order
          )
        );
        message.success(
          "Design details submitted and order forwarded to production team"
        );
        setIsDesignModalVisible(false);
        designForm.resetFields();
      } else {
        message.error("Failed to submit design details");
      }
    } catch (err) {
      console.error("Error submitting design:", err);
      message.error("Failed to submit design details");
    } finally {
      setLoading(false);
    }
  };

  // Handle quality check submission
  const handleQualitySubmit = async (values) => {
    try {
      setLoading(true);

      const success = await updateOrderStatus(
        currentOrder._id,
        "packing team",
        {
          quality_rating: values.rating,
          quality_notes: values.notes,
        }
      );

      if (success) {
        setOrderData((prev) =>
          prev.map((order) =>
            order._id === currentOrder._id
              ? {
                  ...order,
                  order_status: "packing team",
                  quality_rating: values.rating,
                  quality_notes: values.notes,
                }
              : order
          )
        );
        message.success(
          "Quality check completed and order forwarded to packing team"
        );
        setIsQualityModalVisible(false);
        qualityForm.resetFields();
      } else {
        message.error("Failed to submit quality check");
      }
    } catch (err) {
      console.error("Error submitting quality check:", err);
      message.error("Failed to submit quality check");
    } finally {
      setLoading(false);
    }
  };

  // Vendor assignment functions
  const fetchVendorsForOrder = async (order) => {
    try {
      setLoading(true);
      const [allVendorsResponse, ...assignedVendors] = await Promise.all([
        getAllVendor(),
        ..._.get(order, "vendor_details", []).map((v) =>
          getSingleVendor(v._id).catch(() => null)
        ),
      ]);

      const availableVendors = _.get(allVendorsResponse, "data.data", []);
      const filteredAssignedVendors = assignedVendors.filter((v) => v);

      setVendors(availableVendors);
      if (filteredAssignedVendors.length > 0) {
        setSelectedVendor(filteredAssignedVendors[0]._id);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      message.error("Failed to load vendor data");
    } finally {
      setLoading(false);
    }
  };

  const showVendorAssignmentModal = async (order) => {
    setCurrentOrder(order);
    setIsModalVisible(true);
    await fetchVendorsForOrder(order);
  };

  const handleVendorAssignment = async () => {
    if (!selectedVendor || !currentOrder) {
      message.warning("Please select a vendor");
      return;
    }

    try {
      setLoading(true);
      await assignVendorToOrder({
        order_id: currentOrder._id,
        vendor_id: selectedVendor,
      });

      message.success("Vendor assigned successfully");
      setIsModalVisible(false);
      await fetchOrders();
    } catch (err) {
      console.error("Error assigning vendor:", err);
      message.error("Failed to assign vendor");
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusObj = statusFlow.find((s) => s.label === status);
    return statusObj ? statusObj.color : "#d9d9d9";
  };

  // Get status icon
  const getStatusIcon = (status) => {
    const statusObj = statusFlow.find((s) => s.label === status);
    return statusObj ? statusObj.icon : <FiPackage />;
  };

  // Calculate order statistics
  const orderStats = {
    total: orderData.length,
    completed: orderData.filter((order) => order.order_status === "completed")
      .length,
    inProgress: orderData.filter(
      (order) =>
        order.order_status !== "completed" && order.order_status !== "placed"
    ).length,
    placed: orderData.filter((order) => order.order_status === "placed").length,
  };

  // Get current status index for progress
  const getStatusIndex = (status) => {
    return statusFlow.findIndex((s) => s.label === status);
  };

  const provideOrderContent = (order_status) => {
    let data = order_status
      ? orderData.filter((result) => {
          return result.order_status === order_status;
        })
      : orderData;
    return data.map((res) => {
      return {
        order_id: _.get(res, "_id", ""),
        invoice_number: _.get(res, "invoice_no", ""),
        order_date: moment(_.get(res, "createdAt", "")).format("YYYY-MM-DD"),
        order_status: _.get(res, "order_status", ""),
        payment_method: _.get(res, "payment_type", ""),
        customer_name: _.get(res, "user_details[0].name", ""),
        customer_email: _.get(res, "user_details[0].email", ""),
        customer_phone: _.get(res, "delivery_address.mobile_number", ""),
        customer_gstin: _.get(res, "delivery_address.gst_no", ""),
        customer_address: `${_.get(
          res,
          "delivery_address.delivery_address.addressType",
          ""
        )}-${_.get(res, "delivery_address.street_address", "")}-${_.get(
          res,
          "delivery_address.pincode",
          ""
        )}`,
        product_name: _.get(res, "cart_items.product_name", ""),
        product_quantity: _.get(res, "cart_items.product_quantity", ""),
        unit_price: _.get(res, "cart_items.product_price", ""),
        cgst: _.get(res, "cart_items.cgst", ""),
        sgst: _.get(res, "cart_items.sgst", ""),
        total_price: _.get(res, "total_price", ""),
      };
    });
  };

  // Export to CSV functionality
  const exportToExcel = () => {
    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Define columns
      const columns = [
        "Order ID", "Invoice Number", "Order Date", "Order Status", 
        "Payment Method", "Customer Name", "Customer Email", 
        "Customer Phone", "GSTIN", "Customer Address", "Product Name", 
        "Quantity", "Unit Price", "CGST", "SGST", "Total Price"
      ];
      
      // Add header row
      csvContent += columns.join(",") + "\r\n";
      
      // Add data rows
      provideOrderContent().forEach(row => {
        const values = columns.map(col => {
          const key = col.toLowerCase().replace(/\s+/g, '_');
          return `"${row[key] || ''}"`; // Wrap in quotes to handle commas
        });
        csvContent += values.join(",") + "\r\n";
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "orders_export.csv");
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      document.body.removeChild(link);
      
      message.success("CSV file downloaded successfully");
    } catch (err) {
      console.error("Error exporting data:", err);
      message.error("Failed to export data");
    }
  };

  // Custom upload button for design file
  const uploadButton = (
    <div>
      <FiFile className="text-2xl mb-2" />
      <div>Upload Design File</div>
    </div>
  );
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-800">
          Order Management Dashboard
        </h1>
        <p className="text-gray-600">
          Track and manage orders through the production pipeline
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="shadow-md border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <FiShoppingBag className="text-white text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-white text-opacity-80">Total Orders</h3>
                <p className="text-2xl font-bold">{orderStats.total}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md border-0 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <FiCheck className="text-white text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-white text-opacity-80">Completed</h3>
                <p className="text-2xl font-bold">{orderStats.completed}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md border-0 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <FiTrendingUp className="text-white text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-white text-opacity-80">In Progress</h3>
                <p className="text-2xl font-bold">{orderStats.inProgress}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-md border-0 bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <FiDollarSign className="text-white text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-white text-opacity-80">Pending Payment</h3>
                <p className="text-2xl font-bold">{orderStats.placed}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Order Pipeline Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-lg shadow-md mb-6"
      >
        <h2 className="text-lg font-semibold mb-4">Order Pipeline</h2>
        <Steps current={-1} labelPlacement="vertical" className="px-8">
          {statusFlow.map((status, index) => (
            <Step
              key={status.key}
              title={_.startCase(status.label)}
              icon={status.icon}
              description={
                <span className="text-xs">
                  {
                    orderData.filter(
                      (order) => order.order_status === status.label
                    ).length
                  }{" "}
                  orders
                </span>
              }
            />
          ))}
        </Steps>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white p-4 rounded-lg shadow-md mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Search Orders
            </label>
            <Input
              placeholder="Search by invoice, customer name, or email"
              prefix={<FiSearch className="text-gray-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              size="large"
            />
          </div>

          <div className="w-full md:w-auto">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Date Range
            </label>
            <RangePicker
              onChange={(dates) => setDateFilter(dates)}
              className="w-full"
              size="large"
            />
          </div>

          <div className="w-full md:w-48">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Filter by Status
            </label>
            <Select
              placeholder="Select status"
              value={orderStatus || undefined}
              onChange={setOrderStatus}
              allowClear
              className="w-full"
              size="large"
            >
              {statusFlow.map((status) => (
                <Option key={status.key} value={status.label}>
                  <div className="flex items-center">
                    <span className="mr-2" style={{ color: status.color }}>
                      {status.icon}
                    </span>
                    {_.startCase(status.label)}
                  </div>
                </Option>
              ))}
            </Select>
          </div>

          <Button
            type="primary"
            icon={<FiDownload />}
            onClick={exportToExcel}
            size="large"
            className="bg-blue-500 hover:bg-blue-600 border-0"
          >
            Export
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="mt-6 flex overflow-x-auto pb-2">
          <div
            className={`px-4 py-2 cursor-pointer flex items-center whitespace-nowrap ${
              activeTab === "all"
                ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("all")}
          >
            <FiBox className="mr-2" />
            All Orders
          </div>
          {statusFlow.map((status) => (
            <div
              key={status.key}
              className={`px-4 py-2 cursor-pointer flex items-center whitespace-nowrap ${
                activeTab === status.label
                  ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(status.label)}
            >
              <span className="mr-2" style={{ color: status.color }}>
                {status.icon}
              </span>
              {_.startCase(status.label)}
              <Badge
                count={
                  orderData.filter(
                    (order) => order.order_status === status.label
                  ).length
                }
                showZero
                size="small"
                className="ml-2"
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Orders List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4"
      >
        <AnimatePresence>
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order._id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              layout
            >
              <Card
                className="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 overflow-hidden"
                bodyStyle={{ padding: 0 }}
              >
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Badge
                          color={getStatusColor(order.order_status)}
                          text={
                            <span className="font-medium">
                              {_.startCase(order.order_status)}
                            </span>
                          }
                        />
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-500">
                          #{order.invoice_no}
                        </span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-500">
                          {moment(order.createdAt).format("MMM D, YYYY h:mm A")}
                        </span>
                      </div>

                      <div className="flex items-center mb-3">
                        <Avatar
                          size="default"
                          src={_.get(order, "user_details[0].profile_pic")}
                          icon={<FiUser />}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium">
                            {_.get(order, "user_details[0].name", "N/A")}
                          </div>
                          <div className="text-gray-500 text-sm flex items-center">
                            <FiMail className="mr-1" />
                            {_.get(order, "user_details[0].email", "N/A")}
                          </div>
                        </div>
                        <span className="mx-4 text-gray-300">|</span>
                        <div className="text-primary font-semibold text-lg">
                          ₹{_.get(order, "total_price", "0")}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Order Progress</span>
                          <span>
                            {getStatusIndex(order.order_status) + 1} of{" "}
                            {statusFlow.length} steps
                          </span>
                        </div>
                        <Progress
                          percent={Math.round(
                            ((getStatusIndex(order.order_status) + 1) /
                              statusFlow.length) *
                              100
                          )}
                          showInfo={false}
                          strokeColor={getStatusColor(order.order_status)}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-gray-500">
                        {statusFlow.map((status, idx) => (
                          <Tooltip
                            key={status.key}
                            title={_.startCase(status.label)}
                          >
                            <div
                              className={`p-1 rounded-full ${
                                idx <= getStatusIndex(order.order_status)
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {status.icon}
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end mt-4 md:mt-0 space-y-3 md:ml-4">
                      <div className="flex space-x-2">
                        {user.role !== "super admin" && (
                          <>
                            {order.order_status !== "completed" && (
                              <Popconfirm
                                title={`Forward to ${
                                  statusFlow[
                                    statusFlow.findIndex(
                                      (item) =>
                                        item.label === order.order_status
                                    ) + 1
                                  ]?.label
                                }?`}
                                onConfirm={() =>
                                  handleStatusChange(
                                    order._id,
                                    order.order_status
                                  )
                                }
                                okText="Yes"
                                cancelText="No"
                                disabled={
                                  (order.order_status === "production team" &&
                                    !order.assigned_vendor) ||
                                  (user.role !==
                                    order.order_status.split(" ")[0] +
                                      " team" &&
                                    !(
                                      order.order_status === "quality check" &&
                                      user.role === "quality check"
                                    ))
                                }
                              >
                                <Button
                                  type="primary"
                                  size="middle"
                                  icon={<FiArrowRight />}
                                  className="flex items-center bg-green-500 hover:bg-green-600 border-0"
                                  disabled={
                                    (order.order_status === "production team" &&
                                      !order.assigned_vendor) ||
                                    (user.role !==
                                      order.order_status.split(" ")[0] +
                                        " team" &&
                                      !(
                                        order.order_status ===
                                          "quality check" &&
                                        user.role === "quality check"
                                      ))
                                  }
                                >
                                  Forward
                                </Button>
                              </Popconfirm>
                            )}
                          </>
                        )}

                        {userRole.role === "production team" &&
                          order.order_status === "production team" && (
                            <Button
                              size="middle"
                              onClick={() => showVendorAssignmentModal(order)}
                              className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                            >
                              Assign Vendor
                            </Button>
                          )}

                        <Button
                          size="middle"
                          icon={<FiEye />}
                          onClick={() =>
                            navigation("/order_explore", { state: order._id })
                          }
                        >
                          Details
                        </Button>
                      </div>

                      {order.assigned_vendor ? (
                        <div className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full flex items-center">
                          <FiUser className="mr-1" />
                          <span>Vendor: {order.assigned_vendor.name}</span>
                          {order.quality_rating && (
                            <Rate
                              disabled
                              defaultValue={order.quality_rating}
                              className="ml-2"
                              size="small"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-sm bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full">
                          <FiUser className="inline mr-1" />
                          No vendor assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order footer with quick info */}
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                  <Row gutter={16}>
                    <Col span={6}>
                      <div className="text-xs text-gray-500">Product</div>
                      <div className="text-sm font-medium truncate">
                        {_.get(order, "cart_items.product_name", "N/A")}
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="text-xs text-gray-500">Quantity</div>
                      <div className="text-sm font-medium">
                        {_.get(order, "cart_items.product_quantity", "N/A")}
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="text-xs text-gray-500">Payment</div>
                      <div className="text-sm font-medium">
                        {_.get(order, "payment_type", "N/A")}
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="text-xs text-gray-500">Delivery</div>
                      <div className="text-sm font-medium truncate">
                        {_.get(order, "delivery_address.city", "N/A")}
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-lg shadow-sm"
          >
            <FiPackage className="text-4xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg text-gray-500 mb-2">No orders found</h3>
            <p className="text-gray-400">
              Try changing your filters or search query
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Vendor Assignment Modal */}
      <Modal
        title="Assign Vendor to Order"
        open={isModalVisible}
        onOk={handleVendorAssignment}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleVendorAssignment}
            className="bg-blue-500 hover:bg-blue-600 border-0"
          >
            Assign Vendor
          </Button>,
        ]}
      >
        {currentOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">{currentOrder.invoice_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Product</p>
                <p className="font-medium">
                  {_.get(currentOrder, "cart_items.product_name", "N/A")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">
                  {_.get(currentOrder, "user_details[0].name", "N/A")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">
                  {_.get(currentOrder, "cart_items.product_quantity", "N/A")}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Select Vendor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {vendors.map((vendor) => (
                  <motion.div
                    key={vendor._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedVendor === vendor._id
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedVendor(vendor._id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium">{vendor.name}</h5>
                        <p className="text-sm text-gray-600">{vendor.email}</p>
                      </div>
                      {selectedVendor === vendor._id && (
                        <Tag color="blue">Selected</Tag>
                      )}
                    </div>
                    <div className="mt-2 text-sm space-y-1">
                      <p className="flex items-center">
                        <FiMapPin className="mr-2 text-gray-400" />
                        {vendor.address || "Address not specified"}
                      </p>
                      <p className="flex items-center">
                        <FiPhone className="mr-2 text-gray-400" />
                        {vendor.phone || "Phone not specified"}
                      </p>
                      <p>Specialization: {vendor.specialization || "N/A"}</p>
                      <p>Capacity: {vendor.capacity || "N/A"} orders/day</p>
                      {vendor.rating && (
                        <div className="flex items-center">
                          <span className="mr-2">Rating:</span>
                          <Rate
                            disabled
                            defaultValue={vendor.rating}
                            size="small"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Design Team Modal */}
      <Modal
        title="Design Team - Submit Design Details"
        open={isDesignModalVisible}
        onCancel={() => setIsDesignModalVisible(false)}
        footer={null}
        width={600}
      >
        {currentOrder && (
          <Form
            form={designForm}
            layout="vertical"
            onFinish={handleDesignSubmit}
          >
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Order ID">
                  {currentOrder.invoice_no}
                </Descriptions.Item>
                <Descriptions.Item label="Product">
                  {_.get(currentOrder, "cart_items.product_name", "N/A")}
                </Descriptions.Item>
                <Descriptions.Item label="Customer">
                  {_.get(currentOrder, "user_details[0].name", "N/A")}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <Form.Item
              label="Design Start Time"
              name="design_start_time"
              rules={[{ required: true, message: "Please select start time" }]}
            >
              <DatePicker showTime className="w-full" />
            </Form.Item>

            <Form.Item
              label="Design End Time"
              name="design_end_time"
              rules={[{ required: true, message: "Please select end time" }]}
            >
              <DatePicker showTime className="w-full" />
            </Form.Item>

            <Form.Item
              label="Design File"
              name="design_file"
              valuePropName="fileList"
              getValueFromEvent={(e) => e.fileList}
              rules={[{ required: true, message: "Please upload design file" }]}
            >
              <Upload
                listType="picture-card"
                beforeUpload={() => false} // Prevent automatic upload
                maxCount={1}
              >
                {uploadButton}
              </Upload>
            </Form.Item>

            <Form.Item>
              <div className="flex justify-end space-x-3">
                <Button onClick={() => setIsDesignModalVisible(false)}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="bg-blue-500 hover:bg-blue-600 border-0"
                >
                  Submit Design & Forward to Production
                </Button>
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Quality Check Modal */}
      <Modal
        title="Quality Check - Rate Vendor"
        open={isQualityModalVisible}
        onCancel={() => setIsQualityModalVisible(false)}
        footer={null}
        width={500}
      >
        {currentOrder && (
          <Form
            form={qualityForm}
            layout="vertical"
            onFinish={handleQualitySubmit}
          >
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Order ID">
                  {currentOrder.invoice_no}
                </Descriptions.Item>
                <Descriptions.Item label="Product">
                  {_.get(currentOrder, "cart_items.product_name", "N/A")}
                </Descriptions.Item>
                <Descriptions.Item label="Vendor">
                  {currentOrder.assigned_vendor
                    ? currentOrder.assigned_vendor.name
                    : "Not assigned"}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <Form.Item
              label="Quality Rating"
              name="rating"
              rules={[{ required: true, message: "Please rate the vendor" }]}
            >
              <Rate />
            </Form.Item>

            <Form.Item label="Notes" name="notes">
              <TextArea
                rows={4}
                placeholder="Add any notes about quality check"
              />
            </Form.Item>

            <Form.Item>
              <div className="flex justify-end space-x-3">
                <Button onClick={() => setIsQualityModalVisible(false)}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="bg-blue-500 hover:bg-blue-600 border-0"
                >
                  Submit Rating & Forward to Packing
                </Button>
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Orders;