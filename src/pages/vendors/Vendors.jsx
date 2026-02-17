import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button, Form, Image, Input, Modal, Popconfirm, Checkbox, Spin, Card, Tag, Divider, Tooltip } from "antd";
import { 
  UserOutlined, 
  ShopOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  EnvironmentOutlined,
  IdcardOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  LockOutlined
} from "@ant-design/icons";
import { formValidation } from "../../helper/formvalidation";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import CustomLabel from "../../components/CustomLabel";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { addVendor, editVendor, getAllVendor, deleteVendor } from "../../api";
import _ from "lodash";
import CustomTable from "../../components/CustomTable";
import { Link } from "react-router-dom";
import { canEditPage, canDeletePage, isSuperAdmin } from "../../helper/permissionHelper";

const { TextArea } = Input;

const Vendors = () => {
  const { user } = useSelector((state) => state.authSlice);
  const [search, setSearch] = useState(null);
  const [formStatus, setFormStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image_path, setImagePath] = useState(false);
  const [id, setId] = useState("");
  const [allVendors, setAllVendors] = useState([]);
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [form] = Form.useForm();

  // Check permissions
  const hasEditPermission = isSuperAdmin(user.role) || canEditPage(user.pagePermissions, "vendors");
  const hasDeletePermission = isSuperAdmin(user.role) || canDeletePage(user.pagePermissions, "vendors");

  const generateUniqueCode = () => {
    if (allVendors.length === 0) return "pev0001";
    
    const codes = allVendors.map(v => v.unique_code).filter(code => code && code.startsWith('pev'));
    const numbers = codes.map(code => parseInt(code.replace('pev', ''), 10));
    const maxNumber = numbers.length ? Math.max(...numbers) : 0;
    return `pev${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const handleFinish = async (values) => {
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to modify vendors" });
      return;
    }

    try {
      setLoading(true);
      values.vendor_image = image_path;
      
      if (sameAsBilling) {
        values.shipping_address = values.billing_address;
      }
      values.password = values.vendor_contact_number;

      let result = "";

      if (id) {
        result = await editVendor(values, id);
      } else {
        result = await addVendor(values);
      }
      form.resetFields();
      handleCancel();
      SUCCESS_NOTIFICATION(result);
      setFormStatus(false);
      collectVendors();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormStatus(false);
    setId("");
    setImagePath(null);
    setSameAsBilling(false);
    form.resetFields();
  };

  const collectVendors = async () => {
    try {
      setLoading(true);
      const result = await getAllVendor(search);
      setAllVendors(_.get(result, "data.data", []));
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    collectVendors();
  }, [search]);

  useEffect(() => {
    if (formStatus && !id) {
      form.setFieldsValue({ unique_code: generateUniqueCode() });
    }
  }, [formStatus, allVendors]);

  const handleEdit = (res) => {
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to edit vendors" });
      return;
    }

    try {
      form.setFieldsValue(res);
      setId(res?._id);
      setFormStatus(true);
      setImagePath(res?.vendor_image);
      setSameAsBilling(res?.shipping_address === res?.billing_address);
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };

  const handleDelete = async (vendorId) => {
    if (!hasDeletePermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to delete vendors" });
      return;
    }

    try {
      setLoading(true);
      const result = await deleteVendor(vendorId);
      SUCCESS_NOTIFICATION(result);
      collectVendors();
    } catch (err) {
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = () => {
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to add vendors" });
      return;
    }
    setFormStatus(true);
  };

  const columns = [
    {
      title: "S.No",
      render: (_, __, index) => (
        <div className="text-center font-semibold text-gray-600">{index + 1}</div>
      ),
      width: 70,
    },
    {
      title: "Unique Code",
      dataIndex: "unique_code",
      render: (code) => (
        <Tag color="blue" className="font-mono font-semibold">
          {code}
        </Tag>
      ),
    },
    {
      title: "Vendor Name",
      dataIndex: "vendor_name",
      render: (name) => (
        <div className="font-medium text-gray-800">{name}</div>
      ),
    },
    {
      title: "Business Name",
      dataIndex: "business_name",
      render: (name) => (
        <div className="text-gray-700">{name}</div>
      ),
    },
    {
      title: "Email",
      dataIndex: "vendor_email",
      render: (email) => (
        <div className="text-gray-600 text-sm">{email}</div>
      ),
    },
    {
      title: "Contact",
      dataIndex: "vendor_contact_number",
      render: (contact) => (
        <div className="text-gray-600 text-sm">{contact}</div>
      ),
    },
    {
      title: "Actions",
      render: (data) => (
        <div className="flex items-center gap-2">
          {hasEditPermission ? (
            <Tooltip title="Edit Vendor">
              <Button
                icon={<EditOutlined />}
                onClick={() => handleEdit(data)}
                className="text-green-600 border-green-200 hover:bg-green-50"
                size="small"
              >
                Edit
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="No permission to edit">
              <Button
                icon={<LockOutlined />}
                disabled
                size="small"
              >
                Edit
              </Button>
            </Tooltip>
          )}

          {hasDeletePermission ? (
            <Tooltip title="Delete Vendor">
              <Popconfirm
                title="Delete Vendor"
                description="Are you sure you want to delete this vendor?"
                onConfirm={() => handleDelete(data._id)}
                okText="Yes, Delete"
                okType="danger"
                cancelText="No"
              >
                <Button
                  icon={<DeleteOutlined />}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  size="small"
                >
                  Delete
                </Button>
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title="No permission to delete">
              <Button
                icon={<LockOutlined />}
                disabled
                size="small"
              >
                Delete
              </Button>
            </Tooltip>
          )}

          <Tooltip title="View Vendor Details">
            <Link to={`/vendor_details/${data?._id}`}>
              <Button
                icon={<EyeOutlined />}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                size="small"
              >
                View
              </Button>
            </Link>
          </Tooltip>
        </div>
      ),
      width: 250,
    },
  ];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Card
        title={
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Vendor Management
            </h2>
            {hasEditPermission ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddVendor}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Add Vendor
              </Button>
            ) : (
              <Tooltip title="No permission to add vendors">
                <Button
                  icon={<LockOutlined />}
                  disabled
                >
                  Add Vendor
                </Button>
              </Tooltip>
            )}
          </div>
        }
        className="rounded-lg shadow-sm border-0"
      >
        {/* Permission Warning */}
        {!hasEditPermission && !hasDeletePermission && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium flex items-center gap-2">
              <LockOutlined />
              You have view-only access to vendors. Contact an administrator to request edit permissions.
            </p>
          </div>
        )}

        <div className="mb-4 flex justify-between items-center">
          <Input.Search
            placeholder="Search vendors..."
            allowClear
            onSearch={setSearch}
            className="w-64"
            size="large"
          />
          <div className="text-sm text-gray-500">
            Total Vendors:{" "}
            <span className="font-semibold text-gray-800">
              {allVendors.length}
            </span>
          </div>
        </div>

        <CustomTable
          dataSource={allVendors}
          loading={loading}
          columns={columns}
          scroll={{ x: 1000 }}
          rowClassName="hover:bg-gray-50"
        />

        {/* Modal only renders with edit permission */}
        {hasEditPermission && (
          <Modal
            open={formStatus}
            footer={null}
            closable={true}
            width={800}
            title={
              <div className="text-lg font-semibold">
                {id ? "Update Vendor" : "Add New Vendor"}
              </div>
            }
            onCancel={handleCancel}
            className="rounded-lg"
            bodyStyle={{ padding: "24px" }}
            destroyOnClose
          >
            <Spin spinning={loading}>
              <Form
                layout="vertical"
                form={form}
                onFinish={handleFinish}
                className="vendor-form"
              >
                <div className="flex gap-6 mb-6">
                  <div className="w-full grid grid-cols-2 gap-4">
                    <Form.Item
                      label={<span className="font-semibold text-gray-700">Unique Code</span>}
                      name="unique_code"
                      tooltip="Automatically generated"
                    >
                      <Input
                        prefix={<IdcardOutlined className="text-gray-400" />}
                        className="h-10"
                        readOnly
                      />
                    </Form.Item>

                    <Form.Item
                      label={<span className="font-semibold text-gray-700">Business Name</span>}
                      name="business_name"
                      rules={[formValidation("Enter Business Name")]}
                    >
                      <Input
                        prefix={<ShopOutlined className="text-gray-400" />}
                        className="h-10"
                        placeholder="Enter Business Name"
                      />
                    </Form.Item>
                  </div>
                </div>

                <Divider className="my-4">
                  <span className="text-gray-500 text-sm font-medium">
                    Contact Information
                  </span>
                </Divider>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Vendor Name</span>}
                    name="vendor_name"
                    rules={[formValidation("Enter Vendor Name")]}
                  >
                    <Input
                      prefix={<UserOutlined className="text-gray-400" />}
                      className="h-10"
                      placeholder="Enter Vendor Name"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Email</span>}
                    name="vendor_email"
                    rules={[formValidation("Enter Vendor Email")]}
                  >
                    <Input
                      prefix={<MailOutlined className="text-gray-400" />}
                      className="h-10"
                      placeholder="Enter Vendor Email"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Contact Number</span>}
                    name="vendor_contact_number"
                    rules={[formValidation("Enter Vendor Contact Number")]}
                  >
                    <Input
                      prefix={<PhoneOutlined className="text-gray-400" />}
                      className="h-10"
                      placeholder="Enter Contact Number"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Alternate Contact</span>}
                    name="alternate_vendor_contact_number"
                  >
                    <Input
                      prefix={<PhoneOutlined className="text-gray-400" />}
                      className="h-10"
                      placeholder="Enter Alternate Contact"
                    />
                  </Form.Item>
                </div>

                <Divider className="my-4">
                  <span className="text-gray-500 text-sm font-medium">
                    Address Information
                  </span>
                </Divider>

                <Form.Item
                  label={<span className="font-semibold text-gray-700">Billing Address</span>}
                  name="billing_address"
                  rules={[formValidation("Enter Billing Address")]}
                >
                  <TextArea
                    rows={3}
                    placeholder="Enter complete billing address"
                    className="rounded-md"
                  />
                </Form.Item>

                <Form.Item>
                  <Checkbox
                    checked={sameAsBilling}
                    onChange={(e) => setSameAsBilling(e.target.checked)}
                    className="mb-4 font-medium text-gray-700"
                  >
                    Shipping address same as billing address
                  </Checkbox>
                </Form.Item>

                {!sameAsBilling && (
                  <Form.Item
                    label={<span className="font-semibold text-gray-700">Shipping Address</span>}
                    name="shipping_address"
                    rules={[formValidation("Enter Shipping Address")]}
                  >
                    <TextArea
                      rows={3}
                      placeholder="Enter complete shipping address"
                      className="rounded-md"
                    />
                  </Form.Item>
                )}

                <Divider className="my-4" />

                <Form.Item className="mb-0">
                  <div className="flex gap-3 justify-end">
                    <Button
                      onClick={handleCancel}
                      className="h-11 px-6 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      className="h-11 px-6 font-medium bg-blue-500 hover:bg-blue-600 border-0 shadow-sm"
                      loading={loading}
                    >
                      {id ? "Update" : "Add"} Vendor
                    </Button>
                  </div>
                </Form.Item>
              </Form>
            </Spin>
          </Modal>
        )}
      </Card>
    </div>
  );
};

export default Vendors;