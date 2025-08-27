import { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import AddForms from "./AddForms";
import { MdDelete } from "react-icons/md";
import { Button, Checkbox, Collapse, Descriptions, Form, Image, Input, Modal, Popconfirm, Select, Spin, Switch, Table, Tabs, Tag, Tooltip } from "antd";
import { FaEdit } from "react-icons/fa";
import _ from "lodash";
import { addproduct, CLIENT_URL, deleteProduct, editProduct, getAllCategoryProducts, getAllVendor, getMainCategory, getProduct, getSubCategory, getSubProductCategory } from "../../api";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import CustomTable from "../../components/CustomTable";
import { ICON_HELPER } from "../../helper/iconhelper";
import { Link } from "react-router-dom";
import { render } from "react-dom";
import { useForm } from "antd/es/form/Form";

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
  console.log({ tableData });

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
        return <span>{index + 1}</span>;
      },
    },
    {
      title: "Clone",
      render: (data) => {
        return (
          <div onClick={() => setCloneProductDetails(data)} className="text-lg text-primary center_div cursor-pointer">
            <ICON_HELPER.PLUS_ICON />
          </div>
        );
      },
    },
    {
      title: "Image",
      dataIndex: "images",
      render: (image) => {
        return <div>{image ? <Image src={_.get(image, "[0].path", "")} alt="Sub Category" className="!w-[50px] !h-[50px] !object-cover" /> : <span>No Image</span>}</div>;
      },
    },
    {
      title: " Name",
      dataIndex: "name",
      render: (data) => {
        return (
          <Tooltip title={data}>
            <span className="!line-clamp-1 w-[100px]">{data}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Category",
      dataIndex: "category_details",
      render: (data) => {
        return (
          <Tooltip title={_.get(data, "main_category_name", "")}>
            <span className="!line-clamp-1 w-[100px]">{_.get(data, "main_category_name", "")}</span>
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
            <span className="!line-clamp-1 w-[100px]">{_.get(data, "sub_category_name", "")}</span>
          </Tooltip>
        );
      },
    },

    {
      title: " Type",
      dataIndex: "type",
    },
    {
      title: " Price",
      render: (data) => {
        const price = data.single_product_price || _.get(data, "variants_price[0].price", "N/A");
        return <span>Rs. {price}</span>;
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
                onClick={() => {
                  setVendorClose(data);
                }}
                className="cursor-pointer"
              >
                View
              </Tag>
            ) : (
              ""
            )}
          </div>
        );
      },
    },

    {
      title: "Actions",
      render: (data) => {
        return (
          <div className="center_div gap-x-2">
            {!_.get(data, "is_cloned", false) && (
              <>
                {" "}
                <Button
                  onClick={() => {
                    handleUpdate(data);
                  }}
                  className="text-green-600"
                >
                  Edit
                </Button>
              </>
            )}
            <Popconfirm description="Are you sure want to delete This Product" onConfirm={() => handleDelete(data)}>
              <Button className="text-red-600">Delete</Button>
            </Popconfirm>
            <Button className="text-blue-500" onClick={() => handleView(data)}>
              View
            </Button>
          </div>
        );
      },
    },
    {
      title: "New ",
      align: "center",
      dataIndex: "new_product",
      render: (data, record) => {
        return (
          <Switch
            size="small"
            value={data}
            onChange={(e) => {
              handleOnChangeLabel({ new_product: e }, record);
            }}
          ></Switch>
        );
      },
    },
    {
      title: "Popular ",
      align: "center",
      dataIndex: "popular_product",
      render: (data, record) => {
        return (
          <Switch
            size="small"
            value={data}
            onChange={(e) => {
              handleOnChangeLabel({ popular_product: e }, record);
            }}
          ></Switch>
        );
      },
    },
    {
      title: "Recommended ",
      align: "center",
      dataIndex: "recommended_product",
      render: (data, record) => {
        return (
          <Switch
            size="small"
            value={data}
            onChange={(e) => {
              handleOnChangeLabel({ recommended_product: e }, record);
            }}
          ></Switch>
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
    <div>
      <DefaultTile title={"Products"} add={true} addText={"Product"} formStatus={formStatus} setFormStatus={setFormStatus} search={true} setSearch={setSearch} />

      {formStatus ? (
        <AddForms fetchData={fetchData} setFormStatus={setFormStatus} id={id} setId={setId} />
      ) : (
        <>
          <div className="flex gap-x-2 py-2">
            <Select placeholder="Filter By Product Category" size="large" className="!w-[20rem] !h-[50px]" allowClear onChange={(val) => setFilterByProduct_category(val)}>
              {mainCategory.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.main_category_name}
                </Select.Option>
              ))}
            </Select>

            {!_.isEmpty(subcategoryData) && (
              <>
                <Select placeholder="Filter By Sub Category" size="large" className="!w-[20rem] !h-[50px]" allowClear onChange={(val) => setFilterByProduct_subcategory(val)}>
                  {subcategoryData.map((item) => (
                    <Select.Option key={item._id} value={item._id}>
                      {item.sub_category_name}
                    </Select.Option>
                  ))}
                </Select>
              </>
            )}

            <Select placeholder="Filter By Product Vendor" size="large" className="!w-[20rem] !h-[50px]" allowClear onChange={(val) => setVendor_filter(val)}>
              {allVendors.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.vendor_name}
                </Select.Option>
              ))}
            </Select>

            <Select placeholder="Filter By Product Type" size="large" className="!w-[13rem] !h-[50px]" options={productType} allowClear onChange={(val) => setFilterByType(val)} />
          </div>
          <Tabs
            destroyInactiveTabPane
            type="card"
            size="small"
            items={[
              {
                key: "1",
                label: "Products",
                children: (
                  <CustomTable
                    loading={loading}
                    dataSource={tableData.filter((res) => {
                      return !res.is_cloned;
                    })}
                    columns={columns}
                  />
                ),
              },
              {
                key: "2",
                label: "Cloned Products",
                children: (
                  <CustomTable
                    loading={loading}
                    dataSource={tableData.filter((res) => {
                      return res.is_cloned;
                    })}
                    columns={columns.filter((col) => col.title !== "Clone")}
                  />
                ),
              },
            ]}
          />

          <Modal
            title="Vendor Details"
            open={!_.isEmpty(vendorClose)}
            footer={false}
            onCancel={() => {
              setVendorClose([]);
            }}
          >
            <Descriptions layout="vertical" bordered>
              {vendorClose.map((res, index) => {
                return (
                  <Descriptions.Item key={index} label={<p>Vendor {index + 1}</p>}>
                    <div className="center_div justify-between !text-sm">
                      {res.vendor_name}
                      <Link to={`/vendor_details/${res._id}`} target="_blank" className="!text-sm !text-sky-500">
                        View More
                      </Link>
                    </div>
                  </Descriptions.Item>
                );
              })}
            </Descriptions>
          </Modal>
        </>
      )}

      <Modal title="Clone Product" open={!_.isEmpty(cloneProductDetails)} onCancel={handleCloseModal} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Category" name="category_details" rules={[{ required: true, message: "Please select a product category!" }]}>
            <Select
              placeholder="Select Product Category"
              className="input_box"
              onChange={(e) => {
                onCategoryChnage(e);
              }}
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

          <Form.Item label="Sub Category" name="sub_category_details" rules={[{ required: true, message: "Please select a product sub-category!" }]}>
            <Select placeholder="Select Product Sub Category" className="input_box">
              {filter_subcategory_data.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.sub_category_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button className="bg-primary text-white" type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
