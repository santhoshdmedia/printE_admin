import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MdDelete,
  MdContentCopy,
  MdMoreVert,
  MdStar,
  MdNewReleases,
  MdThumbUp,
} from "react-icons/md";
import {
  Button,
  Descriptions,
  Form,
  Image,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Card,
  Typography,
  Dropdown,
  Menu,
} from "antd";
import { FaEdit, FaEye, FaFilter } from "react-icons/fa";
import _ from "lodash";
import {
  addproduct,
  CLIENT_URL,
  deleteProduct,
  editProduct,
  getAllCategoryProducts,
  getAllVendor,
  getMainCategory,
  getProduct,
  getSubCategory,
  getSingleVendor,
} from "../../api";
import {
  ERROR_NOTIFICATION,
  SUCCESS_NOTIFICATION,
} from "../../helper/notification_helper";
import CustomTable from "../../components/CustomTable";
import DefaultTile from "../../components/DefaultTile";
import { useForm } from "antd/es/form/Form";
import AddForms from "./AddForms";

const { Title, Text } = Typography;

const Products = () => {
  const [formStatus, setFormStatus] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [search, setSearch] = useState("");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mainCategory, setMainCategoryData] = useState([]);
  const [filterByProductCategory, setFilterByProductCategory] = useState("");
  const [filterByProductSubcategory, setFilterByProductSubcategory] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [filterByType, setFilterByType] = useState("");
  const [vendorClose, setVendorClose] = useState([]);
  const [subcategoryData, setSubcategoryData] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [cloneModal, setOpenCloneModal] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [subcategoryDataFilter, setSubcategoryDataFilter] = useState([]);
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [productId, setProductId] = useState();
  const [showFilters, setShowFilters] = useState(false);
  const [vendorNames, setVendorNames] = useState({});
  const [vendorsLoading, setVendorsLoading] = useState({});
  const [cloneProductDetails, setCloneProductDetails] = useState([]);
  const [form] = useForm();

  const handleOpenModal = (productData) => {
    const product = { ...productData };
    delete product.category_details;
    delete product.sub_category_details;
    const product_id = product._id;
    delete product._id;

    try {
      setSelectedProductData(product);
      setProductId(product_id);
      setOpenCloneModal(true);
    } catch (err) {
      console.log(err);
    }
  };

  const handleCloseModal = () => {
    form.resetFields();
    setCloneProductDetails([]);
    setSelectedProductData(null);
    setOpenCloneModal(false);
  };

  const onCategoryChange = (value) => {
    setFilterByProductCategory(value);
    setFilterByProductSubcategory("");
    
    if (value) {
      // Filter subcategories based on the selected main category using select_main_category field
      const filteredSubcategories = subcategoryData.filter(
        (subcategory) => subcategory.select_main_category === value
      );
      setSubcategoryDataFilter(filteredSubcategories);
    } else {
      setSubcategoryDataFilter([]);
    }
  };

  const onCloneCategoryChange = (value) => {
    if (value) {
      // Filter subcategories for clone modal based on the selected main category
      const filteredSubcategories = subcategoryData.filter(
        (subcategory) => subcategory.select_main_category === value
      );
      setSubcategoryDataFilter(filteredSubcategories);
    } else {
      setSubcategoryDataFilter([]);
    }
    
    // Clear subcategory selection when main category changes
    form.setFieldValue("sub_category_details", undefined);
  };

  const fetchCategories = async () => {
    try {
      const [mainResult, subResult] = await Promise.all([
        getMainCategory(),
        getSubCategory(),
      ]);
      setCategoryData(_.get(mainResult, "data.data", []));
      setSubcategoryData(_.get(subResult, "data.data", []));
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const fetchMainCategories = async () => {
    try {
      const result = await getAllCategoryProducts();
      setMainCategoryData(_.get(result, "data.data", []));
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getProduct(
        "",
        search,
        true,
        filterByProductCategory,
        filterByType,
        filterByProductSubcategory,
        vendorFilter
      );
      setTableData(_.get(result, "data.data", []).reverse());
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...cloneProductDetails,
        parent_product_id: _.get(cloneProductDetails, "_id", ""),
        is_cloned: true,
        category_details: values.category_details,
        sub_category_details: values.sub_category_details,
      };
      delete payload._id;

      const result = await addproduct(payload);
      SUCCESS_NOTIFICATION(result);
      form.resetFields();
      fetchData();
      setCloneProductDetails([]);
      setOpenCloneModal(false);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (data) => {
    setId(data);
    setFormStatus(true);
  };

  const handleDelete = async (data) => {
    try {
      const payload = {
        product_id: data._id,
        is_cloned: data.is_cloned,
      };
      const result = await deleteProduct(JSON.stringify(payload));
      SUCCESS_NOTIFICATION(result);
      fetchData();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleView = (id) => {
    window.open(`${CLIENT_URL}/product/${_.get(id, "seo_url", "")}`);
  };

  const handleOnChangeLabel = async (data, product) => {
    try {
      const result = await editProduct(data, _.get(product, "_id", ""));
      SUCCESS_NOTIFICATION(result);
      fetchData();
    } catch (error) {
      ERROR_NOTIFICATION(error);
    }
  };

  const getVendorName = useCallback(
    async (id) => {
      if (!id) return null;
      if (vendorNames[id]) return vendorNames[id];

      setVendorsLoading((prev) => ({ ...prev, [id]: true }));
      try {
        const vendor = await getSingleVendor(id);
        const businessName = _.get(
          vendor,
          "data.data.business_name",
          "Unknown Vendor"
        );
        setVendorNames((prev) => ({ ...prev, [id]: businessName }));
        return businessName;
      } catch (error) {
        console.error("Error fetching vendor:", error);
        setVendorNames((prev) => ({ ...prev, [id]: "Error Loading Vendor" }));
        return "Error Loading Vendor";
      } finally {
        setVendorsLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [vendorNames]
  );

  const collectVendors = async () => {
    try {
      setLoading(true);
      const result = await getAllVendor();
      setAllVendors(_.get(result, "data.data", []));
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced helper function to get variant images with proper handling
  const getVariantImages = (product) => {
    if (!product.variants || !Array.isArray(product.variants)) return [];

    const variantImages = [];
    
    product.variants.forEach((variantGroup) => {
      if (variantGroup.variant_type === "image_variant" && variantGroup.options) {
        variantGroup.options.forEach((option) => {
          if (option.image_names && Array.isArray(option.image_names) && option.image_names.length > 0) {
            // Handle both object format and string format for images
            const images = option.image_names.map(img => 
              typeof img === 'object' ? _.get(img, "url", _.get(img, "path", "")) : img
            ).filter(img => img);
            
            if (images.length > 0) {
              variantImages.push({
                variantName: variantGroup.variant_name,
                optionValue: option.value,
                images: images
              });
            }
          }
        });
      }
    });

    return variantImages;
  };

  // Enhanced helper function to get first variant image
  const getFirstVariantImage = (product) => {
    const variantImages = getVariantImages(product);
    
    for (const variant of variantImages) {
      if (variant.images && variant.images.length > 0) {
        return variant.images[0];
      }
    }
    
    return null;
  };

  // Enhanced helper function to display product image with proper URL handling
  const getProductImage = (product) => {
    // First check if there are main product images
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (typeof firstImage === 'object') {
        return _.get(firstImage, "url", _.get(firstImage, "path", ""));
      }
      return firstImage;
    }
    
    // Then check for variant images
    const variantImage = getFirstVariantImage(product);
    if (variantImage) {
      return variantImage;
    }
    
    return "";
  };

  // Enhanced function to get product price based on type
  const getProductPrice = (product, priceType = 'customer') => {
    const priceFieldMap = {
      'customer': 'customer_product_price',
      'dealer': 'Deler_product_price', 
      'corporate': 'corporate_product_price'
    };

    const priceField = priceFieldMap[priceType];
    
    if (product.type === "Stand Alone Product") {
      return product[priceField] || product.MRP_price || "N/A";
    } 
    else if (product.type === "Variant Product" || product.type === "Variable Product") {
      if (product.variants_price && Array.isArray(product.variants_price) && product.variants_price.length > 0) {
        const prices = product.variants_price
          .map(variant => {
            const price = variant[priceField] || variant.price;
            return price ? parseFloat(price) : null;
          })
          .filter(price => price !== null && !isNaN(price));
        
        if (prices.length > 0) {
          return Math.min(...prices);
        }
      }
      
      return product[priceField] || product.MRP_price || "N/A";
    }
    
    return "N/A";
  };

  // Enhanced function to calculate total stock for variant products
  const getTotalStock = (product) => {
    if ((product.type === "Variant Product" || product.type === "Variable Product") && 
        product.variants_price && Array.isArray(product.variants_price)) {
      return product.variants_price.reduce((sum, variant) => {
        const stock = parseInt(variant.stock) || 0;
        return sum + stock;
      }, 0);
    }
    
    return product.stock_count || 0;
  };

  useEffect(() => {
    fetchCategories();
    fetchMainCategories();
    collectVendors();
  }, []);

  useEffect(() => {
    fetchData();
    if (!formStatus) setId("");
  }, [
    search,
    formStatus,
    filterByProductCategory,
    filterByType,
    filterByProductSubcategory,
    vendorFilter,
  ]);

  useEffect(() => {
    if (vendorClose.length > 0) {
      vendorClose.forEach((vendor) => {
        if (!vendorNames[vendor._id]) {
          getVendorName(vendor._id);
        }
      });
    }
  }, [vendorClose, vendorNames, getVendorName]);

  const userRole = JSON.parse(localStorage.getItem("userprofile")) || {};

  const productType = [
    { value: "Stand Alone Product", label: "Stand Alone Product" },
    { value: "Variable Product", label: "Variable Product" },
    { value: "Variant Product", label: "Variant Product" },
  ];

  const handleClearFilters = () => {
    setFilterByProductCategory("");
    setFilterByProductSubcategory("");
    setVendorFilter("");
    setFilterByType("");
    setSubcategoryDataFilter([]);
  };

  // Process table data with serial numbers in reverse order
  const processedTableData = tableData.map((item, index) => ({
    ...item,
    serialNumber: tableData.length - index,
    totalStock: getTotalStock(item),
    prices: {
      customerPrice: getProductPrice(item, 'customer'),
      dealerPrice: getProductPrice(item, 'dealer'),
      corporatePrice: getProductPrice(item, 'corporate'),
    }
  }));

  const columns = [
    {
      title: "S.No",
      dataIndex: "serialNumber",
      align: "center",
      width: 80,
      render: (serialNumber) => (
        <span className="text-gray-700 font-semibold">{serialNumber}</span>
      ),
    },
    {
      title: "Clone",
      align: "center",
      width: 80,
      render: (data) => (
        <div
          onClick={() => {
            setCloneProductDetails(data);
            handleOpenModal(data);
          }}
          className="text-2xl text-teal-600 cursor-pointer hover:text-teal-800 transition-transform duration-300 transform hover:scale-125 flex justify-center"
        >
          <MdContentCopy />
        </div>
      ),
    },
    ...(userRole?.role === "super admin"
      ? [
          {
            title: "Visibility",
            align: "center",
            width: 100,
            dataIndex: "is_visible",
            render: (data, record) => (
              <Switch
                size="small"
                checked={data}
                onChange={(checked) =>
                  handleOnChangeLabel({ is_visible: checked }, record)
                }
                className="bg-gray-300 hover:bg-teal-500 transition-colors duration-300"
              />
            ),
          },
        ]
      : []),
    {
      title: "Image",
      dataIndex: "images",
      width: 260,
      render: (image, record) => {
        const productImage = getProductImage(record);
        const hasVariants = record.variants && record.variants.length > 0;
        const variantImages = getVariantImages(record);
        const isVariableProduct = record.type === "Variable Product" || record.type === "Variant Product";

        return (
          <div className="flex justify-center">
            {productImage ? (
              <div className="relative aspect-square w-40 h-40 sm:w-40 sm:h-40 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-lg hover:shadow-2xl transition-all duration-300">
                <Image
                  src={productImage}
                  alt="Product"
                  width="100%"
                  height="100%"
                  className="object-cover w-full h-full"
                  preview={true}
                  fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzkzYTNiMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=="
                />
                {hasVariants && variantImages.length > 0 && (
                  <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {variantImages.length}
                  </div>
                )}
                {isVariableProduct && (
                  <div className="absolute bottom-1 left-1 bg-purple-500 text-white text-xs rounded-full px-1 py-0.5">
                    Var
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-300">
                <span className="text-xs text-gray-500 font-medium text-center px-1">
                  No Image
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      width: 200,
      render: (data, record) => {
        const hasVariants = record.variants && record.variants.length > 0;
        const variantCount = hasVariants ? record.variants.reduce((count, variant) => count + (variant.options?.length || 0), 0) : 0;
        const productCode = record.product_code || "N/A";
        
        return (
          <div className="flex flex-col space-y-1">
            <Tooltip title={data}>
              <span className="font-semibold text-gray-900 text-sm line-clamp-2">
                {data}
              </span>
            </Tooltip>
            <span className="text-xs text-gray-500">Code: {productCode}</span>
            {hasVariants && (
              <span className="text-xs text-blue-600 font-medium">
                {variantCount} variant(s)
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 150,
      render: (type) => {
        const typeColors = {
          "Stand Alone Product": "bg-green-100 text-green-800 border-green-200",
          "Variable Product": "bg-blue-100 text-blue-800 border-blue-200",
          "Variant Product": "bg-purple-100 text-purple-800 border-purple-200"
        };
        
        return (
          <Tag
            className={`font-semibold rounded-full px-3 py-1 text-xs border ${
              typeColors[type] || "bg-orange-100 text-orange-800 border-orange-200"
            }`}
          >
            {type}
          </Tag>
        );
      },
    },
    {
      title: "Category",
      dataIndex: "category_details",
      width: 150,
      render: (data) => (
        <Tooltip title={_.get(data, "main_category_name", "")}>
          <Tag className="max-w-full truncate font-semibold bg-teal-100 text-teal-800 border-teal-200 rounded-full px-3 py-1 text-xs">
            {_.get(data, "main_category_name", "N/A")}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Stock",
      dataIndex: "totalStock",
      width: 100,
      align: "center",
      render: (stock, record) => {
        const stockStatus = record.stocks_status || "In Stock";
        const statusColor = stockStatus === "Limited" ? "text-orange-600" : "text-green-600";
        
        return (
          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-900 text-lg">{stock}</span>
            <span className={`text-xs font-medium ${statusColor}`}>
              {stockStatus}
            </span>
          </div>
        );
      },
    },
    {
      title: "Prices",
      dataIndex: "prices",
      width: 180,
      render: (prices) => (
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600">Corporate:</span>
            <span className="font-bold text-gray-900 text-sm">
              {prices.corporatePrice !== "N/A" ? `₹${prices.corporatePrice}` : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600">Dealer:</span>
            <span className="font-bold text-gray-900 text-sm">
              {prices.dealerPrice !== "N/A" ? `₹${prices.dealerPrice}` : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600">Customer:</span>
            <span className="font-bold text-gray-900 text-sm">
              {prices.customerPrice !== "N/A" ? `₹${prices.customerPrice}` : "N/A"}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Vendor",
      align: "center",
      width: 120,
      dataIndex: "vendor_details",
      render: (data) => (
        <div className="flex justify-center">
          {data?.length > 0 ? (
            <Tag
              onClick={() => setVendorClose(data)}
              className="cursor-pointer bg-purple-100 text-purple-800 font-semibold hover:bg-purple-200 transition-colors duration-300 rounded-full px-3 py-1 border-purple-200 text-xs"
            >
              View ({data.length})
            </Tag>
          ) : (
            <Tag className="bg-gray-100 text-gray-600 font-semibold rounded-full px-3 py-1 border-gray-200 text-xs">
              None
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      align: "center",
      width: 150,
      render: (record) => (
        <div className="flex flex-col space-y-2">
          <Tooltip title="New Product">
            <Button
              size="small"
              type={record.new_product ? "primary" : "default"}
              icon={<MdNewReleases />}
              onClick={() =>
                handleOnChangeLabel(
                  { new_product: !record.new_product },
                  record
                )
              }
              className={`flex items-center justify-center w-full text-xs ${
                record.new_product
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
              }`}
            >
              New
            </Button>
          </Tooltip>
          <Tooltip title="Popular Product">
            <Button
              size="small"
              type={record.popular_product ? "primary" : "default"}
              icon={<MdThumbUp />}
              onClick={() =>
                handleOnChangeLabel(
                  { popular_product: !record.popular_product },
                  record
                )
              }
              className={`flex items-center justify-center w-full text-xs ${
                record.popular_product
                  ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
              }`}
            >
              Popular
            </Button>
          </Tooltip>
          <Tooltip title="Recommended Product">
            <Button
              size="small"
              type={record.recommended_product ? "primary" : "default"}
              icon={<MdStar />}
              onClick={() =>
                handleOnChangeLabel(
                  { recommended_product: !record.recommended_product },
                  record
                )
              }
              className={`flex items-center justify-center w-full text-xs ${
                record.recommended_product
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
              }`}
            >
              Recommended
            </Button>
          </Tooltip>
        </div>
      ),
    },
    {
      title: "Actions",
      width: 100,
      align: "center",
      fixed: "right",
      render: (data) => (
        <Dropdown
          overlay={
            <Menu className="rounded-xl shadow-2xl bg-white border border-gray-100 p-2 min-w-[120px]">
              {!_.get(data, "is_cloned", false) && (
                <Menu.Item key="edit">
                  <Button
                    type="text"
                    icon={<FaEdit className="text-teal-600" />}
                    onClick={() => handleUpdate(data)}
                    className="flex items-center text-teal-600 hover:bg-teal-50 w-full text-left px-3 py-2 rounded-lg font-medium text-xs"
                  >
                    Edit
                  </Button>
                </Menu.Item>
              )}
              <Menu.Item key="delete">
                <Popconfirm
                  title="Delete Product"
                  description="Are you sure you want to delete this product?"
                  onConfirm={() => handleDelete(data)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    icon={<MdDelete className="text-red-600" />}
                    className="flex items-center text-red-600 hover:bg-red-50 w-full text-left px-3 py-2 rounded-lg font-medium text-xs"
                  >
                    Delete
                  </Button>
                </Popconfirm>
              </Menu.Item>
              <Menu.Item key="view">
                <Button
                  type="text"
                  icon={<FaEye className="text-green-600" />}
                  onClick={() => handleView(data)}
                  className="flex items-center text-green-600 hover:bg-green-50 w-full text-left px-3 py-2 rounded-lg font-medium text-xs"
                >
                  View
                </Button>
              </Menu.Item>
            </Menu>
          }
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MdMoreVert className="text-gray-600" />}
            className="hover:text-teal-600 transition-colors duration-300"
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 p-4 md:p-8 font-sans">
      <DefaultTile
        title="Products Dashboard"
        add={true}
        addText="New Product"
        formStatus={formStatus}
        setFormStatus={setFormStatus}
        search={true}
        setSearch={setSearch}
        className="bg-white shadow-2xl rounded-3xl p-6 md:p-8 mb-6 md:mb-8 border border-teal-100"
      />

      {formStatus ? (
        <AddForms
          fetchData={fetchData}
          setFormStatus={setFormStatus}
          id={id}
          setId={setId}
          className="bg-white shadow-2xl rounded-3xl p-6 md:p-8 border border-teal-100"
        />
      ) : (
        <>
          <Card
            className="mb-6 md:mb-8 bg-white shadow-2xl rounded-3xl border-none overflow-hidden"
            bodyStyle={{ padding: "24px" }}
          >
            <div className="flex justify-between items-center mb-6">
              <Title
                level={4}
                className="m-0 flex items-center text-gray-900 font-extrabold tracking-tight text-lg md:text-xl"
              >
                <FaFilter className="mr-3 text-teal-600 text-lg" />
                Filter Products
              </Title>
              <Button
                type="text"
                icon={
                  showFilters ? (
                    <span className="text-teal-600">▲</span>
                  ) : (
                    <span className="text-teal-600">▼</span>
                  )
                }
                onClick={() => setShowFilters(!showFilters)}
                className="text-teal-600 hover:text-teal-800 transition-colors duration-300 font-semibold"
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                showFilters ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div>
                  <Text className="text-sm font-semibold text-gray-700 mb-2 block">
                    Product Category
                  </Text>
                  <Select
                    placeholder="Select Category"
                    size="large"
                    className="w-full rounded-xl"
                    allowClear
                    onChange={onCategoryChange}
                    value={filterByProductCategory}
                  >
                    {mainCategory.map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        {item.main_category_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text className="text-sm font-semibold text-gray-700 mb-2 block">
                    Sub Category
                  </Text>
                  <Select
                    placeholder="Select Sub Category"
                    size="large"
                    className="w-full rounded-xl"
                    allowClear
                    onChange={(val) => setFilterByProductSubcategory(val)}
                    value={filterByProductSubcategory}
                    disabled={
                      !filterByProductCategory ||
                      subcategoryDataFilter.length === 0
                    }
                  >
                    {subcategoryDataFilter.map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        {item.sub_category_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text className="text-sm font-semibold text-gray-700 mb-2 block">
                    Vendor
                  </Text>
                  <Select
                    placeholder="Select Vendor"
                    size="large"
                    className="w-full rounded-xl"
                    allowClear
                    onChange={(val) => setVendorFilter(val)}
                    value={vendorFilter}
                  >
                    {allVendors.map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        {item.vendor_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text className="text-sm font-semibold text-gray-700 mb-2 block">
                    Product Type
                  </Text>
                  <Select
                    placeholder="Select Type"
                    size="large"
                    className="w-full rounded-xl"
                    options={productType}
                    allowClear
                    onChange={(val) => setFilterByType(val)}
                    value={filterByType}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleClearFilters}
                  className="bg-gray-200 text-gray-800 hover:bg-gray-300 border-none rounded-xl font-semibold px-6"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>

          <Card
            className="bg-white shadow-2xl rounded-3xl border-none overflow-hidden"
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              destroyInactiveTabPane
              type="card"
              size="large"
              className="px-4 md:px-8 pt-4 md:pt-6"
              items={[
                {
                  key: "1",
                  label: (
                    <span className="flex items-center text-gray-900 font-extrabold tracking-tight text-sm md:text-base">
                      <span className="mr-2">📦</span> Products
                      <Tag className="ml-2 bg-teal-100 text-teal-800 font-semibold rounded-full px-2 py-0.5 text-xs">
                        {tableData.filter((res) => !res.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={processedTableData.filter(
                        (res) => !res.is_cloned
                      )}
                      columns={columns}
                      scroll={{ x: 1200 }}
                      className="rounded-b-3xl"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} of ${total} items`,
                      }}
                    />
                  ),
                },
                {
                  key: "2",
                  label: (
                    <span className="flex items-center text-gray-900 font-extrabold tracking-tight text-sm md:text-base">
                      <MdContentCopy className="mr-2 text-teal-600" />
                      Cloned Products
                      <Tag className="ml-2 bg-green-100 text-green-800 font-semibold rounded-full px-2 py-0.5 text-xs">
                        {tableData.filter((res) => res.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={processedTableData.filter((res) => res.is_cloned)}
                      columns={columns.filter((col) => col.title !== "Clone")}
                      scroll={{ x: 1100 }}
                      className="rounded-b-3xl"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} of ${total} items`,
                      }}
                    />
                  ),
                },
              ]}
            />
          </Card>

          <Modal
            title={
              <span className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
                Vendor Details
              </span>
            }
            open={!_.isEmpty(vendorClose)}
            footer={null}
            onCancel={() => setVendorClose([])}
            className="rounded-3xl"
            bodyStyle={{ padding: "24px" }}
            width={600}
          >
            <div className="max-h-96 overflow-y-auto">
              <Descriptions
                layout="vertical"
                bordered
                column={1}
                className="rounded-xl"
              >
                {vendorClose.map((res, index) => (
                  <Descriptions.Item
                    key={index}
                    label={
                      <p className="font-semibold text-gray-700 text-base md:text-lg">
                        Vendor {index + 1}
                      </p>
                    }
                  >
                    <div className="flex justify-between items-center text-sm md:text-base">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-900 mr-3">
                          {vendorNames[res._id] || "Loading..."}
                        </span>
                        {vendorsLoading[res._id] && <Spin size="small" />}
                      </div>
                      <Link
                        to={`/vendor_details/${res._id}`}
                        target="_blank"
                        className="text-teal-600 hover:text-teal-800 transition-colors duration-300 flex items-center font-semibold text-sm"
                      >
                        View Details <span className="ml-1">→</span>
                      </Link>
                    </div>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </div>
          </Modal>

          <Modal
            title={
              <span className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
                Clone Product
              </span>
            }
            open={cloneModal}
            onCancel={handleCloseModal}
            footer={null}
            className="rounded-3xl"
            bodyStyle={{ padding: "24px" }}
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label={
                  <span className="text-sm font-semibold text-gray-700">
                    Category
                  </span>
                }
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
                  className="w-full rounded-xl"
                  onChange={onCloneCategoryChange}
                >
                  {categoryData
                    .filter(
                      (res) =>
                        res._id !==
                        _.get(cloneProductDetails, "category_details._id", "")
                    )
                    .map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        {item.main_category_name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-sm font-semibold text-gray-700">
                    Sub Category
                  </span>
                }
                name="sub_category_details"
                rules={[
                  {
                    required: true,
                    message: "Please select a product sub-category!",
                  },
                ]}
              >
                <Select
                  placeholder="Select Product Sub Category"
                  className="w-full rounded-xl"
                  disabled={
                    !form.getFieldValue("category_details") ||
                    subcategoryDataFilter.length === 0
                  }
                >
                  {subcategoryDataFilter.map((item) => (
                    <Select.Option key={item._id} value={item._id}>
                      {item.sub_category_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item className="mb-0">
                <div className="flex justify-end gap-4">
                  <Button
                    onClick={handleCloseModal}
                    className="bg-gray-200 text-gray-900 hover:bg-gray-300 border-none rounded-xl font-semibold px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="bg-teal-600 hover:bg-teal-700 border-none rounded-xl font-semibold px-6"
                    loading={loading}
                  >
                    Clone Product
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Products;