import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import DefaultTile from "../../components/DefaultTile";
import { Button, Card, Divider, Drawer, Form, Image, Input, Modal, Skeleton, Space, Spin, Tag, Tooltip } from "antd";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import JoditEditor from "jodit-react";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { addBlog, deleteBlog, editBlog, getBlog } from "../../api";
import _, { uniqueId } from "lodash";
import { ICON_HELPER } from "../../helper/iconhelper";
import CustomLabel from "../../components/CustomLabel";
import { v4 as uuidv4 } from "uuid";
import { Link } from "react-router-dom";
import { LockOutlined } from "@ant-design/icons";
import { canEditPage, canDeletePage, isSuperAdmin } from "../../helper/permissionHelper";

const Blog = () => {
  const { user } = useSelector((state) => state.authSlice);
  const [formStatus, setFormStatus] = useState(false);
  const [image_path, setImagePath] = useState("");
  const [current_image, setCurrentImage] = useState("");
  const [id, setId] = useState(null);
  const [content, setContent] = useState("");
  const [blogData, setBlogData] = useState([]);
  const editorRef = useRef(null);
  const [dummy, setDummy] = useState(false);
  const [triger, setTriger] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Check permissions
  const hasEditPermission = isSuperAdmin(user.role) || canEditPage(user.pagePermissions, "blogs");
  const hasDeletePermission = isSuperAdmin(user.role) || canDeletePage(user.pagePermissions, "blogs");

  const handleFinish = async (values) => {
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to modify blogs" });
      return;
    }

    try {
      setLoading(true);
      if (!image_path) {
        CUSTOM_ERROR_NOTIFICATION("Please Upload Blog Image");
        return;
      }
      values.blog_image = image_path;

      let result = "";
      if (id) {
        result = await editBlog(values, id);
      } else {
        result = await addBlog(values);
      }
      form.resetFields();
      setContent("");
      setImagePath("");
      SUCCESS_NOTIFICATION(result);
      handleClose();
    } catch (err) {
      console.log("Error submitting form:", err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const result = await getBlog();
      const data = _.get(result, "data.data", "");
      setBlogData(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClose = () => {
    setFormStatus(false);
    form.resetFields();
    setContent("");
    setImagePath("");
    setId(null);
    fetchData();
  };

  const handleDelete = async (blogId) => {
    if (!hasDeletePermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to delete blogs" });
      return;
    }

    Modal.confirm({
      title: 'Delete Blog',
      content: 'Are you sure you want to delete this blog?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const result = await deleteBlog(blogId);
          fetchData();
          SUCCESS_NOTIFICATION(result);
        } catch (err) {
          ERROR_NOTIFICATION(err);
        }
      }
    });
  };

  const handleEdit = (res) => {
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to edit blogs" });
      return;
    }

    try {
      form.setFieldsValue(res);
      setId(res?._id);
      setFormStatus(true);
      setImagePath(res?.blog_image);
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };

  const handleChange = (id, url) => {
    try {
      setDummy(!dummy);
      let currentObject = form.getFieldValue("blog_descriptions").filter((res) => {
        return res.uuid === id;
      });
      let initial = currentObject[0].images;
      initial.push(url);
      currentObject[0].images = initial;
    } catch (err) {
      console.log(err);
    } finally {
      setDummy(!dummy);
    }
  };

  const GETCURRENT_SETOF_IMAGES = (id) => {
    try {
      let currentObject = form.getFieldValue("blog_descriptions").filter((res) => {
        return res.uuid === id;
      });
      return _.get(currentObject, "[0].images", []);
    } catch (err) {
      return [];
    }
  };

  const REMOVE_IMAGES = (id, delte_url) => {
    try {
      setDummy(!dummy);
      let currentObject = form.getFieldValue("blog_descriptions").filter((res) => {
        return res.uuid === id;
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

  return (
    <>
      <div>
        <DefaultTile
          title="Blogs"
          add={hasEditPermission}
          addText="Blog"
          formStatus={formStatus}
          setFormStatus={setFormStatus}
        />

        {/* Permission Warning */}
        {!hasEditPermission && !hasDeletePermission && (
          <div className="mb-4 mx-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium flex items-center gap-2">
              <LockOutlined />
              You have view-only access to blogs. Contact an administrator to request edit permissions.
            </p>
          </div>
        )}

        <div className="w-full min-h-[600px] bg-white rounded-lg grid grid-cols-4 p-5 gap-x-4 gap-y-4">
          {blogData.map((res, index) => {
            return (
              <Card
                key={index}
                hoverable
                actions={[
                  <div className="center_div justify-between px-10 group" key={index}>
                    {hasEditPermission ? (
                      <Tooltip title="Edit Blog">
                        <ICON_HELPER.EDIT_ICON
                          onClick={() => handleEdit(res)}
                          className="!text-xl group-hover:text-gray-500 hover:!text-primary cursor-pointer"
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="No permission to edit">
                        <LockOutlined className="!text-xl text-gray-300" />
                      </Tooltip>
                    )}

                    <Divider type="vertical" />

                    <Tooltip title="View Blog">
                      <Link
                        to={`http://localhost:5173/blog-details/${res._id}`}
                        target="_blank"
                      >
                        <ICON_HELPER.EYE_ICON className="!text-xl group-hover:text-gray-500 hover:!text-primary" />
                      </Link>
                    </Tooltip>

                    <Divider type="vertical" />

                    {hasDeletePermission ? (
                      <Tooltip title="Delete Blog">
                        <ICON_HELPER.DELETE_ICON
                          onClick={() => handleDelete(res?._id)}
                          className="!text-xl group-hover:text-gray-500 hover:!text-primary cursor-pointer"
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="No permission to delete">
                        <LockOutlined className="!text-xl text-gray-300" />
                      </Tooltip>
                    )}
                  </div>,
                ]}
                className="!w-full !h-[400px]"
                cover={
                  <Image
                    className="!h-[200px]"
                    src={res.blog_image}
                    preview={true}
                  />
                }
              >
                <Card.Meta
                  title={
                    <span className="font-semibold text-gray-800">
                      {res?.blog_name}
                    </span>
                  }
                  description={
                    <span className="line-clamp-3 text-gray-500">
                      {_.get(res, "short_description", "")}
                    </span>
                  }
                />
              </Card>
            );
          })}

          {/* Empty State */}
          {blogData.length === 0 && (
            <div className="col-span-4 flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-lg font-medium">No blogs found</p>
              {hasEditPermission && (
                <p className="text-sm mt-1">
                  Click "Add Blog" to create your first blog post
                </p>
              )}
            </div>
          )}
        </div>

        {/* Drawer only renders if user has edit permission */}
        {hasEditPermission && (
          <Drawer
            destroyOnClose
            open={formStatus}
            onClose={handleClose}
            className="!w-full"
            placement="top"
            style={{ width: "100%", height: "100vh" }}
            bodyStyle={{ height: "100vh" }}
            title={
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">
                  {id ? "Update" : "Add"} Blog
                </span>
              </div>
            }
          >
            <Form
              layout="vertical"
              form={form}
              onFinish={handleFinish}
              initialValues={{ blog_descriptions: [{}] }}
            >
              <Form.Item
                label={<CustomLabel name="Blog Main Image" />}
                name="blog_image"
              >
                {image_path ? (
                  <ShowImages setImage={setImagePath} path={image_path} />
                ) : (
                  <UploadHelper setImagePath={setImagePath} />
                )}
              </Form.Item>

              <Form.Item
                label={<span className="font-semibold">Blog Name</span>}
                name="blog_name"
                rules={[{ required: true, message: "Please enter the blog name" }]}
              >
                <Input
                  placeholder="Enter Blog Name"
                  className="w-[100%] h-[50px]"
                />
              </Form.Item>

              <Form.Item
                label={<span className="font-semibold">Short Description</span>}
                name="short_description"
                rules={[{ required: true, message: "Please enter the blog description" }]}
              >
                <Input.TextArea
                  rows={6}
                  placeholder="Enter Short Description"
                  className="w-[100%]"
                />
              </Form.Item>

              <Form.List name="blog_descriptions">
                {(fields, { add, remove }) => (
                  <>
                    <div className="center_div justify-between mb-4">
                      <CustomLabel name={"Blog Description"} className="!w-full" />
                      <Tag
                        className="cursor-pointer !p-2 !w-[100px] center_div !bg-green-500 !text-white hover:!bg-green-600 transition-colors"
                        onClick={() => {
                          setTriger(true);
                          add({ images: [] });
                          setDummy(!dummy);
                          setTriger(false);
                        }}
                      >
                        + Add More
                      </Tag>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {fields.map(({ key, name, ...restField }) => {
                        return (
                          <div
                            key={key}
                            className="bg-white shadow-lg p-5 m-2 rounded-lg grid grid-cols-2 w-full border border-gray-100 hover:shadow-xl transition-shadow"
                          >
                            <div>
                              <Form.Item
                                {...restField}
                                name={[name, "title"]}
                                label={<span className="font-semibold">Title</span>}
                                rules={[
                                  {
                                    required: true,
                                    message: `Please enter title`,
                                  },
                                ]}
                              >
                                <Input
                                  placeholder="Enter title"
                                  className="!w-[90%] !h-[50px]"
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, "description"]}
                                label={<span className="font-semibold">Description</span>}
                                rules={[
                                  {
                                    required: true,
                                    message: `Please enter description`,
                                  },
                                ]}
                              >
                                <Input
                                  placeholder="Enter description"
                                  className="!w-[90%] !h-[50px]"
                                />
                              </Form.Item>

                              <Form.Item
                                hidden
                                {...restField}
                                name={[name, "uuid"]}
                                initialValue={key}
                                label="uuid"
                              >
                                <Input.TextArea
                                  rows={5}
                                  className="!w-[90%] !h-[50px]"
                                />
                              </Form.Item>

                              <Form.Item
                                rules={[
                                  {
                                    required: true,
                                    message: `Please upload images`,
                                  },
                                ]}
                                {...restField}
                                name={[name, "images"]}
                                initialValue={[]}
                                label="Images"
                              >
                                <Input.TextArea
                                  disabled
                                  rows={5}
                                  placeholder="Images"
                                  className="!w-[90%] !h-[50px]"
                                />
                              </Form.Item>

                              <Tag
                                className="!cursor-pointer !text-red-500 !border-red-300 !p-2 !w-[100px] !center_div hover:!bg-red-50 transition-colors"
                                onClick={() => remove(name)}
                              >
                                Remove
                              </Tag>
                            </div>

                            <div className="flex flex-wrap gap-x-2">
                              <div className="!size-[100px]">
                                <UploadHelper
                                  blog={true}
                                  setImagePath={setCurrentImage}
                                  current_key={key}
                                  handleChange={handleChange}
                                />
                              </div>

                              <div className="flex gap-x-2 flex-wrap">
                                {GETCURRENT_SETOF_IMAGES(key)?.map((res, index) => {
                                  return (
                                    <div key={index} className="relative group">
                                      <Image
                                        height={100}
                                        key={index}
                                        className="!h-[100px] !w-[100px] !rounded-lg !border-2 border-gray-200 object-cover"
                                        src={res}
                                      />
                                      <Tag
                                        onClick={() => REMOVE_IMAGES(key, res)}
                                        className="cursor-pointer text-center text-red-500 gap-x-2 center_div mt-1 hover:!bg-red-50 transition-colors"
                                      >
                                        {<ICON_HELPER.DELETE_ICON2 />} Remove
                                      </Tag>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <Form.Item></Form.Item>
                    </div>
                  </>
                )}
              </Form.List>

              <Form.Item>
                <Button
                  block
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="bg-primary !h-[50px] font-semibold text-base"
                >
                  {id ? "Update" : "Add"} Blog
                </Button>
              </Form.Item>
            </Form>
          </Drawer>
        )}
      </div>
    </>
  );
};

export default Blog;