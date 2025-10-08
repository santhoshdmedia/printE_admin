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
  DatePicker,
} from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteFilled,
  PlusOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import JoditEditor from "jodit-react";
import moment from "moment";
import { DndContext } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper imports
import {
  addproduct,
  editProduct,
  getAllVendor,
  getMainCategory,
  getSubCategory,
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

// Image structure definition
const createImageObject = (url, existingId = null) => ({
  _id: existingId || uuidv4(),
  path: url,
  url: url,
  type: 'image', // Consistent type
  uploadedAt: new Date().toISOString()
});

// Constants
const initialVariantOptionValue = {
  value: "",
  _id: Date.now() + 1,
  variant_type: "text_box_variant",
  image_names: [], // Always array of image objects
};

const initialVariantValue = {
  variant_name: "",
  variant_type: "text_box_variant",
  options: [initialVariantOptionValue],
  variant_images: [], // Always array of image objects
  _id: Date.now(),
};

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

const GST_preference = [
  { value: "5" },
  { value: "12" },
  { value: "18" },
  { value: "28" },
];

const PRODUTSTOCK_TYPE = [{ value: "Limited" }, { value: "Unliimted" }];
const Unit_type = [
  { value: "pcs" }, { value: "Box" }, { value: "cm" }, { value: "dozen" },
  { value: "gm" }, { value: "kg" }, { value: "lbs" }, { value: "meter" },
  { value: "inches" }, { value: "ft" }, { value: "Nos" }, { value: "Sqft" },
];

// Sortable Image Component
const SortableImage = ({ id, image, onRemove, showDragLabel = true }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group"
    >
      <Image
        src={image.url || image.path || image}
        alt="Product"
        className="!w-20 !h-20 object-cover rounded border-2 border-dashed border-gray-300"
        preview={{
          mask: (
            <div className="flex items-center justify-center">
              <EyeOutlined className="text-white" />
            </div>
          ),
        }}
      />
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="primary"
          danger
          size="small"
          icon={<DeleteFilled />}
          onClick={handleRemove}
          className="!w-6 !h-6 !min-w-0 !p-0 flex items-center justify-center"
        />
      </div>
      {showDragLabel && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">
          Drag to reorder
        </div>
      )}
    </div>
  );
};

