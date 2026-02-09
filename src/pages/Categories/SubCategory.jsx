import { Button, Checkbox, Form, Input, message, Modal, Select, Switch, Table, Tooltip, Collapse } from "antd";
import { useEffect, useState } from "react";
import { addSubCategory, deleteSubCategory, editSubCategory, getMainCategory, getSubCategory } from "../../api";
import { CUSTOM_ERROR_NOTIFICATION, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import _ from "lodash";
import { MdDelete, MdDragIndicator } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import ShowImages from "../../helper/ShowImages";
import UploadHelper from "../../helper/UploadHelper";
import React from "react";
import CustomTable from "../../components/CustomTable";
import DefaultTile from "../../components/DefaultTile";
import { ICON_HELPER } from "../../helper/iconhelper";
import { formValidation } from "../../helper/formvalidation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const { Panel } = Collapse;

// Sortable Item Component for individual subcategory
const SortableItem = ({ item, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg ${
        isDragging ? "shadow-lg border-blue-400 z-50" : "hover:shadow-md"
      } transition-all duration-200 mb-2`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <MdDragIndicator className="text-gray-400 text-2xl" />
      </div>
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-semibold">
            {index + 1}
          </span>
          {item.sub_category_image && (
            <img
              src={item.sub_category_image}
              alt={item.sub_category_name}
              className="w-12 h-12 object-cover rounded-md border border-gray-200"
            />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{item.sub_category_name}</p>
          <p className="text-sm text-gray-500">
            Position: <span className="font-semibold">{item.position || index + 1}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const SubCategory = () => {
  const [form] = Form.useForm();
  const [subData, setSubData] = useState([]);
  const [id, setId] = useState(null);
  const [modalStatus, setModalStatus] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [image_path, setImagePath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [banner_image_path, setBannerImage] = useState(null);
  const [nav_square_image_path, setNavSquareImage] = useState(null);
  const [nav_horizontal_image_path, setNavHorizontalImage] = useState(null);
  const [reorderModalStatus, setReorderModalStatus] = useState(false);
  const [reorderData, setReorderData] = useState([]);
  const [groupedSubcategories, setGroupedSubcategories] = useState({});

  // DnD Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getData = async () => {
    try {
      setLoading(true);
      const result = await getMainCategory();
      const data = _.get(result, "data.data", []);
      setSubData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const gettableData = async () => {
    try {
      setLoading(true);
      const result = await getSubCategory(filter);
      const data = _.get(result, "data.data", []);
      setTableData(data);
      
      // Group subcategories by main category
      groupSubcategoriesByMainCategory(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // Group subcategories by main category for display
  const groupSubcategoriesByMainCategory = (subcategories) => {
    const grouped = {};
    
    subcategories.forEach(subcat => {
      const mainCategoryId = _.get(subcat, "main_category_details[0]._id", "");
      const mainCategoryName = _.get(subcat, "main_category_details[0].main_category_name", "Uncategorized");
      
      if (!grouped[mainCategoryId]) {
        grouped[mainCategoryId] = {
          mainCategoryName,
          mainCategoryId,
          subcategories: []
        };
      }
      
      grouped[mainCategoryId].subcategories.push(subcat);
    });
    
    // Sort subcategories within each group by position
    Object.keys(grouped).forEach(key => {
      grouped[key].subcategories.sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    
    setGroupedSubcategories(grouped);
  };

  useEffect(() => {
    getData();
    gettableData();
  }, [filter]);

  const handleFinish = async (values) => {
    try {
      if (!image_path) {
        return message.warning("Please provide a category image");
      }
      if (!banner_image_path) {
        return message.warning("Please provide a banner image");
      }

      values.sub_category_image = image_path;
      values.sub_category_banner_image = banner_image_path;
      values.nav_menu_square_image = nav_square_image_path || "";
      values.nav_menu_horizontal_image = nav_horizontal_image_path || "";

      let result;
      if (id) {
        result = await editSubCategory(values, id?._id);
      } else {
        result = await addSubCategory(values);
      }
      SUCCESS_NOTIFICATION(result);
      setModalStatus(false);
      setBannerImage("");
      setNavSquareImage("");
      setNavHorizontalImage("");
      setId(null);

      setImagePath("");
      form.resetFields("");
      getData();
      gettableData();
    } catch (err) {
      CUSTOM_ERROR_NOTIFICATION(err);
      console.log(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteSubCategory(id);
      SUCCESS_NOTIFICATION(result);
      gettableData();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleOnChangeShowBrowseAllCategory = async (e, recordId) => {
    const val = e.target.checked;
    try {
      let result = "";
      if (recordId) {
        result = await editSubCategory({ show: val }, recordId);
      }
      SUCCESS_NOTIFICATION(result);
      gettableData();
    } catch (err) {
      CUSTOM_ERROR_NOTIFICATION(err);
      console.log(err);
    }
  };

  const handleUpdate = (subData) => {
    try {
      setId(subData);
      setModalStatus(true);
      form.setFieldsValue({
        select_main_category: _.get(subData, "main_category_details[0]._id", ""),
        sub_category_name: subData.sub_category_name,
        sub_category_image: subData.sub_category_image,
        sub_category_banner_image: subData.sub_category_banner_image,
        nav_menu_square_image: subData.nav_menu_square_image,
        nav_menu_horizontal_image: subData.nav_menu_horizontal_image,
        position: subData.position,
        show: subData.show,
      });
      setImagePath(subData.sub_category_image);
      setBannerImage(subData.sub_category_banner_image);
      setNavSquareImage(subData.nav_menu_square_image);
      setNavHorizontalImage(subData.nav_menu_horizontal_image);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleClose = () => {
    form.resetFields("");
    setModalStatus(false);
    setImagePath(null);
    setBannerImage(null);
    setNavSquareImage(null);
    setNavHorizontalImage(null);
    setId(null);
  };

  // Open reorder modal for specific main category
  const openReorderModal = (mainCategoryId) => {
    const categoryGroup = groupedSubcategories[mainCategoryId];
    if (categoryGroup) {
      const sortedData = [...categoryGroup.subcategories].sort((a, b) => (a.position || 0) - (b.position || 0));
      setReorderData(sortedData);
      setReorderModalStatus(true);
    }
  };

  // Open reorder modal for all subcategories
  const openReorderModalAll = () => {
    const sortedData = [...tableData].sort((a, b) => (a.position || 0) - (b.position || 0));
    setReorderData(sortedData);
    setReorderModalStatus(true);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setReorderData((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update positions
        return newItems.map((item, index) => ({
          ...item,
          position: index + 1,
        }));
      });
    }
  };

  const saveReorder = async () => {
    try {
      setLoading(true);

      // Update each subcategory with new position
      const updatePromises = reorderData.map((item, index) =>
        editSubCategory({ position: index + 1 }, item._id)
      );

      await Promise.all(updatePromises);

      SUCCESS_NOTIFICATION({ message: "Order updated successfully" });
      setReorderModalStatus(false);
      gettableData();
    } catch (err) {
      ERROR_NOTIFICATION(err);
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

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
      title: "Sub Category Name",
      dataIndex: "sub_category_name",
    },
    {
      title: "Main Category Name",
      dataIndex: "main_category_details",
      render: (data) => {
        return (
          <>
            <span>{_.get(data, "[0].main_category_name")}</span>
          </>
        );
      },
    },

    {
      title: "Position",
      dataIndex: "position",
      align: "center",
    },
    {
      title: "Show in Browse All Category",
      dataIndex: "show",
      align: "center",
      render: (data, record, index) => {
        return <Checkbox checked={data} onChange={(e) => handleOnChangeShowBrowseAllCategory(e, record._id ?? "")} />;
      },
    },
    {
      title: "Images",
      dataIndex: "sub_category_image",
      render: (image) => {
        return (
          <div>
            {image ? (
              <img
                src={image}
                alt="Sub Category"
                style={{
                  width: "50px",
                  height: "50px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Banner Images",
      dataIndex: "sub_category_banner_image",
      render: (image) => {
        return (
          <div>
            {image ? (
              <img
                src={image}
                alt="Sub Category"
                style={{
                  width: "50px",
                  height: "50px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Nav Square Image",
      dataIndex: "nav_menu_square_image",
      render: (image) => {
        return (
          <div>
            {image ? (
              <img
                src={image}
                alt="Nav Square"
                style={{
                  width: "50px",
                  height: "50px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Nav Horizontal Image",
      dataIndex: "nav_menu_horizontal_image",
      render: (image) => {
        return (
          <div>
            {image ? (
              <img
                src={image}
                alt="Nav Horizontal"
                style={{
                  width: "80px",
                  height: "40px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>
        );
      },
    },

    {
      title: "Actions",
      render: (data) => {
        return (
          <div className="flex gap-2">
            <div className="">
              <Button className="text-green-500 border-green-300" onClick={() => handleUpdate(data)}>
                Edit
              </Button>
            </div>
            <div className="">
              <Button className="text-red-600  border-red-300" variant="filled" onClick={() => handleDelete(data._id)}>
                Delete
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  const handleFilterChange = (value) => {
    setFilter(value);
  };

  return (
    <div>
      <DefaultTile
        filter={true}
        handleFilterChange={handleFilterChange}
        filterData={subData}
        title={"Add Sub Category"}
        addModal={true}
        addModalText="Sub Category"
        modalFormStatus={modalStatus}
        setModalFormStatus={setModalStatus}
      />

      {/* Reorder Buttons */}
      <div className="mb-4 flex justify-end gap-2">
        <Button
          type="primary"
          onClick={openReorderModalAll}
          className="bg-blue-500 hover:bg-blue-600"
          icon={<MdDragIndicator />}
          disabled={tableData.length === 0}
        >
          Reorder All Subcategories
        </Button>
      </div>

      {/* Grouped Display by Main Category */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Subcategories by Main Category</h2>
        <Collapse accordion>
          {Object.keys(groupedSubcategories).map((mainCategoryId) => {
            const group = groupedSubcategories[mainCategoryId];
            return (
              <Panel
                header={
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">
                      {group.mainCategoryName} ({group.subcategories.length} subcategories)
                    </span>
                    <Button
                      size="small"
                      type="primary"
                      icon={<MdDragIndicator />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openReorderModal(mainCategoryId);
                      }}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Reorder
                    </Button>
                  </div>
                }
                key={mainCategoryId}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.subcategories.map((subcat, index) => (
                    <div
                      key={subcat._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                          {index + 1}
                        </span>
                        {subcat.sub_category_image && (
                          <img
                            src={subcat.sub_category_image}
                            alt={subcat.sub_category_name}
                            className="w-16 h-16 object-cover rounded-md border border-gray-200"
                          />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {subcat.sub_category_name}
                      </h3>
                      <div className="text-sm text-gray-600 mb-3">
                        <p>Position: {subcat.position || index + 1}</p>
                        <p>
                          Visible: {subcat.show ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-red-600">No</span>
                          )}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {subcat.nav_menu_square_image && (
                            <div>
                              <p className="text-xs text-gray-500">Square:</p>
                              <img
                                src={subcat.nav_menu_square_image}
                                alt="Square"
                                className="w-10 h-10 object-cover rounded border"
                              />
                            </div>
                          )}
                          {subcat.nav_menu_horizontal_image && (
                            <div>
                              <p className="text-xs text-gray-500">Horizontal:</p>
                              <img
                                src={subcat.nav_menu_horizontal_image}
                                alt="Horizontal"
                                className="w-20 h-10 object-cover rounded border"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          className="text-green-500 border-green-300"
                          onClick={() => handleUpdate(subcat)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          className="text-red-600 border-red-300"
                          onClick={() => handleDelete(subcat._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </Collapse>
      </div>

      {/* Original Table View */}
      {/* <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">All Subcategories (Table View)</h2>
        <CustomTable loading={loading} dataSource={tableData} columns={columns} />
      </div> */}

      {/* Add/Edit Modal */}
      <Modal title="Sub Category" closable={false} open={modalStatus} footer={null} width={900}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="select_main_category" label="Select Main Category" rules={[formValidation("Select Main Category")]}>
            <Select placeholder="Select Main Category" className="!h-[50px]">
              {subData.map((res) => (
                <Select.Option key={res._id} value={res._id}>
                  {res.main_category_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="sub_category_name" label="Sub Category Name" rules={[{ required: true, message: "Please enter a subcategory name!" }]}>
            <Input placeholder="Enter Sub Category Name" className="!h-[50px]" />
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item className="w-full" name="sub_category_image" label="Subcategory Image">
              {image_path ? <ShowImages path={image_path} setImage={setImagePath} /> : <UploadHelper setImagePath={setImagePath} />}
            </Form.Item>

            <Form.Item className="w-full" name="sub_category_banner_image" label="Banner Image">
              {banner_image_path ? <ShowImages path={banner_image_path} setImage={setBannerImage} /> : <UploadHelper setImagePath={setBannerImage} />}
            </Form.Item>
          </div>

          <div className="border-t pt-4 mt-4">
           
            
            {/* <div className="flex gap-4">
              <Form.Item className="w-full" name="nav_menu_square_image" label="Square Image (For 1 Empty Box)">
                {nav_square_image_path ? (
                  <ShowImages path={nav_square_image_path} setImage={setNavSquareImage} />
                ) : (
                  <UploadHelper setImagePath={setNavSquareImage} />
                )}
                <p className="text-xs text-gray-500 mt-1">Recommended: Square aspect ratio (e.g., 300x300px)</p>
              </Form.Item>

              <Form.Item className="w-full" name="nav_menu_horizontal_image" label="Horizontal Image (For 2-3 Empty Boxes)">
                {nav_horizontal_image_path ? (
                  <ShowImages path={nav_horizontal_image_path} setImage={setNavHorizontalImage} />
                ) : (
                  <UploadHelper setImagePath={setNavHorizontalImage} />
                )}
                <p className="text-xs text-gray-500 mt-1">Recommended: Wide aspect ratio (e.g., 600x300px)</p>
              </Form.Item>
            </div> */}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="default" onClick={handleClose}>
              Close
            </Button>
            <Button type="primary" htmlType="submit" className="bg-primary">
              {id ? "Edit" : "Add"}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Reorder Modal with DnD Kit */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <MdDragIndicator className="text-blue-500 text-xl" />
            <span>Reorder Subcategories</span>
          </div>
        }
        open={reorderModalStatus}
        onCancel={() => setReorderModalStatus(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setReorderModalStatus(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={saveReorder} loading={loading} className="bg-primary">
            Save Order
          </Button>,
        ]}
      >
        <div className="py-4">
          <p className="mb-4 text-gray-600">
            <strong>Drag and drop</strong> to reorder subcategories. The new order will be saved across your entire application.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={reorderData.map((item) => item._id)} strategy={verticalListSortingStrategy}>
              <div className="max-h-[500px] overflow-y-auto pr-2">
                {reorderData.map((item, index) => (
                  <SortableItem key={item._id} item={item} index={index} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {reorderData.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No subcategories available to reorder</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SubCategory;