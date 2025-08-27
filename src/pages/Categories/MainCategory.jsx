import { Button, Checkbox, Form, Input, Modal, Spin, Switch, Table } from "antd";
import React, { useEffect, useState } from "react";
import { MdDelete } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import _, { values } from "lodash";
import { addMainCategory, deleteMainCategory, editMainCategory, getMainCategory } from "../../api";
import CustomTable from "../../components/CustomTable";
import DefaultTile from "../../components/DefaultTile";

const MainCategory = () => {
  const [formStatus, setFormStatus] = useState(false);
  const [form] = Form.useForm();
  const [id, setId] = useState(null);

  const [mainCategoryData, setMainCategoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    try {
      let result = "";

      if (id) {
        result = await editMainCategory(values, id);
      } else {
        result = await addMainCategory(values);
      }
      handleCancel();
      SUCCESS_NOTIFICATION(result);
      form.resetFields("");
      setFormStatus(false);
      onFetchData();
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };

  const handleTopBarChange = async (value, id) => {
    try {
      setLoading(true);
      let values = { category_active_status: value };

      let result = await editMainCategory(values, id);

      SUCCESS_NOTIFICATION(result);
      onFetchData();
    } catch (err) {
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields("");
    setFormStatus(false);
    setId(null);
  };

  useEffect(() => {
    onFetchData();
  }, []);

  const onFetchData = async () => {
    try {
      setLoading(true);
      const result = await getMainCategory();
      setMainCategoryData(_.get(result, "data.data"));
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const onEditButtonHandler = async (data) => {
    try {
      setFormStatus(true);
      setId(data?._id);
      form.setFieldsValue(data);
    } catch (err) {
      console.log(err);
    }
  };

  const onDeleteButtonHandler = async (_id) => {
    try {
      const result = await deleteMainCategory({ _id });
      onFetchData();
      SUCCESS_NOTIFICATION(result);
      const filterData = mainCategoryData.filter((data) => data._id !== _id);

      setMainCategoryData(filterData);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
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
      title: "Main Category Name",
      dataIndex: "main_category_name",
    },
    {
      title: "Add To Navbar",
      dataIndex: "",
      render: (status) => (
        <Checkbox
          checked={status?.category_active_status}
          onChange={(e) => {
            handleTopBarChange(e?.target?.checked, status?._id);
          }}
        />
      ),
    },
    // {
    //   title: "Position",h
    //   dataIndex: "position",
    //   align: "center",
    // },
    {
      title: "Actions",
      render: (data) => {
        return (
          <div className="flex gap-1">
            <div>
              <Button onClick={() => onEditButtonHandler(data)} className="text-green-600">
                Edit
              </Button>
            </div>
            <div>
              <Button onClick={() => onDeleteButtonHandler(data._id)} className="text-red-500">
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
    //       <Button onClick={() => onDeleteButtonHandler(data._id)} className="text-red-500">
    //         <MdDelete size={20} />
    //       </Button>
    //     );
    //   },
    // },
  ];

  return (
    <>
      <DefaultTile title={"Add Main Category"} addModal={true} addModalText="Main Category" formStatus={formStatus} setModalFormStatus={setFormStatus} />

      <div>
        <CustomTable loading={loading} dataSource={mainCategoryData} columns={columns} />
      </div>
      <Spin spinning={loading}>
        <Modal onCancel={handleCancel} open={formStatus} footer={false} title={`${id ? "Update" : "Add"} Main Category`}>
          <Form form={form} layout="vertical" onFinish={handleFinish} className="!pt-4">
            <Form.Item name="main_category_name" label="Main Category Name" rules={[{ required: true, message: "Please enter a main category name!" }]}>
              <Input placeholder="Enter Main Category Name" className="h-[45px]" />
            </Form.Item>
            {/* <Form.Item name="position" label="Position" rules={[{ required: true, message: "Please enter a position" }]}>
            <Input placeholder="Enter Sub Category Name" className="h-[45px]" />
          </Form.Item> */}

            <Form.Item initialValue={false} name={"category_active_status"} label={"Add To Navbar"}>
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button htmlType="submit" className="button !w-full !h-[50px]" loading={loading}>
                {id ? "Update" : "Add"} Main Category
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Spin>
    </>
  );
};

export default MainCategory;
