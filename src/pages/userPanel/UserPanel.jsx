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
  Popconfirm
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
} from "@ant-design/icons";
import { formValidation } from "../../helper/formvalidation";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { addCustomUser, getCustomUser, deleteVendor } from "../../api";
import _ from "lodash";
import CustomTable from "../../components/CustomTable";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { TextArea } = Input;

const UserPanel = () => {
  const [search, setSearch] = useState(null);
  const [formStatus, setFormStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [id, setId] = useState("");
  const [role, setRole] = useState("Corporate");
  const [allCustomUser, setAllCustomUser] = useState([]);
  const navigate = useNavigate();

  const handleView = (id) => {
    try {
      navigate("/user_details", { state: id });
    } catch {}
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
      
      // Format the data according to the schema
      const userData = {
        name: values.name,
        email: values.email,
        password: values.phone,
        role: values.role,
        phone: values.phone,
        business_name: values.business_name,
        unique_code: values.unique_code,
        addresses: values.addresses || []
      };


      // Add GST number if provided
      if (values.gst_no) {
        userData.gst_no = values.gst_no;
      }

      let result = "";
      result = await addCustomUser(userData);
      form.resetFields();
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
    setRole("user");
  };

  const collectUsers = async () => {
    try {
      setLoading(true);
      const result = await getCustomUser(search);
      
      setAllCustomUser(_.get(result, "data.data", []));
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

  const handleEdit = (res) => {
    try {
      form.setFieldsValue(res);
      setId(res?._id);
      setRole(res?.role || "user");
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

  const columns = [
    {
      title: "S.No",
      render: (_, __, index) => <div className="text-center">{index + 1}</div>,
      width: 70,
    },
    {
      title: "Unique Code",
      dataIndex: "unique_code",
      render: (code) => code && (
        <Tag color="blue" className="font-mono">
          {code}
        </Tag>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (name) => <div className="font-medium">{name}</div>,
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Phone",
      dataIndex: "phone",
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role) => (
        <Tag color={role === "Corporate" ? "blue" : role === "Dealer" ? "green" : "default"}>
          {role}
        </Tag>
      ),
    },
    {
      title: "Action",
      dataIndex: "_id",
      render: (id) => {
        return (
          <div className="flex space-x-2">
            <Button 
              icon={<EyeOutlined />} 
              className="text-blue-600"
              onClick={() => handleView(id)}
            >
              View
            </Button>
            {/* <Button 
              icon={<EditOutlined />} 
              className="text-green-600"
              onClick={() => handleEdit(allCustomUser.find(user => user._id === id))}
            >
              Edit
            </Button>
            <Popconfirm
              title="Are you sure to delete this user?"
              onConfirm={() => handleDelete(id)}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteOutlined />} className="text-red-600">
                Delete
              </Button>
            </Popconfirm> */}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Card
        title={
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              User Management
            </h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFormStatus(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Add User
            </Button>
          </div>
        }
        className="rounded-lg shadow-sm border-0"
      >
        <div className="mb-4 flex justify-between">
          <Input.Search
            placeholder="Search users..."
            allowClear
            onSearch={setSearch}
            className="w-64"
            size="large"
          />
          <div className="text-sm text-gray-500">
            Total Users:{" "}
            <span className="font-semibold">{allCustomUser.length}</span>
          </div>
        </div>

        <CustomTable
          dataSource={allCustomUser}
          loading={loading}
          columns={columns}
          scroll={{ x: 1000 }}
          rowClassName="hover:bg-gray-50"
        />

        <Modal
          open={formStatus}
          footer={null}
          closable={true}
          width={800}
          title={
            <div className="text-lg font-semibold">
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
                      <Option value="Corporate">Corporate</Option>
                      <Option value="Dealer">Dealer</Option>
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
                      prefix={<IdcardOutlined className="text-gray-400" />}
                      className="h-10"
                      readOnly
                    />
                  </Form.Item>
                </Col>
              </Row>

              {(role === "Corporate" || role === "Dealer") && (
                <Form.Item
                  label="Business Name"
                  name="business_name"
                  rules={role !== "user" ? [formValidation("Enter Business Name")] : []}
                >
                  <Input
                    prefix={<ShopOutlined className="text-gray-400" />}
                    className="h-10"
                    placeholder="Enter Business Name"
                  />
                </Form.Item>
              )}

              <Form.Item
                label="GST Number"
                name="gst_no"
              >
                <Input
                  className="h-10"
                  placeholder="Enter GST Number (optional)"
                />
              </Form.Item>

              <Divider className="my-6" />

              <h3 className="text-md font-medium mb-4 text-gray-700">
                Personal Information
              </h3>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Full Name"
                    name="name"
                    rules={[formValidation("Enter Full Name")]}
                  >
                    <Input
                      prefix={<UserOutlined className="text-gray-400" />}
                      className="h-10"
                      placeholder="Enter Full Name"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[formValidation("Enter Email")]}
                  >
                    <Input
                      prefix={<MailOutlined className="text-gray-400" />}
                      className="h-10"
                      placeholder="Enter Email"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                {/* <Col span={12}>
                  <Form.Item
                    label="Password"
                    name="password"
                    rules={[formValidation("Enter Password")]}
                  >
                    <Input.Password
                      className="h-10"
                      placeholder="Enter Password"
                    />
                  </Form.Item>
                </Col> */}
                <Col span={12}>
                  <Form.Item
                    label="Phone"
                    name="phone"
                    rules={[formValidation("Enter Phone Number")]}
                  >
                    <Input
                      prefix={<PhoneOutlined className="text-gray-400" />}
                      className="h-10"
                      placeholder="Enter Phone Number"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item className="mb-0 mt-6">
                <Button
                  type="primary"
                  htmlType="submit"
                  className="w-full h-12 rounded-md text-lg font-medium bg-blue-500 hover:bg-blue-600 border-0 shadow-sm"
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
          color: #374151;
        }
        .ant-card-head-title {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default UserPanel;