import { Button, Checkbox, Form, Input, message, Modal, Select, Table } from "antd";
import { useEffect, useState } from "react";
import { addSubCategory, addSubProductCategory, deleteSubProductCategory, editSubProductCategory, getSubCategory, getSubProductCategory } from "../../api";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import { MdDelete } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import _ from "lodash";
import React from "react";
import DefaultTile from "../../components/DefaultTile";
import CustomTable from "../../components/CustomTable";

const SubProductCategory = () => {
  const [image_path, setImagePath] = useState(null);
  const [form] = Form.useForm();
  const [id, setId] = useState(null);
  const [modalStatus, setModalStatus] = useState(false);
  const [subData, setSubData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [filter, setFilter] = useState("");

  const showModal = () => {
    setModalStatus(true);
    form.resetFields();
    setId(null);
    setImagePath(null);
  };

  const handleFinish = async (values) => {
    try {
      if (!image_path) {
        return message.warning("Please provide a sub product category image");
      }
      values.sub_product_image = image_path;
      let result;
      if (id) {
        result = await editSubProductCategory(values, id?._id);
      } else {
        result = await addSubProductCategory(values);
      }
      SUCCESS_NOTIFICATION(result);
      setModalStatus(false);
      form.resetFields();
      setImagePath("");
      gettableData();
    } catch (err) {
      console.log(err);
    }
  };
  const getData = async () => {
    try {
      setLoading(true);
      const result = await getSubCategory();
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
      const result = await getSubProductCategory(filter);
      const data = _.get(result, "data.data", []);
      setTableData(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getData();
    gettableData();
  }, [filter]);

  const handleCancel = () => {
    setModalStatus(false);
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteSubProductCategory(id);
      SUCCESS_NOTIFICATION(result);
      gettableData();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleUpdate = (subData) => {
    setId(subData);
    setModalStatus(true);
    form.setFieldsValue({
      select_sub_category: _.get(subData, "sub_category_details[0]._id", ""),
      sub_product_name: subData.sub_product_name,
      sub_product_image: subData.sub_product_image,
    });
    setImagePath(subData.sub_product_image);
  };

  const handleOnChangeLabel = async (data) => {
    const { _id, label, labelvalue, checked } = data;
    let updatedLabel;
    if (checked) updatedLabel = label.filter((data) => data !== labelvalue);
    else updatedLabel = [...label, labelvalue];

    try {
      const result = await editSubProductCategory({ label: updatedLabel }, _id);
      SUCCESS_NOTIFICATION(result);
      gettableData();
    } catch (error) {
      ERROR_NOTIFICATION(error);
    }
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
      dataIndex: "sub_category_details",
      render: (data) => {
        return (
          <>
            <span>{_.get(data, "[0].sub_category_name")}</span>
          </>
        );
      },
    },

    {
      title: "Product Category Name",
      dataIndex: "sub_product_name",
    },
    {
      title: "Images",
      dataIndex: "sub_product_image",
      render: (image) => {
        return (
          <div>
            {image ? (
              <img
                src={image}
                alt="Product Category"
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
      title: "New Arrival",
      align: "center",
      render: (data) => {
        const label = _.get(data, "label", []);
        const checked = label.includes("new");
        return (
          <Checkbox
            checked={checked}
            onChange={() =>
              handleOnChangeLabel({
                _id: data._id,
                label,
                labelvalue: "new",
                checked,
              })
            }
          ></Checkbox>
        );
      },
    },
    {
      title: "Popular Product",
      align: "center",
      render: (data) => {
        const label = _.get(data, "label", []);
        const checked = label.includes("popular");
        return (
          <Checkbox
            checked={checked}
            onChange={() =>
              handleOnChangeLabel({
                _id: data._id,
                label,
                labelvalue: "popular",
                checked,
              })
            }
          ></Checkbox>
        );
      },
    },
    {
      title: "Edit",
      render: (data) => {
        return (
          <div className="flex gap-2">
            <div>
              <Button className="text-green-500 border-green-300" onClick={() => handleUpdate(data)}>
                Edit
              </Button>
            </div>
            <div>
              <Button className="text-red-500 border-red-300" variant="filled" onClick={() => handleDelete(data._id)}>
                Delete
              </Button>
            </div>
          </div>
        );
      },
    },
    // {
    //   title: "Delete",
    //   render: (data) => {
    //     return (
    //    >
    //     );
    //   },
    // },
  ];

  const handleFilterChange = (value) => {
    setFilter(value);
  };

  return (
    <div>
      <DefaultTile filter={true} handleFilterChange={handleFilterChange} filterData={subData} title={"Add Product Category"} addModal={true} addModalText="Product Category" modalFormStatus={modalStatus} setModalFormStatus={setModalStatus} />

      <div>
        <CustomTable loading={loading} dataSource={tableData} columns={columns} />
      </div>
      <Modal closable={false} title="Product Category" open={modalStatus} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="select_sub_category" label="Select Sub Category">
            <Select placeholder="Select Sub Category">
              {subData.map((res) => (
                <Select.Option key={res._id} value={res._id}>
                  {res.sub_category_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sub_product_name"
            label="Sub Product Category Name"
            rules={[
              {
                required: true,
                message: "Please enter a sub Product category name!",
              },
            ]}
          >
            <Input placeholder="Enter Sub Category Name" />
          </Form.Item>

          <Form.Item className="w-full " name="sub_product_image" label="Image">
            {image_path ? <ShowImages path={image_path} setImage={setImagePath} /> : <UploadHelper setImagePath={setImagePath} />}{" "}
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button
              type="default"
              onClick={() => {
                setModalStatus(false);
                form.resetFields();
                setImagePath(null);
              }}
            >
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

export default SubProductCategory;
