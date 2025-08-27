import { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, Form, Image, Input, Modal, Popconfirm, Select, Spin } from "antd";
import { formValidation } from "../../helper/formvalidation";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import CustomLabel from "../../components/CustomLabel";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { addVendor, editVendor, getAllVendor, deleteVendor } from "../../api";
import _ from "lodash";
import CustomTable from "../../components/CustomTable";
import { Link } from "react-router-dom";

const Vendors = () => {
  const [search, setSearch] = useState(null);
  const [formStatus, setFormStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image_path, setImagePath] = useState(false);
  const [id, setId] = useState("");
  const [allVendors, setAllVendors] = useState([]);

  const [form] = Form.useForm();

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      if (!image_path) {
        CUSTOM_ERROR_NOTIFICATION("Please Upload Vendor image");
      }
      values.vendor_image = image_path;

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
    setId(null);
    setImagePath(null);
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

  const handleEdit = (res) => {
    try {
      setLoading(true);

      form.setFieldsValue(res);
      setId(res?._id);
      setFormStatus(true);
      setImagePath(res?.vendor_image);
    } catch (err) {
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
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
      render: (_, rest, index) => {
        return <div className="font-medium">{index + 1}</div>;
      },
    },
    {
      title: "Logo",
      dataIndex: "vendor_image",
      render: (data) => {
        return <Image className="!size-[30px] rounded-full" src={data} alt="logo" />;
      },
    },
    {
      title: "Unique Code",
      dataIndex: "unique_code",
    },
    {
      title: "Vendor Name",
      dataIndex: "vendor_name",
    },
    {
      title: "Vendor Business Name",
      dataIndex: "business_name",
    },
    {
      title: "Email",
      dataIndex: "vendor_email",
    },

    {
      title: "Contact Number",
      dataIndex: "vendor_contact_number",
    },
    {
      title: "Actions",
      render: (data) => {
        return (
          <div className="flex items-center gap-2">
            <Button onClick={() => handleEdit(data)} className="text-green-600">
              Edit
            </Button>
            <Popconfirm description="Are you sure you want to delete this vendor?" onConfirm={() => handleDelete(data._id)}>
              <Button className="text-red-600">Delete</Button>
            </Popconfirm>

            <Link to={`/vendor_details/${data?._id}`}>
              <Button className="text-blue-600">View</Button>
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <DefaultTile title={"Vendors"} search={true} add={true} formStatus={formStatus} setFormStatus={setFormStatus} addText="Vendors" setSearch={setSearch} />
      <div className="bg-white rounded-lg min-h-screen">
        <CustomTable dataSource={allVendors} loading={loading} columns={columns} />
        <Spin spinning={loading}>
          <Modal open={formStatus} footer={false} closable={true} width={800} title={`${id ? "Update" : "Add"} Vendor`} onCancel={handleCancel}>
            <Form layout="vertical" form={form} onFinish={handleFinish}>
              <Form.Item className="w-full " name="vendor_image" label={<CustomLabel name="Vendor Image" />}>
                {image_path ? <ShowImages path={image_path} setImage={setImagePath} /> : <UploadHelper setImagePath={setImagePath} />}
              </Form.Item>

              <div className="grid grid-cols-3 gap-2">
                <Form.Item label="Name" name="vendor_name" rules={[formValidation("Enter Vendor Name")]}>
                  <Input className="h-[45px]" placeholder="Enter Vendor Name" />
                </Form.Item>
                <Form.Item label="Email" name="vendor_email" rules={[formValidation("Enter Vendor Email")]}>
                  <Input className="h-[45px]" placeholder="Enter Vendor Email" />
                </Form.Item>
                <Form.Item label="Contact Number" name="vendor_contact_number" rules={[formValidation("Enter Vendor Contact Number")]}>
                  <Input className="h-[45px]" placeholder="Enter Contact Number" />
                </Form.Item>
                <Form.Item label="Alternate Contact Number" name="alternate_vendor_contact_number" rules={[formValidation("Enter Vendor Contact Number")]}>
                  <Input className="h-[45px]" placeholder="Enter Alternate Contact Number" />
                </Form.Item>
                <Form.Item label="Business or Store Name" name="business_name" rules={[formValidation("Enter Business or Store Name")]}>
                  <Input className="h-[45px]" placeholder="Enter Business or Store Name" />
                </Form.Item>
                <Form.Item label="Business or Store Address" name="business_address" rules={[formValidation("Enter Business or Store Address")]}>
                  <Input className="h-[45px]" placeholder="Enter Business or Store Address" />
                </Form.Item>
                <Form.Item label="Unique Code" name="unique_code" rules={[formValidation("Enter Unique Code")]}>
                  <Input className="h-[45px]" placeholder="Enter Unique Code" />
                </Form.Item>
              </div>
              <Form.Item>
                <Button htmlType="submit" className="button !w-full !h-[50px]" loading={loading}>
                  {id ? "Update" : "Add"} Vendor
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        </Spin>
      </div>
    </div>
  );
};

export default Vendors;