// Sortable Image List Component
const SortableImageList = ({ images, setImages, showDragLabel = true }) => {
  const getImageId = (image) => {
    return image._id || image.path || image;
  };

  const getImageUrl = (image) => {
    return image.url || image.path || image;
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => getImageId(img) === active.id);
    const newIndex = images.findIndex((img) => getImageId(img) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newImages = arrayMove(images, oldIndex, newIndex);
      setImages(newImages);
    }
  };

  const handleRemove = (imageId) => {
    const newImages = images.filter(img => getImageId(img) !== imageId);
    setImages(newImages);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={images.map(img => getImageId(img))}>
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg !min-h-32">
          {images.map((image, index) => (
            <SortableImage
              key={getImageId(image)}
              id={getImageId(image)}
              image={image}
              onRemove={handleRemove}
              showDragLabel={showDragLabel}
            />
          ))}
          {images.length === 0 && (
            <div className="flex items-center justify-center w-full h-32 text-gray-500">
              No images uploaded yet
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
};

// Enhanced UploadHelper Component
const EnhancedUploadHelper = ({ 
  multiple = true, 
  max = 6,
  setImagePath, 
  image_path = [], 
  blog = false, 
  current_key, 
  handleChange,
  label = "Upload Images"
}) => {
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (event) => {
    try {
      setLoading(true);
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const uploadedImages = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("image", file);
        
        const result = await uploadImage(formData);
        const imageUrl = _.get(result, "data.data.url", "");
        
        if (imageUrl) {
          uploadedImages.push(createImageObject(imageUrl));
        }
      }

      if (uploadedImages.length > 0) {
        if (blog && current_key && handleChange) {
          // For blog, we only need the URL string
          handleChange(current_key, uploadedImages[0].url);
        } else {
          const currentImages = Array.isArray(image_path) ? image_path : [];
          const newImages = [...currentImages, ...uploadedImages].slice(0, max);
          setImagePath(newImages);
        }
        message.success(`Successfully uploaded ${uploadedImages.length} image(s)`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      message.error('Failed to upload images');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  if (blog) {
    return (
      <div className="flex flex-col gap-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          multiple={multiple}
          className="hidden"
          id={`blog-upload-${current_key}`}
        />
        <label
          htmlFor={`blog-upload-${current_key}`}
          className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-600 transition-colors"
        >
          {loading ? 'Uploading...' : 'Upload Image'}
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        multiple={multiple}
        className="hidden"
        id={`upload-${current_key || 'product'}`}
      />
      <label
        htmlFor={`upload-${current_key || 'product'}`}
        className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
      >
        <div className="flex flex-col items-center gap-2">
          <PlusOutlined className="text-2xl text-gray-400" />
          <span className="text-gray-600">{label}</span>
          <span className="text-sm text-gray-500">Minimum {max} images recommended</span>
          {loading && <Spin size="small" />}
        </div>
      </label>
      
      {image_path && image_path.length > 0 && (
        <div className="mt-4">
          <label className="text-gray-600 text-sm mb-2 block">
            Uploaded Images ({image_path.length}/{max}) - Drag to reorder
          </label>
          <SortableImageList
            images={image_path}
            setImages={setImagePath}
          />
        </div>
      )}
    </div>
  );
};

// Variant Option Image Upload Component
const VariantOptionImageUpload = ({ 
  variantId, 
  optionId, 
  optionValue, 
  image_names = [], 
  onImageUpload
}) => {
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (event) => {
    try {
      setLoading(true);
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const uploadedImages = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("image", file);
        
        const result = await uploadImage(formData);
        const imageUrl = _.get(result, "data.data.url", "");
        
        if (imageUrl) {
          uploadedImages.push(createImageObject(imageUrl));
        }
      }

      if (uploadedImages.length > 0) {
        const currentImages = Array.isArray(image_names) ? image_names : [];
        const newImages = [...currentImages, ...uploadedImages].slice(0, 6);
        onImageUpload(variantId, optionId, newImages);
        message.success(`Uploaded ${uploadedImages.length} image(s) for ${optionValue}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      message.error('Failed to upload images');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        multiple={true}
        className="hidden"
        id={`variant-option-upload-${variantId}-${optionId}`}
      />
      
      <label
        htmlFor={`variant-option-upload-${variantId}-${optionId}`}
        className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors"
      >
        <div className="flex flex-col items-center gap-2">
          <PlusOutlined className="text-xl text-gray-400" />
          <span className="text-gray-600">
            {image_names && image_names.length > 0 ? 'Add More' : 'Upload'} {optionValue} Images
          </span>
          <span className="text-sm text-gray-500">
            {image_names && image_names.length > 0 
              ? `${image_names.length}/6 images uploaded` 
              : `Upload 6 images for ${optionValue}`
            }
          </span>
          {loading && <Spin size="small" />}
        </div>
      </label>
      
      {(image_names && image_names.length > 0) && (
        <div className="mt-4">
          <label className="text-gray-600 text-sm mb-2 block">
            {optionValue} Images ({image_names.length}/6) - Drag to reorder
          </label>
          <SortableImageList
            images={image_names}
            setImages={(newImages) => onImageUpload(variantId, optionId, newImages)}
          />
        </div>
      )}
    </div>
  );
};

// Main Component
const AddForms = ({ fetchData, setFormStatus, id, setId }) => {
  const [form] = Form.useForm();
  const [image_path, setImagePath] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [subcategory_data, setSubcategory_data] = useState([]);
  const [filter_subcategory_data, setFilterSubcategory_data] = useState([]);
  const [variants, setVariants] = useState([{ ...initialVariantValue, _id: Date.now() }]);
  const [tableValue, setTableValue] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quantityType, setQuantityType] = useState("");
  const [dummy, setDummy] = useState(false);
  const [modalUnitVisible, setModalUnitVisible] = useState(false);
  const [usedProductCodes, setUsedProductCodes] = useState(new Set());
  
  const [percentageDifferences, setPercentageDifferences] = useState({
    customer: 0,
    dealer: 0,
    corporate: 0
  });

  const productTypeSelectedValue = Form.useWatch('type', form) || (id?.type || productType[0].value);
  const productStockSelectedValue = Form.useWatch('stocks_status', form) || (id?.stocks_status || PRODUTSTOCK_TYPE[1].value);

  const initial_seo_data = {
    title: "",
    keywords: "",
    description: "",
    url: "",
  };

  const [seo_datas, setSEO_Datas] = useState(initial_seo_data);

  // Check if any variant is image variant
  const hasImageVariant = variants.some(variant => 
    variant.variant_type === "image_variant"
  );

  // Helper function to normalize images to array of objects
  const normalizeImages = (images) => {
    if (!images) return [];
    
    return images.map(img => {
      if (typeof img === 'string') {
        return createImageObject(img);
      } else if (typeof img === 'object') {
        return {
          _id: img._id || uuidv4(),
          path: img.path || img.url || img.image_url || '',
          url: img.url || img.path || img.image_url || '',
          type: img.type || 'image',
          uploadedAt: img.uploadedAt || new Date().toISOString()
        };
      }
      return img;
    }).filter(img => img.path || img.url);
  };

  // API Functions
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

  // Effects
  useEffect(() => {
    productCategory();
    collectVendors();
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      onCategoryChnge(_.get(id, "category_details._id", ""));
      
      // Set form values
      const formValues = {
        ...id,
        vendor_details: _.get(id, "vendor_details", []).map((res) => res._id),
        category_details: _.get(id, "category_details._id", ""),
        sub_category_details: _.get(id, "sub_category_details._id", ""),
        stock_info: [],
      };

      form.setFieldsValue(formValues);
      setQuantityType(_.get(id, "quantity_type", ""));

      setSEO_Datas({
        title: _.get(id, "seo_title", ""),
        description: _.get(id, "seo_description", ""),
        url: _.get(id, "seo_url", ""),
      });

      setTableValue(_.get(id, "variants_price", []));
      
      // Normalize main product images to array of objects
      const productImages = _.get(id, "images", []);
      const normalizedImages = normalizeImages(productImages);
      setImagePath(normalizedImages);
      
      // Normalize variants with proper image structure
      const initialVariants = _.get(id, "variants", [initialVariantValue]);
      const updatedVariants = initialVariants.map(variant => ({
        ...variant,
        _id: variant._id || Date.now() + Math.random(),
        variant_images: normalizeImages(variant.variant_images || []),
        options: variant.options.map(option => ({
          ...option,
          _id: option._id || Date.now() + Math.random(),
          image_names: normalizeImages(option.image_names || [])
        }))
      }));
      
      console.log("Loaded variants with normalized images:", updatedVariants);
      setVariants(updatedVariants);
      setDummy(!dummy);
      setLoading(false);
    }
  }, [id, form]);

  // Helper Functions
  const calculatePercentageDifference = (mrp, price) => {
    const mrpValue = parseFloat(mrp) || 0;
    const priceValue = parseFloat(price) || 0;
    
    if (mrpValue === 0) return 0;
    
    const difference = priceValue - mrpValue;
    const percentage = (difference / mrpValue) * 100;
    
    return Math.round(percentage * 100) / 100;
  };

  const updatePercentageDifferences = (mrp, customerPrice, dealerPrice, corporatePrice) => {
    const mrpValue = parseFloat(mrp) || 0;
    
    const newPercentages = {
      customer: calculatePercentageDifference(mrpValue, customerPrice),
      dealer: calculatePercentageDifference(mrpValue, dealerPrice),
      corporate: calculatePercentageDifference(mrpValue, corporatePrice)
    };
    
    setPercentageDifferences(newPercentages);
  };

  // Price Handlers
  const handleMRPChange = (value) => {
    const mrp = parseFloat(value) || 0;
    const customerPrice = parseFloat(form.getFieldValue('customer_product_price') || 0);
    const dealerPrice = parseFloat(form.getFieldValue('Deler_product_price') || 0);
    const corporatePrice = parseFloat(form.getFieldValue('corporate_product_price') || 0);
    
    updatePercentageDifferences(mrp, customerPrice, dealerPrice, corporatePrice);
  };

  const handleCustomerPriceChange = (value) => {
    const customerPrice = parseFloat(value) || 0;
    const mrp = parseFloat(form.getFieldValue('MRP_price') || 0);
    const dealerPrice = parseFloat(form.getFieldValue('Deler_product_price') || 0);
    const corporatePrice = parseFloat(form.getFieldValue('corporate_product_price') || 0);
    
    updatePercentageDifferences(mrp, customerPrice, dealerPrice, corporatePrice);
  };

  const handleDealerPriceChange = (value) => {
    const dealerPrice = parseFloat(value) || 0;
    const mrp = parseFloat(form.getFieldValue('MRP_price') || 0);
    const customerPrice = parseFloat(form.getFieldValue('customer_product_price') || 0);
    const corporatePrice = parseFloat(form.getFieldValue('corporate_product_price') || 0);
    
    updatePercentageDifferences(mrp, customerPrice, dealerPrice, corporatePrice);
  };

  const handleCorporatePriceChange = (value) => {
    const corporatePrice = parseFloat(value) || 0;
    const mrp = parseFloat(form.getFieldValue('MRP_price') || 0);
    const customerPrice = parseFloat(form.getFieldValue('customer_product_price') || 0);
    const dealerPrice = parseFloat(form.getFieldValue('Deler_product_price') || 0);
    
    updatePercentageDifferences(mrp, customerPrice, dealerPrice, corporatePrice);
  };

  // Variant Handlers
  const handleAddVariant = () => {
    const newVariantId = Date.now() + Math.random();
    const newVariant = { 
      ...initialVariantValue, 
      _id: newVariantId,
      options: [{
        ...initialVariantOptionValue,
        _id: Date.now() + Math.random()
      }]
    };
    setVariants([...variants, newVariant]);
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
              _id: Date.now() + Math.random(),
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
              options: variant.options.map(option => ({
                ...option,
                variant_type: event,
                image_names: event === "image_variant" ? (option.image_names || []) : []
              }))
            }
          : variant
      )
    );
  };

  const handleOnDeleteVariantName = (variant_details) => {
    if (variants.length <= 1) {
      return CUSTOM_ERROR_NOTIFICATION("At least one variant is required");
    }
    
    if (!_.isEmpty(_.get(variant_details, "options", []))) {
      return CUSTOM_ERROR_NOTIFICATION("Please delete variant options first");
    }
    
    setVariants((prevVariants) =>
      prevVariants.filter((variant) => variant._id !== variant_details._id)
    );
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
      const variant = variants.find(v => v._id === VariantId);
      if (variant && variant.options.length <= 1) {
        return CUSTOM_ERROR_NOTIFICATION("At least one option is required");
      }

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

  // Variant Option Image Handlers
  const handleVariantOptionImageUpload = (variantId, optionId, images) => {
    setVariants(prevVariants =>
      prevVariants.map(variant =>
        variant._id === variantId
          ? {
              ...variant,
              options: variant.options.map(option =>
                option._id === optionId
                  ? { ...option, image_names: images }
                  : option
              )
            }
          : variant
      )
    );
  };

  // Table Handlers
  const handlePriceChange = (record, e, priceType) => {
    const { value } = e.target;
    const numericValue = parseFloat(value) || 0;

    const updatedRecord = {
      ...record,
      [priceType]: numericValue,
    };

    const updatedTableValue = tableValue.map((data) => {
      if (data.key === record.key) {
        return updatedRecord;
      }
      return data;
    });

    if (!updatedTableValue.some((data) => data.key === record.key)) {
      updatedTableValue.push(updatedRecord);
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

  const getVariantPercentageDifference = (record, priceType) => {
    const mrp = record.MRP_price || 0;
    const price = record[priceType] || 0;
    return calculatePercentageDifference(mrp, price);
  };

  // Form Helpers
  const onCategoryChnge = (value) => {
    if (value) {
      let response = subcategory_data.filter((data) => {
        return data.select_main_category === value;
      });
      setFilterSubcategory_data(response);
    }
  };

  const handleChnge = (e, location) => {
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
      form.getFieldValue("description_tabs"),
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

  const REMOVE_IMAGES = (id, delete_url) => {
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
      initial?.splice(initial?.indexOf(delete_url), 1);
      currentObject[0].images = initial;
    } catch (err) {
      console.log(err);
    } finally {
      setDummy(!dummy);
    }
  };

  // Generate Product Code
  const generateProductCode = (isVariableProduct = false, variantName = "") => {
    const categoryId = form.getFieldValue("category_details");
    const subCategoryId = form.getFieldValue("sub_category_details");

    if (!categoryId || !subCategoryId) {
      message.warning("Please select category and subcategory first");
      return null;
    }

    const category = categoryData.find((c) => c._id === categoryId);
    const subCategory = filter_subcategory_data.find(
      (sc) => sc._id === subCategoryId
    );

    if (!category || !subCategory) {
      message.warning("Please select valid category and subcategory");
      return null;
    }

    const categoryPrefix = category.main_category_name.charAt(0).toUpperCase();
    const subCategoryPrefix = subCategory.sub_category_name.charAt(0).toUpperCase();

    let variantPrefix = "";
    if (isVariableProduct && variantName) {
      variantPrefix = variantName.charAt(0).toUpperCase();
    }

    let productCode = "";
    let isUnique = false;
    let attemptCount = 0;
    const maxAttempts = 50;

    while (!isUnique && attemptCount < maxAttempts) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      productCode = `${categoryPrefix}${subCategoryPrefix}${variantPrefix}${randomNum}`;

      if (!usedProductCodes.has(productCode)) {
        isUnique = true;
        setUsedProductCodes((prev) => new Set([...prev, productCode]));
      }
      attemptCount++;
    }

    if (attemptCount >= maxAttempts) {
      message.error("Could not generate a unique product code. Please try again.");
      return null;
    }

    return productCode;
  };

  // Modal Handlers
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
      const variantName = variants[i]?.variant_name || `Variant ${i + 1}`;
      return {
        ...acc,
        [variantName]: data.value,
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

  // Stock Info Data
  const stockInfoData = (form.getFieldValue("stock_info") || []).map(
    (item, index) => ({
      key: `new-${index}`,
      _id: item._id || uuidv4(),
      add_stock: item.add_stock,
      date: item.date ? moment(item.date).format("DD/MM/YYYY h:mm A") : "",
      invoice: item.invoice || "",
      note: item.notes || "",
    })
  );

  const combinedStockInfoData = [
    ...(id?.stock_info || []).map((item, index) => ({
      key: `existing-${index}`,
      _id: item._id || uuidv4(),
      add_stock: item.add_stock,
      date: item.date ? moment(item.date).format("DD/MM/YYYY h:mm A") : "",
      invoice: item.invoice || "",
      note: item.notes || "",
    })),
    ...stockInfoData,
  ].reduce((unique, item) => {
    return unique.some((u) => u._id === item._id) ? unique : [...unique, item];
  }, []);

  // Stock Info Columns
  const stockInfoColumns = [
    {
      title: "Add Stock",
      dataIndex: "add_stock",
      key: "add_stock",
      render: (text) => text || "N/A",
    },
    {
      title: "Date & Time",
      dataIndex: "date",
      key: "date",
      render: (text) => text || "N/A",
    },
    {
      title: "Invoice",
      dataIndex: "invoice",
      key: "invoice",
      render: (text) => text || "N/A",
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      render: (text) => text || "N/A",
    },
  ];

  // Variant Table Columns
  const columns = [
    ...variants.map((variant) => ({
      title: variant.variant_name || `Variant ${variant._id}`,
      dataIndex: variant.variant_name,
      key: variant.variant_name,
      render: (text) => text || "-",
    })),
    {
      title: "MRP price",
      dataIndex: "MRP_price",
      key: "MRP_price",
      render: (text, record, index) => (
        <Input
          type="number"
          key={index}
          required
          placeholder="MRP price"
          value={record.MRP_price}
          onChange={(e) => handlePriceChange(record, e, "MRP_price")}
        />
      ),
    },
    {
      title: "Customer Price",
      dataIndex: "customer_product_price",
      key: "customer_product_price",
      render: (text, record, index) => (
        <div>
          <Input
            type="number"
            key={index}
            required
            placeholder="Customer Price"
            value={record.customer_product_price}
            onChange={(e) => handlePriceChange(record, e, "customer_product_price")}
          />
          {record.MRP_price && record.customer_product_price && (
            <div className="text-xs mt-1">
              <Tag 
                color={getVariantPercentageDifference(record, "customer_product_price") > 0 ? "green" : "red"}
                icon={getVariantPercentageDifference(record, "customer_product_price") > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              >
                {getVariantPercentageDifference(record, "customer_product_price") > 0 ? '+' : ''}
                {getVariantPercentageDifference(record, "customer_product_price").toFixed(2)}%
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Dealer Price",
      dataIndex: "Deler_product_price",
      key: "Deler_product_price",
      render: (text, record, index) => (
        <div>
          <Input
            type="number"
            key={index}
            required
            placeholder="Dealer Price"
            value={record.Deler_product_price}
            onChange={(e) => handlePriceChange(record, e, "Deler_product_price")}
          />
          {record.MRP_price && record.Deler_product_price && (
            <div className="text-xs mt-1">
              <Tag 
                color={getVariantPercentageDifference(record, "Deler_product_price") > 0 ? "green" : "red"}
                icon={getVariantPercentageDifference(record, "Deler_product_price") > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              >
                {getVariantPercentageDifference(record, "Deler_product_price") > 0 ? '+' : ''}
                {getVariantPercentageDifference(record, "Deler_product_price").toFixed(2)}%
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Corporate Price",
      dataIndex: "corporate_product_price",
      key: "corporate_product_price",
      render: (text, record, index) => (
        <div>
          <Input
            type="number"
            key={index}
            required
            placeholder="Corporate Price"
            value={record.corporate_product_price}
            onChange={(e) => handlePriceChange(record, e, "corporate_product_price")}
          />
          {record.MRP_price && record.corporate_product_price && (
            <div className="text-xs mt-1">
              <Tag 
                color={getVariantPercentageDifference(record, "corporate_product_price") > 0 ? "green" : "red"}
                icon={getVariantPercentageDifference(record, "corporate_product_price") > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              >
                {getVariantPercentageDifference(record, "corporate_product_price") > 0 ? '+' : ''}
                {getVariantPercentageDifference(record, "corporate_product_price").toFixed(2)}%
              </Tag>
            </div>
          )}
        </div>
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
              style={{ cursor: "pointer" }}
            />
          }
        />
      ),
    },
  ];

  // Form Submission - FIXED with consistent image structure
  const handleFinish = async (values) => {
    try {
      console.log("Form Values:", values);
      console.log("Variants:", variants);
      console.log("Has Image Variant:", hasImageVariant);
      
      setLoading(true);
      
      // Handle stock info
      const existingStockInfo = (id ? _.get(id, "stock_info", []) : []).map(
        (item) => ({
          ...item,
          _id: item._id || uuidv4(),
          date: item.date ? new Date(item.date).toISOString() : null,
        })
      );
      
      const newStockInfo = (values.stock_info || []).map((item) => ({
        ...item,
        _id: uuidv4(),
        date: item.date ? item.date.toISOString() : null,
      }));

      const combinedStockInfo = [...existingStockInfo, ...newStockInfo];
      const uniqueStockInfo = [];
      const seenIds = new Set();

      combinedStockInfo.forEach((item) => {
        if (!seenIds.has(item._id)) {
          seenIds.add(item._id);
          uniqueStockInfo.push(item);
        }
      });

      values.stock_info = uniqueStockInfo;

      // Calculate total stock
      const existingStockCount = id ? Number(_.get(id, "stock_count", 0)) : 0;
      const newStock = newStockInfo.reduce(
        (sum, item) => sum + (Number(item.add_stock) || 0),
        0
      );
      values.stock_count = Number(existingStockCount) + Number(newStock);

      // FIXED: Handle ALL images as arrays of objects
      values.images = image_path.map(img => ({
        _id: img._id,
        path: img.path,
        url: img.url,
        type: img.type || 'image',
        uploadedAt: img.uploadedAt
      }));

      // Process variants with consistent image structure
      values.variants = variants.map(variant => ({
        variant_name: variant.variant_name,
        variant_type: variant.variant_type,
        variant_images: variant.variant_images ? variant.variant_images.map(img => ({
          _id: img._id,
          path: img.path,
          url: img.url,
          type: img.type || 'image',
          uploadedAt: img.uploadedAt
        })) : [],
        options: variant.options.map(option => ({
          value: option.value,
          variant_type: option.variant_type,
          image_names: option.image_names.map(img => ({
            _id: img._id,
            path: img.path,
            url: img.url,
            type: img.type || 'image',
            uploadedAt: img.uploadedAt
          }))
        }))
      }));

      values.variants_price = tableValue;
      values.seo_url = String(values.seo_url).trim();

      // ADD DEBUG LOGS TO VERIFY IMAGE DATA
      console.log("Processed Main Images:", values.images);
      console.log("Processed Variants:", values.variants);
      values.variants.forEach((variant, index) => {
        console.log(`Variant ${index}:`, variant.variant_name);
        variant.options.forEach((option, optIndex) => {
          console.log(`  Option ${optIndex}:`, option.value);
          console.log(`  Images:`, option.image_names);
        });
      });

      console.log("Final submission data:", values);

      let result = id
        ? await editProduct(values, id?._id)
        : await addproduct(values);

      setFormStatus(false);
      SUCCESS_NOTIFICATION(result);
      form.resetFields();
      setId("");
      setQuantityType("");
      setImagePath([]);
      setFormStatus(false);
      fetchData();
      setSEO_Datas(initial_seo_data);
      setPercentageDifferences({ customer: 0, dealer: 0, corporate: 0 });
    } catch (err) {
      console.log("Error in form submission:", err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const userRole = JSON.parse(localStorage.getItem("userprofile"));

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
              defaultActiveKey={["1", "2", "3", "4", "5", "6", "7"]}
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
                <div className={`grid grid-cols-1 md:grid-cols-2 ${userRole.role == "super admin"?"lg:grid-cols-4":"lg:grid-cols-3"} gap-4`}>
                  {userRole.role == "super admin" && (
                  <div className="p-2 bg-blue-200 rounded-lg !text-lg">
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
                    </div>
                  )}
                  <div className="p-2 bg-gray-100 rounded-lg !text-lg">
                    <Form.Item
                      name="is_customer"
                      label="Customer product"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg !text-lg">
                    <Form.Item
                      name="is_dealer"
                      label="Dealer product"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg !text-lg">
                  <Form.Item
                    name="is_corporate"
                    label="Corporate product"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  </div>
                </div>
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
                      onChange={(e) => onCategoryChnge(e)}
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
                    />
                  </Form.Item>

                 {productTypeSelectedValue === "Stand Alone Product" && <Form.Item
                    label="Product Code"
                    name="product_code"
                    rules={[
                      { required: true, message: "Product code is required" },
                    ]}
                    className="mb-0"
                  >
                    <Input
                      placeholder="Product code will be generated automatically"
                      suffix={
                        <ReloadOutlined
                          onClick={() => {
                            const code = generateProductCode(false);
                            if (code)
                              form.setFieldsValue({ product_code: code });
                          }}
                      className="h-10"
                          style={{ cursor: "pointer" }}
                        />
                      }
                    />
                  </Form.Item>}

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
                            {item.business_name}({item.vendor_name})
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
                    label="Tax Preference"
                    name="Tax_prefernce"
                    rules={[
                      {
                        required: true,
                        message: "Please select a Tax preference!",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select type"
                      className="h-12"
                      options={TaxPreference}
                    />
                  </Form.Item>
                  <Form.Item
                    label="GST Percentage"
                    name="GST"
                    rules={[
                      {
                        required: true,
                        message: "Please select a GST percentage!",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select type"
                      className="h-12"
                      options={GST_preference}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  rules={[formValidation("enter title for description")]}
                  label="Product Description Title"
                  name="product_description_tittle"
                >
                  <Input
                    placeholder="Enter description title"
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

              {/* Stock Info Panel */}
              <Panel
                header={
                  <div className="flex md:flex-row flex-col justify-between items-center">
                    <span className="text-lg font-semibold">
                      Stock Information
                    </span>
                    <span>Current Stock:{_.get(id, "stock_count", 0)}</span>
                  </div>
                }
                key="7"
              >
                <div className="mt-4">
                  <h2 className="font-medium mb-3">Stock Info</h2>
                  <Form.List name="stock_info">
                    {(fields, { add, remove }) => (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <Form.Item className="mb-0">
                            <Button
                              onClick={() => add()}
                              icon={<PlusOutlined />}
                              className="h-10"
                            >
                              Add Stock Info
                            </Button>
                          </Form.Item>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {fields.map(({ key, name, ...restField }) => (
                            <Card size="small" key={key} className="relative">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <Form.Item
                                  label="Add Stock"
                                  {...restField}
                                  name={[name, "add_stock"]}
                                  rules={[
                                    formValidation("Enter stock quantity"),
                                  ]}
                                  className="mb-0"
                                >
                                  <Input
                                    type="number"
                                    placeholder="Enter Stock Quantity"
                                    className="h-10"
                                  />
                                </Form.Item>

                                <Form.Item
                                  label="Date & Time"
                                  {...restField}
                                  name={[name, "date"]}
                                  rules={[formValidation("Select a date")]}
                                  className="mb-0"
                                >
                                  <DatePicker
                                    showTime
                                    className="h-10 w-full"
                                    format="DD/MM/YYYY h:mm A"
                                  />
                                </Form.Item>

                                <Form.Item
                                  label="Invoice"
                                  {...restField}
                                  name={[name, "invoice"]}
                                  className="mb-0"
                                >
                                  <Input
                                    placeholder="Enter Invoice"
                                    className="h-10"
                                  />
                                </Form.Item>

                                <Form.Item
                                  label="Note"
                                  {...restField}
                                  name={[name, "notes"]}
                                  className="mb-0"
                                >
                                  <Input.TextArea
                                    placeholder="Enter Notes"
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

                        {/* Display unique stock entries in the table */}
                        {combinedStockInfoData.length > 1 && (
                          <div className="mt-6">
                            <Table
                              bordered
                              dataSource={combinedStockInfoData}
                              columns={stockInfoColumns}
                              pagination={false}
                              scroll={{ x: true }}
                              className="custom-table"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </Form.List>
                </div>
              </Panel>

              {/* Product Images Panel */}
              {productTypeSelectedValue !== "Variable Product" || !hasImageVariant ? (
                <Panel
                  header={
                    <span className="text-lg font-semibold">Product Images</span>
                  }
                  key="2"
                >
                  <Form.Item className="py-4" label="Product Image" name="images">
                    <EnhancedUploadHelper
                      multiple={true}
                      max={6}
                      setImagePath={setImagePath}
                      image_path={image_path}
                      label="Upload Product Images (Minimum 6 images)"
                    />
                  </Form.Item>
                </Panel>
              ) : null}

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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Form.Item
                      rules={[formValidation("Enter MRP Price")]}
                      label="MRP Price"
                      name="MRP_price"
                    >
                      <Input
                        placeholder="Enter MRP Price"
                        type="Number"
                        className="h-12"
                        onChange={(e) => handleMRPChange(e.target.value)}
                      />
                    </Form.Item>
                    
                    <Form.Item
                      rules={[formValidation("Enter Customer Price")]}
                      label={
                        <div className="flex items-center gap-2">
                          <span>Customer Price</span>
                          {percentageDifferences.customer !== 0 && (
                            <Tag 
                              color={percentageDifferences.customer > 0 ? "green" : "red"}
                              icon={percentageDifferences.customer > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                              className="text-xs"
                            >
                              {percentageDifferences.customer > 0 ? '+' : ''}
                              {percentageDifferences.customer.toFixed(2)}%
                            </Tag>
                          )}
                        </div>
                      }
                      name="customer_product_price"
                    >
                      <Input
                        placeholder="Enter Customer Price"
                        type="Number"
                        className="h-12"
                        onChange={(e) => handleCustomerPriceChange(e.target.value)}
                      />
                    </Form.Item>
                    
                    <Form.Item
                      rules={[formValidation("Enter Dealer Price")]}
                      label={
                        <div className="flex items-center gap-2">
                          <span>Dealer Price</span>
                          {percentageDifferences.dealer !== 0 && (
                            <Tag 
                              color={percentageDifferences.dealer > 0 ? "green" : "red"}
                              icon={percentageDifferences.dealer > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                              className="text-xs"
                            >
                              {percentageDifferences.dealer > 0 ? '+' : ''}
                              {percentageDifferences.dealer.toFixed(2)}%
                            </Tag>
                          )}
                        </div>
                      }
                      name="Deler_product_price"
                    >
                      <Input
                        placeholder="Enter Dealer Price"
                        type="Number"
                        className="h-12"
                        onChange={(e) => handleDealerPriceChange(e.target.value)}
                      />
                    </Form.Item>
                    
                    <Form.Item
                      rules={[formValidation("Enter Corporate Price")]}
                      label={
                        <div className="flex items-center gap-2">
                          <span>Corporate Price</span>
                          {percentageDifferences.corporate !== 0 && (
                            <Tag 
                              color={percentageDifferences.corporate > 0 ? "green" : "red"}
                              icon={percentageDifferences.corporate > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                              className="text-xs"
                            >
                              {percentageDifferences.corporate > 0 ? '+' : ''}
                              {percentageDifferences.corporate.toFixed(2)}%
                            </Tag>
                          )}
                        </div>
                      }
                      name="corporate_product_price"
                    >
                      <Input
                        placeholder="Enter Corporate Price"
                        type="Number"
                        className="h-12"
                        onChange={(e) => handleCorporatePriceChange(e.target.value)}
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
                                      Image Variant (Upload 6 images per option)
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

                                  {data.options.map((option) => (
                                    <div
                                      key={option._id}
                                      className="flex flex-col gap-3 p-3 border rounded-lg"
                                    >
                                      <div className="flex items-center gap-2">
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
                                      
                                      {/* Image Upload for Image Variants */}
                                      {data.variant_type === "image_variant" && (
                                        <VariantOptionImageUpload
                                          variantId={data._id}
                                          optionId={option._id}
                                          optionValue={option.value}
                                          image_names={option.image_names || []}
                                          onImageUpload={handleVariantOptionImageUpload}
                                        />
                                      )}
                                    </div>
                                  ))}
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
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
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
                                  label="Customer Discount %"
                                  {...restField}
                                  name={[name, "Customer_discount"]}
                                  rules={[formValidation("Enter a Customer  discount")]}
                                  className="mb-0"
                                >
                                  <Input
                                    type="number"
                                    placeholder="Enter Customer  Discount"
                                    className="h-10"
                                  />
                                </Form.Item>
                                <Form.Item
                                  label="Dealer Discount %"
                                  {...restField}
                                  name={[name, "Dealer_discount"]}
                                  rules={[formValidation("Enter a Dealer discount")]}
                                  className="mb-0"
                                >
                                  <Input
                                    type="number"
                                    placeholder="Enter Dealer Discount"
                                    className="h-10"
                                  />
                                </Form.Item>
                                <Form.Item
                                  label="Corporate Discount %"
                                  {...restField}
                                  name={[name, "Corporate_discount"]}
                                  rules={[formValidation("Enter a Corporate discount")]}
                                  className="mb-0"
                                >
                                  <Input
                                    type="number"
                                    placeholder="Enter Dealer Discount"
                                    className="h-10"
                                  />
                                </Form.Item>
                                

                                <Form.Item
                                  label="Free Deliverey"
                                  {...restField}
                                  name={[name, "Free_Deliverey"]}
                                  className="mb-0 "
                                  >
                                  <Switch />
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
                                    {[
                                      "Recommended",
                                      "Most Picked",
                                      "High seller",
                                      "Best seller",
                                      "No comments",
                                    ].map((res, index) => {
                                      return (
                                        <Select.Option key={index} value={res}>
                                          {res}
                                        </Select.Option>
                                      );
                                    })}
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
                                                  <EnhancedUploadHelper
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
                        handleChnge(e, "title");
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
                        handleChnge(e, "keywords");
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
                        handleChnge(e, "description");
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
                        handleChnge(e, "url");
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