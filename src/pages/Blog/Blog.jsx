import React, { useState, useRef, useEffect } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, Card, Divider, Drawer, Form, Image, Input, Skeleton, Space, Spin, Tag } from "antd";
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

const Blog = () => {
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

  const handleFinish = async (values) => {
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
    fetchData();
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteBlog(id);
      fetchData();
      SUCCESS_NOTIFICATION(result);
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };
  const handleEdit = (res) => {
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
      console.log("GETCURRENT_SETOF_IMAGES", _.get(currentObject, "[0].images", []));
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
        <DefaultTile title="Blogs" add={true} addText="Blog" formStatus={formStatus} setFormStatus={setFormStatus} />

        <div className="w-full min-h-[600px] bg-white rounded-lg grid grid-cols-4 p-5 gap-x-4 gap-y-4">
          {blogData.map((res, index) => {
            return (
              <Card
                key={index}
                hoverable
                actions={[
                  <div className="center_div justify-between px-10 group" key={index}>
                    <ICON_HELPER.EDIT_ICON
                      onClick={() => {
                        handleEdit(res);
                      }}
                      className="!text-xl group-hover:text-gray-500 hover:!text-primary"
                    />
                    <Divider type="vertical" />
                    <div>
                      <Link to={`https://printe.in/blog-details/${res._id}`} target="_blank">
                        <ICON_HELPER.EYE_ICON className="!text-xl group-hover:text-gray-500 hover:!text-primary" />
                      </Link>
                    </div>
                    <Divider type="vertical" />
                    <ICON_HELPER.DELETE_ICON
                      onClick={() => {
                        handleDelete(res?._id);
                      }}
                      className="!text-xl group-hover:text-gray-500 hover:!text-primary"
                    />
                  </div>,
                ]}
                className="!w-full !h-[400px]"
                cover={<Image className="!h-[200px] " src={res.blog_image} />}
              >
                <Card.Meta title={res?.blog_name} description={<span className="line-clamp-3">{_.get(res, "short_description", "")}</span>} />
              </Card>
            );
          })}
        </div>

        <Drawer destroyOnClose open={formStatus} onClose={handleClose} className="!w-full" placement="top" style={{ width: "100%", height: "100vh" }} bodyStyle={{ height: "100vh" }}>
          <Form layout="vertical" form={form} onFinish={handleFinish} initialValues={{ blog_descriptions: [{}] }}>
            <Form.Item label={<CustomLabel name="Blog Main Image" />} name="blog_image">
              {image_path ? <ShowImages setImage={setImagePath} path={image_path} /> : <UploadHelper setImagePath={setImagePath} />}
            </Form.Item>
            <Form.Item label="Blog Name" name="blog_name" rules={[{ required: true, message: "Please enter the blog name" }]}>
              <Input placeholder="Enter Blog Name" className="w-[100%] h-[50px]" />
            </Form.Item>

            <Form.Item label="Short Description" name="short_description" rules={[{ required: true, message: "Please enter the blog description" }]}>
              <Input.TextArea rows={6} placeholder="Enter Short Description" className="w-[100%] h-[50px]" />
            </Form.Item>
            <Form.List name="blog_descriptions">
              {(fields, { add, remove }) => (
                <>
                  <div className="center_div justify-between">
                    <CustomLabel name={"Blog Description"} className="!w-full" />{" "}
                    <Tag
                      className="cursor-pointer  !p-2 !w-[100px] center_div"
                      onClick={() => {
                        setTriger(true);
                        add({ images: [] });
                        setDummy(!dummy);
                        setTriger(false);
                      }}
                    >
                      Add More
                    </Tag>
                  </div>
                  <div className="grid grid-cols-2">
                    {fields.map(({ key, name, ...restField }) => {
                      return (
                        <div key={key} className="bg-white shadow-lg p-5 m-2 rounded-lg grid grid-cols-2 w-full">
                          <div>
                            <div>
                              <Form.Item
                                {...restField}
                                name={[name, "title"]}
                                label="Title"
                                rules={[
                                  {
                                    required: true,
                                    message: `Please Enter title`,
                                  },
                                ]}
                              >
                                <Input placeholder="First Name" className="!w-[90%] !h-[50px]" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "description"]}
                                label="Description"
                                rules={[
                                  {
                                    required: true,
                                    message: `Please Enter title`,
                                  },
                                ]}
                              >
                                <Input placeholder="First Name" className="!w-[90%] !h-[50px]" />
                              </Form.Item>
                              <Form.Item hidden {...restField} name={[name, "uuid"]} initialValue={key} label="uuid">
                                <Input.TextArea rows={5} placeholder="First Name" className="!w-[90%]  !h-[50px]" />
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
                                label="images"
                              >
                                <Input.TextArea disabled rows={5} placeholder="Images" className="!w-[90%] !h-[50px]" />
                              </Form.Item>
                            </div>

                            <Tag className="!cursor-pointer !text-secondary !p-2 !w-[100px] !center_div" onClick={() => remove(name)}>
                              Remove
                            </Tag>
                          </div>
                          <div className="flex flex-wrap gap-x-2">
                            <div className="!size-[100px]">
                              <UploadHelper blog={true} setImagePath={setCurrentImage} current_key={key} handleChange={handleChange} />
                            </div>

                            <div className="flex gap-x-2 flex-wrap">
                              {GETCURRENT_SETOF_IMAGES(key)?.map((res, index) => {
                                return (
                                  <div key={index} className="relative">
                                    <Image height={100} key={index} className="!h-[100px] !w-[100px] !rounded-lg !border" src={res} />
                                    <Tag
                                      onClick={() => {
                                        REMOVE_IMAGES(key, res);
                                      }}
                                      className="cursor-pointer text-center text-red-500 gap-x-2 center_div"
                                    >
                                      {<ICON_HELPER.DELETE_ICON2 />}Remove
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
              <Button block type="primary" htmlType="submit" loading={loading} className="bg-primary !h-[50px]">
                {id ? "Update" : "Add"} Blog
              </Button>
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </>
  );
};

export default Blog;
