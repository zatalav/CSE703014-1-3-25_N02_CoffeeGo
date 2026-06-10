import { Navigate, createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Order from "./pages/Order";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";
import Stores from "./pages/Stores";
import Rewards from "./pages/Rewards";
import { NewsList, NewsDetail } from "./pages/News";
import About from "./pages/About";
import { Login, Register, ForgotPassword } from "./pages/Auth";
import Profile from "./pages/Profile";
import PaymentReturn from "./pages/PaymentReturn";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "products", Component: Menu },
      { path: "product-detail/:id", Component: ProductDetail },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Order },
      { path: "payment-return", Component: PaymentReturn },
      { path: "orders", element: <Profile initialTab="orders" /> },
      { path: "menu", element: <Navigate to="/products" replace /> },
      { path: "order", element: <Navigate to="/checkout" replace /> },
      { path: "order-success", element: <Profile initialTab="orders" /> },
      { path: "stores", Component: Stores },
      { path: "rewards", Component: Rewards },
      { path: "news", Component: NewsList },
      { path: "news/:slug", Component: NewsDetail },
      { path: "about", Component: About },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "profile", Component: Profile },
      { path: "*", Component: Home },
    ],
  },
]);
