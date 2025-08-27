import React, { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, DatePicker, Modal, Popconfirm, Select, Space, Tag, Tooltip, message } from "antd";
// import { IoIosArrowRoundForward, MdDone } from "react-icons";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { 
  collectallorders, 
  updateorderstatus, 
  getSingleVendor, 
  getAllVendor,
  // assignVendorToOrder 
} from "../../api";
import _ from "lodash";
import CustomTable from "../../components/CustomTable";
import moment from "moment";
import xlsx from "json-as-xlsx";
import { ICON_HELPER } from "../../helper/iconhelper";

const Orders = () => {
  // State management
  const { user } = useSelector((state) => state.authSlice);
  const [orderData, setOrderData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [date_filter, setDateFilter] = useState("");
  const [order_status, setOrderStatus] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const navigation = useNavigate();

  // Status flow configuration
  const statusFlow = [
    { key: "1", label: "placed" },
    { key: "2", label: "accounting team" },
    { key: "3", label: "designing team" },
    { key: "4", label: "production team" },
    { key: "5", label: "delivery team" },
    { key: "6", label: "out For Delivery" },
    { key: "7", label: "completed" },
  ];

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const searchData = { search, date_filter, order_status };
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
  }, [search, date_filter, order_status]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const userRole = JSON.parse(localStorage.getItem("userprofile"));
      await updateorderstatus({
        order_id: orderId,
        order_status: newStatus,
        member_id: userRole._id
      });
      return true;
    } catch (err) {
      console.error("Error updating status:", err);
      return false;
    }
  };

  // Handle status transition
  const handleStatusChange = async (orderId, currentStatus) => {
    const currentIndex = statusFlow.findIndex(item => item.label === currentStatus);
    const nextStatus = statusFlow[currentIndex + 1]?.label;

    if (!nextStatus) {
      message.info("Order is already in the final status");
      return;
    }

    const success = await updateOrderStatus(orderId, nextStatus);
    if (success) {
      setOrderData(prev => prev.map(order => 
        order._id === orderId ? { ...order, order_status: nextStatus } : order
      ));
      message.success(`Order forwarded to '${nextStatus}'`);
    } else {
      message.error("Failed to forward order");
    }
  };

  // Vendor assignment functions
  const fetchVendorsForOrder = async (order) => {
    try {
      setLoading(true);
      const [allVendorsResponse, ...assignedVendors] = await Promise.all([
        getAllVendor(),
        ..._.get(order, 'vendor_details', []).map(v => 
          getSingleVendor(v._id).catch(() => null)
        )
      ]);

      const availableVendors = _.get(allVendorsResponse, 'data.data', []);
      const filteredAssignedVendors = assignedVendors.filter(v => v);
      
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



  // Table columns configuration
  const columns = [
    {
      title: "S. No",
      align: "center",
      width: 100,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Invoice No.",
      dataIndex: "invoice_no",
      align: "center",
    },
    {
      title: "Amount",
      dataIndex: "cart_items",
      width: 150,
      render: (amount) => <div className="!font-medium !text-primary">₹ {_.get(amount, "product_price", "")}</div>,
    },
    {
      title: "Order Status",
      dataIndex: "order_status",
      align: "center",
      render: (status) => (
        <Tag color="blue-inverse" className="!min-w-[100px]">
          {status}
        </Tag>
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      align: "left",
      render: (method) => (
        <Tooltip title={method === "cash-on-payment" ? "Cash on delivery" : "Online payment"}>
          <span>{method === "cash-on-payment" ? "COD" : "ONLINE"}</span>
        </Tooltip>
      ),
    },
    {
      title: "User",
      dataIndex: "user_details",
      align: "left",
      render: (details) => (
        <Tooltip title={_.get(details[0], "name", "N/A")}>
          <span className="font-medium line-clamp-1">
            {_.get(details[0], "name", "N/A")}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Vendor",
      dataIndex: "assigned_vendor",
      align: "left",
      render: (vendor) => (
        <Tooltip title={vendor ? _.get(vendor, "name", "N/A") : "Not assigned"}>
          <span className="font-medium line-clamp-1">
            {vendor ? _.get(vendor, "name", "N/A") : "Not assigned"}
          </span>
        </Tooltip>
      ),
    },
    ...(user.role !== "super admin" ? [{
      title: "Edit Status",
      align: "left",
      render: (_, record) => {
        const currentIndex = statusFlow.findIndex(item => item.label === record.order_status);
        const nextStatus = statusFlow[currentIndex + 1]?.label;
        const isAuthorized = user.role.toLowerCase() === record.order_status.toLowerCase();

        if (!nextStatus) {
          return (
            <Tag color="green" className="flex items-center gap-2">
              Completed 
            </Tag>
          );
        }

        return isAuthorized ? (
          <Popconfirm
            title={`Forward to ${nextStatus}?`}
            onConfirm={() => handleStatusChange(record._id, record.order_status)}
          >
            <Tag className="cursor-pointer bg-green-700 text-white flex items-center gap-2 hover:bg-green-200 hover:border-green-500 hover:text-green-700">
              Forward to {nextStatus} 
            </Tag>
          </Popconfirm>
        ) : (
          <Tooltip title={`Pending ${record.order_status}`}>
            <div className="bg-red-300 !line-clamp-1 !w-[150px] text-sm px-2">
              Pending {record.order_status}
            </div>
          </Tooltip>
        );
      }
    }] : []),
    {
      title: "Assign Vendor",
      align: "center",
      render: (_, record) => (
        <Button 
          type="primary" 
          onClick={() => showVendorAssignmentModal(record)}
          disabled={record.order_status !== "production team"}
        >
          Assign Vendor
        </Button>
      ),
    },
    {
      title: "View Details",
      align: "center",
      render: (record) => (
        <Button
          type="link"
          onClick={() => navigation("/order_explore", { state: record._id })}
        >
          View
        </Button>
      ),
    }
  ];

  // Export to Excel functionality
  const exportToExcel = () => {
    const columns = [
      { label: "Order ID", value: "_id" },
      { label: "Invoice", value: "invoice_no" },
      { label: "Status", value: "order_status" },
      { label: "Customer", value: "user_details[0].name" },
      { label: "Vendor", value: "assigned_vendor.name" },
      { label: "Amount", value: "cart_items.product_price" }
    ];

    try {
      xlsx([{
        sheet: "Orders",
        columns,
        content: orderData.map(order => ({
          ...order,
          createdAt: moment(order.createdAt).format("YYYY-MM-DD")
        }))
      }], {
        fileName: "Orders_Export",
        writeMode: "writeFile"
      });
    } catch (err) {
      console.error("Export error:", err);
      message.error("Failed to export data");
    }
  };

  return (
    <div className="p-4">
      <DefaultTile title="Order Management" setSearch={setSearch} searchable />
      
      <div className="flex flex-wrap gap-4 my-4">
        <DatePicker.RangePicker
          className="w-full md:w-auto"
          onChange={setDateFilter}
          format="DD-MM-YYYY"
        />
        <Select
          className="w-full md:w-64"
          placeholder="Filter by status"
          options={statusFlow.map(status => ({
            label: _.startCase(status.label),
            value: status.label
          }))}
          onChange={setOrderStatus}
          allowClear
        />
        <Button 
          type="primary" 
          onClick={exportToExcel}
          icon={<ICON_HELPER.EXCELICON />}
        >
          Export
        </Button>
      </div>

      <CustomTable
        loading={loading}
        dataSource={orderData}
        columns={columns}
        rowKey="_id"
        scroll={{ x: true }}
      />

      {/* Vendor Assignment Modal */}
      <Modal
        title="Assign Vendor"
        open={isModalVisible}
        onOk={handleVendorAssignment}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={800}
      >
        {currentOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">{currentOrder._id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Product</p>
                <p className="font-medium">
                  {_.get(currentOrder, "cart_items.product_name", "N/A")}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Select Vendor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {vendors.map(vendor => (
                  <div
                    key={vendor._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedVendor === vendor._id 
                        ? "border-blue-500 bg-blue-50" 
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedVendor(vendor._id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium">{vendor.name}</h5>
                        <p className="text-sm text-gray-600">{vendor.email}</p>
                      </div>
                      {selectedVendor === vendor._id && (
                        <Tag color="blue">Selected</Tag>
                      )}
                    </div>
                    <div className="mt-2 text-sm">
                      <p>Specialization: {vendor.specialization || "N/A"}</p>
                      <p>Capacity: {vendor.capacity || "N/A"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;