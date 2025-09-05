import { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import AddForms from "./AddForms";
import { MdDelete, MdContentCopy } from "react-icons/md";
import { 
  Button, Checkbox, Collapse, Descriptions, Form, Image, Input, Modal, 
  Popconfirm, Select, Spin, Switch, Table, Tabs, Tag, Tooltip, Card, 
  Row, Col, Divider, Space, Typography 
} from "antd";
import { FaEdit, FaEye, FaFilter } from "react-icons/fa";
import _ from "lodash";
import { 
  addproduct, CLIENT_URL, deleteProduct, editProduct, getAllCategoryProducts, 
  getAllVendor, getMainCategory, getProduct, getSubCategory, getSubProductCategory 
} from "../../api";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import CustomTable from "../../components/CustomTable";
import { ICON_HELPER } from "../../helper/iconhelper";
import { Link } from "react-router-dom";
import { useForm } from "antd/es/form/Form";

const { Title, Text } = Typography;

const Products = () => {
  const [formStatus, setFormStatus] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [search, setSearch] = useState("");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mainCategory, setmainCategoryData] = useState([]);
  const [filterByProduct_category, setFilterByProduct_category] = useState("");
  const [filterByProduct_subcategory, setFilterByProduct_subcategory] = useState("");
  const [vendor_filter, setVendor_filter] = useState("");
  const [filterByType, setFilterByType] = useState("");
  const [vendorClose, setVendorClose] = useState([]);
  const [subcategoryData, setSubcategoryData] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [cloneModal, setOpenCloneModal] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [subcategory_data, setSubcategory_data] = useState([]);
  const [filter_subcategory_data, setFilterSubcategory_data] = useState([]);
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [productid, setProductId] = useState();
  const [showFilters, setShowFilters] = useState(false);

  const [cloneProductDetails, setCloneProductDetails] = useState([]);

  const [form] = useForm();

  const handleOpneModal = (productData) => {
    delete productData.category_details;
    delete productData.sub_category_details;
    const product_id = productData._id;
    delete productData._id;

    try {
      setSelectedProductData(productData);
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
  };

  useEffect(() => {
    productCategory();
  }, []);

  const onCategoryChnage = (value) => {
    if (value) {
      let responce = subcategory_data.filter((data) => {
        return data.select_main_category === value;
      });
      setFilterSubcategory_data(responce);
    }
  };

  const productCategorys = async () => {
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

  useEffect(() => {
    productCategorys();
  }, []);

  const handleSubmit = async (value) => {
    setLoading(true);
    try {
      const payload = {
        ...cloneProductDetails,
        parent_product_id: _.get(cloneProductDetails, "_id", ""),
        is_cloned: true,
        category_details: value.category_details,
        sub_category_details: value.sub_category_details,
      };

      delete payload._id;

      const result = await addproduct(payload);
      SUCCESS_NOTIFICATION(result);
      form.resetFields();
      fetchData();
      setCloneProductDetails([]);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const productCategory = async () => {
    try {
      const result = await getAllCategoryProducts();
      const data = _.get(result, "data.data", "");
      setmainCategoryData(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getProduct("", search, true, filterByProduct_category, filterByType, filterByProduct_subcategory, vendor_filter);
      setTableData(_.get(result, "data.data"));
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

  useEffect(() => {
    fetchData();
    if (!formStatus) setId("");
  }, [search, formStatus, filterByProduct_category, filterByType, filterByProduct_subcategory, vendor_filter]);

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

  const productType = [
    {
      value: "Single Product",
    },
    {
      value: "Variant Product",
    },
  ];

  const columns = [
    {
      title: "S.No",
      dataIndex: "_id",
      align: "center",
      render: (s, a, index) => {
        return <span className="text-gray-600">{index + 1}</span>;
      },
    },
    {
      title: "Clone",
      render: (data) => {
        return (
          <div onClick={() => setCloneProductDetails(data)} className="text-lg text-blue-500 center_div cursor-pointer hover:text-blue-700 transition-colors">
            <MdContentCopy />
          </div>
        );
      },
    },
    {
      title: "Image",
      dataIndex: "images",
      render: (image) => {
        return (
          <div className="flex justify-center">
            {image ? (
              <div className="rounded-md overflow-hidden border border-gray-200 p-1 bg-white shadow-sm">
                <Image 
                  src={_.get(image, "[0].path", "")} 
                  alt="Product" 
                  className="!w-[50px] !h-[50px] !object-cover"
                  preview={false}
                />
              </div>
            ) : (
              <div className="w-[50px] h-[50px] bg-gray-100 rounded-md flex items-center justify-center border border-dashed border-gray-300">
                <span className="text-xs text-gray-400">No Image</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (data) => {
        return (
          <Tooltip title={data}>
            <span className="font-medium text-gray-800 line-clamp-1 max-w-[120px]">{data}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Main Category",
      dataIndex: "category_details",
      render: (data) => {
        return (
          <Tooltip title={_.get(data, "main_category_name", "")}>
            <Tag color="blue" className="max-w-[120px] truncate">
              {_.get(data, "main_category_name", "")}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Sub Category",
      dataIndex: "sub_category_details",
      render: (data) => {
        return (
          <Tooltip title={_.get(data, "sub_category_name", "")}>
            <Tag color="geekblue" className="max-w-[120px] truncate">
              {_.get(data, "sub_category_name", "")}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (type) => (
        <Tag color={type === "Single Product" ? "green" : "orange"}>
          {type}
        </Tag>
      )
    },
    {
      title: "Price",
      render: (data) => {
        const price = data.single_product_price || _.get(data, "variants_price[0].price", "N/A");
        return <span className="font-semibold text-gray-800">Rs. {price}</span>;
      },
      align: "center",
    },
    {
      title: "Vendor",
      align: "center",
      dataIndex: "vendor_details",
      render: (data) => {
        return (
          <div className="center_div gap-x-2">
            {data?.length > 0 ? (
              <Tag
                color="purple"
                onClick={() => {
                  setVendorClose(data);
                }}
                className="cursor-pointer hover:bg-purple-100 transition-colors"
              >
                View ({data.length})
              </Tag>
            ) : (
              <Tag color="default">None</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Actions",
      render: (data) => {
        return (
          <Space size="small">
            {!_.get(data, "is_cloned", false) && (
              <Button
                size="small"
                icon={<FaEdit />}
                onClick={() => {
                  handleUpdate(data);
                }}
                className="text-blue-500 border-blue-100 hover:bg-blue-50"
              >
                Edit
              </Button>
            )}
            <Popconfirm 
              title="Delete Product" 
              description="Are you sure you want to delete this product?" 
              onConfirm={() => handleDelete(data)}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                size="small" 
                icon={<MdDelete />}
                className="text-red-500 border-red-100 hover:bg-red-50"
              >
                Delete
              </Button>
            </Popconfirm>
            <Button 
              size="small" 
              icon={<FaEye />}
              onClick={() => handleView(data)}
              className="text-green-500 border-green-100 hover:bg-green-50"
            >
              View
            </Button>
          </Space>
        );
      },
    },
    {
      title: "New",
      align: "center",
      dataIndex: "new_product",
      render: (data, record) => {
        return (
          <Switch
            size="small"
            checked={data}
            onChange={(e) => {
              handleOnChangeLabel({ new_product: e }, record);
            }}
            className="bg-gray-300"
          />
        );
      },
    },
    {
      title: "Popular",
      align: "center",
      dataIndex: "popular_product",
      render: (data, record) => {
        return (
          <Switch
            size="small"
            checked={data}
            onChange={(e) => {
              handleOnChangeLabel({ popular_product: e }, record);
            }}
            className="bg-gray-300"
          />
        );
      },
    },
    {
      title: "Recommended",
      align: "center",
      dataIndex: "recommended_product",
      render: (data, record) => {
        return (
          <Switch
            size="small"
            checked={data}
            onChange={(e) => {
              handleOnChangeLabel({ recommended_product: e }, record);
            }}
            className="bg-gray-300"
          />
        );
      },
    },
  ];

  useEffect(() => {
    let filte_category_subcategory = mainCategory.filter((category) => {
      return category._id === filterByProduct_category;
    });
    setSubcategoryData(_.get(filte_category_subcategory, "[0].sub_categories_details", []));
  }, [filterByProduct_category]);

  const collectVendors = async () => {
    try {
      setLoading(true);
      const result = await getAllVendor();
      setAllVendors(_.get(result, "data.data", []));
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    collectVendors();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <DefaultTile 
        title={"Products Management"} 
        add={true} 
        addText={"Add Product"} 
        formStatus={formStatus} 
        setFormStatus={setFormStatus} 
        search={true} 
        setSearch={setSearch} 
      />

      {formStatus ? (
        <AddForms fetchData={fetchData} setFormStatus={setFormStatus} id={id} setId={setId} />
      ) : (
        <>
          <Card 
            className="mb-6 shadow-sm border-0 rounded-xl"
            bodyStyle={{ padding: '16px 24px' }}
          >
            <div className="flex justify-between items-center mb-4">
              <Title level={5} className="m-0 flex items-center">
                <FaFilter className="mr-2 text-blue-500" />
                Filters
              </Title>
              <Button 
                type="text" 
                icon={showFilters ? <span>▲</span> : <span>▼</span>}
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-500"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
            
            <Collapse in={showFilters}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Text className="text-sm font-medium text-gray-600">Product Category</Text>
                  <Select 
                    placeholder="Select Category" 
                    size="middle" 
                    className="w-full mt-1"
                    allowClear 
                    onChange={(val) => setFilterByProduct_category(val)}
                    suffixIcon={<span className="text-gray-400">▼</span>}
                  >
                    {mainCategory.map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        {item.main_category_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {!_.isEmpty(subcategoryData) && (
                  <div>
                    <Text className="text-sm font-medium text-gray-600">Sub Category</Text>
                    <Select 
                      placeholder="Select Sub Category" 
                      size="middle" 
                      className="w-full mt-1"
                      allowClear 
                      onChange={(val) => setFilterByProduct_subcategory(val)}
                      suffixIcon={<span className="text-gray-400">▼</span>}
                    >
                      {subcategoryData.map((item) => (
                        <Select.Option key={item._id} value={item._id}>
                          {item.sub_category_name}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                )}

                <div>
                  <Text className="text-sm font-medium text-gray-600">Vendor</Text>
                  <Select 
                    placeholder="Select Vendor" 
                    size="middle" 
                    className="w-full mt-1"
                    allowClear 
                    onChange={(val) => setVendor_filter(val)}
                    suffixIcon={<span className="text-gray-400">▼</span>}
                  >
                    {allVendors.map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        {item.vendor_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text className="text-sm font-medium text-gray-600">Product Type</Text>
                  <Select 
                    placeholder="Select Type" 
                    size="middle" 
                    className="w-full mt-1"
                    options={productType} 
                    allowClear 
                    onChange={(val) => setFilterByType(val)}
                    suffixIcon={<span className="text-gray-400">▼</span>}
                  />
                </div>
              </div>
            </Collapse>
          </Card>

          <Card 
            className="shadow-sm border-0 rounded-xl overflow-hidden"
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              destroyInactiveTabPane
              type="card"
              size="middle"
              className="px-4 pt-4"
              items={[
                {
                  key: "1",
                  label: (
                    <span className="flex items-center">
                      <span className="mr-1">📦</span> Products
                      <Tag className="ml-2" color="blue">
                        {tableData.filter(res => !res.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={tableData.filter((res) => {
                        return !res.is_cloned;
                      })}
                      columns={columns}
                      scroll={{ x: 1500 }}
                    />
                  ),
                },
                {
                  key: "2",
                  label: (
                    <span className="flex items-center">
                      <MdContentCopy className="mr-1" /> Cloned Products
                      <Tag className="ml-2" color="green">
                        {tableData.filter(res => res.is_cloned).length}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <CustomTable
                      loading={loading}
                      dataSource={tableData.filter((res) => {
                        return res.is_cloned;
                      })}
                      columns={columns.filter((col) => col.title !== "Clone")}
                      scroll={{ x: 1400 }}
                    />
                  ),
                },
              ]}
            />
          </Card>

          <Modal
            title="Vendor Details"
            open={!_.isEmpty(vendorClose)}
            footer={false}
            onCancel={() => {
              setVendorClose([]);
            }}
            className="rounded-lg"
            bodyStyle={{ padding: '16px 24px' }}
          >
            <Descriptions layout="vertical" bordered column={1}>
              {vendorClose.map((res, index) => {
                return (
                  <Descriptions.Item key={index} label={<p className="font-medium">Vendor {index + 1}</p>}>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{res.vendor_name}</span>
                      <Link to={`/vendor_details/${res._id}`} target="_blank" className="text-blue-500 hover:text-blue-700 transition-colors">
                        View Details →
                      </Link>
                    </div>
                  </Descriptions.Item>
                );
              })}
            </Descriptions>
          </Modal>
        </>
      )}

      <Modal 
        title="Clone Product" 
        open={!_.isEmpty(cloneProductDetails)} 
        onCancel={handleCloseModal} 
        footer={null}
        className="rounded-lg"
        bodyStyle={{ padding: '24px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item 
            label="Category" 
            name="category_details" 
            rules={[{ required: true, message: "Please select a product category!" }]}
          >
            <Select
              placeholder="Select Product Category"
              className="w-full"
              onChange={onCategoryChnage}
              suffixIcon={<span className="text-gray-400">▼</span>}
            >
              {categoryData
                .filter((res) => {
                  return res._id !== _.get(cloneProductDetails, "category_details._id", "");
                })
                .map((item) => (
                  <Select.Option key={item._id} value={item._id}>
                    {item.main_category_name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item 
            label="Sub Category" 
            name="sub_category_details" 
            rules={[{ required: true, message: "Please select a product sub-category!" }]}
          >
            <Select 
              placeholder="Select Product Sub Category" 
              className="w-full"
              suffixIcon={<span className="text-gray-400">▼</span>}
            >
              {filter_subcategory_data.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.sub_category_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-3">
              <Button onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                className="bg-blue-500 hover:bg-blue-600 border-blue-500"
                loading={loading}
              >
                Clone Product
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;