import React, { useState, useEffect } from 'react'
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
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';

import { addCoupen,getSingleCoupen,getAllCoupens,deleteCoupen,editCoupen } from '../../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
import moment from 'moment';  

const Coupon = () => {
  const [form] = Form.useForm();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [updatedCouponsId, setUpdatedCouponsId] = useState("");


  // Fetch coupons (replace with actual API call)
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
  const handleUpdate = async (values,id) => {
    try {
      setLoading(true);
      // Replace with actual API call
      
      await editCoupen(values,id);
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
    Modal.confirm({
      title: 'Are you sure you want to delete this coupon?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          // Replace with actual API call
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
    try {
      // Replace with actual API call
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
    setEditingCoupon(null);
    setModalVisible(true);
    form.resetFields();
  };

  // Open modal for edit
  const showEditModal = (coupon) => {
    console.log(coupon);
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
    console.log(values,"value");
    
    if (editingCoupon) {
      await handleUpdate(formattedValues, updatedCouponsId);
    } else {
      await handleCreate(formattedValues);
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
          type === 'fixed' ? 'green' : 'orange'
        }>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Discount Value',
      dataIndex: 'discountValue',
      key: 'discountValue',
      render: (value, record) => (
        <Text>
          {record.discountType === 'percentage' ? `${value}%` : 
           record.discountType === 'fixed' ? `₹${value}` : 'Free Shipping'}
        </Text>
      ),
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (_, record) => (
        <Text>{record.usedCount} / {record.usageLimit || '∞'}</Text>
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
        <Switch
          checked={isActive}
          onChange={() => toggleCouponStatus(record._id, isActive)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>Coupon Management</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateModal}
          >
            Add Coupon
          </Button>
        </div>

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
     <Modal
  title={editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
  open={modalVisible}
  onCancel={() => {
    setModalVisible(false);
    setEditingCoupon(null);
    form.resetFields();
  }}
  footer={null}
  width={800} // Increased width for better layout
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
      // Add initial values for all discount fields
      Customer_discountValue: 0,
      Dealer_discountValue: 0,
      Corporate_discountValue: 0
    }}
  >
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Form.Item
        name="code"
        label="Coupon Code"
        rules={[{ required: true, message: 'Please enter coupon code' }]}
      >
        <Input 
          placeholder="e.g., WELCOME10" 
          style={{ textTransform: 'uppercase' }} 
        />
      </Form.Item>

      <Form.Item
        name="discountType"
        label="Discount Type"
        rules={[{ required: true, message: 'Please select discount type' }]}
      >
        <Select placeholder="Select discount type" onChange={(value) => handleDiscountTypeChange(value)}>
          <Option value="percentage">Percentage</Option>
          <Option value="fixed">Fixed Amount</Option>
          <Option value="shipping">Free Shipping</Option>
          <Option value="tiered_quantity">Tiered Quantity</Option>
        </Select>
      </Form.Item>
    </div>

    {/* Discount Values Section - Show for percentage, fixed, and shipping */}
    <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h4 style={{ marginBottom: '16px' }}>Discount Values by User Type</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <Form.Item
          name="Customer_discountValue"
          label="Customer Discount"
          rules={[{ required: true, message: 'Please enter customer discount' }]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            placeholder={form.getFieldValue('discountType') === 'percentage' ? 'e.g., 10%' : 'e.g., ₹10'}
            addonAfter={form.getFieldValue('discountType') === 'percentage' ? '%' : '₹'}
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
            placeholder={form.getFieldValue('discountType') === 'percentage' ? 'e.g., 15%' : 'e.g., ₹15'}
            addonAfter={form.getFieldValue('discountType') === 'percentage' ? '%' : '₹'}
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
            placeholder={form.getFieldValue('discountType') === 'percentage' ? 'e.g., 20%' : 'e.g., ₹20'}
            addonAfter={form.getFieldValue('discountType') === 'percentage' ? '%' : '₹'}
          />
        </Form.Item>
      </div>
    </div>

    {/* Tiered Discount Section - Only show for tiered_quantity */}
    <div 
      style={{ 
        marginBottom: '16px', 
        padding: '16px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        display: form.getFieldValue('discountType') === 'tiered_quantity' ? 'block' : 'none'
      }}
    >
      <h4 style={{ marginBottom: '16px' }}>Tiered Quantity Discounts</h4>
      <Form.List name="discountTiers">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <div key={key} style={{ marginBottom: '16px', padding: '16px', border: '1px solid #d9d9d9', borderRadius: '8px' }}>
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

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Form.Item
        name="minimumOrderAmount"
        label="Minimum Order Amount"
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
        label="Maximum Discount"
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
        label="Usage Limit"
      >
        <InputNumber
          min={1}
          style={{ width: '100%' }}
          placeholder="No limit"
        />
      </Form.Item>

      <Form.Item
        name="isPerProductDiscount"
        label="Apply Per Product"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </div>

    <Form.Item
      name="dateRange"
      label="Validity Period"
      rules={[{ required: true, message: 'Please select validity period' }]}
    >
      <RangePicker style={{ width: '100%' }} />
    </Form.Item>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Form.Item
        name="applicableCategories"
        label="Applicable Categories"
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
        label="Applicable Products"
      >
        <Select
          mode="multiple"
          placeholder="Select specific products"
          // You'll need to fetch products and populate this dropdown
          // options={productOptions}
        />
      </Form.Item>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Form.Item
        name="isActive"
        label="Active Status"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        name="singleUse"
        label="Single Use"
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
      </Card>
    </div>
  );
};

export default Coupon;