import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  Tooltip,
} from "antd";
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  LockOutlined 
} from '@ant-design/icons';

import { addCoupen, getSingleCoupen, getAllCoupens, deleteCoupen, editCoupen } from '../../api';
import { canEditPage, canDeletePage, isSuperAdmin } from "../../helper/permissionHelper";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
import moment from 'moment';

const Coupon = () => {
  const { user } = useSelector((state) => state.authSlice);
  const [form] = Form.useForm();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [updatedCouponsId, setUpdatedCouponsId] = useState("");

  // Check permissions
  const hasEditPermission = isSuperAdmin(user.role) || canEditPage(user.pagePermissions, "coupons");
  const hasDeletePermission = isSuperAdmin(user.role) || canDeletePage(user.pagePermissions, "coupons");

  // Fetch coupons
  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const response = await getAllCoupens();
      
      setTimeout(() => {
        setCoupons(response.data.data);
        setLoading(false);
      }, 1000);
    } catch (error) {
      message.error('Failed to fetch coupons');
      setLoading(false);
    }
  };

  // Create coupon
  const handleCreate = async (values) => {
    if (!hasEditPermission) {
      message.error("You don't have permission to create coupons");
      return;
    }

    try {
      setLoading(true);
      const response = await addCoupen(values);
      
      message.success('Coupon created successfully');
      setModalVisible(false);
      fetchCoupons();
      form.resetFields();
    } catch (error) {
      message.error('Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  // Update coupon
  const handleUpdate = async (values, id) => {
    if (!hasEditPermission) {
      message.error("You don't have permission to edit coupons");
      return;
    }

    try {
      setLoading(true);
      
      await editCoupen(values, id);
      const updatedCoupons = coupons.map(coupon =>
        coupon._id === editingCoupon._id
          ? { ...coupon, ...values }
          : coupon
      );
      
      setCoupons(updatedCoupons);
      message.success('Coupon updated successfully');
      setModalVisible(false);
      setEditingCoupon(null);
      form.resetFields();
    } catch (error) {
      message.error('Failed to update coupon');
    } finally {
      setLoading(false);
    }
  };

  // Delete coupon
  const handleDelete = (couponId) => {
    if (!hasDeletePermission) {
      message.error("You don't have permission to delete coupons");
      return;
    }

    Modal.confirm({
      title: 'Are you sure you want to delete this coupon?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          await deleteCoupen(couponId);
          const filteredCoupons = coupons.filter(coupon => coupon._id !== couponId);
          setCoupons(filteredCoupons);
          message.success('Coupon deleted successfully');
        } catch (error) {
          message.error('Failed to delete coupon');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Toggle coupon status
  const toggleCouponStatus = async (couponId, currentStatus) => {
    if (!hasEditPermission) {
      message.error("You don't have permission to modify coupon status");
      return;
    }

    try {
      await editCoupen({ isActive: !currentStatus }, couponId);
      const updatedCoupons = coupons.map(coupon =>
        coupon._id === couponId
          ? { ...coupon, isActive: !currentStatus }
          : coupon
      );
      
      setCoupons(updatedCoupons);
      message.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      message.error('Failed to update coupon status');
    }
  };

  // Open modal for create
  const showCreateModal = () => {
    if (!hasEditPermission) {
      message.error("You don't have permission to create coupons");
      return;
    }

    setEditingCoupon(null);
    setModalVisible(true);
    form.resetFields();
  };

  // Open modal for edit
  const showEditModal = (coupon) => {
    if (!hasEditPermission) {
      message.error("You don't have permission to edit coupons");
      return;
    }

    setUpdatedCouponsId(coupon._id);
    setEditingCoupon(coupon);
    setModalVisible(true);
    form.setFieldsValue({
      ...coupon,
      dateRange: [moment(coupon.startDate), moment(coupon.endDate)]
    });
  };

  // Handle form submit
  const handleFormSubmit = async (values) => {
    const formattedValues = {
      ...values,
      startDate: values.dateRange[0].format('YYYY-MM-DD'),
      endDate: values.dateRange[1].format('YYYY-MM-DD')
    };
    delete formattedValues.dateRange;
    
    if (editingCoupon) {
      await handleUpdate(formattedValues, updatedCouponsId);
    } else {
      await handleCreate(formattedValues);
    }
  };

  // Handle discount type change
  const handleDiscountTypeChange = (value) => {
    // Reset discount values when type changes
    if (value === 'tiered_quantity') {
      form.setFieldsValue({
        Customer_discountValue: 0,
        Dealer_discountValue: 0,
        Corporate_discountValue: 0,
      });
    }
  };

  // Filter coupons based on search
  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchText.toLowerCase())
  );

  // Table columns
  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Text strong>{code}</Text>,
    },
    {
      title: 'Discount Type',
      dataIndex: 'discountType',
      key: 'discountType',
      render: (type) => (
        <Tag color={
          type === 'percentage' ? 'blue' : 
          type === 'fixed' ? 'green' : 
          type === 'tiered_quantity' ? 'purple' : 'orange'
        }>
          {type === 'tiered_quantity' ? 'TIERED' : type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Discount Value',
      dataIndex: 'discountValue',
      key: 'discountValue',
      render: (value, record) => {
        if (record.discountType === 'tiered_quantity') {
          return <Text>Tiered Pricing</Text>;
        }
        return (
          <div>
            <Text>Customer: {record.discountType === 'percentage' ? `${record.Customer_discountValue}%` : `₹${record.Customer_discountValue}`}</Text><br/>
            <Text>Dealer: {record.discountType === 'percentage' ? `${record.Dealer_discountValue}%` : `₹${record.Dealer_discountValue}`}</Text><br/>
            <Text>Corporate: {record.discountType === 'percentage' ? `${record.Corporate_discountValue}%` : `₹${record.Corporate_discountValue}`}</Text>
          </div>
        );
      },
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (_, record) => (
        <Text>{record.usedCount || 0} / {record.usageLimit || '∞'}</Text>
      ),
    },
    {
      title: 'Validity',
      key: 'validity',
      render: (_, record) => (
        <Text>
          {new Date(record.startDate).toLocaleDateString()} - {new Date(record.endDate).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => (
        <Tooltip title={hasEditPermission ? (isActive ? "Active" : "Inactive") : "No permission to modify"}>
          <Switch
            checked={isActive}
            onChange={() => toggleCouponStatus(record._id, isActive)}
            disabled={!hasEditPermission}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {hasEditPermission ? (
            <Tooltip title="Edit Coupon">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => showEditModal(record)}
              >
                Edit
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="No permission to edit">
              <Button
                type="link"
                icon={<LockOutlined />}
                disabled
              >
                Edit
              </Button>
            </Tooltip>
          )}
          
          {hasDeletePermission ? (
            <Tooltip title="Delete Coupon">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record._id)}
              >
                Delete
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="No permission to delete">
              <Button
                type="link"
                icon={<LockOutlined />}
                disabled
              >
                Delete
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>Coupon Management</Title>
          {hasEditPermission ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showCreateModal}
            >
              Add Coupon
            </Button>
          ) : (
            <Tooltip title="No permission to create coupons">
              <Button
                icon={<LockOutlined />}
                disabled
              >
                Add Coupon
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Permission Warning */}
        {!hasEditPermission && !hasDeletePermission && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
            <Text style={{ color: '#fa8c16' }}>
              <LockOutlined /> You have view-only access to coupons. Contact an administrator to request edit permissions.
            </Text>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search coupons by code..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredCoupons}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1000 }}
        />

        {/* Add/Edit Modal */}
        {hasEditPermission && (
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </span>
              </div>
            }
            open={modalVisible}
            onCancel={() => {
              setModalVisible(false);
              setEditingCoupon(null);
              form.resetFields();
            }}
            footer={null}
            width={800}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleFormSubmit}
              initialValues={{
                isActive: true,
                singleUse: false,
                discountType: 'percentage',
                minimumOrderAmount: 0,
                Customer_discountValue: 0,
                Dealer_discountValue: 0,
                Corporate_discountValue: 0
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="code"
                  label={<span style={{ fontWeight: 600 }}>Coupon Code</span>}
                  rules={[{ required: true, message: 'Please enter coupon code' }]}
                >
                  <Input 
                    placeholder="e.g., WELCOME10" 
                    style={{ textTransform: 'uppercase' }} 
                  />
                </Form.Item>

                <Form.Item
                  name="discountType"
                  label={<span style={{ fontWeight: 600 }}>Discount Type</span>}
                  rules={[{ required: true, message: 'Please select discount type' }]}
                >
                  <Select placeholder="Select discount type" onChange={handleDiscountTypeChange}>
                    <Option value="percentage">Percentage</Option>
                    <Option value="fixed">Fixed Amount</Option>
                    <Option value="shipping">Free Shipping</Option>
                    <Option value="tiered_quantity">Tiered Quantity</Option>
                  </Select>
                </Form.Item>
              </div>

              {/* Discount Values Section */}
              <Form.Item shouldUpdate noStyle>
                {() => {
                  const discountType = form.getFieldValue('discountType');
                  if (discountType === 'tiered_quantity') return null;
                  
                  return (
                    <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                      <h4 style={{ marginBottom: '16px', fontWeight: 600 }}>Discount Values by User Type</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <Form.Item
                          name="Customer_discountValue"
                          label="Customer Discount"
                          rules={[{ required: true, message: 'Please enter customer discount' }]}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            placeholder={discountType === 'percentage' ? 'e.g., 10%' : 'e.g., ₹10'}
                            addonAfter={discountType === 'percentage' ? '%' : '₹'}
                          />
                        </Form.Item>

                        <Form.Item
                          name="Dealer_discountValue"
                          label="Dealer Discount"
                          rules={[{ required: true, message: 'Please enter dealer discount' }]}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            placeholder={discountType === 'percentage' ? 'e.g., 15%' : 'e.g., ₹15'}
                            addonAfter={discountType === 'percentage' ? '%' : '₹'}
                          />
                        </Form.Item>

                        <Form.Item
                          name="Corporate_discountValue"
                          label="Corporate Discount"
                          rules={[{ required: true, message: 'Please enter corporate discount' }]}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            placeholder={discountType === 'percentage' ? 'e.g., 20%' : 'e.g., ₹20'}
                            addonAfter={discountType === 'percentage' ? '%' : '₹'}
                          />
                        </Form.Item>
                      </div>
                    </div>
                  );
                }}
              </Form.Item>

              {/* Tiered Discount Section */}
              <Form.Item shouldUpdate noStyle>
                {() => {
                  const discountType = form.getFieldValue('discountType');
                  if (discountType !== 'tiered_quantity') return null;
                  
                  return (
                    <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                      <h4 style={{ marginBottom: '16px', fontWeight: 600 }}>Tiered Quantity Discounts</h4>
                      <Form.List name="discountTiers">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ marginBottom: '16px', padding: '16px', border: '1px solid #d9d9d9', borderRadius: '8px', backgroundColor: 'white' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'minimumQuantity']}
                                    label="Min Quantity"
                                    rules={[{ required: true, message: 'Enter minimum quantity' }]}
                                  >
                                    <InputNumber min={1} placeholder="e.g., 10" style={{ width: '100%' }} />
                                  </Form.Item>
                                  
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'Customer_discountValue']}
                                    label="Customer"
                                    rules={[{ required: true, message: 'Enter discount' }]}
                                  >
                                    <InputNumber min={0} placeholder="Discount" style={{ width: '100%' }} />
                                  </Form.Item>
                                  
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'Dealer_discountValue']}
                                    label="Dealer"
                                    rules={[{ required: true, message: 'Enter discount' }]}
                                  >
                                    <InputNumber min={0} placeholder="Discount" style={{ width: '100%' }} />
                                  </Form.Item>
                                  
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'Corporate_discountValue']}
                                    label="Corporate"
                                    rules={[{ required: true, message: 'Enter discount' }]}
                                  >
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <InputNumber min={0} placeholder="Discount" style={{ flex: 1 }} />
                                      {fields.length > 1 && (
                                        <Button 
                                          type="text" 
                                          danger 
                                          onClick={() => remove(name)}
                                          icon={<DeleteOutlined />}
                                        />
                                      )}
                                    </div>
                                  </Form.Item>
                                </div>
                              </div>
                            ))}
                            <Form.Item>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                Add Tier
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </div>
                  );
                }}
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="minimumOrderAmount"
                  label={<span style={{ fontWeight: 600 }}>Minimum Order Amount</span>}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="0"
                    prefix="₹"
                  />
                </Form.Item>

                <Form.Item
                  name="maximumDiscount"
                  label={<span style={{ fontWeight: 600 }}>Maximum Discount</span>}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="No limit"
                    prefix="₹"
                  />
                </Form.Item>

                <Form.Item
                  name="usageLimit"
                  label={<span style={{ fontWeight: 600 }}>Usage Limit</span>}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    placeholder="No limit"
                  />
                </Form.Item>

                <Form.Item
                  name="isPerProductDiscount"
                  label={<span style={{ fontWeight: 600 }}>Apply Per Product</span>}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </div>

              <Form.Item
                name="dateRange"
                label={<span style={{ fontWeight: 600 }}>Validity Period</span>}
                rules={[{ required: true, message: 'Please select validity period' }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="applicableCategories"
                  label={<span style={{ fontWeight: 600 }}>Applicable Categories</span>}
                >
                  <Select mode="tags" placeholder="Add categories">
                    <Option value="all">All Categories</Option>
                    <Option value="electronics">Electronics</Option>
                    <Option value="clothing">Clothing</Option>
                    <Option value="home">Home & Garden</Option>
                    <Option value="books">Books</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="applicableProducts"
                  label={<span style={{ fontWeight: 600 }}>Applicable Products</span>}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select specific products"
                  />
                </Form.Item>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="isActive"
                  label={<span style={{ fontWeight: 600 }}>Active Status</span>}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  name="singleUse"
                  label={<span style={{ fontWeight: 600 }}>Single Use</span>}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </div>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setModalVisible(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    {editingCoupon ? 'Update' : 'Create'} Coupon
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        )}
      </Card>
    </div>
  );
};

export default Coupon;