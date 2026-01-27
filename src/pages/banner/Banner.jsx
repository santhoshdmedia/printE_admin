import { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, Card, Divider, Empty, Form, Image, Input, Modal, Select, Spin, Switch, Tag, message } from "antd";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import { formValidation } from "../../helper/formvalidation";
import CustomLabel from "../../components/CustomLabel";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { addBanner, CLIENT_URL, deleteBanner, editBanner, getAllBannerProducts, getAllBanners } from "../../api";
import _ from "lodash";
import { ICON_HELPER } from "../../helper/iconhelper";

const Banner = () => {
  const [formStatus, setFormStatus] = useState(false);
  const [id, setId] = useState(null);
  const [productData, setProductData] = useState([]);
  const [banners, setAllBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);
      
      if (!values.banner_image) {
        CUSTOM_ERROR_NOTIFICATION("Please Upload Banner image");
        return;
      }

      // Convert features string to array if it's a string
      if (typeof values.feature === 'string' && values.feature.trim()) {
        values.feature = values.feature.split(',').map(item => item.trim()).filter(item => item);
      } else if (Array.isArray(values.feature)) {
        values.feature = values.feature.filter(item => item && item.trim());
      } else {
        values.feature = [];
      }

      let result = "";

      if (id) {
        result = await editBanner(values, id);
      } else {
        result = await addBanner(values);
      }
      
      form.resetFields();
      handleCancel();
      SUCCESS_NOTIFICATION(result);
      setFormStatus(false);
      collectBanners();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormStatus(false);
    setId(null);
    form.resetFields();
  };

  const collectBanners = async () => {
    try {
      const result = await getAllBanners();
      setAllBanners(_.get(result, "data.data", []));
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    collectBanners();
  }, []);

  const handleEdit = (res) => {
    try {
      // Prepare initial values for form
      const initialValues = {
        banner_name: res?.banner_name || "",
        tag: res?.tag || "",
        banner_products: res?.banner_products || [],
        banner_image: res?.banner_image || null,
        feature: res?.feature ? res.feature.join(', ') : "",
        is_reward: res?.is_reward || false,
        banner_slug: res?.banner_slug || "",
        rating: res?.rating || ""
      };

      form.setFieldsValue(initialValues);
      setId(res?._id);
      setFormStatus(true);
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteBanner(id);
      SUCCESS_NOTIFICATION(result);
      collectBanners();
    } catch (err) {
      ERROR_NOTIFICATION(err);
    }
  };

  const handleView = () => {
    window.open(`${CLIENT_URL}/`);
  };

  return (
    <Spin spinning={loading}>
      <div className="w-full">
        <DefaultTile 
          title={"Banner"} 
          add={true} 
          addText="Banner" 
          formStatus={formStatus} 
          setFormStatus={setFormStatus} 
        />
        {_.isEmpty(banners) ? (
          <div className="!mx-auto !h-[600px] center_div">
            <Empty />
          </div>
        ) : (
          <>
            <div className="w-full max-h-fit bg-white rounded-lg grid grid-cols-4 p-14 gap-x-4 gap-y-4">
              {banners.map((res, index) => {
                return (
                  <Card
                    key={index}
                    hoverable
                    actions={[
                      <div className="center_div justify-between px-10 group" key={2}>
                        <ICON_HELPER.EDIT_ICON
                          onClick={() => {
                            handleEdit(res);
                          }}
                          className="!text-xl group-hover:text-gray-500 hover:!text-primary"
                        />
                        <Divider type="vertical" />
                        <ICON_HELPER.EYE_ICON
                          className="!text-xl group-hover:text-gray-500 hover:!text-primary"
                          onClick={() => {
                            handleView(res);
                          }}
                        />
                        <Divider type="vertical" />
                        <ICON_HELPER.DELETE_ICON
                          onClick={() => {
                            handleDelete(res?._id);
                          }}
                          className="!text-xl group-hover:text-gray-500 hover:!text-primary"
                        />
                      </div>,
                    ]}
                    className="!w-full !h-fit"
                    cover={<Image className="!h-[300px] !rounded-t-lg" src={res.banner_image} />}
                  >
                    <Card.Meta 
                      title={<h1 className="!font-medium !text-sm">{res?.banner_name}</h1>}
                      description={
                        <div className="mt-2">
                          <Tag color="blue">{res.tag}</Tag>
                          {res.is_reward && <Tag color="gold">Reward</Tag>}
                          <div className="mt-2">
                            {res.feature?.slice(0, 3).map((feat, i) => (
                              <Tag key={i} className="mb-1">{feat}</Tag>
                            ))}
                            {res.feature?.length > 3 && <Tag>+{res.feature.length - 3} more</Tag>}
                          </div>
                        </div>
                      }
                    />
                  </Card>
                );
              })}
            </div>
          </>
        )}
        <Modal 
          open={formStatus} 
          footer={false} 
          closable={true} 
          title={`${id ? "Update" : "Add"} Banner`} 
          onCancel={handleCancel}
          width={600}
        >
          <Form 
            layout="vertical" 
            form={form} 
            onFinish={handleFinish}
            initialValues={{
              is_reward: false,
              feature: ""
            }}
          >
            {/* Image Upload Field */}
            <Form.Item 
              label={<CustomLabel name="Banner Image" />}
              name="banner_image"
              rules={[formValidation("Please upload banner image")]}
            >
              <UploadHelper 
                setImagePath={(path) => {
                  form.setFieldsValue({ banner_image: path });
                }}
              />
            </Form.Item>

            {/* Show uploaded image */}
            <Form.Item shouldUpdate noStyle>
              {() => {
                const image = form.getFieldValue('banner_image');
                return image ? (
                  <div className="mb-4">
                    <Image 
                      src={image} 
                      alt="Banner preview" 
                      className="max-h-40 object-contain"
                    />
                  </div>
                ) : null;   
              }}
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              {/* Banner Name */}
              <Form.Item 
                label="Banner Name" 
                name="banner_name" 
                rules={[formValidation("Enter Banner Name")]}
              >
                <Input className="h-[45px]" placeholder="Enter Banner Name" />
              </Form.Item>

              {/* Tag */}
              <Form.Item 
                label="Tag" 
                name="tag" 
                rules={[formValidation("Enter Tag")]}
              >
                <Input className="h-[45px]" placeholder="Enter Tag" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Banner Slug */}
              <Form.Item 
                label="Banner Slug" 
                name="banner_slug"
              >
                <Input className="h-[45px]" placeholder="Enter Banner Slug" />
              </Form.Item>

              {/* Rating */}
              <Form.Item 
                label="Banner Rating" 
                name="rating"
              >
                <Input 
                  className="h-[45px]" 
                  placeholder="Enter Banner Rating" 
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                />
              </Form.Item>
            </div>

            {/* Features - Comma separated input */}
            <Form.Item 
              label="Features" 
              name="feature"
              tooltip="Enter features separated by commas"
            >
              <Input.TextArea 
                placeholder="Enter features separated by commas (e.g., Feature 1, Feature 2, Feature 3)"
                rows={3}
              />
            </Form.Item>

            {/* Reward Switch */}
            <Form.Item 
              label="Is Reward?" 
              name="is_reward"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            {/* Products Selection */}
            <Form.Item 
              label="Products" 
              name="banner_products" 
              rules={[formValidation("Select Products")]}
            >
              <Select 
                mode="multiple" 
                className="w-full" 
                allowClear 
                maxTagCount={2}
                placeholder="Select products"
                optionLabelProp="label"
              >
                {productData
                  .filter((res) => !res.is_cloned)
                  .map((res, index) => {
                    return (
                      <Select.Option 
                        key={index} 
                        value={res._id}
                        label={res.name}
                      >
                        <div className="flex items-center justify-between">
                          <span>{res.name}</span>
                          <img 
                            src={_.get(res, "images[0].path", "")} 
                            className="!size-[30px] rounded-full ml-2" 
                            alt={res.name}
                          />
                        </div>
                      </Select.Option>
                    );
                  })}
              </Select>
            </Form.Item>

            {/* Submit Button */}
            <Form.Item>
              <Button 
                htmlType="submit" 
                className="button !w-full !h-[50px]" 
                loading={submitting}
                type="primary"
              >
                {id ? "Update" : "Add"} Banner
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Banner;