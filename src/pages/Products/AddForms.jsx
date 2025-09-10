/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import {
  Button,
  Card,
  Collapse,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Modal,
  Switch,
} from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteFilled,
  MinusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { MdDeleteOutline } from "react-icons/md";
import { FaCirclePlus } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import JoditEditor from "jodit-react";

// Helper imports
import Inputs from "../../components/Inputs";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import {
  addproduct,
  editProduct,
  getAllVendor,
  getMainCategory,
  getSubCategory,
  getSubProductCategory,
  uploadImage,
} from "../../api";
import _ from "lodash";
import {
  CUSTOM_ERROR_NOTIFICATION,
  ERROR_NOTIFICATION,
  SUCCESS_NOTIFICATION,
} from "../../helper/notification_helper";
import { formValidation } from "../../helper/formvalidation";
import { ICON_HELPER } from "../../helper/iconhelper";

const { Title, Text } = Typography;
const { Panel } = Collapse;

// Constants
const initialVariantOptionValue = {
  value: "",
  _id: Date.now() + 1,
  variant_type: "text_box_variant",
  image_name: "",
};

const initialVariantValue = {
  variant_name: "",
  variant_type: "text_box_variant",
  options: [initialVariantOptionValue],
};

const productCardColor = [
  { value: "Red", bg: "bg-red-300" },
  { value: "Green", bg: "bg-green-300" },
  { value: "Yellow", bg: "bg-yellow-300" },
  { value: "Gray", bg: "bg-gray-300" },
  { value: "Indigo", bg: "bg-indigo-300" },
  { value: "Pink", bg: "bg-pink-300" },
  { value: "Teal", bg: "bg-teal-300" },
  { value: "Purple", bg: "bg-purple-300" },
  { value: "Blue", bg: "bg-blue-300" },
  { value: "Orange", bg: "bg-orange-300" },
  { value: "Amber", bg: "bg-amber-300" },
];

const productType = [
  { value: "Stand Alone Product" },
  { value: "Variable Product" },
];

const TaxPreference = [
  { value: "Taxable" },
  { value: "Non-Taxable" },
  { value: "Out of Scope" },
  { value: "Non-GST Apply" },
];

const PRODUTSTOCK_TYPE = [{ value: "Limited" }, { value: "Unliimted" }];
const Unit_type = [
  { value: "pcs" }, 
  { value: "Box" },
  { value: "cm" },
  { value: "dozen" },
  { value: "gm" },
  { value: "kg" },
  { value: "lbs" },
  { value: "meter" },
  { value: "inches" },
  { value: "ft" },
  { value: "Nos" },
  { value: "Sqft" },
];

