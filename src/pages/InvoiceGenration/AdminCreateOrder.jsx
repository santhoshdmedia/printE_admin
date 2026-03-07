import { useState } from 'react';
import { FaPlus, FaTrash, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaShoppingCart, FaReceipt, FaSave } from 'react-icons/fa';

const EMPTY_ITEM = { product_id: '', product_name: '', quantity: 1, mrp_price: 0, price: 0, size: '', color: '', notes: '' };

const AdminCreateOrder = () => {
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(null);
  const [error,   setError]     = useState('');

  const [formData, setFormData] = useState({
    customer_name:     '',
    customer_email:    '',
    customer_phone:    '',
    address_line1:     '',   // ← fixed: was mixing street / Line_1 / Line_2
    address_line2:     '',
    city:              '',
    state:             '',
    pincode:           '',
    country:           'India',
    gst_no:            '',
    delivery_charges:  0,
    free_delivery:     false,
    notes:             '',
  });

  const [cartItems, setCartItems] = useState([{ ...EMPTY_ITEM }]);

  // ── form helpers ──────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCartItemChange = (index, field, value) => {
    setCartItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: ['quantity', 'price', 'mrp_price'].includes(field)
          ? parseFloat(value) || 0
          : value,
      };
      return updated;
    });
  };

  const addCartItem    = () => setCartItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeCartItem = (index) => {
    if (cartItems.length > 1) setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── totals ────────────────────────────────────────────────────────────────
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax      = subtotal * 0.18;
    const delivery = formData.free_delivery ? 0 : parseFloat(formData.delivery_charges || 0);
    return { subtotal, tax, delivery, total: subtotal + tax + delivery };
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const validCartItems = cartItems.filter(
        item => item.product_name && item.quantity > 0 && item.price > 0
      );
      if (validCartItems.length === 0) throw new Error('Please add at least one valid product');

      const { subtotal, tax, total } = calculateTotals();

      const orderData = {
        customer_name:  formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        delivery_address: {
          // combine line1 + line2 into "street"; keep landmark separate if API supports it
          street:   [formData.address_line1, formData.address_line2].filter(Boolean).join(', '),
          landmark: formData.address_line2,
          city:     formData.city,
          state:    formData.state,
          pincode:  formData.pincode,
          country:  formData.country,
        },
        cart_items:       validCartItems,   // each item already has mrp_price
        gst_no:           formData.gst_no,
        delivery_charges: formData.free_delivery ? 0 : parseFloat(formData.delivery_charges),
        free_delivery:    formData.free_delivery,
        subtotal,
        tax_amount:       tax,
        discount_amount:  0,
        total_amount:     total,
        notes:            formData.notes,
        admin_id:         '675be0febb62992beaa0b1c0',
      };

      const response = await fetch('http://localhost:8080/api/payment/admin/create-order', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create order');

      setSuccess({
        invoice_no:   data.data.invoice_no,
        payment_link: data.data.payment_link,
        total_amount: data.data.total_amount,
      });

      // reset
      setFormData({
        customer_name: '', customer_email: '', customer_phone: '',
        address_line1: '', address_line2: '',
        city: '', state: '', pincode: '', country: 'India',
        gst_no: '', delivery_charges: 0, free_delivery: false, notes: '',
      });
      setCartItems([{ ...EMPTY_ITEM }]);

    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, delivery, total } = calculateTotals();

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <FaShoppingCart className="text-blue-600" />
            Create New Order
          </h1>

          {/* ── error banner ── */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* ── success banner ── */}
          {success && (
            <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-bold text-green-800 mb-2">Order Created Successfully!</h3>
              <div className="space-y-2 text-green-700">
                <p><strong>Invoice No:</strong> {success.invoice_no}</p>
                <p><strong>Amount:</strong> ₹{success.total_amount.toFixed(2)}</p>
                <p><strong>Payment Link:</strong></p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={success.payment_link}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(success.payment_link)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ── Customer Information ── */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaUser className="text-blue-600" /> Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                  <input type="text" name="customer_name" value={formData.customer_name}
                    onChange={handleInputChange} required placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input type="email" name="customer_email" value={formData.customer_email}
                    onChange={handleInputChange} required placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input type="tel" name="customer_phone" value={formData.customer_phone}
                    onChange={handleInputChange} required maxLength={10} placeholder="9876543210"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </section>

            {/* ── Delivery Address ── */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaMapMarkerAlt className="text-blue-600" /> Delivery Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
                  <input type="text" name="address_line1" value={formData.address_line1}
                    onChange={handleInputChange} required placeholder="Flat / Door No, Building Name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                  <input type="text" name="address_line2" value={formData.address_line2}
                    onChange={handleInputChange} placeholder="Street, Area, Landmark"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'City *',    name: 'city',    required: true,  maxLength: undefined },
                    { label: 'State *',   name: 'state',   required: true,  maxLength: undefined },
                    { label: 'Pincode *', name: 'pincode', required: true,  maxLength: 6 },
                    { label: 'Country',   name: 'country', required: false, maxLength: undefined },
                  ].map(({ label, name, required, maxLength }) => (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                      <input type="text" name={name} value={formData[name]}
                        onChange={handleInputChange} required={required}
                        {...(maxLength ? { maxLength } : {})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Cart Items ── */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaShoppingCart className="text-blue-600" /> Order Items
                </h2>
                <button type="button" onClick={addCartItem}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <FaPlus /> Add Item
                </button>
              </div>

              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                      {/* Product Name */}
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                        <input type="text" value={item.product_name}
                          onChange={e => handleCartItemChange(index, 'product_name', e.target.value)}
                          required placeholder="Product name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>

                      {/* Notes */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <input type="text" value={item.notes}
                          onChange={e => handleCartItemChange(index, 'notes', e.target.value)}
                          placeholder="e.g. custom text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Qty *</label>
                        <input type="number" value={item.quantity} min="1" required
                          onChange={e => handleCartItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>

                      {/* MRP */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">MRP (₹)</label>
                        <input type="number" value={item.mrp_price} min="0" step="0.01"
                          onChange={e => handleCartItemChange(index, 'mrp_price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>

                      {/* Selling Price */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
                        <input type="number" value={item.price} min="0" step="0.01" required
                          onChange={e => handleCartItemChange(index, 'price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>

                      {/* Line Total */}
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-medium text-sm">
                          ₹{(item.quantity * item.price).toFixed(2)}
                        </div>
                      </div>

                      {/* Remove */}
                      <div className="md:col-span-1">
                        <button type="button" onClick={() => removeCartItem(index)}
                          disabled={cartItems.length === 1}
                          className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                          <FaTrash className="mx-auto" />
                        </button>
                      </div>

                    </div>

                    {/* Discount badge — shown only when mrp > price */}
                    {item.mrp_price > 0 && item.price > 0 && item.mrp_price > item.price && (
                      <p className="mt-2 text-xs text-green-600 font-medium">
                        Discount: ₹{(item.mrp_price - item.price).toFixed(2)} &nbsp;
                        ({Math.round(((item.mrp_price - item.price) / item.mrp_price) * 100)}% off)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Additional Details ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Number (Optional)</label>
                <input type="text" name="gst_no" value={formData.gst_no}
                  onChange={handleInputChange} maxLength={15} placeholder="22AAAAA0000A1Z5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Charges (₹)</label>
                <input type="number" name="delivery_charges" value={formData.delivery_charges}
                  onChange={handleInputChange} disabled={formData.free_delivery} min="0" step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100" />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" name="free_delivery" checked={formData.free_delivery}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded" />
                  <span className="text-sm text-gray-700">Free Delivery</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Internal)</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3}
                placeholder="Internal notes about this order..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            {/* ── Order Summary ── */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaReceipt className="text-blue-600" /> Order Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax (18% GST):</span>
                  <span className="font-semibold">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Delivery Charges:</span>
                  <span className="font-semibold">₹{delivery.toFixed(2)}</span>
                </div>
                <div className="border-t border-blue-300 pt-2 mt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">Total Amount:</span>
                    <span className="font-bold text-blue-600">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => window.history.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                <FaSave />
                {loading ? 'Creating Order...' : 'Create Order'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateOrder;