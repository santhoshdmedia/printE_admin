import { Button, Checkbox, Form, Input, message, Modal, Select, Switch, Table, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { addSubCategory, deleteSubCategory, editSubCategory, getMainCategory, getSubCategory } from "../../api";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import _ from "lodash";
import { MdDelete } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import React from "react";
import CustomTable from "../../components/CustomTable";
import DefaultTile from "../../components/DefaultTile";
import { ICON_HELPER } from "../../helper/iconhelper";
import { formValidation } from "../../helper/formvalidation";

const SubCategory = () => {
  const [form] = Form.useForm();
  const [subData, setSubData] = useState([]);
  const [id, setId] = useState(null);
  const [modalStatus, setModalStatus] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [image_path, setImagePath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [banner_image_path, setBannerImage] = useState(null);

  const getData = async () => {
    try {
      setLoading(true);
      const result = await getMainCategory();
      const data = _.get(result, "data.data", []);
      setSubData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const gettableData = async () => {
    try {
      setLoading(true);
      const result = await getSubCategory(filter);
      const data = _.get(result, "data.data", []);
      setTableData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
    gettableData();
  }, [filter]);

  const handleFinish = async (values) => {
    try {
      if (!image_path) {
        return message.warning("Please provide a category image");
      }
      if (!banner_image_path) {
        return message.warning("Please provide a banner image");
      }

      values.sub_category_image = image_path;
      values.sub_category_banner_image = banner_image_path;

      let result;
      if (id) {
        result = await editSubCategory(values, id?._id);
      } else {
        result = await addSubCategory(values);
      }
      SUCCESS_NOTIFICATION(result);
      setModalStatus(false);
      setBannerImage("");
      setId(null);

      setImagePath("");
      form.resetFields("");
      getData();
      gettableData();
    } catch (err) {
      CUSTOM_ERROR_NOTIFICATION(err);
      console.log(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteSubCategory(id);
      SUCCESS_NOTIFICATION(result);
      gettableData();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleOnChangeShowBrowseAllCategory = async (e, recordId) => {
    const val = e.target.checked;
    try {
      let result = "";
      if (recordId) {
        result = await editSubCategory({ show: val }, recordId);
      }
      SUCCESS_NOTIFICATION(result);
      gettableData();
    } catch (err) {
      CUSTOM_ERROR_NOTIFICATION(err);
      console.log(err);
    }
  };

  // const showModal = () => {
  //   setModalStatus(true);
  //   form.resetFields();
  //   setId(null);
  //   setImagePath(null);
  // };

  // const handleCancel = () => {
  //   setModalStatus(false);
  // };

  const handleUpdate = (subData) => {
    try {
      setId(subData);
      setModalStatus(true);
      form.setFieldsValue({
        select_main_category: _.get(subData, "main_category_details[0]._id", ""),
        sub_category_name: subData.sub_category_name,
        sub_category_image: subData.sub_category_image,
        sub_category_banner_image: subData.sub_category_banner_image,
        position: subData.position,
        show: subData.show,
      });
      setImagePath(subData.sub_category_image);
      setBannerImage(subData.sub_category_banner_image);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleClose = () => {
    form.resetFields("");
    setModalStatus(false);
    setImagePath(null);
    setBannerImage(null);
    setId(null);
  };

  const columns = [
    {
      title: "S.No",
      dataIndex: "_id",
      align: "center",
      render: (s, a, index) => {
        return <span>{index + 1}</span>;
      },
    },
    {
      title: "Sub Category Name",
      dataIndex: "sub_category_name",
    },
    {
      title: "Main Category Name",
      dataIndex: "main_category_details",
      render: (data) => {
        return (
          <>
            <span>{_.get(data, "[0].main_category_name")}</span>
          </>
        );
      },
    },

    {
      title: "Position",
      dataIndex: "position",
      align: "center",
    },
    {
      title: "Show in Browse All Category",
      dataIndex: "show",
      align: "center",
      render: (data, record, index) => {
        return <Checkbox checked={data} onChange={(e) => handleOnChangeShowBrowseAllCategory(e, record._id ?? "")} />;
      },
    },
    {
      title: "Images",
      dataIndex: "sub_category_image",
      render: (image) => {
        return (
          <div>
            {image ? (
              <img
                src={image}
                alt="Sub Category"
                style={{
                  width: "50px",
                  height: "50px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Banner Images",
      dataIndex: "sub_category_banner_image",
      render: (image) => {
        return (
          <div>
            {image ? (
              <img
                src={image}
                alt="Sub Category"
                style={{
                  width: "50px",
                  height: "50px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>
        );
      },
    },

    // {
    //   title: "Edit",
    //   render: (data) => {
    //     return (

    //     );
    //   },
    // },
    {
      title: "Actions",
      render: (data) => {
        return (
          <div className="flex gap-2">
            <div className="">
              <Button className="text-green-500 border-green-300" onClick={() => handleUpdate(data)}>
                Edit
              </Button>
            </div>
            <div className="">
              <Button className="text-red-600  border-red-300" variant="filled" onClick={() => handleDelete(data._id)}>
                Delete
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  const handleFilterChange = (value) => {
    setFilter(value);
  };

  return (
    <div>
      <DefaultTile filter={true} handleFilterChange={handleFilterChange} filterData={subData} title={"Add Sub Category"} addModal={true} addModalText="Sub Category" modalFormStatus={modalStatus} setModalFormStatus={setModalStatus} />

      <div>
        <CustomTable loading={loading} dataSource={tableData} columns={columns} />
      </div>

      <Modal title="Sub Category" closable={false} open={modalStatus} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="select_main_category" label="Select Main Category" rules={[formValidation("Select Main Category")]}>
            <Select placeholder="Select Main Category" className="!h-[50px]">
              {subData.map((res) => (
                <Select.Option key={res._id} value={res._id}>
                  {res.main_category_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="sub_category_name" label="Sub Category Name" rules={[{ required: true, message: "Please enter a subcategory name!" }]}>
            <Input placeholder="Enter Sub Category Name" className="!h-[50px]" />
          </Form.Item>
          {/* <Form.Item
            name="position"
            label="Position in Browse all category"
            validateTrigger="onBlur"
            hasFeedback
            rules={[
              {
                type: "number",
              },
            ]}
          >
            <Input placeholder="Position in Browse all category" defaultValue={1} />
          </Form.Item>
          <Form.Item name="show" label="Show in Browse all category" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item> */}

          <div className="flex">
            <Form.Item className="w-full " name="sub_category_image" label="Image">
              {image_path ? <ShowImages path={image_path} setImage={setImagePath} /> : <UploadHelper setImagePath={setImagePath} />}
            </Form.Item>

            <Form.Item className="w-full " name="sub_category_banner_image" label="Banner Image">
              {banner_image_path ? <ShowImages path={banner_image_path} setImage={setBannerImage} /> : <UploadHelper setImagePath={setBannerImage} />}
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="default" onClick={handleClose}>
              Close
            </Button>
            <Button type="primary" htmlType="submit" className="bg-primary">
              {id ? "Edit" : "Add"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default SubCategory;
