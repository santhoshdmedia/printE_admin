import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useForm } from "antd/es/form/Form";
import { Button, Collapse, Form, Input, Modal, Select, Spin, Tag, Tooltip } from "antd";
import { Link } from "react-router-dom";
import { LockOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
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
import { canEditPage, canDeletePage, isSuperAdmin } from "../../helper/permissionHelper";

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
  const { user } = useSelector((state) => state.authSlice);
  
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

  // Check permissions
  const hasEditPermission = isSuperAdmin(user.role) || canEditPage(user.pagePermissions, "product-section");
  const hasDeletePermission = isSuperAdmin(user.role) || canDeletePage(user.pagePermissions, "product-section");

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
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to modify product sections" });
      return;
    }

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
    if (!hasEditPermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to edit product sections" });
      return;
    }

    setSectionId(section._id);
    setSectionType(section.section_type);

    // Set image states based on section type
    if (section.section_type === "banner") {
      setBannerImages(section.banner_images?.map((img) => img.path) || []);
    } else {
      setCoverImage(section.Product_cover_img || "");
      setSingleImage(section.Product_single_img || "");
    }

    // Set form fields - ensure section_products contains the IDs
    const productIds = section.section_products?.map((p) => 
      typeof p === 'object' ? p._id : p
    ) || [];

    form.setFieldsValue({
      section_name: section.section_name,
      sub_title: section.sub_title,
      section_products: productIds,
      product_display: section.product_display,
      ...(section.section_type === "banner" && {
        banner_count: section.banner_count,
      }),
      section_type: section.section_type,
    });
    
    setModalStatus(true);
  };

  const handleDelete = async (id) => {
    if (!hasDeletePermission) {
      ERROR_NOTIFICATION({ message: "You don't have permission to delete product sections" });
      return;
    }

    Modal.confirm({
      title: 'Delete Product Section',
      content: 'Are you sure you want to delete this product section?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
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
      }
    });
  };

  // Handle section type change
  const handleSectionTypeChange = (value) => {
    setSectionType(value);
    // Reset image states when section type changes
    if (value === "banner") {
      setCoverImage("");
      setSingleImage("");
    } else if (value === "floating product") {
      setBannerImages([]);
    }
  };

  // Render helpers
  const renderProductItem = (product) => (
    <div className="flex items-center gap-4 py-2 justify-between border px-3 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2">
        {/* <img
          src={_.get(product, "images[0].path", "")}
          alt={product.name}
          className="w-8 h-8 rounded-full object-cover"
        /> */}
        <span className="font-medium">{product.name}</span>
      </div>
      <Link
        to={`/product/${product.seo_url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800"
      >
        <ICON_HELPER.LINK_SHARE_ICON />
      </Link>
    </div>
  );

  const renderSectionContent = (section) => {
    if (section.section_type === "banner") {
      return (
        <div className={`grid grid-cols-${section.banner_count || 1} gap-4`}>
          {/* {section.banner_images?.map((img, index) => (
            <img
              key={`banner-${index}`}
              src={img.path}
              alt={`Banner ${index + 1}`}
              className="w-full h-auto object-cover rounded-lg shadow-md"
              loading="lazy"
            />
          ))} */}
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
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      {hasEditPermission ? (
        <Tooltip title="Edit Section">
          <Tag
            icon={<EditOutlined />}
            className="border bg-white text-green-600 cursor-pointer hover:bg-green-50 transition-colors"
            onClick={() => handleEdit(section)}
          >
            Edit
          </Tag>
        </Tooltip>
      ) : (
        <Tooltip title="No permission to edit">
          <Tag
            icon={<LockOutlined />}
            className="border bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            Edit
          </Tag>
        </Tooltip>
      )}
      
      {hasDeletePermission ? (
        <Tooltip title="Delete Section">
          <Tag
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(section._id)}
            className="border bg-white text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
          >
            Delete
          </Tag>
        </Tooltip>
      ) : (
        <Tooltip title="No permission to delete">
          <Tag
            icon={<LockOutlined />}
            className="border bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            Delete
          </Tag>
        </Tooltip>
      )}
    </div>
  );

  return (
    <Spin spinning={loading}>
      <div className="p-6">
        <DefaultTile
          title="Product Sections"
          addModal={hasEditPermission}
          addModalText="Add Section"
          modalFormStatus={modalStatus}
          setModalFormStatus={setModalStatus}
        />

        {/* Permission Warning */}
        {!hasEditPermission && !hasDeletePermission && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium flex items-center gap-2">
              <LockOutlined />
              You have view-only access to product sections. Contact an administrator to request edit permissions.
            </p>
          </div>
        )}

        {_.isEmpty(customerSections) ? (
          <div className="bg-white rounded-lg p-8">
            <Nodata />
          </div>
        ) : (
          <div className="w-full bg-white rounded-lg shadow-sm">
            <Collapse 
              defaultActiveKey={["1"]} 
              className="bg-white"
              bordered={false}
            >
              {customerSections.map((section, index) => (
                <Panel
                  key={`section-${index}`}
                  header={
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{section.section_name}</span>
                      <Tag color="blue" className="text-xs">
                        {section.productDetails?.length || 0} Products
                      </Tag>
                      <Tag color="purple" className="text-xs">
                        Display: {section.product_display === "1" ? "Grid" : section.product_display === "2" ? "List" : "Carousel"}
                      </Tag>
                    </div>
                  }
                  extra={renderSectionActions(section)}
                  className="mb-2"
                >
                  <div className="pt-4">
                    {section.sub_title && (
                      <p className="text-gray-600 mb-4 italic">{section.sub_title}</p>
                    )}
                    {renderSectionContent(section)}
                  </div>
                </Panel>
              ))}
            </Collapse>
          </div>
        )}

        {hasEditPermission && (
          <Modal
            title={
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">
                  {sectionId ? "Edit" : "Add"} Product Section
                </span>
              </div>
            }
            open={modalStatus}
            onCancel={resetForm}
            footer={null}
            width={800}
            destroyOnClose
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                name="section_name"
                label={<span className="font-semibold">Section Name</span>}
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
                label={<span className="font-semibold">Sub Title</span>}
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
                label={<span className="font-semibold">Products</span>}
                rules={[formValidation("Please select at least one product")]}
                tooltip="Only visible products can be selected"
              >
                <Select
                  mode="multiple"
                  placeholder="Select products"
                  className="w-full"
                  optionFilterProp="children"
                  showSearch
                  maxTagCount={3}
                  filterOption={(input, option) =>
                    option.children[0]?.props?.children?.[1]?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {productData
                    .filter((product) => !product.is_cloned && product.is_visible)
                    .map((product) => (
                      <Select.Option key={product._id} value={product._id}>
                        <div className="flex items-center gap-2">
                          <img
                            src={_.get(product, "images[0].path", "")}
                            className="w-6 h-6 rounded-full object-cover"
                            alt={product.name}
                          />
                          <span>{product.name}</span>
                        </div>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="product_display"
                label={<span className="font-semibold">Display Type</span>}
                rules={[formValidation("Please select display type")]}
                tooltip="Choose how products should be displayed in this section"
              >
                <Select placeholder="Select display type" className="w-full h-12">
                  <Select.Option value="1">
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span>Grid View</span>
                    </div>
                  </Select.Option>
                  <Select.Option value="2">
                    <div className="flex items-center gap-2">
                      <span>📋</span>
                      <span>List View</span>
                    </div>
                  </Select.Option>
                  <Select.Option value="3">
                    <div className="flex items-center gap-2">
                      <span>🎠</span>
                      <span>Carousel</span>
                    </div>
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <div className="flex gap-4 justify-end">
                  <Button
                    onClick={resetForm}
                    className="h-12 px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="h-12 px-6"
                    loading={loading}
                  >
                    {sectionId ? "Update" : "Create"} Section
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Modal>
        )}
      </div>
    </Spin>
  );
};

export default CustomerPage;