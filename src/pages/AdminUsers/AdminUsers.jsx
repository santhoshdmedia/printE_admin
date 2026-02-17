import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Card,
  Form,
  Space,
  Typography,
  Checkbox,
  Divider,
  Row,
  Col,
} from "antd";
import {
  FaEdit,
  FaKey,
  FaUserPlus,
  FaUserCog,
  FaTrashAlt,
  FaRupeeSign,
  FaEye,
  FaUserShield,
  FaLock,
} from "react-icons/fa";
import {
  FiUsers,
  FiBox,
  FiClipboard,
  FiPackage,
  FiTruck,
  FiCheck,
} from "react-icons/fi";
import { addAdmin, deleteAdmin, getAdmin, updateAdmin } from "../../api/index";
import _ from "lodash";
import {
  ERROR_NOTIFICATION,
  SUCCESS_NOTIFICATION,
} from "../../helper/notification_helper";

const { Title, Text } = Typography;
const { Option } = Select;

const AVAILABLE_PAGES = [
  { name: "Dashboard", value: "dashboard", hasActions: false },
  { name: "Orders", value: "orders", hasActions: true },
  { name: "Cancelled Orders", value: "cancelled-orders", hasActions: true },
  { name: "Categories", value: "categories", hasActions: true },
  { name: "Main Category", value: "main-category", hasActions: true },
  { name: "Sub Category", value: "sub-category", hasActions: true },
  { name: "Products", value: "product-details", hasActions: true },
  { name: "Vendor Products", value: "Vendor-product-details", hasActions: true },
  { name: "Homepage", value: "homepage", hasActions: false },
  { name: "Banners", value: "banners", hasActions: true },
  { name: "Product Section", value: "product-section", hasActions: true },
  { name: "Coupons", value: "coupons", hasActions: true },
  { name: "Admin Users", value: "admin-users", hasActions: true },
  { name: "Customers", value: "client-users", hasActions: true },
  { name: "BNI", value: "BNI", hasActions: true },
  { name: "Vendors", value: "vendors", hasActions: true },
  { name: "Blogs", value: "blogs", hasActions: true },
  { name: "Review", value: "review", hasActions: true },
  { name: "Enquires", value: "enquires", hasActions: true },
  { name: "Bulk Enquires", value: "bulk-enquires", hasActions: true },
  { name: "Settings", value: "settings", hasActions: true },
];

