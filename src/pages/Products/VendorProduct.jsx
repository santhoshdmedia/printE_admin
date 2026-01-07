import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MdDelete,
  MdContentCopy,
  MdMoreVert,
  MdStar,
  MdNewReleases,
  MdThumbUp,
  MdFileDownload,
  MdFilterList,
  MdClearAll,
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
  message,
  Input,
  Space,
  Badge,
  Alert,
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
const { Search } = Input;

// Error Boundary Component for AddForms
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mb-6 bg-white shadow-lg rounded-xl border border-red-200">
          <div className="text-center p-8">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <Title level={4} className="text-red-600 mb-2">
              Something went wrong
            </Title>
            <Text className="text-gray-600 mb-4 block">
              There was an error loading the product form.
            </Text>
            <Button
              type="primary"
              danger
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Reload Page
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Utility functions
const safeGet = (obj, path, defaultValue = null) => {
  const value = _.get(obj, path, defaultValue);
  return value === null || value === undefined ? defaultValue : value;
};

const safeMap = (array, callback) => {
  if (!Array.isArray(array)) {
    console.warn("Attempted to map over non-array:", array);
    return [];
  }
  return array.map(callback);
};

const VendorProduct = () => {
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
  const [exportLoading, setExportLoading] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [error, setError] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);

  const [form] = useForm();

  // Handle product visibility toggle
  const handleOnChangeLabel = async (data, product) => {
    const productId = safeGet(product, "_id", "");
    
    if (!productId) {
      ERROR_NOTIFICATION("Product ID is missing");
      return;
    }
    
    try {
      setUpdatingProductId(productId);
      
      // Store original state for rollback
      const originalState = { ...product };
      
      // Optimistic update
      setTableData(prevTableData => 
        prevTableData.map(item => 
          item._id === productId 
            ? { ...item, ...data }
            : item
        )
      );

      const result = await editProduct(data, productId);
      SUCCESS_NOTIFICATION(result);
      
    } catch (error) {
      // Revert optimistic update on error
      setTableData(prevTableData => 
        prevTableData.map(item => 
          item._id === productId 
            ? { ...originalState }
            : item
        )
      );
      ERROR_NOTIFICATION(error);
    } finally {
      setUpdatingProductId(null);
    }
  };

  // Fetch products with filters
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        search: search || "",
        category: filterByProductCategory || "",
        type: filterByType || "",
        subcategory: filterByProductSubcategory || "",
        vendor: vendorFilter || "",
        visibility: visibilityFilter || ""
      };

      const result = await getProduct(
        "",
        filters.search,
        true,
        filters.category,
        filters.type,
        filters.subcategory,
        filters.vendor,
        filters.visibility
      );
      
      const data = safeGet(result, "data.data", []);
      const allProducts = Array.isArray(data) ? data : [];
      
      // Safely filter vendor products
      const vendorProducts = allProducts.filter((res) => {
        if (!res || typeof res !== "object") return false;
        const productType = safeGet(res, "product_type", "").toString().toLowerCase();
        return productType === "vendor product";
      });
      
      setTableData(vendorProducts.reverse());
      setTotalProducts(vendorProducts.length);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch products. Please try again.");
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportToCSV = () => {
    try {
      setExportLoading(true);
      
      if (tableData.length === 0) {
        message.warning("No products available for export");
        return;
      }
      
      let csvContent = "data:text/csv;charset=utf-8,";
      const columns = [
        "S.No",
        "Product Name",
        "PRODUCT S.NO",
        "VENDOR CODE",
        "Product Code",
        "Category",
        "Sub Category",
        "MRP Price",
      ];
      
      csvContent += columns.join(",") + "\r\n";
      
      tableData.forEach((product, index) => {
        const vendorCode = safeGet(product, "Vendor_Code", "N/A");
        const categoryName = safeGet(product, "category_details.main_category_name", "N/A");
        const subCategoryName = safeGet(product, "sub_category_details.sub_category_name", "N/A");
        
        const row = {
          s_no: index + 1,
          product_name: safeGet(product, "name", "N/A"),
          product_serial_no: safeGet(product, "product_codeS_NO", "N/A"),
          vendor_code: vendorCode,
          product_code: safeGet(product, "product_code", "N/A"),
          category: categoryName,
          sub_category: subCategoryName,
          mrp_price: safeGet(product, "MRP_price", "N/A"),
        };

        const values = columns.map((col) => {
          const keyMap = {
            "S.No": "s_no",
            "Product Name": "product_name",
            "PRODUCT S.NO": "product_serial_no",
            "VENDOR CODE": "vendor_code",
            "Product Code": "product_code",
            "Category": "category",
            "Sub Category": "sub_category",
            "MRP Price": "mrp_price",
          };
          const key = keyMap[col];
          return `"${row[key] || ""}"`;
        });
        
        csvContent += values.join(",") + "\r\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success("CSV file downloaded successfully");
    } catch (err) {
      console.error("Error exporting data:", err);
      message.error("Failed to export data");
    } finally {
      setExportLoading(false);
    }
  };

  const exportFilteredToCSV = () => {
    try {
      setExportLoading(true);

      if (tableData.length === 0) {
        message.warning("No products available for export");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      const columns = [
        "S.No",
        "Product Name",
        "PRODUCT S.NO",
        "VENDOR CODE",
        "Product Code",
        "Product Type",
        "Category",
        "Sub Category",
        "Total Stock",
        "Stock Status",
        "Customer Price",
        "Dealer Price",
        "Corporate Price",
        "Vendors",
        "Visibility",
        "New Product",
        "Popular Product",
        "Recommended Product",
        "Cloned Product",
      ];

      csvContent += columns.join(",") + "\r\n";
      
      tableData.forEach((product, index) => {
        const totalStock = getTotalStock(product);
        const customerPrice = getProductPrice(product, 'customer');
        const dealerPrice = getProductPrice(product, 'dealer');
        const corporatePrice = getProductPrice(product, 'corporate');

        const vendorDetails = safeGet(product, "vendor_details", []);
        const vendorNames = Array.isArray(vendorDetails) && vendorDetails.length > 0
          ? vendorDetails.map(vendor => safeGet(vendor, "business_name", safeGet(vendor, "vendor_name", "Unknown Vendor"))).join(', ')
          : 'No Vendor';

        const vendorCodes = safeGet(product, "Vendor_Code", "N/A");
        const categoryName = safeGet(product, "category_details.main_category_name", "N/A");
        const subCategoryName = safeGet(product, "sub_category_details.sub_category_name", "N/A");

        const row = {
          s_no: index + 1,
          product_name: safeGet(product, "name", "N/A"),
          product_serial_no: safeGet(product, "product_codeS_NO", safeGet(product, "product_serial_no", safeGet(product, "product_code", "N/A"))),
          vendor_code: vendorCodes,
          product_code: safeGet(product, "product_code", "N/A"),
          product_type: safeGet(product, "type", safeGet(product, "product_type", "N/A")),
          category: categoryName,
          sub_category: subCategoryName,
          total_stock: totalStock || 'N/A',
          stock_status: safeGet(product, "stocks_status", safeGet(product, "stock_status", "N/A")),
          customer_price: customerPrice !== "N/A" ? `₹${customerPrice}` : 'N/A',
          dealer_price: dealerPrice !== "N/A" ? `₹${dealerPrice}` : 'N/A',
          corporate_price: corporatePrice !== "N/A" ? `₹${corporatePrice}` : 'N/A',
          vendors: vendorNames,
          visibility: safeGet(product, "is_visible", false) ? 'Visible' : 'Hidden',
          new_product: safeGet(product, "new_product", false) ? 'Yes' : 'No',
          popular_product: safeGet(product, "popular_product", false) ? 'Yes' : 'No',
          recommended_product: safeGet(product, "recommended_product", false) ? 'Yes' : 'No',
          cloned_product: safeGet(product, "is_cloned", false) ? 'Yes' : 'No',
        };

        const values = columns.map((col) => {
          const keyMap = {
            "S.No": "s_no",
            "Product Name": "product_name",
            "PRODUCT S.NO": "product_serial_no",
            "VENDOR CODE": "vendor_code",
            "Product Code": "product_code",
            "Product Type": "product_type",
            "Category": "category",
            "Sub Category": "sub_category",
            "Total Stock": "total_stock",
            "Stock Status": "stock_status",
            "Customer Price": "customer_price",
            "Dealer Price": "dealer_price",
            "Corporate Price": "corporate_price",
            "Vendors": "vendors",
            "Visibility": "visibility",
            "New Product": "new_product",
            "Popular Product": "popular_product",
            "Recommended Product": "recommended_product",
            "Cloned Product": "cloned_product",
          };
          const key = keyMap[col];
          return `"${row[key] || ""}"`;
        });

        csvContent += values.join(",") + "\r\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `filtered_products_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(`CSV file with ${tableData.length} products downloaded successfully`);
    } catch (err) {
      console.error("Error exporting filtered data:", err);
      message.error("Failed to export filtered data");
    } finally {
      setExportLoading(false);
    }
  };

  const exportAllToCSV = async () => {
    try {
      setExportLoading(true);
      const result = await getProduct("", "", false, "", "", "", "", "");
      const allProducts = safeGet(result, "data.data", []);
      const safeProducts = Array.isArray(allProducts) ? allProducts : [];

      if (safeProducts.length === 0) {
        message.warning("No products available for export");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      const columns = [
        "S.No",
        "Product ID",
        "Product Name",
        "PRODUCT S.NO",
        "VENDOR CODE",
        "Product Code",
        "Product Type",
        "Category",
        "Sub Category",
        "Total Stock",
        "Stock Status",
        "Customer Price",
        "Dealer Price",
        "Corporate Price",
        "MRP Price",
        "Vendors",
        "Visibility",
        "New Product",
        "Popular Product",
        "Recommended Product",
        "Cloned Product",
        "Parent Product ID",
        "Image URL",
        "Product Description",
        "SEO URL",
        "Created Date",
        "Last Updated",
      ];

      csvContent += columns.join(",") + "\r\n";
      
      safeProducts.forEach((product, index) => {
        const productImage = getProductImage(product);
        const totalStock = getTotalStock(product);
        const customerPrice = getProductPrice(product, 'customer');
        const dealerPrice = getProductPrice(product, 'dealer');
        const corporatePrice = getProductPrice(product, 'corporate');

        const vendorDetails = safeGet(product, "vendor_details", []);
        const vendorNames = Array.isArray(vendorDetails) && vendorDetails.length > 0
          ? vendorDetails.map(vendor => safeGet(vendor, "business_name", safeGet(vendor, "vendor_name", "Unknown Vendor"))).join(', ')
          : 'No Vendor';

        const vendorCodes = safeGet(product, "Vendor_Code", "N/A");
        const categoryName = safeGet(product, "category_details.main_category_name", "N/A");
        const subCategoryName = safeGet(product, "sub_category_details.sub_category_name", "N/A");

        const row = {
          s_no: index + 1,
          product_id: safeGet(product, "_id", "N/A"),
          product_name: safeGet(product, "name", "N/A"),
          product_serial_no: safeGet(product, "product_codeS_NO", safeGet(product, "product_serial_no", safeGet(product, "product_code", "N/A"))),
          vendor_code: vendorCodes,
          product_code: safeGet(product, "product_code", "N/A"),
          product_type: safeGet(product, "type", safeGet(product, "product_type", "N/A")),
          category: categoryName,
          sub_category: subCategoryName,
          total_stock: totalStock,
          stock_status: safeGet(product, "stocks_status", safeGet(product, "stock_status", "In Stock")),
          customer_price: customerPrice !== "N/A" ? `₹${customerPrice}` : 'N/A',
          dealer_price: dealerPrice !== "N/A" ? `₹${dealerPrice}` : 'N/A',
          corporate_price: corporatePrice !== "N/A" ? `₹${corporatePrice}` : 'N/A',
          mrp_price: safeGet(product, "MRP_price") ? `₹${product.MRP_price}` : 'N/A',
          vendors: vendorNames,
          visibility: safeGet(product, "is_visible", false) ? 'Visible' : 'Hidden',
          new_product: safeGet(product, "new_product", false) ? 'Yes' : 'No',
          popular_product: safeGet(product, "popular_product", false) ? 'Yes' : 'No',
          recommended_product: safeGet(product, "recommended_product", false) ? 'Yes' : 'No',
          cloned_product: safeGet(product, "is_cloned", false) ? 'Yes' : 'No',
          parent_product_id: safeGet(product, "parent_product_id", "Original"),
          image_url: productImage || 'No Image',
          product_description: safeGet(product, "product_description_tittle", safeGet(product, "description", "N/A")),
          seo_url: safeGet(product, "seo_url", "N/A"),
          created_date: safeGet(product, "createdAt") ? new Date(product.createdAt).toLocaleDateString('en-IN') : 'N/A',
          last_updated: safeGet(product, "updatedAt") ? new Date(product.updatedAt).toLocaleDateString('en-IN') : 'N/A',
        };

        const values = columns.map((col) => {
          const keyMap = {
            "S.No": "s_no",
            "Product ID": "product_id",
            "Product Name": "product_name",
            "PRODUCT S.NO": "product_serial_no",
            "VENDOR CODE": "vendor_code",
            "Product Code": "product_code",
            "Product Type": "product_type",
            "Category": "category",
            "Sub Category": "sub_category",
            "Total Stock": "total_stock",
            "Stock Status": "stock_status",
            "Customer Price": "customer_price",
            "Dealer Price": "dealer_price",
            "Corporate Price": "corporate_price",
            "MRP Price": "mrp_price",
            "Vendors": "vendors",
            "Visibility": "visibility",
            "New Product": "new_product",
            "Popular Product": "popular_product",
            "Recommended Product": "recommended_product",
            "Cloned Product": "cloned_product",
            "Parent Product ID": "parent_product_id",
            "Image URL": "image_url",
            "Product Description": "product_description",
            "SEO URL": "seo_url",
            "Created Date": "created_date",
            "Last Updated": "last_updated",
          };
          const key = keyMap[col];
          return `"${row[key] || ""}"`;
        });

        csvContent += values.join(",") + "\r\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `all_products_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(`All ${safeProducts.length} products exported successfully`);
    } catch (err) {
      console.error("Error exporting all data:", err);
      message.error("Failed to export all products");
    } finally {
      setExportLoading(false);
    }
  };

  // Clone product modal handlers
  const handleOpenModal = (productData) => {
    try {
      const product = { ...productData };
      delete product.category_details;
      delete product.sub_category_details;
      const product_id = product._id;
      delete product._id;

      setSelectedProductData(product);
      setProductId(product_id);
      setOpenCloneModal(true);
    } catch (err) {
      console.error("Error opening clone modal:", err);
      ERROR_NOTIFICATION("Failed to open clone modal");
    }
  };

  const handleCloseModal = () => {
    form.resetFields();
    setCloneProductDetails([]);
    setSelectedProductData(null);
    setOpenCloneModal(false);
  };

  // Category change handlers
  const onCategoryChange = (value) => {
    setFilterByProductCategory(value);
    setFilterByProductSubcategory("");
    setCurrentPage(1);

    if (value) {
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
      const filteredSubcategories = subcategoryData.filter(
        (subcategory) => subcategory.select_main_category === value
      );
      setSubcategoryDataFilter(filteredSubcategories);
    } else {
      setSubcategoryDataFilter([]);
    }

    form.setFieldValue("sub_category_details", undefined);
  };

  // Fetch initial data
  const fetchCategories = async () => {
    try {
      const [mainResult, subResult] = await Promise.all([
        getMainCategory(),
        getSubCategory(),
      ]);
      setCategoryData(safeGet(mainResult, "data.data", []));
      setSubcategoryData(safeGet(subResult, "data.data", []));
    } catch (err) {
      console.error("Error fetching categories:", err);
      ERROR_NOTIFICATION(err);
    }
  };

  const fetchMainCategories = async () => {
    try {
      const result = await getAllCategoryProducts();
      setMainCategoryData(safeGet(result, "data.data", []));
    } catch (err) {
      console.error("Error fetching main categories:", err);
      ERROR_NOTIFICATION(err);
    }
  };

  // Clone product submission
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...cloneProductDetails,
        parent_product_id: safeGet(cloneProductDetails, "_id", ""),
        is_cloned: true,
        category_details: values.category_details,
        sub_category_details: values.sub_category_details,
      };
      delete payload._id;

      const result = await addproduct(payload);
      SUCCESS_NOTIFICATION(result);
      form.resetFields();
      await fetchData();
      setCloneProductDetails([]);
      setOpenCloneModal(false);
    } catch (err) {
      console.error("Error cloning product:", err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const handleUpdate = (data) => {
    setId(data);
    setFormStatus(true);
  };

  const handleDelete = async (data) => {
    try {
      const payload = {
        product_id: safeGet(data, "_id", ""),
        is_cloned: safeGet(data, "is_cloned", false),
      };
      const result = await deleteProduct(JSON.stringify(payload));
      SUCCESS_NOTIFICATION(result);
      await fetchData();
    } catch (err) {
      console.error("Error deleting product:", err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleView = (id) => {
    const seoUrl = safeGet(id, "seo_url", "");
    if (seoUrl) {
      window.open(`${CLIENT_URL}/product/${seoUrl}`);
    } else {
      ERROR_NOTIFICATION("Product URL not found");
    }
  };

  const getVendorName = useCallback(
    async (id) => {
      if (!id) return "No Vendor";
      if (vendorNames[id]) return vendorNames[id];

      setVendorsLoading((prev) => ({ ...prev, [id]: true }));
      try {
        const vendor = await getSingleVendor(id);
        const businessName = safeGet(vendor, "data.data.business_name", "Unknown Vendor");
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
      setAllVendors(safeGet(result, "data.data", []));
    } catch (err) {
      console.error("Error fetching vendors:", err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for product data
  const getVariantImages = (product) => {
    const variants = safeGet(product, "variants", []);
    if (!Array.isArray(variants)) return [];

    const variantImages = [];

    variants.forEach((variantGroup) => {
      if (variantGroup.variant_type === "image_variant" && variantGroup.options) {
        const options = Array.isArray(variantGroup.options) ? variantGroup.options : [];
        options.forEach((option) => {
          const imageNames = safeGet(option, "image_names", []);
          if (Array.isArray(imageNames) && imageNames.length > 0) {
            const images = imageNames.map(img =>
              typeof img === 'object' ? safeGet(img, "url", safeGet(img, "path", "")) : img
            ).filter(img => img);

            if (images.length > 0) {
              variantImages.push({
                variantName: safeGet(variantGroup, "variant_name", ""),
                optionValue: safeGet(option, "value", ""),
                images: images
              });
            }
          }
        });
      }
    });

    return variantImages;
  };

  const getFirstVariantImage = (product) => {
    const variantImages = getVariantImages(product);
    for (const variant of variantImages) {
      if (variant.images && variant.images.length > 0) {
        return variant.images[0];
      }
    }
    return null;
  };

  const getProductImage = (product) => {
    const images = safeGet(product, "images", []);
    if (Array.isArray(images) && images.length > 0) {
      const firstImage = images[0];
      if (typeof firstImage === 'object') {
        return safeGet(firstImage, "url", safeGet(firstImage, "path", ""));
      }
      return firstImage;
    }

    const variantImage = getFirstVariantImage(product);
    if (variantImage) {
      return variantImage;
    }

    return "";
  };

  const getProductPrice = (product, priceType = 'customer') => {
    const priceFieldMap = {
      'customer': 'customer_product_price',
      'dealer': 'Deler_product_price',
      'corporate': 'corporate_product_price'
    };

    const priceField = priceFieldMap[priceType];
    const type = safeGet(product, "type", "");

    if (type === "Stand Alone Product") {
      return safeGet(product, priceField, safeGet(product, "MRP_price", "N/A"));
    }
    else if (type === "Variant Product" || type === "Variable Product") {
      const variantsPrice = safeGet(product, "variants_price", []);
      if (Array.isArray(variantsPrice) && variantsPrice.length > 0) {
        const prices = variantsPrice
          .map(variant => {
            const price = safeGet(variant, priceField, safeGet(variant, "price", null));
            return price ? parseFloat(price) : null;
          })
          .filter(price => price !== null && !isNaN(price));

        if (prices.length > 0) {
          return Math.min(...prices);
        }
      }

      return safeGet(product, priceField, safeGet(product, "MRP_price", "N/A"));
    }

    return "N/A";
  };

  const getTotalStock = (product) => {
    const type = safeGet(product, "type", "");
    if ((type === "Variant Product" || type === "Variable Product")) {
      const variantsPrice = safeGet(product, "variants_price", []);
      if (Array.isArray(variantsPrice)) {
        return variantsPrice.reduce((sum, variant) => {
          const stock = parseInt(safeGet(variant, "stock", 0)) || 0;
          return sum + stock;
        }, 0);
      }
    }

    return parseInt(safeGet(product, "stock_count", 0)) || 0;
  };

  // Process table data with pagination
  const processedTableData = useMemo(() => {
    return tableData.map((item, index) => ({
      ...item,
      serialNumber: (currentPage - 1) * pageSize + index + 1,
      totalStock: getTotalStock(item),
      prices: {
        customerPrice: getProductPrice(item, 'customer'),
        dealerPrice: getProductPrice(item, 'dealer'),
        corporatePrice: getProductPrice(item, 'corporate'),
      }
    }));
  }, [tableData, currentPage, pageSize]);

  // Filter options
  const productType = [
    { value: "Stand Alone Product", label: "Stand Alone Product" },
    { value: "Variable Product", label: "Variable Product" },
    { value: "Variant Product", label: "Variant Product" },
  ];

  const visibilityOptions = [
    { value: "", label: "All Products" },
    { value: "true", label: "Visible Only" },
    { value: "false", label: "Hidden Only" },
  ];

  const handleClearFilters = () => {
    setFilterByProductCategory("");
    setFilterByProductSubcategory("");
    setVendorFilter("");
    setFilterByType("");
    setVisibilityFilter("");
    setSubcategoryDataFilter([]);
    setCurrentPage(1);
    setSearch("");
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const userRole = JSON.parse(localStorage.getItem("userprofile")) || {};

  // Table columns
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
      title: "Product S.No",
      dataIndex: "product_codeS_NO",
      align: "center",
      width: 120,
      render: (productCodeSNo) => (
        <Tooltip title={productCodeSNo || "N/A"}>
          <Tag className="max-w-full truncate font-semibold bg-blue-100 text-blue-800 border-blue-200 rounded-full px-3 py-1 text-xs">
            {productCodeSNo || "N/A"}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Vendor Code",
      dataIndex: "Vendor_Code",
      align: "center",
      width: 120,
      render: (vendorCode) => (
        <Tooltip title={vendorCode || "N/A"}>
          <Tag className="max-w-full truncate font-semibold bg-purple-100 text-purple-800 border-purple-200 rounded-full px-3 py-1 text-xs">
            {vendorCode || "N/A"}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Vendor Name",
      dataIndex: "vendor_details",
      align: "center",
      width: 150,
      render: (vendorDetails) => (
        <Tooltip title={safeGet(vendorDetails, "vendor_name", "N/A")}>
          <Tag className="max-w-full truncate font-semibold bg-orange-100 text-orange-500 border-orange-200 rounded-full px-3 py-1 text-xs">
            {safeGet(vendorDetails, "vendor_name", "N/A")}
          </Tag>
        </Tooltip>
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
          render: (isVisible, record) => (
            <Tooltip title={isVisible ? "Visible" : "Hidden"}>
              <Switch
                size="small"
                checked={isVisible}
                onChange={(checked) => {
                  handleOnChangeLabel({ is_visible: checked }, record);
                }}
                loading={updatingProductId === record._id}
                className={`${isVisible ? 'bg-green-600' : 'bg-gray-300'} hover:bg-teal-500 transition-colors duration-300`}
              />
            </Tooltip>
          ),
        },
      ]
      : []),
    {
      title: "Image",
      dataIndex: "images",
      width: 120,
      render: (image, record) => {
        const productImage = getProductImage(record);
        const hasVariants = record.variants && Array.isArray(record.variants) && record.variants.length > 0;
        const variantImages = getVariantImages(record);
        const isVariableProduct = record.type === "Variable Product" || record.type === "Variant Product";

        return (
          <div className="flex justify-center">
            {productImage ? (
              <div className="relative aspect-square w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
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
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-bl-lg px-1 py-0.5">
                    {variantImages.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                <span className="text-xs text-gray-500">No Image</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Product Name",
      dataIndex: "name",
      width: 200,
      render: (data, record) => {
        const hasVariants = record.variants && Array.isArray(record.variants) && record.variants.length > 0;
        const variantCount = hasVariants ? record.variants.reduce((count, variant) => count + (variant.options?.length || 0), 0) : 0;
        const productCode = safeGet(record, "product_code", "N/A");

        return (
          <div className="flex flex-col space-y-1">
            <Tooltip title={data}>
              <span className="font-semibold text-gray-900 text-sm line-clamp-2">
                {data}
              </span>
            </Tooltip>
            <span className="text-xs text-gray-500">Code: {productCode}</span>
            {hasVariants && (
              <Badge count={variantCount} size="small" className="mt-1">
                <span className="text-xs text-blue-600">Variants</span>
              </Badge>
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
            className={`font-semibold rounded-full px-3 py-1 text-xs border ${typeColors[type] || "bg-orange-100 text-orange-800 border-orange-200"
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
        <Tooltip title={safeGet(data, "main_category_name", "")}>
          <Tag className="max-w-full truncate font-semibold bg-teal-100 text-teal-800 border-teal-200 rounded-full px-3 py-1 text-xs">
            {safeGet(data, "main_category_name", "N/A")}
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
        const stockStatus = safeGet(record, "stocks_status", "In Stock");
        const statusColor = stockStatus === "Limited" ? "text-orange-600" :
                          stockStatus === "Out of Stock" ? "text-red-600" : "text-green-600";

        return (
          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-900 text-lg">{stock || 0}</span>
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
            <span className="text-xs font-semibold text-gray-600">Customer:</span>
            <span className="font-bold text-gray-900 text-sm">
              {prices.customerPrice !== "N/A" ? `₹${prices.customerPrice}` : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600">Dealer:</span>
            <span className="font-bold text-gray-900 text-sm">
              {prices.dealerPrice !== "N/A" ? `₹${prices.dealerPrice}` : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600">Corporate:</span>
            <span className="font-bold text-gray-900 text-sm">
              {prices.corporatePrice !== "N/A" ? `₹${prices.corporatePrice}` : "N/A"}
            </span>
          </div>
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
              loading={updatingProductId === record._id}
              className={`flex items-center justify-center w-full text-xs ${record.new_product
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
              loading={updatingProductId === record._id}
              className={`flex items-center justify-center w-full text-xs ${record.popular_product
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
              loading={updatingProductId === record._id}
              className={`flex items-center justify-center w-full text-xs ${record.recommended_product
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
              {!safeGet(data, "is_cloned", false) && (
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

  // Effects
  useEffect(() => {
    fetchCategories();
    fetchMainCategories();
    collectVendors();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [
    search,
    formStatus,
    filterByProductCategory,
    filterByType,
    filterByProductSubcategory,
    vendorFilter,
    visibilityFilter,
  ]);

  useEffect(() => {
    if (vendorClose.length > 0) {
      vendorClose.forEach((vendor) => {
        if (vendor && vendor._id && !vendorNames[vendor._id]) {
          getVendorName(vendor._id);
        }
      });
    }
  }, [vendorClose, vendorNames, getVendorName]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans">
      <ErrorBoundary>
        <DefaultTile
          title="Vendor Products Dashboard"
          add={true}
          addText="Add Vendor Product"
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          search={true}
          setSearch={setSearch}
          className="bg-white shadow-lg rounded-xl p-6 mb-6 border border-gray-200"
          extra={
            <Space>
              <Dropdown
                overlay={
                  <Menu className="rounded-xl shadow-xl bg-white border border-gray-100 p-2 min-w-[200px]">
                    <Menu.Item key="all">
                      <Button
                        type="text"
                        icon={<MdFileDownload className="text-green-600" />}
                        onClick={exportAllToCSV}
                        loading={exportLoading}
                        className="flex items-center text-green-600 hover:bg-green-50 w-full text-left px-3 py-2 rounded-lg font-medium text-sm"
                      >
                        Export All Products
                      </Button>
                    </Menu.Item>
                    <Menu.Item key="filtered">
                      <Button
                        type="text"
                        icon={<MdFileDownload className="text-blue-600" />}
                        onClick={exportFilteredToCSV}
                        loading={exportLoading}
                        disabled={tableData.length === 0}
                        className="flex items-center text-blue-600 hover:bg-blue-50 w-full text-left px-3 py-2 rounded-lg font-medium text-sm"
                      >
                        Export Filtered Products
                      </Button>
                    </Menu.Item>
                    <Menu.Item key="current">
                      <Button
                        type="text"
                        icon={<MdFileDownload className="text-teal-600" />}
                        onClick={exportToCSV}
                        loading={exportLoading}
                        className="flex items-center text-teal-600 hover:bg-teal-50 w-full text-left px-3 py-2 rounded-lg font-medium text-sm"
                      >
                        Export Current View
                      </Button>
                    </Menu.Item>
                  </Menu>
                }
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="primary"
                  icon={<MdFileDownload className="text-white" />}
                  loading={exportLoading}
                  className="bg-teal-600 hover:bg-teal-700 border-none rounded-lg font-medium px-4 flex items-center shadow"
                >
                  Export
                </Button>
              </Dropdown>
            </Space>
          }
        />
      </ErrorBoundary>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}

      {formStatus ? (
        <ErrorBoundary>
          <AddForms
            fetchData={fetchData}
            setFormStatus={setFormStatus}
            id={id}
            setId={setId}
            className="bg-white shadow-lg rounded-xl p-6 border border-gray-200"
          />
        </ErrorBoundary>
      ) : (
        <>
          <Card
            className="mb-6 bg-white shadow-lg rounded-xl border-none"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center">
                <MdFilterList className="mr-2 text-teal-600 text-xl" />
                <Title level={4} className="m-0 text-gray-900 font-bold">
                  Filter Products
                </Title>
                <Badge
                  count={totalProducts}
                  showZero
                  className="ml-3 bg-teal-100 text-teal-800"
                />
              </div>
              <Space>
                <Button
                  type="text"
                  icon={showFilters ? <MdClearAll /> : <FaFilter />}
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-teal-600 hover:text-teal-800"
                >
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
                <Button
                  onClick={handleClearFilters}
                  icon={<MdClearAll />}
                  className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-none rounded-lg"
                >
                  Clear All
                </Button>
              </Space>
            </div>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Text className="text-sm font-medium text-gray-700 mb-2 block">
                    Product Category
                  </Text>
                  <Select
                    placeholder="Select Category"
                    size="middle"
                    className="w-full"
                    allowClear
                    onChange={onCategoryChange}
                    value={filterByProductCategory}
                    options={mainCategory.map(item => ({
                      value: item._id,
                      label: item.main_category_name
                    }))}
                  />
                </div>

                <div>
                  <Text className="text-sm font-medium text-gray-700 mb-2 block">
                    Sub Category
                  </Text>
                  <Select
                    placeholder="Select Sub Category"
                    size="middle"
                    className="w-full"
                    allowClear
                    onChange={(val) => setFilterByProductSubcategory(val)}
                    value={filterByProductSubcategory}
                    disabled={
                      !filterByProductCategory ||
                      subcategoryDataFilter.length === 0
                    }
                    options={subcategoryDataFilter.map(item => ({
                      value: item._id,
                      label: item.sub_category_name
                    }))}
                  />
                </div>

                <div>
                  <Text className="text-sm font-medium text-gray-700 mb-2 block">
                    Vendor
                  </Text>
                  <Select
                    placeholder="Select Vendor"
                    size="middle"
                    className="w-full"
                    allowClear
                    onChange={(val) => setVendorFilter(val)}
                    value={vendorFilter}
                    options={allVendors.map(item => ({
                      value: item._id,
                      label: item.vendor_name
                    }))}
                  />
                </div>

                <div>
                  <Text className="text-sm font-medium text-gray-700 mb-2 block">
                    Product Type
                  </Text>
                  <Select
                    placeholder="Select Type"
                    size="middle"
                    className="w-full"
                    options={productType}
                    allowClear
                    onChange={(val) => setFilterByType(val)}
                    value={filterByType}
                  />
                </div>

                <div>
                  <Text className="text-sm font-medium text-gray-700 mb-2 block">
                    Visibility
                  </Text>
                  <Select
                    placeholder="Select Visibility"
                    size="middle"
                    className="w-full"
                    options={visibilityOptions}
                    allowClear
                    onChange={(val) => setVisibilityFilter(val)}
                    value={visibilityFilter}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="bg-white shadow-lg rounded-xl border-none"
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              defaultActiveKey="1"
              type="card"
              size="middle"
              className="px-4 pt-4"
              items={[
                {
                  key: "1",
                  label: (
                    <span className="flex items-center">
                      <span className="mr-2">📦</span>
                      Products
                      <Badge
                        count={tableData.filter((res) => !res.is_cloned).length}
                        className="ml-2 bg-teal-100 text-teal-800"
                      />
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={processedTableData.filter(
                        (res) => !res.is_cloned
                      )}
                      columns={columns}
                      scroll={{ x: 1500 }}
                      onChange={handleTableChange}
                      pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: tableData.filter((res) => !res.is_cloned).length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} of ${total} items`,
                        pageSizeOptions: ['10', '20', '50', '100']
                      }}
                    />
                  ),
                },
                {
                  key: "2",
                  label: (
                    <span className="flex items-center">
                      <MdContentCopy className="mr-2 text-teal-600" />
                      Cloned Products
                      <Badge
                        count={tableData.filter((res) => res.is_cloned).length}
                        className="ml-2 bg-green-100 text-green-800"
                      />
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={processedTableData.filter((res) => res.is_cloned)}
                      columns={columns.filter((col) => col.title !== "Clone")}
                      scroll={{ x: 1400 }}
                      onChange={handleTableChange}
                      pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: tableData.filter((res) => res.is_cloned).length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} of ${total} items`,
                        pageSizeOptions: ['10', '20', '50', '100']
                      }}
                    />
                  ),
                },
              ]}
            />
          </Card>

          {/* Vendor Details Modal */}
          <Modal
            title="Vendor Details"
            open={vendorClose.length > 0}
            footer={null}
            onCancel={() => setVendorClose([])}
            width={600}
          >
            <div className="max-h-96 overflow-y-auto">
              <Descriptions
                layout="vertical"
                bordered
                column={1}
                className="rounded-lg"
              >
                {vendorClose.map((res, index) => (
                  <Descriptions.Item
                    key={index}
                    label={`Vendor ${index + 1}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 mr-3">
                          {vendorNames[res._id] || "Loading..."}
                        </span>
                        {vendorsLoading[res._id] && <Spin size="small" />}
                      </div>
                      <Link
                        to={`/vendor_details/${res._id}`}
                        target="_blank"
                        className="text-teal-600 hover:text-teal-800 font-medium text-sm"
                      >
                        View Details →
                      </Link>
                    </div>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </div>
          </Modal>

          {/* Clone Product Modal */}
          <Modal
            title="Clone Product"
            open={cloneModal}
            onCancel={handleCloseModal}
            footer={null}
            width={400}
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="Category"
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
                  className="w-full"
                  onChange={onCloneCategoryChange}
                  options={categoryData
                    .filter(
                      (res) =>
                        res._id !==
                        safeGet(cloneProductDetails, "category_details._id", "")
                    )
                    .map((item) => ({
                      value: item._id,
                      label: item.main_category_name
                    }))}
                />
              </Form.Item>

              <Form.Item
                label="Sub Category"
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
                  className="w-full"
                  disabled={
                    !form.getFieldValue("category_details") ||
                    subcategoryDataFilter.length === 0
                  }
                  options={subcategoryDataFilter.map((item) => ({
                    value: item._id,
                    label: item.sub_category_name
                  }))}
                />
              </Form.Item>

              <Form.Item>
                <div className="flex justify-end gap-3">
                  <Button
                    onClick={handleCloseModal}
                    className="bg-gray-100 text-gray-900 hover:bg-gray-200 border-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="bg-teal-600 hover:bg-teal-700 border-none"
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

export default VendorProduct;