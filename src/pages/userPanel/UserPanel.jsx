import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Checkbox,
  Spin,
  Card,
  Tag,
  Divider,
  Select,
  Row,
  Col,
  Popconfirm,
  message,
  Table,
  Empty
} from "antd";
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
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import { formValidation } from "../../helper/formvalidation";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { addCustomUser, getCustomUser, deleteVendor, sendMailDealer } from "../../api";
import _ from "lodash";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { TextArea } = Input;

const UserPanel = () => {
  const [search, setSearch] = useState(null);
  const [formStatus, setFormStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingMail, setSendingMail] = useState({}); 
  const [id, setId] = useState("");
  const [role, setRole] = useState("Dealer");
  const [allCustomUser, setAllCustomUser] = useState([]);
  const [sameAsBusinessAddress, setSameAsBusinessAddress] = useState(false);
  const navigate = useNavigate();
  
  // For table pagination and sorting
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [sortedData, setSortedData] = useState([]);

  const handleView = (id) => {
    try {
      navigate("/user_details", { state: id });
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const [form] = Form.useForm();

  const generateUniqueCode = () => {
    if (allCustomUser.length === 0) return role === "Corporate" ? "PEC001" : "PED001";

    const codes = allCustomUser
      .filter(user => user.role === role)
      .map(v => v.unique_code)
      .filter(code => code && code.startsWith(role === "Corporate" ? "PEC" : "PED"));

    const numbers = codes.map(code =>
      parseInt(code.replace(role === "Corporate" ? "PEC" : "PED", ""), 10)
    );

    const maxNumber = numbers.length ? Math.max(...numbers) : 0;
    return `${role === "Corporate" ? "PEC" : "PED"}${String(maxNumber + 1).padStart(3, "0")}`;
  };

  const handleFinish = async (values) => {
    try {
      setLoading(true);

      // Format the data according to the backend schema
      const userData = {
        name: values.name,
        email: values.email,
        password: values.phone,
        role: values.role,
        phone: values.phone,
        business_name: values.business_name,
        unique_code: values.unique_code,
        addresses: values.addresses || [],
        gst_no: values.gst_no,
        business_phone: values.business_phone,
        business_email: values.business_email,
        business_address: values.business_address,
        person_address: values.person_address
      };

      const result = await addCustomUser(userData);
      
      form.resetFields();
      setSameAsBusinessAddress(false);
      handleCancel();
      SUCCESS_NOTIFICATION(result);
      setFormStatus(false);
      collectUsers();
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
    form.resetFields();
    setRole("Dealer");
    setSameAsBusinessAddress(false);
  };

  const collectUsers = async () => {
    try {
      setLoading(true);
      const result = await getCustomUser(search);
      const data = _.get(result, "data.data", []);
      
      // Sort data by creation date (newest first) or by _id if no createdAt
      const sorted = _.orderBy(
        data, 
        ['createdAt', '_id'], 
        ['desc', 'desc']
      );
      
      setAllCustomUser(sorted);
      setSortedData(sorted);
      setPagination({
        ...pagination,
        total: sorted.length,
      });
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    collectUsers();
  }, [search]);

  useEffect(() => {
    if (formStatus && !id) {
      form.setFieldsValue({
        unique_code: generateUniqueCode(),
        role: role
      });
    }
  }, [formStatus, role]);

  // Handle same as business address checkbox
  const handleSameAsBusinessAddress = (e) => {
    const checked = e.target.checked;
    setSameAsBusinessAddress(checked);
    
    if (checked) {
      const businessAddress = form.getFieldValue('business_address');
      form.setFieldsValue({
        person_address: businessAddress
      });
    } else {
      form.setFieldsValue({
        person_address: ''
      });
    }
  };

  // Update personal address when business address changes and checkbox is checked
  const handleBusinessAddressChange = (e) => {
    if (sameAsBusinessAddress) {
      form.setFieldsValue({
        person_address: e.target.value
      });
    }
  };

  const handleEdit = (res) => {
    try {
      form.setFieldsValue(res);
      setId(res?._id);
      setRole(res?.role || "Corporate");
      setFormStatus(true);
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      const result = await deleteVendor(id);
      SUCCESS_NOTIFICATION(result);
      collectUsers();
    } catch (err) {
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle send mail to user
  const handleSendMail = async (userId, userEmail) => {
    if (!userEmail) {
      message.error("No email address found for this user");
      return;
    }

    try {
      // Set sending state for this specific user
      setSendingMail(prev => ({ ...prev, [userId]: true }));
      
      // Prepare payload with email
      const payload = { mail_id: userEmail };
      
      // Call the send mail API
      const result = await sendMailDealer(payload);
      
      SUCCESS_NOTIFICATION(result || "Mail sent successfully!");
    } catch (err) {
      console.error("Error sending mail:", err);
      ERROR_NOTIFICATION(err);
    } finally {
      // Reset sending state for this user
      setSendingMail(prev => ({ ...prev, [userId]: false }));
    }
  };

  const columns = [
    {
      title: "S.No",
      key: "sno",
      align: "center",
      width: 80,
      render: (text, record, index) => {
        const { current, pageSize, total } = pagination;
        // Calculate serial number for newest-first order
        const globalIndex = (current - 1) * pageSize + index;
        return <span>{total - globalIndex}</span>;
      },
    },
    {
      title: "Unique Code",
      dataIndex: "unique_code",
      sorter: (a, b) => (a.unique_code || "").localeCompare(b.unique_code || ""),
      render: (code) => code && (
        <Tag color="yellow" className="font-mono border-yellow-400 text-yellow-700">
          {code}
        </Tag>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
      render: (name) => <div className="font-medium">{name}</div>,
    },
    {
      title: "Verification Status",
      dataIndex: "Dealer_verification",
      sorter: (a, b) => {
        if (a.role !== "Dealer" && b.role !== "Dealer") return 0;
        if (a.role !== "Dealer") return -1;
        if (b.role !== "Dealer") return 1;
        return (a.Dealer_verification ? 1 : 0) - (b.Dealer_verification ? 1 : 0);
      },
      render: (verified, record) => {
        if (record.role !== "Dealer") {
          return <span className="text-gray-400">N/A</span>;
        }
        
        return verified ? (
          <Tag 
            icon={<CheckCircleOutlined />} 
            color="success"
            className="flex items-center"
          >
            Verified
          </Tag>
        ) : (
          <Tag 
            icon={<CloseCircleOutlined />} 
            color="error"
            className="flex items-center"
          >
            Not Verified
          </Tag>
        );
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      sorter: (a, b) => (a.email || "").localeCompare(b.email || ""),
      render: (email) => (
        <div className="flex items-center">
          <MailOutlined className="mr-1 text-gray-400" />
          {email}
        </div>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      sorter: (a, b) => (a.phone || "").localeCompare(b.phone || ""),
      render: (phone) => (
        <div className="flex items-center">
          <PhoneOutlined className="mr-1 text-gray-400" />
          {phone}
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      sorter: (a, b) => (a.role || "").localeCompare(b.role || ""),
      render: (role) => (
        <Tag color={role === "Corporate" ? "yellow" : role === "Dealer" ? "orange" : "default"}>
          {role}
        </Tag>
      ),
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      defaultSortOrder: 'descend',
      render: (date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      },
    },
    {
      title: "Action",
      key: "action",
      render: (text, record) => {
        return (
          <div className="flex space-x-2">
            <Button
              icon={<EyeOutlined />}
              className="text-yellow-600 border-yellow-400 hover:bg-yellow-50"
              onClick={() => handleView(record._id)}
            >
              View
            </Button>
            
            <Popconfirm
              title="Send mail to this user?"
              description={`You want to send an email to ${record.email}?`}
              onConfirm={() => handleSendMail(record._id, record.email)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                icon={<SendOutlined />}
                loading={sendingMail[record._id]}
                className="text-blue-600 border-blue-400 hover:bg-blue-50"
              >
                Send Mail
              </Button>
            </Popconfirm>        
          </div>
        );
      },
    },
  ];

  const handleTableChange = (newPagination, filters, sorter) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    
    // Handle sorting locally
    if (sorter.field) {
      const data = [...allCustomUser];
      const sorted = _.orderBy(
        data,
        [sorter.field],
        [sorter.order === 'ascend' ? 'asc' : 'desc']
      );
      setSortedData(sorted);
    } else {
      // Reset to default sorting (newest first)
      const data = [...allCustomUser];
      const sorted = _.orderBy(data, ['createdAt', '_id'], ['desc', 'desc']);
      setSortedData(sorted);
    }
  };

  return (
    <Spin spinning={loading}>
      <div className="p-4 bg-yellow-50 min-h-screen">
        <Card
          title={
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-yellow-800">
                User Management 
              </h2>
              <div className="flex space-x-2">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setFormStatus(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-white"
                >
                  Add User
                </Button>
                {/* <Button
                  type="default"
                  icon={<MailOutlined />}
                  onClick={() => {
                    message.info("Bulk mail feature coming soon!");
                  }}
                  className="border-blue-400 text-blue-600 hover:bg-blue-50"
                >
                  Bulk Mail
                </Button> */}
              </div>
            </div>
          }
          className="rounded-lg shadow-sm border-0 border-t-4 border-t-yellow-400"
        >
          <div className="mb-4 flex justify-between">
            <Input.Search
              placeholder="Search users..."
              allowClear
              onSearch={setSearch}
              className="w-64"
              size="large"
            />
            <div className="text-sm text-yellow-700">
              Total Users:{" "}
              <span className="font-semibold">{pagination.total}</span>
            </div>
          </div>

          <div className="p-2">
            {sortedData.length > 0 ? (
              <Table 
                dataSource={sortedData}
                columns={columns}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '30', '50'],
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} users`,
                }}
                rowKey="_id"
                onChange={handleTableChange}
                bordered
                className="bg-white"
                rowClassName="hover:bg-yellow-50"
              />
            ) : (
              <div className="flex justify-center items-center min-h-[200px]">
                <Empty description="No Users Available" />
              </div>
            )}
          </div>

          <Modal
            open={formStatus}
            footer={null}
            closable={true}
            width={1000}
            title={
              <div className="text-lg font-semibold text-yellow-800">
                {id ? "Update User" : "Add New User"}
              </div>
            }
            onCancel={handleCancel}
            className="rounded-lg"
            bodyStyle={{ padding: "24px" }}
          >
            <Spin spinning={loading}>
              <Form
                layout="vertical"
                form={form}
                onFinish={handleFinish}
                className="user-form"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Role"
                      name="role"
                      rules={[formValidation("Select Role")]}
                    >
                      <Select
                        placeholder="Select Role"
                        onChange={(value) => setRole(value)}
                      >
                        <Option value="Dealer">Dealer</Option>
                        <Option value="Corporate">Corporate</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Unique Code"
                      name="unique_code"
                      tooltip="Automatically generated"
                    >
                      <Input
                        prefix={<IdcardOutlined className="text-yellow-400" />}
                        className="h-10 border-yellow-200 focus:border-yellow-400"
                        readOnly
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider className="my-6 border-yellow-200" />

                <div className="grid grid-cols-2 gap-6">
                  {/* Business Information Column */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                      <h3 className="text-md font-medium mb-4 text-yellow-800 flex items-center">
                        <ShopOutlined className="mr-2" />
                        Business Information
                      </h3>
                      
                      <Form.Item
                        label="Business Name"
                        name="business_name"
                        rules={[formValidation("Enter Business Name")]}
                      >
                        <Input
                          className="h-10 border-yellow-200 focus:border-yellow-400"
                          placeholder="Enter Business Name"
                        />
                      </Form.Item>

                      <Form.Item
                        label="GST Number"
                        name="gst_no"
                      >
                        <Input
                          className="h-10 border-yellow-200 focus:border-yellow-400"
                          placeholder="Enter GST Number (optional)"
                        />
                      </Form.Item>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            label="Business Phone"
                            name="business_phone"
                            rules={[formValidation("Enter Business Phone")]}
                          >
                            <Input
                              prefix={<PhoneOutlined className="text-yellow-400" />}
                              className="h-10 border-yellow-200 focus:border-yellow-400"
                              placeholder="Enter Business Phone"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Business Email"
                            name="business_email"
                            rules={[formValidation("Enter Business Email")]}
                          >
                            <Input
                              prefix={<MailOutlined className="text-yellow-400" />}
                              className="h-10 border-yellow-200 focus:border-yellow-400"
                              placeholder="Enter Business Email"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item
                        label="Business Address"
                        name="business_address"
                        rules={[formValidation("Enter Business Address")]}
                      >
                        <TextArea
                          rows={3}
                          placeholder="Enter complete business address"
                          onChange={handleBusinessAddressChange}
                          className="border-yellow-200 focus:border-yellow-400"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Personal Information Column */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                      <h3 className="text-md font-medium mb-4 text-yellow-800 flex items-center">
                        <UserOutlined className="mr-2" />
                        Personal Information
                      </h3>

                      <Form.Item
                        label="Person Name"
                        name="name"
                        rules={[formValidation("Enter Person Name")]}
                      >
                        <Input
                          prefix={<UserOutlined className="text-yellow-400" />}
                          className="h-10 border-yellow-200 focus:border-yellow-400"
                          placeholder="Enter Person Name"
                        />
                      </Form.Item>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            label="Personal Phone"
                            name="phone"
                            rules={[formValidation("Enter Personal Phone")]}
                          >
                            <Input
                              type="number"
                              prefix={<PhoneOutlined className="text-yellow-400" />}
                              className="h-10 border-yellow-200 focus:border-yellow-400"
                              placeholder="Enter Personal Phone"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Personal Email"
                            name="email"
                            rules={[formValidation("Enter Personal Email")]}
                          >
                            <Input
                              prefix={<MailOutlined className="text-yellow-400" />}
                              className="h-10 border-yellow-200 focus:border-yellow-400"
                              placeholder="Enter Personal Email"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item className="mb-2">
                        <Checkbox 
                          checked={sameAsBusinessAddress}
                          onChange={handleSameAsBusinessAddress}
                          className="text-yellow-700"
                        >
                          Same as Business Address
                        </Checkbox>
                      </Form.Item>

                      <Form.Item
                        label="Personal Address"
                        name="person_address"
                        rules={[formValidation("Enter Personal Address")]}
                      >
                        <TextArea
                          rows={3}
                          placeholder="Enter complete personal address"
                          disabled={sameAsBusinessAddress}
                          className="border-yellow-200 focus:border-yellow-400"
                        />
                      </Form.Item>
                    </div>
                  </div>
                </div>

                <Form.Item className="mb-0 mt-6">
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full h-12 rounded-md text-lg font-medium bg-yellow-500 hover:bg-yellow-600 border-yellow-500 shadow-sm text-white"
                    loading={loading}
                  >
                    {id ? "Update" : "Add"} User
                  </Button>
                </Form.Item>
              </Form>
            </Spin>
          </Modal>
        </Card>

        <style jsx>{`
          .user-form .ant-form-item-label > label {
            font-weight: 500;
            color: #92400e;
          }
          .ant-card-head-title {
            font-weight: 600;
          }
          .ant-input:focus, .ant-input-focused {
            border-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
          }
          .ant-select:not(.ant-select-disabled):hover .ant-select-selector {
            border-color: #f59e0b;
          }
          .ant-select-focused:not(.ant-select-disabled).ant-select:not(.ant-select-customize-input) .ant-select-selector {
            border-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
          }
        `}</style>
      </div>
    </Spin>
  );
};

export default UserPanel;