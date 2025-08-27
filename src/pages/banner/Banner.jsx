import { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, Card, Divider, Empty, Form, Image, Input, Modal, Select, Spin, Tag } from "antd";
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
  const [image_path, setImagePath] = useState(null);
  const [productData, setProductData] = useState([]);
  const [banners, setAllBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState([]);
  const [currentFeature, setCurrentFeature] = useState("");

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
      if (!image_path) {
        CUSTOM_ERROR_NOTIFICATION("Please Upload Banner image");
        return;
      }
      
      values.banner_image = image_path;
      values.feature = features;

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
    }
  };

  const handleCancel = () => {
    setFormStatus(false);
    setId(null);
    setImagePath(null);
    setFeatures([]);
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
      form.setFieldsValue({
        banner_name: res?.banner_name,
        tag: res?.tag,
        banner_products: res?.banner_products
      });
      setId(res?._id);
      setFormStatus(true);
      setImagePath(res?.banner_image);
      setFeatures(res?.feature || []);
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

  const addFeature = () => {
    if (currentFeature.trim() && !features.includes(currentFeature.trim())) {
      setFeatures([...features, currentFeature.trim()]);
      setCurrentFeature("");
    }
  };

  const removeFeature = (featureToRemove) => {
    setFeatures(features.filter(feature => feature !== featureToRemove));
  };

  return (
    <Spin spinning={loading}>
      <div className="w-full">
        <DefaultTile title={"Banner"} add={true} addText="Banner" formStatus={formStatus} setFormStatus={setFormStatus} />
        {_.isEmpty(banners) ? (
          <div className="!mx-auto !h-[600px] center_div">
            <Empty />
          </div>
        ) : (
          <>
            <div className="w-full min-h-[600px] bg-white rounded-lg grid grid-cols-4 p-5 gap-x-4 gap-y-4">
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
                    className="!w-full !h-[350px]"
                    cover={<Image className="!h-[200px] !rounded-t-lg" src={res.banner_image} />}
                  >
                    <Card.Meta 
                      title={<h1 className="!font-medium !text-sm">{res?.banner_name}</h1>}
                      description={
                        <div className="mt-2">
                          <Tag color="blue">{res.tag}</Tag>
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
        <Modal open={formStatus} footer={false} closable={true} title={`${id ? "Update" : "Add"} Banner`} onCancel={handleCancel}>
          <Form layout="vertical" form={form} onFinish={handleFinish}>
            <Form.Item className="w-full " name="banner_image" label={<CustomLabel name="Banner Image" />}>
              {image_path ? <ShowImages path={image_path} setImage={setImagePath} /> : <UploadHelper setImagePath={setImagePath} />}
            </Form.Item>
            
            <Form.Item label="Banner Name" name="banner_name" rules={[formValidation("Enter Banner Name")]}>
              <Input className="h-[45px]" placeholder="Enter Banner Name" />
            </Form.Item>
            
            <Form.Item label="Tag" name="tag" rules={[formValidation("Enter Tag")]}>
              <Input className="h-[45px]" placeholder="Enter Tag" />
            </Form.Item>
            
            <Form.Item label="Features">
              <div className="flex mb-2">
                <Input 
                  value={currentFeature}
                  onChange={(e) => setCurrentFeature(e.target.value)}
                  className="h-[45px] mr-2" 
                  placeholder="Enter feature" 
                />
                <Button onClick={addFeature} type="primary">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {features.map((feature, index) => (
                  <Tag 
                    key={index} 
                    closable 
                    onClose={() => removeFeature(feature)}
                    className="!text-sm !py-1 !px-2"
                  >
                    {feature}
                  </Tag>
                ))}
              </div>
            </Form.Item>
            
            <Form.Item label="Products" name="banner_products" rules={[formValidation("Select Products")]}>
              <Select mode="multiple" className="w-full h-[45px]" allowClear maxTagCount={1}>
                {productData
                  .filter((res) => !res.is_cloned)
                  .map((res, index) => {
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

            <Form.Item>
              <Button htmlType="submit" className="button !w-full !h-[50px]" loading={loading}>
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