const AdminUsers = () => {
  const [adminUsersData, setAdminUsersData] = useState([]);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalType, setModalType] = useState("Add");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [pagePermissions, setPagePermissions] = useState({});

  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
    pagePermissions: [],
  });

  const { confirm } = Modal;

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCloseModal = () => {
    setModalStatus(false);
    setModalType("Add");
    form.resetFields();
    setPagePermissions({});
    setAddUserForm({
      _id: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "",
      pagePermissions: [],
    });
  };

  const deleteUserConfirm = (record) => {
    confirm({
      title: "Confirm Deletion",
      content: `Are you sure you want to delete ${capitalizeWords(
        record.name
      )}?`,
      icon: <FaTrashAlt style={{ color: "#ff4d4f" }} />,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      async onOk() {
        try {
          const result = await deleteAdmin(record._id);
          SUCCESS_NOTIFICATION(result);
          fetchAdminData();
        } catch (error) {
          ERROR_NOTIFICATION(error);
        }
      },
      onCancel() {},
    });
  };

  const handleOkModal = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);

      // Convert pagePermissions object to array
      const pagePermissionsArray = Object.entries(pagePermissions).map(
        ([pageName, permissions]) => ({
          pageName,
          canView: permissions.canView || false,
          canEdit: permissions.canEdit || false,
          canDelete: permissions.canDelete || false,
        })
      );

      const userData = {
        ...values,
        pagePermissions: pagePermissionsArray,
      };

      let result;
      if (modalType === "Add") {
        result = await addAdmin(userData);
      } else if (modalType === "Edit") {
        result = await updateAdmin({ ...userData, _id: addUserForm._id });
      } else {
        result = await updateAdmin({
          _id: addUserForm._id,
          email: addUserForm.email,
          password: values.password,
        });
      }

      SUCCESS_NOTIFICATION(result);
      setConfirmLoading(false);
      handleCloseModal();
      fetchAdminData();
    } catch (error) {
      console.error("Error processing admin data:", error);
      if (error.errorFields) {
        ERROR_NOTIFICATION("Please fill all required fields correctly");
      } else {
        ERROR_NOTIFICATION(error);
      }
      setConfirmLoading(false);
    }
  };

  const handleEditDetails = (record) => {
    setAddUserForm(record);
    form.setFieldsValue({
      ...record,
    });

    // Convert pagePermissions array to object for easier management
    const permissionsObj = {};
    if (record.pagePermissions && record.pagePermissions.length > 0) {
      record.pagePermissions.forEach((perm) => {
        permissionsObj[perm.pageName] = {
          canView: perm.canView,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
        };
      });
    }
    setPagePermissions(permissionsObj);

    setModalStatus(true);
    setModalType("Edit");
  };

  const handleEditPassword = (record) => {
    setAddUserForm(record);
    form.setFieldsValue({ password: "" });
    setModalStatus(true);
    setModalType("Edit Password");
  };

  const handleAddNewUser = () => {
    setAddUserForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "",
      pagePermissions: [],
    });
    form.resetFields();
    setPagePermissions({});
    setModalStatus(true);
    setModalType("Add");
  };

  const capitalizeWords = (str) => {
    if (!str) return "";
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const result = await getAdmin();
      setAdminUsersData(_.get(result, "data.data", []));
    } catch (error) {
      console.error("Error fetching admin data:", error);
      ERROR_NOTIFICATION(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (pageName, permissionType, value) => {
    setPagePermissions((prev) => ({
      ...prev,
      [pageName]: {
        ...prev[pageName],
        [permissionType]: value,
        // If unchecking view, uncheck edit and delete too
        ...(permissionType === "canView" && !value
          ? { canEdit: false, canDelete: false }
          : {}),
      },
    }));
  };

  const handleSelectAllPages = (checked) => {
    const allPermissions = {};
    AVAILABLE_PAGES.forEach((page) => {
      allPermissions[page.value] = {
        canView: checked,
        canEdit: checked && page.hasActions,
        canDelete: checked && page.hasActions,
      };
    });
    setPagePermissions(allPermissions);
  };

  // Role configuration with colors and icons
  const roleConfig = {
    "Frontend admin": { color: "red", icon: <FaUserCog /> },
    "Backend admin": { color: "red", icon: <FaUserCog /> },
    "accounting team": { color: "#1890ff", icon: <FaRupeeSign /> },
    "designing team": { color: "#722ed1", icon: <FiUsers /> },
    "production team": { color: "#faad14", icon: <FiBox /> },
    "quality check": { color: "#13c2c2", icon: <FiClipboard /> },
    "packing team": { color: "#52c41a", icon: <FiPackage /> },
    "delivery team": { color: "#52c41a", icon: <FiTruck /> },
    completed: { color: "#52c41a", icon: <FiCheck /> },
  };

  const columns = [
    {
      title: "S.No",
      key: "sno",
      align: "center",
      width: 70,
      render: (text, record, index) => <Text>{index + 1}</Text>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{capitalizeWords(text)}</Text>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Mobile Number",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => {
        const config = roleConfig[role] || { color: "purple", icon: null };
        return (
          <Tag
            color={config.color}
            icon={config.icon}
            key={role}
            className="flex items-center gap-2 w-fit"
          >
            {capitalizeWords(role)}
          </Tag>
        );
      },
      filters: [
        { text: "Super Admin", value: "super admin" },
        { text: "Frontend Admin", value: "Frontend admin" },
        { text: "Backend Admin", value: "Backend admin" },
        { text: "Accounting Team", value: "accounting team" },
        { text: "Designing Team", value: "designing team" },
        { text: "Production Team", value: "production team" },
        { text: "Quality Check", value: "quality check" },
        { text: "Packing Team", value: "packing team" },
        { text: "Delivery Team", value: "delivery team" },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: "Page Access",
      key: "pageAccess",
      width: 120,
      render: (text, record) => {
        const accessCount = record.pagePermissions?.filter(p => p.canView).length || 0;
        return (
          <Tag color="blue">
            {record.role === "super admin" ? "All Pages" : `${accessCount} Pages`}
          </Tag>
        );
      },
    },
    {
      title: "Password",
      key: "password",
      align: "center",
      width: 100,
      render: (text, record) => {
        return (
          record.role !== "super admin" && (
            <Button
              type="text"
              icon={<FaKey />}
              onClick={() => handleEditPassword(record)}
              style={{ color: "#52c41a" }}
            />
          )
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 150,
      render: (text, record) => {
        return (
          <Space>
            <Button
              type="text"
              icon={<FaEdit />}
              onClick={() => handleEditDetails(record)}
              style={{ color: "#1890ff" }}
            />
            {record.role !== "super admin" && (
              <Button
                type="text"
                icon={<FaTrashAlt />}
                onClick={() => deleteUserConfirm(record)}
                style={{ color: "#ff4d4f" }}
              />
            )}
          </Space>
        );
      },
    },
  ];

  const rolesForSelect = Object.entries(roleConfig).map(([role, config]) => ({
    value: role,
    label: (
      <Space>
        {config.icon}
        {capitalizeWords(role)}
      </Space>
    ),
  }));

  // Add "super admin" to roles if not present
  if (!rolesForSelect.find(r => r.value === "super admin")) {
    rolesForSelect.unshift({
      value: "super admin",
      label: (
        <Space>
          <FaUserShield />
          Super Admin
        </Space>
      ),
    });
  }

  return (
    <div style={{ padding: "24px" }}>
      <Card
        bordered={false}
        title={
          <Space>
            <FaUserCog style={{ fontSize: "20px" }} />
            <Title level={2} style={{ margin: 0 }}>
              Admin Users
            </Title>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<FaUserPlus />}
            onClick={handleAddNewUser}
            size="large"
          >
            Add New User
          </Button>
        }
        style={{
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <Table
          loading={loading}
          dataSource={adminUsersData}
          columns={columns}
          rowKey="_id"
          pagination={{
            position: ["bottomRight"],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        open={modalStatus}
        confirmLoading={confirmLoading}
        onOk={handleOkModal}
        onCancel={handleCloseModal}
        okText={`${modalType === "Add" ? "Create" : "Update"} User`}
        cancelText="Cancel"
        title={
          <Space>
            {modalType === "Add" ? <FaUserPlus /> : <FaEdit />}
            <Title level={4} style={{ margin: 0 }}>
              {modalType} User
            </Title>
          </Space>
        }
        width={700}
        style={{ borderRadius: "8px" }}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: "20px" }}
          initialValues={addUserForm}
        >
          {modalType !== "Edit Password" ? (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Name"
                    name="name"
                    rules={[
                      { required: true, message: "Please input the name!" },
                    ]}
                  >
                    <Input placeholder="Enter full name" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: "Please input the email!" },
                      { type: "email", message: "Please enter a valid email!" },
                    ]}
                  >
                    <Input placeholder="Enter email address" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                {modalType === "Add" && (
                  <Col span={12}>
                    <Form.Item
                      label="Password"
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Please input the password!",
                        },
                      ]}
                    >
                      <Input.Password
                        placeholder="Enter password"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                )}
                <Col span={modalType === "Add" ? 12 : 12}>
                  <Form.Item
                    label="Mobile Number"
                    name="phone"
                    rules={[
                      {
                        required: true,
                        message: "Please input the mobile number!",
                      },
                    ]}
                  >
                    <Input placeholder="Enter mobile number" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Role"
                    name="role"
                    rules={[
                      { required: true, message: "Please select a role!" },
                    ]}
                  >
                    <Select
                      placeholder="Select role"
                      size="large"
                      options={rolesForSelect}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>
                <Space>
                  <FaLock />
                  Page Access Permissions
                </Space>
              </Divider>

              <div style={{ marginBottom: 16 }}>
                <Checkbox
                  onChange={(e) => handleSelectAllPages(e.target.checked)}
                  checked={
                    Object.keys(pagePermissions).length ===
                      AVAILABLE_PAGES.length &&
                    Object.values(pagePermissions).every((p) => p.canView)
                  }
                >
                  <Text strong>Select All Pages</Text>
                </Checkbox>
              </div>

              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                {AVAILABLE_PAGES.map((page) => {
                  const permission = pagePermissions[page.value] || {
                    canView: false,
                    canEdit: false,
                    canDelete: false,
                  };

                  return (
                    <Card
                      key={page.value}
                      size="small"
                      style={{ marginBottom: 12 }}
                      bodyStyle={{ padding: "12px 16px" }}
                    >
                      <Row align="middle" gutter={16}>
                        <Col span={8}>
                          <Text strong>{page.name}</Text>
                        </Col>
                        <Col span={16}>
                          <Space size="large">
                            <Checkbox
                              checked={permission.canView}
                              onChange={(e) =>
                                handlePermissionChange(
                                  page.value,
                                  "canView",
                                  e.target.checked
                                )
                              }
                            >
                              <Space>
                                <FaEye style={{ color: "#1890ff" }} />
                                View
                              </Space>
                            </Checkbox>

                            {page.hasActions && (
                              <>
                                <Checkbox
                                  checked={permission.canEdit}
                                  disabled={!permission.canView}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      page.value,
                                      "canEdit",
                                      e.target.checked
                                    )
                                  }
                                >
                                  <Space>
                                    <FaEdit style={{ color: "#faad14" }} />
                                    Edit
                                  </Space>
                                </Checkbox>

                                <Checkbox
                                  checked={permission.canDelete}
                                  disabled={!permission.canView}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      page.value,
                                      "canDelete",
                                      e.target.checked
                                    )
                                  }
                                >
                                  <Space>
                                    <FaTrashAlt style={{ color: "#ff4d4f" }} />
                                    Delete
                                  </Space>
                                </Checkbox>
                              </>
                            )}
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </div>

              <Text
                type="secondary"
                style={{ fontSize: "12px", display: "block", marginTop: 16 }}
              >
                <FaUserShield style={{ marginRight: 4 }} />
                Note: Super admin role automatically gets full access to all
                pages
              </Text>
            </>
          ) : (
            <Form.Item
              label="New Password"
              name="password"
              rules={[
                { required: true, message: "Please input the new password!" },
              ]}
            >
              <Input.Password placeholder="Enter new password" size="large" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;