const AddForms = ({ fetchData, setFormStatus, id, setId }) => {
  const [form] = Form.useForm();
  const [image_path, setImagePath] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [subcategory_data, setSubcategory_data] = useState([]);
  const [filter_subcategory_data, setFilterSubcategory_data] = useState([]);
  const [variants, setVariants] = useState([initialVariantValue]);
  const [tableValue, setTableValue] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quantityType, setQuantityType] = useState("");
  const [dummy, setDummy] = useState(false);
  const [modalUnitVisible, setModalUnitVisible] = useState(false);
  const [isProductVisible, setIsProductVisible] = useState(false);
  const [productTypeSelectedValue, setProductTypeSelectedValue] = useState(
    id?.type || productType[0].value
  );
  const [TaxPreferenceValue, setTaxPreferenceValue] = useState(
    id?.type || TaxPreference[0].value
  );
  const [productStockSelectedValue, setProductStockSelectedValue] = useState(
    id?.stocks_status || PRODUTSTOCK_TYPE[1].value
  );
  const [UnitSelectedValue, setUnitSelectedValue] = useState(
    id?.stocks_status || PRODUTSTOCK_TYPE[1].value
  );
  const [usedProductCodes, setUsedProductCodes] = useState(new Set());

  const initial_seo_data = {
    title: "",
    keywords: "",
    description: "",
    url: "",
  };

  const [seo_datas, setSEO_Datas] = useState(initial_seo_data);

  // Effect for loading initial data
  useEffect(() => {
    productCategory();
    collectVendors();
  }, []);

  // Effect for handling edit mode
  useEffect(() => {
    if (id) {
      setLoading(true);
      onCategoryChnage(_.get(id, "category_details._id", ""));
      form.setFieldsValue(id);

      let vendors_ids = _.get(id, "vendor_details", []).map((res) => res._id);
      setQuantityType(_.get(id, "quantity_type", ""));

      form.setFieldsValue({
        vendor_details: vendors_ids,
        category_details: _.get(id, "category_details._id", ""),
        sub_category_details: _.get(id, "sub_category_details._id", ""),
      });

      setSEO_Datas({
        title: _.get(id, "seo_title", ""),
        description: _.get(id, "seo_description", ""),
        url: _.get(id, "seo_url", ""),
      });

      setTableValue(_.get(id, "variants_price", []));
      setImagePath(_.get(id, "images", []));
      setVariants(_.get(id, "variants", [initialVariantValue]));
      setDummy(!dummy);
      setLoading(false);
    }
  }, [id]);

  // API functions
  const productCategory = async () => {
    try {
      const result = await getMainCategory();
      const result2 = await getSubCategory();
      const data = _.get(result, "data.data", "");
      setCategoryData(data);
      setSubcategory_data(_.get(result2, "data.data", []));
    } catch (err) {
      console.log(err);
    }
  };

  const collectVendors = async () => {
    try {
      setLoading(true);
      const result = await getAllVendor(null);
      setAllVendors(_.get(result, "data.data", []));
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (values) => {
    console.log(values);

    try {
      setLoading(true);
      if (!image_path) {
        return message.warning("Please provide a category image");
      }

      values.images = image_path;
      values.variants = variants;
      values.variants_price = tableData;
      values.seo_url = String(values.seo_url).trim();

      let result = id
        ? await editProduct(values, id?._id)
        : await addproduct(values);

      setFormStatus(false);
      SUCCESS_NOTIFICATION(result);
      form.resetFields();
      setId("");
      setQuantityType("");
      setImagePath("");
      setFormStatus(false);
      fetchData();
      setSEO_Datas(initial_seo_data);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  // Variant handlers
  const handleAddVariant = () => {
    setVariants([...variants, { ...initialVariantValue, _id: Date.now() }]);
  };

  const handleAddVariantOption = (id) => {
    const newVariant = variants.map((data) => {
      if (data._id === id) {
        return {
          ...data,
          options: [
            ...data.options,
            {
              ...initialVariantOptionValue,
              _id: Date.now() + 1,
              variant_type: data.variant_type,
            },
          ],
        };
      }
      return data;
    });
    setVariants(newVariant);
  };

  const handleOnChangeVariantName = (event, id) => {
    const { value } = event.target;
    setVariants((prevVariants) =>
      prevVariants.map((variant) =>
        variant._id === id ? { ...variant, variant_name: value } : variant
      )
    );
  };

  const handleOnChangeVariantType = (event, id) => {
    setVariants((prevVariants) =>
      prevVariants.map((variant) =>
        variant._id === id
          ? {
              ...variant,
              variant_type: event,
              options: [
                { value: "", _id: Date.now() + 1, variant_type: event },
              ],
            }
          : variant
      )
    );
  };

  const handleOnDeleteVariantName = (varient_details) => {
    if (!_.isEmpty(_.get(varient_details, "options", []))) {
      return CUSTOM_ERROR_NOTIFICATION("Please Delete variant first");
    }
    setVariants((prevVariants) =>
      prevVariants.filter((variant) => variant._id !== varient_details._id)
    );
  };

  const handleOnChangeVariantOptionImageName = async (
    event,
    VariantId,
    OptionId
  ) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("image", event.target.files[0]);
      const result = await uploadImage(formData);
      let value = _.get(result, "data.data.url", "");
      setLoading(false);

      const changeVariantOptionName = variants.map((data) => {
        if (data._id === VariantId) {
          const optionChange = data.options.map((option) => {
            return option._id === OptionId
              ? { ...option, image_name: value }
              : option;
          });
          return { ...data, options: optionChange };
        }
        return data;
      });

      setVariants(changeVariantOptionName);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOnChangeVariantOptionName = async (
    event,
    VariantId,
    OptionId
  ) => {
    try {
      let { value } = event.target;
      const changeVariantOptionName = variants.map((data) => {
        if (data._id === VariantId) {
          const optionChange = data.options.map((option) =>
            option._id === OptionId ? { ...option, value } : option
          );
          return { ...data, options: optionChange };
        }
        return data;
      });
      setVariants(changeVariantOptionName);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOnDeleteVariantOptionName = (VariantId, OptionId) => {
    try {
      const deleteVariantOptionName = variants.map((data) => {
        if (data._id === VariantId) {
          const optionChange = data.options.filter(
            (option) => option._id !== OptionId
          );
          return { ...data, options: optionChange };
        }
        return data;
      });

      setVariants(deleteVariantOptionName);
    } catch (err) {
      console.error(err);
    }
  };

  // Table handlers
  const handlePriceChange = (record, e) => {
    const { value } = e.target;
    const updatedTableValue = tableValue.map((data) => {
      if (data.key === record.key) {
        return { ...data, price: value };
      }
      return data;
    });

    if (!updatedTableValue.some((data) => data.key === record.key)) {
      updatedTableValue.push({ ...record, price: value });
    }

    setTableValue(updatedTableValue);
  };

  const handleStockChange = (record, e) => {
    const { value } = e.target;
    const updatedTableValue = tableValue.map((data) => {
      if (data.key === record.key) {
        return { ...data, stock: value };
      }
      return data;
    });

    if (!updatedTableValue.some((data) => data.key === record.key)) {
      updatedTableValue.push({ ...record, stock: value });
    }

    setTableValue(updatedTableValue);
  };

  const handleProductCodeChange = (record, e) => {
    const { value } = e.target;
    const updatedTableValue = tableValue.map((data) => {
      if (data.key === record.key) {
        return {
          ...data,
          product_code: value,
          product_unique_code: uuidv4() + Date.now(),
        };
      }
      return data;
    });

    if (!updatedTableValue.some((data) => data.key === record.key)) {
      updatedTableValue.push({ ...record, product_code: value });
    }

    setTableValue(updatedTableValue);
  };

  // Helper functions
  const onCategoryChnage = (value) => {
    if (value) {
      let responce = subcategory_data.filter((data) => {
        return data.select_main_category === value;
      });
      setFilterSubcategory_data(responce);
    }
  };

  const handleChnage = (e, location) => {
    setSEO_Datas((pre) => ({ ...pre, [location]: e.target.value }));
  };

  const GET_TABLE_TYPE = (key) => {
    try {
      return _.get(
        form.getFieldValue("description_tabs"),
        `[${key}].tab_type`,
        ""
      );
    } catch (err) {
      return "";
    }
  };

  const handleChange = (id, url) => {
    setDummy(!dummy);
    let firstFieldKey = Number(id.split("-")[1]);
    let imageFieldKey = Number(id.split("-")[0]);

    let currentObject = _.get(
      form.getFieldValue("tabs"),
      `[${firstFieldKey}].content_image_view`,
      []
    ).filter((res) => {
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
      let currentObject = _.get(
        form.getFieldValue("description_tabs"),
        `[${firstFieldKey}].content_image_view`,
        []
      ).filter((res) => {
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
      let currentObject = _.get(
        form.getFieldValue("description_tabs"),
        `[${firstFieldKey}].content_image_view`,
        []
      ).filter((res) => {
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

  // Modal handlers
  const showUnitModal = () => {
    setModalUnitVisible(true);
  };

  const handleUnitOk = () => {
    setModalUnitVisible(false);
  };

  const handleUnitCancel = () => {
    setModalUnitVisible(false);
  };

  // Generate table data from variants
  const combinations = variants.reduce(
    (acc, variant) =>
      acc.flatMap((combination) =>
        variant.options.map((option) => [...combination, option])
      ),
    [[]]
  );

  const tableData = combinations.map((combination) => {
    const row = combination.reduce((acc, data, i) => {
      return {
        ...acc,
        [variants[i].variant_name]: data.value,
      };
    }, {});

    const keyId = combination.map((opt) => opt.value).join("-");
    const existingData = tableValue.find((data) => data.key === keyId);

    return (
      existingData || {
        ...row,
        key: keyId,
      }
    );
  });

  // Generate unique product code
  const generateProductCode = (isVariableProduct = false, variantName = "") => {
    const categoryId = form.getFieldValue('category_details');
    const subCategoryId = form.getFieldValue('sub_category_details');
    
    if (!categoryId || !subCategoryId) {
      message.warning("Please select category and subcategory first");
      return null;
    }
    
    const category = categoryData.find(c => c._id === categoryId);
    const subCategory = filter_subcategory_data.find(sc => sc._id === subCategoryId);
    
    if (!category || !subCategory) {
      message.warning("Please select valid category and subcategory");
      return null;
    }
    
    // Get first letters of category and subcategory
    const categoryPrefix = category.main_category_name.charAt(0).toUpperCase();
    const subCategoryPrefix = subCategory.sub_category_name.charAt(0).toUpperCase();
    
    // Add variant prefix if it's a variable product
    let variantPrefix = "";
    if (isVariableProduct && variantName) {
      variantPrefix = variantName.charAt(0).toUpperCase();
    }
    
    let productCode = "";
    let isUnique = false;
    let attemptCount = 0;
    const maxAttempts = 50; // Prevent infinite loop
    
    // Generate codes until we find a unique one
    while (!isUnique && attemptCount < maxAttempts) {
      // Generate a 4-digit number with leading zeros
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      
      // Construct the product code
      productCode = `${categoryPrefix}${subCategoryPrefix}${variantPrefix}${randomNum}`;
      
      // Check if this code is already used
      if (!usedProductCodes.has(productCode)) {
        isUnique = true;
        // Add the new code to our used codes set
        setUsedProductCodes(prev => new Set([...prev, productCode]));
      }
      
      attemptCount++;
    }
    
    if (attemptCount >= maxAttempts) {
      message.error("Could not generate a unique product code. Please try again.");
      return null;
    }
    
    return productCode;
  };

  // Table columns
  const columns = [
    ...variants.map((variant) => ({
      title: variant.variant_name,
      dataIndex: variant.variant_name,
      key: variant.variant_name,
      render: (text) => text,
    })),
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (text, record, index) => (
        <Input
          type="number"
          key={index}
          required
          placeholder="Price"
          value={record.price}
          onChange={(e) => handlePriceChange(record, e)}
        />
      ),
    },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
      render: (text, record, index) => (
        <Input
          type="number"
          placeholder="stock"
          required
          key={index}
          value={record.stock}
          onChange={(e) => handleStockChange(record, e)}
        />
      ),
    },
    {
      title: "Product Code",
      dataIndex: "product_code",
      key: "product_code",
      render: (text, record, index) => (
        <Input
          placeholder="Product Code"
          required
          key={index}
          value={record.product_code}
          onChange={(e) => handleProductCodeChange(record, e)}
          suffix={
            <ReloadOutlined 
              onClick={() => {
                const isVariable = productTypeSelectedValue === "Variable Product";
                const code = generateProductCode(isVariable, record.variant_name);
                if (code) {
                  const updatedTableValue = tableValue.map((data) => {
                    if (data.key === record.key) {
                      return { ...data, product_code: code };
                    }
                    return data;
                  });
                  setTableValue(updatedTableValue);
                }
              }}
              style={{ cursor: 'pointer' }}
            />
          }
        />
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div className="bg-gray-50 min-h-screen">
        <Card
          bordered={false}
          style={{
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            borderRadius: "12px",
            background: "white",
          }}
        >
          <div className="flex justify-between px-5 items-center mb-6">
            <div>
              <Title
                level={2}
                style={{ color: "#2c3e50", marginBottom: "8px" }}
              >
                {id ? "Edit Product" : "Add New Product"}
              </Title>
              <Text type="secondary">
                {id
                  ? "Update the product details below"
                  : "Fill in the details below to add a new product to your catalog"}
              </Text>
            </div>
          </div>

          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Collapse
              defaultActiveKey={["1", "2", "3", "4", "5"]}
              expandIconPosition="end"
              className="custom-collapse"
            >
              {/* Product Basic Information Panel */}
              <Panel
                header={
                  <span className="text-lg font-semibold relative">
                    Product Basic Information
                  </span>
                }
                key="1"
              >
                  <Form.Item
                name="is_visible"
                label="Visibility"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren={<EyeOutlined />} 
                  unCheckedChildren={<EyeInvisibleOutlined />} 
                />
              </Form.Item>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Form.Item
                    label="Product Type"
                    name="type"
                    rules={[
                      { 
                        required: true,
                        message: "Please select a product type!",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select type"
                      className="h-12"
                      options={productType}
                      onChange={(val) => setProductTypeSelectedValue(val)}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Main Category"
                    name="category_details"
                    rules={[
                      {
                        required: true,
                        message: "Please select a product category!",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select Product Category"
                      className="h-12"
                      onChange={(e) => onCategoryChnage(e)}
                    >
                      {categoryData.map((item) => (
                        <Select.Option key={item._id} value={item._id}>
                          {item.main_category_name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  {!_.isEmpty(filter_subcategory_data) ? (
                    <Form.Item
                      label="Sub Category"
                      name="sub_category_details"
                      rules={[
                        {
                          required: true,
                          message: "Please select a product category!",
                        },
                      ]}
                    >
                      <Select
                        placeholder="Select Product Sub Category"
                        className="h-12"
                      >
                        {filter_subcategory_data.map((item) => (
                          <Select.Option key={item._id} value={item._id}>
                            {item.sub_category_name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  ) : (
                    <Form.Item label="Sub Category" name="sub_category_details">
                      <Select
                        placeholder="No subcategories available"
                        className="h-12"
                        disabled
                      />
                    </Form.Item>
                  )}

                  <Form.Item
                    label="Product Stocks"
                    name="stocks_status"
                    rules={[
                      {
                        required: true,
                        message: "Please select a product stock type!",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select Stocks Type"
                      className="h-12"
                      options={PRODUTSTOCK_TYPE}
                      onChange={(val) => setProductStockSelectedValue(val)}
                    />
                  </Form.Item>

                  {productStockSelectedValue === "Limited" && (
                    <Form.Item
                      rules={[formValidation("Enter In-Stock Count")]}
                      name="stock_count"
                      label="In-Stock Count"
                    >
                      <InputNumber
                        placeholder="Enter Stock Count"
                        type="text"
                        className="w-full h-12"
                      />
                    </Form.Item>
                  )}

                  <Form.Item
                    label="Product Code"
                    name="product_code"
                    rules={[{ required: true, message: 'Product code is required' }]}
                  >
                    <Input
                      placeholder="Product code will be generated automatically"
                      suffix={
                        <ReloadOutlined 
                          onClick={() => {
                            const code = generateProductCode(false);
                            if (code) form.setFieldsValue({ product_code: code });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    name="name"
                    label="Product Name"
                    rules={[formValidation("Enter Product Name")]}
                  >
                    <Input
                      placeholder="Enter Product Name"
                      type="text"
                      className="h-12"
                    />
                  </Form.Item>

                  <Form.Item
                    name="vendor_details"
                    label="Select Vendor"
                    rules={[formValidation("Select Vendor")]}
                  >
                    <Select
                      placeholder="Select Vendor"
                      mode="multiple"
                      className="h-12"
                    >
                      {allVendors.map((item) => (
                        <Select.Option key={item._id} value={item._id}>
                          <div className="flex justify-between items-center">
                            {item.vendor_name}
                            <Link
                              to={`/vendor_details/${item._id}`}
                              target="_blank"
                            >
                              <span className="text-blue-500">View</span>
                            </Link>
                          </div>
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    rules={[formValidation("Enter HSN code")]}
                    label="HSN code"
                    name="HSNcode_time"
                  >
                    <Input
                      placeholder="Enter HSN code"
                      type="Text"
                      className="h-12"
                    />
                  </Form.Item>

                <Form.Item
                    label="Unit"
                    name="unit"
                    rules={[
                      {
                        required: true,
                        message: "Please select a unit!",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select Unit Type"
                      className="h-12"
                      options={Unit_type}
                      onChange={(val) => setUnitSelectedValue(val)}
                    />
                  </Form.Item>

                  <Form.Item
                    rules={[formValidation("Enter Production Time")]}
                    label="Production Time"
                    name="Production_time"
                  >
                    <Input
                      placeholder="Enter Production Time"
                      type="Number"
                      className="h-12"
                    />
                  </Form.Item>

                  <Form.Item
                    rules={[formValidation("Enter Stock Arrangement Time")]}
                    label="Stock Arrangement Time"
                    name="Stock_Arrangement_time"
                  >
                    <Input
                      placeholder="Enter Stock Arrangement Time"
                      type="Number"
                      className="h-12"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Tax Prefernce"
                    name="Tax_prefernce"
                    rules={[
                      {
                        required: true,
                        message: "Please select a Tax prefernce!",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select type"
                      className="h-12"
                      options={TaxPreference}
                      onChange={(val) => setTaxPreferenceValue(val)}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  rules={[formValidation("enter tittle for description")]}
                  label="Product Description Tittle"
                  name="product_description_tittle"
                >
                  <Input
                    placeholder="Enter description tittle"
                    type="Text"
                    className="h-12"
                  />
                </Form.Item>

                <div className="grid grid-cols-2 gap-2">
                  <Form.Item
                    rules={[formValidation("enter Point one")]}
                    label="Point one"
                    name="Point_one"
                  >
                    <Input
                      placeholder="Enter Point one"
                      type="Text"
                      className="h-12"
                    />
                  </Form.Item>
                  <Form.Item
                    rules={[formValidation("enter Point two")]}
                    label="Point two"
                    name="Point_two"
                  >
                    <Input
                      placeholder="Enter Point two"
                      type="Text"
                      className="h-12"
                    />
                  </Form.Item>
                  <Form.Item
                    rules={[formValidation("enter Point three")]}
                    label="Point three"
                    name="Point_three"
                  >
                    <Input
                      placeholder="Enter Point three"
                      type="Text"
                      className="h-12"
                    />
                  </Form.Item>
                  <Form.Item
                    rules={[formValidation("enter Point four")]}
                    label="Point four"
                    name="Point_four"
                  >
                    <Input
                      placeholder="Enter Point four"
                      type="Text"
                      className="h-12"
                    />
                  </Form.Item>
                </div>
              </Panel>

              {/* Product Images Panel */}
              <Panel
                header={
                  <span className="text-lg font-semibold">Product Images</span>
                }
                key="2"
              >
                <Form.Item className="py-4" label="Product Image" name="images">
                  <div className="flex flex-col md:flex-row gap-6">
                    <UploadHelper
                      multiple={true}
                      max={4}
                      setImagePath={setImagePath}
                      image_path={image_path}
                    />
                    {image_path && (
                      <ShowImages
                        path={image_path}
                        setImage={setImagePath}
                        multiple={true}
                      />
                    )}
                  </div>
                </Form.Item>
              </Panel>
              {/* Pricing Information Panel */}
              <Panel
                header={
                  <span className="text-lg font-semibold">
                    Pricing Information
                  </span>
                }
                key="3"
              >
                {productTypeSelectedValue === "Stand Alone Product" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  <Form.Item
                    rules={[formValidation("Enter Product Price")]}
                    label="Customer Price"
                    name="customer_product_price"
                  >
                    <Input
                      placeholder="Enter Product Price"
                      type="text"
                      className="h-12 w-full md:w-80"
                    />
                  </Form.Item>
                  <Form.Item
                    rules={[formValidation("Enter Product Price")]}
                    label="Delear Price"
                    name="Deler_product_price"
                  >
                    <Input
                      placeholder="Enter Product Price"
                      type="text"
                      className="h-12 w-full md:w-80"
                    />
                  </Form.Item>
                  <Form.Item
                    rules={[formValidation("Enter Product Price")]}
                    label="Corporate Price"
                    name="corporate_product_price"
                  >
                    <Input
                      placeholder="Enter Product Price"
                      type="text"
                      className="h-12 w-full md:w-80"
                    />
                  </Form.Item>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3 items-center mb-4">
                      <label className="text-gray-700 font-medium">
                        Variants
                      </label>
                      <Button
                        type="primary"
                        onClick={handleAddVariant}
                        icon={<PlusOutlined />}
                        size="small"
                      >
                        Add Variant
                      </Button>
                    </div>

                    {!_.isEmpty(variants) && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {variants.map((data) => (
                            <Card
                              key={data._id}
                              size="small"
                              className="relative"
                              title={
                                <div className="flex items-center">
                                  <span>Variant Options</span>
                                </div>
                              }
                              extra={
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteFilled />}
                                  onClick={() =>
                                    handleOnDeleteVariantName(data)
                                  }
                                  size="small"
                                />
                              }
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                  <label className="text-gray-600">
                                    Variant Name
                                  </label>
                                  <Input
                                    size="middle"
                                    placeholder="eg. Color"
                                    value={data.variant_name}
                                    onChange={(e) =>
                                      handleOnChangeVariantName(e, data._id)
                                    }
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-gray-600">
                                    Variant Type
                                  </label>
                                  <Select
                                    value={data.variant_type}
                                    placeholder="Select Variant type"
                                    onChange={(e) =>
                                      handleOnChangeVariantType(e, data._id)
                                    }
                                  >
                                    <Select.Option value="text_box_variant">
                                      Text Box Variant
                                    </Select.Option>
                                    <Select.Option value="image_variant">
                                      Image Variant
                                    </Select.Option>
                                  </Select>
                                </div>

                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-gray-600">
                                      Variant Options
                                    </label>
                                    <Button
                                      type="dashed"
                                      onClick={() =>
                                        handleAddVariantOption(data._id)
                                      }
                                      icon={<PlusOutlined />}
                                      size="small"
                                    >
                                      Add Option
                                    </Button>
                                  </div>

                                  {data.options.map((option) => {
                                    return option.variant_type !==
                                      "image_variant" ? (
                                      <div
                                        key={option._id}
                                        className="flex items-center gap-2"
                                      >
                                        <Input
                                          placeholder="eg. White"
                                          value={option.value}
                                          onChange={(e) =>
                                            handleOnChangeVariantOptionName(
                                              e,
                                              data._id,
                                              option._id
                                            )
                                          }
                                          className="flex-1"
                                        />
                                        <Button
                                          type="text"
                                          danger
                                          icon={<DeleteFilled />}
                                          onClick={() =>
                                            handleOnDeleteVariantOptionName(
                                              data._id,
                                              option._id
                                            )
                                          }
                                          size="small"
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        key={option._id}
                                        className="flex items-center gap-2"
                                      >
                                        {option.image_name ? (
                                          <Image
                                            src={option.image_name}
                                            className="w-12 h-12 object-contain border rounded"
                                            preview={false}
                                          />
                                        ) : (
                                          <Input
                                            accept="image/*"
                                            type="file"
                                            onChange={(e) =>
                                              handleOnChangeVariantOptionImageName(
                                                e,
                                                data._id,
                                                option._id
                                              )
                                            }
                                            className="flex-1"
                                          />
                                        )}
                                        <Input
                                          placeholder="eg. White"
                                          value={option.value}
                                          onChange={(e) =>
                                            handleOnChangeVariantOptionName(
                                              e,
                                              data._id,
                                              option._id
                                            )
                                          }
                                          className="flex-1"
                                        />
                                        <Button
                                          type="text"
                                          danger
                                          icon={<DeleteFilled />}
                                          onClick={() =>
                                            handleOnDeleteVariantOptionName(
                                              data._id,
                                              option._id
                                            )
                                          }
                                          size="small"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>

                        <div className="mt-6">
                          <Table
                            bordered
                            dataSource={!_.isEmpty(variants) ? tableData : []}
                            columns={columns}
                            pagination={false}
                            scroll={{ x: true }}
                            className="custom-table"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </Panel>

              {/* Quantity Information Panel */}
              <Panel
                header={
                  <span className="text-lg font-semibold">
                    Quantity Information
                  </span>
                }
                key="4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name="quantity_type"
                    rules={[formValidation("Select Quantity Type")]}
                    label="Quantity Type"
                  >
                    <Select
                      className="h-12"
                      onChange={(e) => {
                        setQuantityType(e);
                      }}
                    >
                      <Select.Option key="Fixed" value="textbox">
                        Single text box
                      </Select.Option>
                      <Select.Option key="Variable" value="dropdown">
                        Dropdown
                      </Select.Option>
                    </Select>
                  </Form.Item>

                  {quantityType === "textbox" && (
                    <>
                      <Form.Item
                        name="max_quantity"
                        rules={[formValidation("Enter Maximum Quantity")]}
                        label="Maximum Quantity"
                      >
                        <Input type="number" className="h-12 w-full" />
                      </Form.Item>
                    </>
                  )}
                </div>

                <div className="mt-4">
                  <h2 className="font-medium mb-3">Quantity + Discount %</h2>
                  <Form.List name="quantity_discount_splitup">
                    {(fields, { add, remove }) => (
                      <>
                        <Form.Item>
                          <Button
                            onClick={() => add()}
                            icon={<PlusOutlined />}
                            className="h-10"
                          >
                            Add Quantity and Discount
                          </Button>
                        </Form.Item>

                        <div className="grid grid-cols-1 gap-3">
                          {fields.map(({ key, name, ...restField }) => (
                            <Card size="small" key={key} className="relative">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <Form.Item
                                  label="Quantity"
                                  {...restField}
                                  name={[name, "quantity"]}
                                  rules={[formValidation("Enter a Quantity")]}
                                  className="mb-0"
                                >
                                  <Input
                                    type="number"
                                    placeholder="Enter Quantity"
                                    className="h-10"
                                  />
                                </Form.Item>

                                <Form.Item
                                  hidden
                                  initialValue={`${key}${Date.now()}`}
                                  {...restField}
                                  name={[name, "uniqe_id"]}
                                  rules={[formValidation("Enter a Quantity")]}
                                  className="mb-0"
                                >
                                  <Input />
                                </Form.Item>

                                <Form.Item
                                  label="Discount %"
                                  {...restField}
                                  name={[name, "discount"]}
                                  rules={[formValidation("Enter a discount")]}
                                  className="mb-0"
                                >
                                  <Input
                                    type="number"
                                    placeholder="Enter Discount"
                                    className="h-10"
                                  />
                                </Form.Item>

                                <Form.Item
                                  label="Recommended"
                                  initialValue={"No comments"}
                                  {...restField}
                                  name={[name, "recommended_stats"]}
                                  rules={[formValidation("Enter a discount")]}
                                  className="mb-0"
                                >
                                  <Select
                                    className="h-10"
                                    defaultValue={"No comments"}
                                  >
                                    {["Recommended", "Most Liked","Best seller","No comments"].map(
                                      (res, index) => {
                                        return (
                                          <Select.Option
                                            key={index}
                                            value={res}
                                          >
                                            {res}
                                          </Select.Option>
                                        );
                                      }
                                    )}
                                  </Select>
                                </Form.Item>

                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteFilled />}
                                  onClick={() => remove(name)}
                                  className="absolute top-2 right-2"
                                />
                              </div>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </Form.List>
                </div>
              </Panel>

              {/* Product Tab Description Info Panel */}
              <Panel
                header={
                  <span className="text-lg font-semibold">
                    Product Tab Description Info
                  </span>
                }
                key="5"
              >
                <Form.List name="description_tabs">
                  {(fields, { add, remove }) => (
                    <>
                      <Tag
                        type="dashed"
                        onClick={() => add()}
                        block
                        className="cursor-pointer !bg-green-500 hover:!bg-orange-500 !mb-5 !text-white"
                      >
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
                              <Form.Item
                                label="Tab Name"
                                name={[field.name, "name"]}
                                rules={[formValidation("Enter tab name")]}
                              >
                                <Input className="!h-[50px] !w-[300px]" />
                              </Form.Item>
                              <Form.Item
                                label="Tab Name"
                                hidden
                                name={[field.name, "key"]}
                                initialValue={field.key}
                                rules={[formValidation("Enter tab name")]}
                              >
                                <Input className="!h-[50px] !w-[300px]" />
                              </Form.Item>
                              <Form.Item
                                label="Tab Type"
                                name={[field.name, "tab_type"]}
                                rules={[formValidation("Select tab Type")]}
                              >
                                <Select
                                  className="!h-[50px] !w-[300px]"
                                  onChange={() => {
                                    setDummy(!dummy);
                                  }}
                                >
                                  <Select.Option value={"Editor"}>
                                    Editor
                                  </Select.Option>
                                  <Select.Option value={"Table"}>
                                    Table View
                                  </Select.Option>
                                  <Select.Option value={"Content-With-Image"}>
                                    Content With Image
                                  </Select.Option>
                                </Select>
                              </Form.Item>
                            </div>
                            {GET_TABLE_TYPE(field.key) === "Editor" && (
                              <>
                                <Form.Item
                                  label="Description"
                                  name={[field.name, "description"]}
                                  rules={[formValidation("Enter Description")]}
                                >
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
                                          <Tag
                                            type="dashed"
                                            onClick={() => subOpt.add()}
                                            className="!cursor-pointer hover:!bg-orange-500 !bg-green-500 !mb-4 !text-white"
                                          >
                                            + Add Table Item
                                          </Tag>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                          {subFields.map((subField) => (
                                            <Space key={subField.key}>
                                              <Form.Item
                                                label="Left"
                                                name={[subField.name, "left"]}
                                                rules={[
                                                  formValidation(
                                                    "Enter left value"
                                                  ),
                                                ]}
                                              >
                                                <Input
                                                  placeholder="Left"
                                                  className="!h-[50px]"
                                                />
                                              </Form.Item>
                                              <Form.Item
                                                label="Right"
                                                name={[subField.name, "right"]}
                                                rules={[
                                                  formValidation(
                                                    "Enter right value"
                                                  ),
                                                ]}
                                              >
                                                <Input
                                                  placeholder="right"
                                                  className="!h-[50px]"
                                                />
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
                            {GET_TABLE_TYPE(field.key) ===
                              "Content-With-Image" && (
                              <>
                                <Form.Item label="Content With Image">
                                  <Form.List
                                    name={[field.name, "content_image_view"]}
                                  >
                                    {(subFields, subOpt) => (
                                      <>
                                        <div className="w-full center_div justify-end px-10">
                                          <Tag
                                            type="dashed"
                                            onClick={() =>
                                              subOpt.add({ images: [] })
                                            }
                                            className="!cursor-pointer hover:!bg-orange-500 !bg-green-500 !mb-4 !text-white"
                                          >
                                            + Add new image with content
                                          </Tag>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                          {subFields.map((subField) => (
                                            <div
                                              key={subField.key}
                                              className="flex flex-col"
                                            >
                                              <Form.Item
                                                label="Content"
                                                name={[
                                                  subField.name,
                                                  "content",
                                                ]}
                                                rules={[
                                                  formValidation(
                                                    "Enter content"
                                                  ),
                                                ]}
                                              >
                                                <Input.TextArea
                                                  placeholder="Content"
                                                  className=" !w-full"
                                                />
                                              </Form.Item>
                                              <Form.Item
                                                label="Content"
                                                hidden
                                                name={[
                                                  subField.name,
                                                  "image_id",
                                                ]}
                                                initialValue={subField.key}
                                                rules={[
                                                  formValidation(
                                                    "Enter content"
                                                  ),
                                                ]}
                                              >
                                                <Input.TextArea
                                                  placeholder="Content"
                                                  className=" !w-full"
                                                />
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
                                                <Input.TextArea
                                                  disabled
                                                  rows={5}
                                                  placeholder="Images"
                                                  className="!w-[90%] !h-[50px]"
                                                />
                                              </Form.Item>
                                              <div className="flex items-center gap-x-2">
                                                <Form.Item
                                                  label="Image"
                                                  name={[
                                                    subField.name,
                                                    "image",
                                                  ]}
                                                >
                                                  <UploadHelper
                                                    blog={true}
                                                    current_key={`${subField.key}-${field.key}`}
                                                    handleChange={handleChange}
                                                  />
                                                </Form.Item>
                                                <div className="flex gap-x-2 flex-wrap">
                                                  {GETCURRENT_SETOF_IMAGES(
                                                    `${subField.key}-${field.key}`
                                                  )?.map((res, index) => {
                                                    return (
                                                      <div
                                                        key={index}
                                                        className="relative"
                                                      >
                                                        <Image
                                                          height={50}
                                                          key={index}
                                                          className="!h-[50px] !w-[50px] !rounded-lg !border"
                                                          src={res}
                                                        />
                                                        <div
                                                          onClick={() => {
                                                            REMOVE_IMAGES(
                                                              `${subField.key}-${field.key}`,
                                                              res
                                                            );
                                                          }}
                                                          className="cursor-pointer text-center text-red-500 gap-x-2 center_div"
                                                        >
                                                          {
                                                            <ICON_HELPER.DELETE_ICON2 />
                                                          }
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
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </Form.List>
              </Panel>

              {/* SEO Information Panel */}
              <Panel
                header={
                  <span className="text-lg font-semibold">SEO Information</span>
                }
                key="6"
              >
                <div className="grid grid-cols-1 gap-4">
                  <Form.Item
                    name="seo_title"
                    rules={[formValidation("Enter SEO Title")]}
                    label="SEO Title"
                  >
                    <Input
                      onChange={(e) => {
                        handleChnage(e, "title");
                      }}
                      className="h-12"
                    />
                  </Form.Item>
                  <Form.Item
                    name="seo_keywords"
                    rules={[formValidation("Enter SEO keywords")]}
                    label="SEO keywords"
                  >
                    <Input
                      onChange={(e) => {
                        handleChnage(e, "keywords");
                      }}
                      className="h-12"
                    />
                  </Form.Item>

                  <Form.Item
                    name="seo_description"
                    rules={[formValidation("Enter SEO Description")]}
                    label="SEO description"
                  >
                    <Input.TextArea
                      onChange={(e) => {
                        handleChnage(e, "description");
                      }}
                      rows={3}
                    />
                  </Form.Item>

                  <Form.Item
                    label="URL"
                    name="seo_url"
                    rules={[formValidation("Enter SEO URL")]}
                  >
                    <Input
                      onChange={(e) => {
                        handleChnage(e, "url");
                      }}
                      className="h-12"
                      addonBefore={"https://printe.in/products/"}
                    />
                  </Form.Item>

                  <Card size="small" title="SEO Preview">
                    <h3 className="text-blue-600 text-lg mb-1">
                      {_.get(seo_datas, "title", ``) ||
                        `WWE Raw Results, News, Video & Photos`}
                    </h3>
                    <p className="text-green-600 text-sm mb-2">
                      {`https://www.printe.in/` + _.get(seo_datas, "url", ``) ||
                        `https://www.printe.in/product/Signages/Standees/Premium`}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {_.get(seo_datas, "description", ``) ||
                        `Lorem, ipsum dolor sit amet consectetur adipisicing elit.
                        Accusamus voluptatum consequuntur, quaerat perspiciatis architecto
                        neque, porro blanditiis fugit nulla, nobis error quisquam
                        consequatur ad corporis modi hic autem numquam et.`}
                    </p>
                  </Card>
                </div>
              </Panel>
            </Collapse>

            <Divider />

            <Form.Item className="my-6">
              <Button
                block
                htmlType="submit"
                type="primary"
                size="large"
                loading={loading}
                className="h-12 text-lg"
              >
                {id ? "Update Product" : "Add Product"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>

      {/* Unit Configuration Modal */}
      <Modal
        title="Unit Configuration"
        visible={modalUnitVisible}
        onOk={handleUnitOk}
        onCancel={handleUnitCancel}
        width={800}
        footer={[
          <Button key="cancel" onClick={handleUnitCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleUnitOk}>
            Save Configuration
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.List name="unit_splitup">
            {(fields, { add, remove }) => (
              <>
                <Form.Item>
                  <Button
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    className="h-10 mb-4"
                  >
                    Add Unit
                  </Button>
                </Form.Item>

                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                  {fields.map(({ key, name, ...restField }) => (
                    <Card size="small" key={key} className="relative">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <Form.Item
                          label="Unit"
                          {...restField}
                          name={[name, "Unit"]}
                          rules={[formValidation("Enter a Unit")]}
                          className="mb-0"
                        >
                          <Input
                            type="Text"
                            placeholder="Enter Unit"
                            className="h-10"
                          />
                        </Form.Item>

                        <Form.Item
                          label="Measurement"
                          {...restField}
                          name={[name, "Measurement"]}
                          rules={[formValidation("Enter a Measurement")]}
                          className="mb-0"
                        >
                          <Input
                            type="Text"
                            placeholder="Enter Measurement"
                            className="h-10"
                          />
                        </Form.Item>

                        <Button
                          type="text"
                          danger
                          icon={<DeleteFilled />}
                          onClick={() => remove(name)}
                          className="absolute top-2 right-2"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <style jsx>{`
        :global(.custom-collapse .ant-collapse-header) {
          align-items: center !important;
          font-weight: 600;
        }

        :global(.custom-table .ant-table-thead > tr > th) {
          background-color: #fafafa;
          font-weight: 600;
        }
      `}</style>
    </Spin>
  );
};

export default AddForms;
