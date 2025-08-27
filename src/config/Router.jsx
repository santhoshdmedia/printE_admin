import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/Login/Login";
import Layout from "./Layout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Category from "../pages/Categories/Category";
import Orders from "../pages/Orders/Orders";
import Products from "../pages/Products/Products";
import Settings from "../pages/Settings/Settings";
import ProductForm from "../pages/Productforms/ProductForm";
import AdminUsers from "../pages/AdminUsers/AdminUsers";
import ClientUsers from "../pages/ClientUsers/ClientUsers";
import OrderExplore from "../pages/Orders/OrderExplore";
import MainCategory from "../pages/Categories/MainCategory";
import SubCategory from "../pages/Categories/SubCategory";
import SubProductCategory from "../pages/Categories/SubProductCategory";
import Banner from "../pages/banner/Banner";
import Review from "../pages/Review/Review";
import Blog from "../pages/Blog/Blog";
import Vendors from "../pages/vendors/Vendors";
import VendorDetails from "../pages/vendors/VendorDetails";
import ClientUsersDetails from "../pages/ClientUsers/ClientUsersDetails";
import Enquires from "../pages/Enquries/Enquires";
import CustomerPage from "../pages/customerpage/CustomerPage";
import ProductDetails from "../pages/productdetails/ProductDetails";
// import EnquiresDetails from "../pages/Enquries/EnquiresDetails";
import AssignedOrder from "../pages/Orders/AssignedOrder";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: <Layout />,
    children: [{ path: "/dashboard", element: <Dashboard /> }],
  },
  {
    path: "/admin-users",
    element: <Layout />,
    children: [{ path: "/admin-users", element: <AdminUsers /> }],
  },
  {
    path: "/categories",
    element: <Layout />,
    children: [{ path: "/categories", element: <Category /> }],
  },

  {
    path: "/categories/main-category",
    element: <Layout />,
    children: [{ path: "/categories/main-category", element: <MainCategory /> }],
  },
  {
    path: "/categories/sub-category",
    element: <Layout />,
    children: [{ path: "/categories/sub-category", element: <SubCategory /> }],
  },
  {
    path: "/categories/product-category",
    element: <Layout />,
    children: [{ path: "/categories/product-category", element: <SubProductCategory /> }],
  },

  {
    path: "/client-users",
    element: <Layout />,
    children: [{ path: "/client-users", element: <ClientUsers /> }],
  },
  {
    path: "/orders",
    element: <Layout />,
    children: [{ path: "/orders", element: <Orders /> }],
  },
  {
    path: "/assigned-order",
    element: <Layout />,
    children: [{ path: "/assigned-order", element: <AssignedOrder /> }],
  },
  {
    path: "/order_explore",
    element: <Layout />,
    children: [{ path: "/order_explore", element: <OrderExplore /> }],
  },
  {
    path: "/product-details",
    element: <Layout />,
    children: [{ path: "/product-details", element: <Products /> }],
  },
  {
    path: "/products/product-description",
    element: <Layout />,
    children: [{ path: "/products/product-description", element: <ProductDetails /> }],
  },
  {
    path: "/settings",
    element: <Layout />,
    children: [{ path: "/settings", element: <Settings /> }],
  },
  {
    path: "/homepage/banners",
    element: <Layout />,
    children: [{ path: "/homepage/banners", element: <Banner /> }],
  },
  {
    path: "/forms",
    element: <Layout />,
    children: [{ path: "/forms", element: <ProductForm /> }],
  },
  {
    path: "/review",
    element: <Layout />,
    children: [{ path: "/review", element: <Review /> }],
  },
  {
    path: "/vendors",
    element: <Layout />,
    children: [{ path: "/vendors", element: <Vendors /> }],
  },
  {
    path: "/vendor_details/:id",
    element: <Layout />,
    children: [{ path: "/vendor_details/:id", element: <VendorDetails /> }],
  },
  {
    path: "/blogs",
    element: <Layout />,
    children: [{ path: "/blogs", element: <Blog /> }],
  },
  {
    path: "/user_details",
    element: <Layout />,
    children: [{ path: "/user_details", element: <ClientUsersDetails /> }],
  },
  {
    path: "/enquires",
    element: <Layout />,
    children: [{ path: "/enquires", element: <Enquires /> }],
  },
  {
    path: "/homepage/product-section",
    element: <Layout />,
    children: [{ path: "/homepage/product-section", element: <CustomerPage /> }],
  },
]);
