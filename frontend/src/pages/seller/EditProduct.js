// EditProduct.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct, updateProduct } from '../../services/api';
import { ProductForm } from './AddProduct';
import toast from 'react-hot-toast';
import { FiArrowLeft } from 'react-icons/fi';

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProduct(id).then(r => setProduct(r.data.product)).catch(() => navigate('/seller/products'));
  }, [id]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      await updateProduct(id, formData);
      toast.success('Product updated!');
      navigate('/seller/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  if (!product) return <div className="spinner" style={{ margin: '80px auto' }} />;

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: '24px' }} onClick={() => navigate('/seller/products')}>
        <FiArrowLeft size={14} /> Back
      </button>
      <h1 style={{ fontSize: '26px', marginBottom: '28px' }}>Edit Product</h1>
      <div className="card" style={{ padding: '28px' }}>
        <ProductForm onSubmit={handleSubmit} loading={loading} initialData={product} />
      </div>
    </div>
  );
}
