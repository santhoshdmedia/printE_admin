import React, { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Avatar, Button, Card, Drawer, Form, Image, Input, Modal, Select, Space, Tag } from "antd";
import { addProductDescription, deleteProductDescription, getAllBannerProducts, getProductDescription, updateProductDescription } from "../../api";
import _ from "lodash";
import { formValidation } from "../../helper/formvalidation";
import { CloseOutlined, DeleteFilled } from "@ant-design/icons";
import Inputs from "../../components/Inputs";
import JoditEditor from "jodit-react";
import UploadHelper from "../../helper/UploadHelper";
import { ICON_HELPER } from "../../helper/iconhelper";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import CustomTable from "../../components/CustomTable";
import { Link } from "react-router-dom";

const ProductDetails = () => {
  const [formStatus, setFormStatus] = useState(false);
  const [id, setId] = useState(null);
  const [loading, setLoading] = useState(null);
  const [productData, setProductData] = useState([]);
  const [descriptionsData, setDescriptionData] = useState([]);
  const [dummy, setDummy] = useState(false);

  const [form] = Form.useForm();

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const result = await getAllBannerProducts();
      const data = _.get(result, "data.data", "");
      setProductData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getProductDescription();
      const data = _.get(result, "data.data", "");
      setDescriptionData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFinish = async (values) => {
    try {
      let result = "";

      if (!_.isEmpty(id)) {
        result = await updateProductDescription(id._id, values);
      } else {
        result = await addProductDescription(values);
      }

      SUCCESS_NOTIFICATION(result);
      fetchData();
      handleClose();
    } catch (err) {
      console.log(err);
    }
  };

  const GET_TABLE_TYPE = (key) => {
    try {
      return _.get(form.getFieldValue("tabs"), `[${key}].tab_type`, "");
    } catch (err) {}
  };

  const handleChange = (id, url) => {
    setDummy(!dummy);

    let firstFieldKey = Number(id.split("-")[1]);
    let imageFieldKey = Number(id.split("-")[0]);

    let currentObject = _.get(form.getFieldValue("tabs"), `[${firstFieldKey}].content_image_view`, []).filter((res) => {
      return res.image_id === imageFieldKey;
    });

    let initial = _.get(currentObject, "[0].images", []);
    initial.push(url);
    currentObject[0].images = initial;
  };

  const GETCURRENT_SETOF_IMAGES = (id) => {
    try {
      let firstFieldKey = Number(id.split("-")[1]);
      let imageFieldKey = Number(id.split("-")[0]);
      let currentObject = _.get(form.getFieldValue("tabs"), `[${firstFieldKey}].content_image_view`, []).filter((res) => {
        return res.image_id === imageFieldKey;
      });

      return _.get(currentObject, "[0].images", []);
    } catch (err) {
      return [];
    }
  };

  const REMOVE_IMAGES = (id, delte_url) => {
    try {
      setDummy(!dummy);
      let firstFieldKey = Number(id.split("-")[1]);
      let imageFieldKey = Number(id.split("-")[0]);
      let currentObject = _.get(form.getFieldValue("tabs"), `[${firstFieldKey}].content_image_view`, []).filter((res) => {
        return res.image_id === imageFieldKey;
      });

      let initial = currentObject[0].images;
      initial?.splice(initial?.indexOf(delte_url), 1);
      currentObject[0].images = initial;
    } catch (err) {
      console.log(err);
    } finally {
      setDummy(!dummy);
    }
  };

  const handleClose = () => {
    setFormStatus(false);
    form.resetFields();
    setId("");
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      const result = await deleteProductDescription(id);
      SUCCESS_NOTIFICATION(result);
      fetchData();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (product) => {
    setFormStatus(true);
    setId(product);
    form.setFieldsValue(product);
  };

  const columns = [
    {
      title: "Product Name",
      dataIndex: "product_details",
      key: "product_name",
      render: (text, record) => <span className="center_div justify-between">{_.get(text, "[0].name")}</span>,
    },
    {
      title: "Product Image",
      dataIndex: "product_details",
      key: "product_name",
      render: (text, record) => <Avatar src={_.get(text, "[0]images[0].path")} shape="square" />,
    },
    {
      title: "Actions",
      key: "details",
      dataIndex: "",
      render: (res) => (
        <div>
          <div className="flex gap-2">
            <div className="">
              <Button className="text-green-500 border-green-300" onClick={() => handleUpdate(res)}>
                Edit
              </Button>
            </div>
            <div className="">
              <Button className="text-red-600  border-red-300" variant="filled" onClick={() => handleDelete(res._id)}>
                Delete
              </Button>
            </div>
            <Link target="_blank" className="cursor-pointer border px-3 rounded-lg flex items-center gap-2  text-blue-700" to={`https://www.printe.in/product/${_.get(res, "product_details[0].seo_url")}`}>
              View
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DefaultTile title={"Products Description"} destroyOnClose add={true} addText={"Product Description"} formStatus={formStatus} setFormStatus={setFormStatus} />
      <CustomTable loading={loading} dataSource={descriptionsData} columns={columns} />

      <Drawer open={formStatus} onClose={handleClose} title={`${id ? "Update Product Description" : "Add Product Description"}`} footer={false} width={"98%"} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="product_id" label="Select Products" rules={[formValidation("Select Section Products")]}>
            <Select className="!w-[400px] h-[50px]" placeholder="Select Products" allowClear maxTagCount={1}>
              {productData.map((res, index) => {
                return (
                  <Select.Option key={index} value={res._id}>
                    <span className="center_div justify-between">
                      {res.name} <img src={_.get(res, "images[0].path", "")} className="!size-[30px] rounded-full" />
                    </span>
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.List name="tabs">
            {(fields, { add, remove }) => (
              <>
                <Tag type="dashed" onClick={() => add()} block className=" cursor-pointer !bg-green-500 hover:!bg-orange-500 !mb-5 !text-white">
                  + Add New Tab
                </Tag>
                <div className="grid grid-cols-1 gap-x-2 gap-y-3">
                  {fields.map((field) => (
                    <Card
                      size="small"
                      title={`Tab ${field.name + 1}`}
                      key={field.key}
                      extra={
                        <DeleteFilled
                          onClick={() => {
                            remove(field.name);
                          }}
                          className="!text-red-500"
                        />
                      }
                    >
                      <div className="center_div justify-start gap-x-2">
                        <Form.Item label="Tab Name" name={[field.name, "name"]} rules={[formValidation("Enter tab name")]}>
                          <Input className="!h-[50px] !w-[300px]" />
                        </Form.Item>
                        <Form.Item label="Tab Name" hidden name={[field.name, "key"]} initialValue={field.key} rules={[formValidation("Enter tab name")]}>
                          <Input className="!h-[50px] !w-[300px]" />
                        </Form.Item>
                        <Form.Item label="Tab Type" name={[field.name, "tab_type"]} rules={[formValidation("Select tab Type")]}>
                          <Select
                            className="!h-[50px] !w-[300px]"
                            onChange={() => {
                              setDummy(!dummy);
                            }}
                          >
                            <Select.Option value={"Editor"}>Editor</Select.Option>
                            <Select.Option value={"Table"}>Table View</Select.Option>
                            <Select.Option value={"Content-With-Image"}>Content With Image</Select.Option>
                          </Select>
                        </Form.Item>
                      </div>
                      {GET_TABLE_TYPE(field.key) === "Editor" && (
                        <>
                          <Form.Item label="Description" name={[field.name, "description"]} rules={[formValidation("Enter Description")]}>
                            <JoditEditor />
                          </Form.Item>
                        </>
                      )}
                      {GET_TABLE_TYPE(field.key) === "Table" && (
                        <>
                          <Form.Item label="Table View">
                            <Form.List name={[field.name, "table_view"]}>
                              {(subFields, subOpt) => (
                                <>
                                  <div className="w-full center_div justify-end px-10">
                                    <Tag type="dashed" onClick={() => subOpt.add()} className="!cursor-pointer hover:!bg-orange-500 !bg-green-500 !mb-4 !text-white">
                                      + Add Table Item
                                    </Tag>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    {subFields.map((subField) => (
                                      <Space key={subField.key}>
                                        <Form.Item label="Left" name={[subField.name, "left"]} rules={[formValidation("Enter left value")]}>
                                          <Input placeholder="Left" className="!h-[50px]" />
                                        </Form.Item>
                                        <Form.Item label="Right" name={[subField.name, "right"]} rules={[formValidation("Enter right value")]}>
                                          <Input placeholder="right" className="!h-[50px]" />
                                        </Form.Item>
                                        <DeleteFilled
                                          onClick={() => {
                                            subOpt.remove(subField.name);
                                          }}
                                          className="!text-red-500"
                                        />
                                      </Space>
                                    ))}
                                  </div>
                                </>
                              )}
                            </Form.List>
                          </Form.Item>
                        </>
                      )}
                      {GET_TABLE_TYPE(field.key) === "Content-With-Image" && (
                        <>
                          <Form.Item label="Content With Image">
                            <Form.List name={[field.name, "content_image_view"]}>
                              {(subFields, subOpt) => (
                                <>
                                  <div className="w-full center_div justify-end px-10">
                                    <Tag type="dashed" onClick={() => subOpt.add({ images: [] })} className="!cursor-pointer hover:!bg-orange-500 !bg-green-500 !mb-4 !text-white">
                                      + Add new image with content
                                    </Tag>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3">
                                    {subFields.map((subField) => (
                                      <div key={subField.key} className="flex flex-col">
                                        <Form.Item label="Content" name={[subField.name, "content"]} rules={[formValidation("Enter content")]}>
                                          <Input.TextArea placeholder="Content" className=" !w-full" />
                                        </Form.Item>
                                        <Form.Item label="Content" hidden name={[subField.name, "image_id"]} initialValue={subField.key} rules={[formValidation("Enter content")]}>
                                          <Input.TextArea placeholder="Content" className=" !w-full" />
                                        </Form.Item>
                                        <Form.Item
                                          hidden
                                          rules={[
                                            {
                                              required: true,
                                              message: `Please upload images`,
                                            },
                                          ]}
                                          name={[subField.name, "images"]}
                                          initialValue={[]}
                                          label="images"
                                        >
                                          <Input.TextArea disabled rows={5} placeholder="Images" className="!w-[90%] !h-[50px]" />
                                        </Form.Item>
                                        <div className="flex items-center gap-x-2">
                                          <Form.Item label="Image" name={[subField.name, "image"]}>
                                            <UploadHelper blog={true} current_key={`${subField.key}-${field.key}`} handleChange={handleChange} />
                                          </Form.Item>
                                          <div className="flex gap-x-2 flex-wrap">
                                            {GETCURRENT_SETOF_IMAGES(`${subField.key}-${field.key}`)?.map((res, index) => {
                                              return (
                                                <div key={index} className="relative">
                                                  <Image height={50} key={index} className="!h-[50px] !w-[50px] !rounded-lg !border" src={res} />
                                                  <div
                                                    onClick={() => {
                                                      REMOVE_IMAGES(`${subField.key}-${field.key}`, res);
                                                    }}
                                                    className="cursor-pointer text-center text-red-500 gap-x-2 center_div"
                                                  >
                                                    {<ICON_HELPER.DELETE_ICON2 />}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        <DeleteFilled
                                          onClick={() => {
                                            subOpt.remove(subField.name);
                                          }}
                                          className="!text-red-500"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </Form.List>
                          </Form.Item>
                        </>
                      )}
                      {/* Nest Form.List */}
                    </Card>
                  ))}
                </div>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Button htmlType="submit" className="button !w-full !h-[50px] !mt-4" loading={loading}>
              {id ? "Update" : "Add New"} Product Description Tab
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default ProductDetails;
