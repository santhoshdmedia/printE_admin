import React, { useEffect, useState } from "react";
import { useForm } from "antd/es/form/Form";
import { Button, Collapse, Form, Input, Modal, Select, Spin, Tag } from "antd";
import { Link } from "react-router-dom";
import _ from "lodash";

// Components
import DefaultTile from "../../components/DefaultTile";
import Nodata from "../../components/Nodata";
import UploadHelper from "../../helper/UploadHelper";
import ShowImages from "../../helper/ShowImages";

// Helpers
import { formValidation } from "../../helper/formvalidation";
import {
  CUSTOM_ERROR_NOTIFICATION,
  ERROR_NOTIFICATION,
  SUCCESS_NOTIFICATION,
} from "../../helper/notification_helper";
import { ICON_HELPER } from "../../helper/iconhelper";

// API
import {
  addCustomerSection,
  deleteBannerCustomerSections,
  editCustomerSection,
  getAllBannerProducts,
  getAllCustomerSections,
} from "../../api";

const { Panel } = Collapse;

const CustomerPage = () => {
  // State management
  const [modalStatus, setModalStatus] = useState(false);
  const [sectionId, setSectionId] = useState("");
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customerSections, setCustomerSections] = useState([]);
  const [bannerImages, setBannerImages] = useState([]);
  const [coverImage, setCoverImage] = useState("");
  const [singleImage, setSingleImage] = useState("");
  const [sectionType, setSectionType] = useState("");
  const [form] = Form.useForm();

  // Data fetching
  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, sectionsResponse] = await Promise.all([
        getAllBannerProducts(),
        getAllCustomerSections(),
      ]);

      setProductData(_.get(productsResponse, "data.data", []));
      setCustomerSections(_.get(sectionsResponse, "data.data", []));
    } catch (error) {
      console.error("Error fetching data:", error);
      ERROR_NOTIFICATION("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form handling
  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      // Prepare payload according to schema
      const payload = {
        section_name: values.section_name,
        sub_title: values.sub_title,
        section_type: sectionType,
        section_products: values.section_products,
        product_display: values.product_display,
        ...(sectionType === "banner" && {
          banner_images: bannerImages.map((img) => ({ path: img })),
          banner_count: values.banner_count,
        }),
        ...(sectionType === "floating product" && {
          Product_cover_img: coverImage,
          Product_single_img: singleImage,
        }),
      };

      // Validate required fields based on section type
      if (
        sectionType === "banner" &&
        (!payload.banner_count || _.isEmpty(payload.banner_images))
      ) {
        return CUSTOM_ERROR_NOTIFICATION(
          "Please provide banner count and upload at least one image"
        );
      }

      if (sectionType === "floating product" && (!coverImage || !singleImage)) {
        return CUSTOM_ERROR_NOTIFICATION("Please upload both product images");
      }

      // API call
      const result = sectionId
        ? await editCustomerSection(sectionId, payload)
        : await addCustomerSection(payload);

      SUCCESS_NOTIFICATION(result);
      resetForm();
      fetchData();
    } catch (error) {
      ERROR_NOTIFICATION(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    form.resetFields();
    setSectionId("");
    setBannerImages([]);
    setCoverImage("");
    setSingleImage("");
    setSectionType("");
    setModalStatus(false);
  };

  // Section actions
  const handleEdit = (section) => {
    setSectionId(section._id);
    setSectionType(section.section_type);

    if (section.section_type === "banner") {
      setBannerImages(section.banner_images?.map((img) => img.path) || []);
    } else {
      setCoverImage(section.Product_cover_img || "");
      setSingleImage(section.Product_single_img || "");
    }

    form.setFieldsValue({
      section_name: section.section_name,
      sub_title: section.sub_title,
      section_products: section.section_products?.map((p) => p._id) || [],
      product_display: section.product_display,
      ...(section.section_type === "banner" && {
        banner_count: section.banner_count,
      }),
    });
    setModalStatus(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      const result = await deleteBannerCustomerSections(id);
      SUCCESS_NOTIFICATION(result);
      fetchData();
    } catch (error) {
      ERROR_NOTIFICATION(error);
    } finally {
      setLoading(false);
    }
  };

  // Render helpers
  const renderProductItem = (product) => (
    <div className="flex items-center gap-4 py-2 justify-between border px-3">
      <div className="flex items-center gap-2">
        <img
          src={_.get(product, "images[0].path", "")}
          alt={product.name}
          className="w-8 h-8 rounded-full object-cover"
        />
        <span>{product.name}</span>
      </div>
      <Link
        to={`/product/${product.seo_url}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ICON_HELPER.LINK_SHARE_ICON />
      </Link>
    </div>
  );

  const renderSectionContent = (section) => {
    if (section.section_type === "banner") {
      return (
        <div className={`grid grid-cols-${section.banner_count || 1} gap-4`}>
          {section.banner_images?.map((img, index) => (
            <img
              key={`banner-${index}`}
              src={img.path}
              alt={`Banner ${index + 1}`}
              className="w-full h-auto object-cover rounded-lg"
              loading="lazy"
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {section.productDetails?.map((product, index) => (
          <div key={`product-${index}`}>{renderProductItem(product)}</div>
        ))}
      </div>
    );
  };

  const renderSectionActions = (section) => (
    <div className="flex gap-2">
      <Tag
        className="border bg-white text-green-500 cursor-pointer"
        onClick={() => handleEdit(section)}
      >
        Edit
      </Tag>
      <Tag
        onClick={() => handleDelete(section._id)}
        className="border bg-white text-red-500 cursor-pointer"
      >
        Delete
      </Tag>
    </div>
  );

  return (
    <Spin spinning={loading}>
      <DefaultTile
        title="Customer Sections"
        addModal={true}
        addModalText="Add Section"
        modalFormStatus={modalStatus}
        setModalFormStatus={setModalStatus}
      />

      {_.isEmpty(customerSections) ? (
        <Nodata />
      ) : (
        <div className="w-full bg-white p-5">
          <Collapse defaultActiveKey={["1"]} className="bg-white">
            {customerSections.map((section, index) => (
              <Panel
                key={`section-${index}`}
                header={section.section_name}
                extra={renderSectionActions(section)}
              >
                {renderSectionContent(section)}
              </Panel>
            ))}
          </Collapse>
        </div>
      )}

      <Modal
        title={`${sectionId ? "Edit" : "Add"} Section`}
        open={modalStatus}
        onCancel={resetForm}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="section_type"
            label="Section Type"
            rules={[formValidation("Please select section type")]}
          >
            <Select
              placeholder="Select section type"
              onChange={setSectionType}
              className="w-full h-12"
            >
              <Select.Option value="floating product">
                Floating Product
              </Select.Option>
              <Select.Option value="banner">Banner</Select.Option>
            </Select>
          </Form.Item>

          {sectionType === "banner" && (
            <>
              <Form.Item
                label="Banner Images"
                rules={[
                  {
                    validator: () =>
                      bannerImages.length > 0
                        ? Promise.resolve()
                        : Promise.reject(
                            "Please upload at least one banner image"
                          ),
                  },
                ]}
              >
                <div className="flex flex-wrap gap-4 mb-4">
                  <UploadHelper
                    multiple={true}
                    max={4}
                    setImagePath={setBannerImages}
                    image_path={bannerImages}
                  />
                  <ShowImages
                    path={bannerImages}
                    setImage={setBannerImages}
                    multiple={true}
                  />
                </div>
              </Form.Item>

              <Form.Item
                name="banner_count"
                label="Banner Count"
                rules={[formValidation("Please select banner count")]}
              >
                <Select placeholder="Select count" className="w-full h-12">
                  {[1, 2, 3, 4].map((count) => (
                    <Select.Option key={count} value={count}>
                      {count} {count > 1 ? "banners" : "banner"}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

        {sectionType === "floating product" && (
            <>
              <Form.Item
                label="Product Cover Image"
                required
              >
                <div className="mb-4">
                  {coverImage ? (
                    <ShowImages path={[coverImage]} setImage={setCoverImage} />
                  ) : (
                    <UploadHelper 
                      setImagePath={(images) => setCoverImage(images[0])}
                      multiple={false}
                    />
                  )}
                </div>
              </Form.Item>

              <Form.Item
                label="Product Single Image"
                required
              >
                <div className="mb-4">
                  {singleImage ? (
                    <ShowImages path={[singleImage]} setImage={setSingleImage} />
                  ) : (
                    <UploadHelper 
                      setImagePath={(images) => setSingleImage(images[0])}
                      multiple={false}
                    />
                  )}
                </div>
              </Form.Item>
            </>
          )}

          <Form.Item
            name="section_name"
            label="Section Name"
            rules={[
              formValidation("Please enter section name"),
              { max: 50, message: "Maximum 50 characters allowed" },
            ]}
          >
            <Input
              placeholder="Enter section name"
              className="h-12"
              maxLength={50}
            />
          </Form.Item>

          <Form.Item
            name="sub_title"
            label="Sub Title"
            rules={[
              formValidation("Please enter sub title"),
              { max: 100, message: "Maximum 100 characters allowed" },
            ]}
          >
            <Input
              placeholder="Enter sub title"
              className="h-12"
              maxLength={100}
            />
          </Form.Item>

          <Form.Item
            name="section_products"
            label="Products"
            rules={[formValidation("Please select at least one product")]}
          >
            <Select
              mode="multiple"
              placeholder="Select products"
              className="w-full"
              optionFilterProp="children"
              showSearch
              filterOption={(input, option) =>
                option.children[0].toLowerCase().includes(input.toLowerCase())
              }
            >
              {productData
                .filter((product) => !product.is_cloned)
                .map((product) => (
                  <Select.Option key={product._id} value={product._id}>
                    <div className="flex items-center gap-2">
                      <img
                        src={_.get(product, "images[0].path", "")}
                        className="w-6 h-6 rounded-full object-cover"
                        alt={product.name}
                      />
                      {product.name}
                    </div>
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="product_display"
            label="Display Type"
            rules={[formValidation("Please select display type")]}
          >
            <Select placeholder="Select display type" className="w-full h-12">
              <Select.Option value="1">Grid View</Select.Option>
              <Select.Option value="2">List View</Select.Option>
              <Select.Option value="3">Carousel</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full h-12"
              loading={loading}
            >
              {sectionId ? "Update" : "Create"} Section
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
};

export default CustomerPage;
