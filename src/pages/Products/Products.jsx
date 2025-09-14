import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { MdDelete, MdContentCopy, MdMoreVert } from "react-icons/md";
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
import AddForms from "./AddForms"


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
    setFilterByProductSubcategory(""); // Reset subcategory when category changes
    if (value) {
      const response = subcategoryData.filter(
        (data) => data.select_main_category === value
      );
      setSubcategoryDataFilter(response);
    } else {
      setSubcategoryDataFilter([]);
    }
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
      setTableData(_.get(result, "data.data", []));
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
        const businessName = _.get(vendor, "data.data.business_name", "Unknown Vendor");
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

  useEffect(() => {
    const filteredSubcategories = mainCategory.find(
      (category) => category._id === filterByProductCategory
    );
    setSubcategoryData(
      _.get(filteredSubcategories, "sub_categories_details", [])
    );
  }, [filterByProductCategory, mainCategory]);

  const userRole = JSON.parse(localStorage.getItem("userprofile")) || {};

  const productType = [
    { value: "Stand Alone Product", label: "Stand Alone Product" },
    { value: "Variable Product", label: "Variable Product" },
  ];

  const handleClearFilters = () => {
    setFilterByProductCategory("");
    setFilterByProductSubcategory("");
    setVendorFilter("");
    setFilterByType("");
    setSubcategoryDataFilter([]);
  };

  const columns = [
    {
      title: "S.No",
      dataIndex: "_id",
      align: "center",
      render: (_, __, index) => (
        <span className="text-gray-700 font-semibold">{index + 1}</span>
      ),
    },
    {
      title: "Clone",
      render: (data) => (
        <div
          onClick={() => {
            setCloneProductDetails(data);
            handleOpenModal(data);
          }}
          className="text-2xl text-teal-600 cursor-pointer hover:text-teal-800 transition-transform duration-300 transform hover:scale-125"
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
      render: (image) => (
        <div className="flex justify-center">
          {image ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 p-1 bg-white shadow-lg hover:shadow-2xl transition-all duration-300">
              <Image
                src={_.get(image, "[0].path", "")}
                alt="Product"
                className="!w-16 !h-16 object-cover rounded-lg"
                preview={false}
              />
              <div className="absolute inset-0 bg-teal-500 bg-opacity-0 hover:bg-opacity-10 transition-all duration-300"></div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-300">
              <span className="text-xs text-gray-500 font-medium">No Image</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (data) => (
        <Tooltip title={data}>
          <span className="font-semibold text-gray-900 truncate max-w-[160px] block">
            {data}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Main Category",
      dataIndex: "category_details",
      render: (data) => (
        <Tooltip title={_.get(data, "main_category_name", "")}>
          <Tag
            className="max-w-[120px] truncate font-semibold bg-teal-100 text-teal-800 border-none rounded-full px-4 py-1"
          >
            {_.get(data, "main_category_name", "")}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Sub Category",
      dataIndex: "sub_category_details",
      render: (data) => (
        <Tooltip title={_.get(data, "sub_category_name", "")}>
          <Tag
            className="max-w-[120px] truncate font-semibold bg-blue-100 text-blue-800 border-none rounded-full px-4 py-1"
          >
            {_.get(data, "sub_category_name", "")}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "stock",
      dataIndex: "stock_count",
      render: (type) => (
        <Tag
          className={`font-semibold border-none rounded-full px-4 py-1 ${
            type === "Stand Alone Product"
              ? "bg-green-100 text-green-800"
              : "bg-orange-100 text-orange-800"
          }`}
        >
          {type}
        </Tag>
      ),
    },
    {
      title: "Price",
      render: (data) => {
        const price =
          data.single_product_price ||
          data.customer_product_price ||
          _.get(data, "variants_price[0].price", "N/A");
        return <span className="font-bold text-gray-900">Rs. {price}</span>;
      },
      align: "center",
    },
    {
      title: "Vendor",
      align: "center",
      dataIndex: "vendor_details",
      render: (data) => (
        <div className="flex justify-center gap-2">
          {data?.length > 0 ? (
            <Tag
              onClick={() => setVendorClose(data)}
              className="cursor-pointer bg-purple-100 text-purple-800 font-semibold hover:bg-purple-200 transition-colors duration-300 rounded-full px-4 py-1 border-none"
            >
              View ({data.length})
            </Tag>
          ) : (
            <Tag className="bg-gray-100 text-gray-600 font-semibold rounded-full px-4 py-1 border-none">
              None
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      render: (data) => (
        <Dropdown
          overlay={
            <Menu className="rounded-xl shadow-2xl bg-white border border-gray-100 p-2">
              {!_.get(data, "is_cloned", false) && (
                <Menu.Item key="edit">
                  <Button
                    type="text"
                    icon={<FaEdit className="text-teal-600" />}
                    onClick={() => handleUpdate(data)}
                    className="flex items-center text-teal-600 hover:bg-teal-50 w-full text-left px-4 py-2 rounded-lg font-medium"
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
                >
                  <Button
                    type="text"
                    icon={<MdDelete className="text-red-600" />}
                    className="flex items-center text-red-600 hover:bg-red-50 w-full text-left px-4 py-2 rounded-lg font-medium"
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
                  className="flex items-center text-green-600 hover:bg-green-50 w-full text-left px-4 py-2 rounded-lg font-medium"
                >
                  View
                </Button>
              </Menu.Item>
            </Menu>
          }
          trigger={["hover"]}
        >
          <div className="flex justify-center">
            <div className="text-2xl text-gray-600 cursor-pointer hover:text-teal-600 transition-transform duration-300 transform hover:scale-125">
              <MdMoreVert />
            </div>
          </div>
        </Dropdown>
      ),
    },
    {
      title: "New",
      align: "center",
      dataIndex: "new_product",
      render: (data, record) => (
        <Switch
          size="small"
          checked={data}
          onChange={(e) => handleOnChangeLabel({ new_product: e }, record)}
          className="bg-gray-300 hover:bg-teal-500 transition-colors duration-300"
        />
      ),
    },
    {
      title: "Popular",
      align: "center",
      dataIndex: "popular_product",
      render: (data, record) => (
        <Switch
          size="small"
          checked={data}
          onChange={(e) => handleOnChangeLabel({ popular_product: e }, record)}
          className="bg-gray-300 hover:bg-teal-500 transition-colors duration-300"
        />
      ),
    },
    {
      title: "Recommended",
      align: "center",
      dataIndex: "recommended_product",
      render: (data, record) => (
        <Switch
          size="small"
          checked={data}
          onChange={(e) =>
            handleOnChangeLabel({ recommended_product: e }, record)
          }
          className="bg-gray-300 hover:bg-teal-500 transition-colors duration-300"
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 p-8 font-sans">
      <DefaultTile
        title="Products Dashboard"
        add={true}
        addText="  New Product"
        formStatus={formStatus}
        setFormStatus={setFormStatus}
        search={true}
        setSearch={setSearch}
        className="bg-white shadow-2xl rounded-3xl p-8 mb-8 border border-teal-100 transform hover:scale-[1.01] transition-transform duration-300"
      />

      {formStatus ? (
        <AddForms
          fetchData={fetchData}
          setFormStatus={setFormStatus}
          id={id}
          setId={setId}
          className="bg-white shadow-2xl rounded-3xl p-8 border border-teal-100"
        />
      ) : (
        <>
          <Card
            className="mb-8 bg-white shadow-2xl rounded-3xl border-none overflow-hidden transform hover:scale-[1.01] transition-transform duration-300"
            bodyStyle={{ padding: "32px" }}
          >
            <div className="flex justify-between items-center mb-6">
              <Title level={4} className="m-0 flex items-center text-gray-900 font-extrabold tracking-tight">
                <FaFilter className="mr-3 text-teal-600 text-xl" />
                Filter Products
              </Title>
              <Button
                type="text"
                icon={
                  showFilters ? (
                    <span className="text-teal-600 text-xl">▲</span>
                  ) : (
                    <span className="text-teal-600 text-xl">▼</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    suffixIcon={<span className="text-teal-500">▼</span>}
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
                    suffixIcon={<span className="text-teal-500">▼</span>}
                    disabled={!filterByProductCategory || subcategoryDataFilter.length === 0}
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
                    suffixIcon={<span className="text-teal-500">▼</span>}
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
                    suffixIcon={<span className="text-teal-500">▼</span>}
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
            className="bg-white shadow-2xl rounded-3xl border-none overflow-hidden transform hover:scale-[1.01] transition-transform duration-300"
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              destroyInactiveTabPane
              type="card"
              size="large"
              className="px-8 pt-6"
              items={[
                {
                  key: "1",
                  label: (
                    <span className="flex items-center text-gray-900 font-extrabold tracking-tight">
                      <span className="mr-2 text-xl">📦</span> Products
                      <Tag className="ml-3 bg-teal-100 text-teal-800 font-semibold rounded-full px-4 py-0.5">
                        {tableData.filter((res) => !res.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={tableData.filter((res) => !res.is_cloned)}
                      columns={columns}
                      scroll={{ x: 1500 }}
                      className="rounded-b-3xl"
                    />
                  ),
                },
                {
                  key: "2",
                  label: (
                    <span className="flex items-center text-gray-900 font-extrabold tracking-tight">
                      <MdContentCopy className="mr-2 text-teal-600 text-xl" />
                      Cloned Products
                      <Tag className="ml-3 bg-green-100 text-green-800 font-semibold rounded-full px-4 py-0.5">
                        {tableData.filter((res) => res.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={tableData.filter((res) => res.is_cloned)}
                      columns={columns.filter((col) => col.title !== "Clone")}
                      scroll={{ x: 1400 }}
                      className="rounded-b-3xl"
                    />
                  ),
                },
              ]}
            />
          </Card>

          <Modal
            title={
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Vendor Details
              </span>
            }
            open={!_.isEmpty(vendorClose)}
            footer={null}
            onCancel={() => setVendorClose([])}
            className="rounded-3xl"
            bodyStyle={{ padding: "32px" }}
            width={600}
          >
            <div className="max-h-96 overflow-y-auto">
              <Descriptions layout="vertical" bordered column={1} className="rounded-xl">
                {vendorClose.map((res, index) => (
                  <Descriptions.Item
                    key={index}
                    label={
                      <p className="font-semibold text-gray-700 text-lg">
                        Vendor {index + 1}
                      </p>
                    }
                  >
                    <div className="flex justify-between items-center text-base">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-900 mr-3">
                          {vendorNames[res._id] || "Loading..."}
                        </span>
                        {vendorsLoading[res._id] && <Spin size="small" />}
                      </div>
                      <Link
                        to={`/vendor_details/${res._id}`}
                        target="_blank"
                        className="text-teal-600 hover:text-teal-800 transition-colors duration-300 flex items-center font-semibold"
                      >
                        View Details <span className="ml-2">→</span>
                      </Link>
                    </div>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </div>
          </Modal>

          <Modal
            title={
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Clone Product
              </span>
            }
            open={cloneModal}
            onCancel={handleCloseModal}
            footer={null}
            className="rounded-3xl"
            bodyStyle={{ padding: "32px" }}
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
                  { required: true, message: "Please select a product category!" },
                ]}
              >
                <Select
                  placeholder="Select Product Category"
                  className="w-full rounded-xl"
                  onChange={onCategoryChange}
                  suffixIcon={<span className="text-teal-500">▼</span>}
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
                  suffixIcon={<span className="text-teal-500">▼</span>}
                  disabled={!filterByProductCategory || subcategoryDataFilter.length === 0}
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