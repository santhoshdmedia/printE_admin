import { useEffect, useState } from "react";
import { Button, Form, Image, Input, Modal, Popconfirm, Checkbox, Spin, Card, Tag, Divider } from "antd";
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
  EyeOutlined
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

const { TextArea } = Input;

const Vendors = () => {
  const [search, setSearch] = useState(null);
  const [formStatus, setFormStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image_path, setImagePath] = useState(false);
  const [id, setId] = useState("");
  const [allVendors, setAllVendors] = useState([]);
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [form] = Form.useForm();

  const generateUniqueCode = () => {
    if (allVendors.length === 0) return "pev0001";
    
    const codes = allVendors.map(v => v.unique_code).filter(code => code && code.startsWith('pev'));
    const numbers = codes.map(code => parseInt(code.replace('pev', ''), 10));
    const maxNumber = numbers.length ? Math.max(...numbers) : 0;
    return `pev${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      // if (!image_path) {
      //   CUSTOM_ERROR_NOTIFICATION("Please Upload Vendor image");
      //   return;
      // }
      values.vendor_image = image_path;
      
      // If same as billing is checked, copy billing address to shipping
      if (sameAsBilling) {
        values.shipping_address = values.billing_address;
      }
      values.password=values.vendor_contact_number

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

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      const result = await deleteVendor(id);
      SUCCESS_NOTIFICATION(result);
      collectVendors();
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
      render: (code) => <Tag color="blue" className="font-mono">{code}</Tag>,
    },
    {
      title: "Vendor Name",
      dataIndex: "vendor_name",
      render: (name) => <div className="font-medium">{name}</div>,
    },
    {
      title: "Business Name",
      dataIndex: "business_name",
    },
    {
      title: "Email",
      dataIndex: "vendor_email",
    },
    {
      title: "Contact",
      dataIndex: "vendor_contact_number",
    },
    {
      title: "Actions",
      render: (data) => (
        <div className="flex items-center gap-2">
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(data)} 
            className="text-green-600 border-green-200 hover:bg-green-50"
            size="small"
          >
            Edit
          </Button>
          <Popconfirm 
            title="Delete Vendor" 
            description="Are you sure you want to delete this vendor?" 
            onConfirm={() => handleDelete(data._id)}
            okText="Yes"
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
          <Link to={`/vendor_details/${data?._id}`}>
            <Button 
              icon={<EyeOutlined />} 
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              size="small"
            >
              View
            </Button>
          </Link>
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
            <h2 className="text-xl font-semibold text-gray-800">Vendor Management</h2>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setFormStatus(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Add Vendor
            </Button>
          </div>
        }
        className="rounded-lg shadow-sm border-0"
      >
        <div className="mb-4 flex justify-between">
          <Input.Search 
            placeholder="Search vendors..." 
            allowClear 
            onSearch={setSearch}
            className="w-64"
            size="large"
          />
          <div className="text-sm text-gray-500">
            Total Vendors: <span className="font-semibold">{allVendors.length}</span>
          </div>
        </div>
        
        <CustomTable 
          dataSource={allVendors} 
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
              {id ? "Update Vendor" : "Add New Vendor"}
            </div>
          } 
          onCancel={handleCancel}
          className="rounded-lg"
          bodyStyle={{ padding: '24px' }}
        >
          <Spin spinning={loading}>
            <Form 
              layout="vertical" 
              form={form} 
              onFinish={handleFinish}
              className="vendor-form"
            >
              <div className="flex gap-6 mb-6">
                {/* <Form.Item 
                  className="w-1/3" 
                  name="vendor_image" 
                  label={<CustomLabel name="Vendor Logo" />}
                >
                  {image_path ? (
                    <ShowImages path={image_path} setImage={setImagePath} />
                  ) : (
                    <UploadHelper setImagePath={setImagePath} />
                  )}
                </Form.Item> */}
                
                <div className="w-2/3 grid grid-cols-2 gap-4">
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
                  
                  <Form.Item 
                    label="Business Name" 
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
              
              <Divider className="my-6" />
              
              <h3 className="text-md font-medium mb-4 text-gray-700">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Form.Item 
                  label="Vendor Name" 
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
                  label="Email" 
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
                  label="Contact Number" 
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
                  label="Alternate Contact" 
                  name="alternate_vendor_contact_number"
                >
                  <Input 
                    prefix={<PhoneOutlined className="text-gray-400" />} 
                    className="h-10" 
                    placeholder="Enter Alternate Contact" 
                  />
                </Form.Item>
              </div>
              
              <Divider className="my-6" />
              
              <h3 className="text-md font-medium mb-4 text-gray-700">Address Information</h3>
              <Form.Item 
                label="Billing Address" 
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
                  className="mb-4"
                >
                  Shipping address same as billing address
                </Checkbox>
              </Form.Item>
              
              {!sameAsBilling && (
                <Form.Item 
                  label="Shipping Address" 
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
              
              <Form.Item className="mb-0 mt-6">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className="w-full h-12 rounded-md text-lg font-medium bg-blue-500 hover:bg-blue-600 border-0 shadow-sm" 
                  loading={loading}
                >
                  {id ? "Update" : "Add"} Vendor
                </Button>
              </Form.Item>
            </Form>
          </Spin>
        </Modal>
      </Card>
      
      <style jsx>{`
        .vendor-form .ant-form-item-label > label {
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

export default Vendors;
