import _ from "lodash";
import { ICON_HELPER } from "./iconhelper";

export const MENU_DATA = [
  {
    id: 1,
    name: "Dashboard",
    icon: ICON_HELPER.HOME_ICON,
    to: "/dashboard",
    special: ["dashboard"],
    for: ["super admin", "accounting team", "designing team", "production team", "delivery team"],
  },

  {
    id: 2,
    name: "Orders",
    icon: ICON_HELPER.ORDERS_ICON,
    to: "/orders",
    special: ["orders","assigned-order", "order_explore"],
    for: ["super admin", "accounting team", "designing team", "production team", "delivery team"],
  },
  
  {
    id: 3,
    name: "Categories",
    icon: ICON_HELPER.CATEGORY_ICON,
    to: "/categories",
    special: ["main-category", "sub-category", "product-category"],
    for: ["super admin"],
    children: [
      {
        id: 31,
        name: "Main Category",
        to: "/categories/main-category",
        special: ["main-category"],
      },
      {
        id: 32,
        name: "Sub Category",
        to: "/categories/sub-category",
        special: ["sub-category"],
      },
      // {
      //   id: 33,
      //   name: "Product Category",
      //   to: "/categories/product-category",
      //   special: ["product-category"],
      // },
    ],
  },

  {
    id: 4,
    name: "Products",
    icon: ICON_HELPER.PRODUCT_ICON,
    to: "/product-details",
    special: ["product-details"],
    for: ["super admin", "accounting team", "designing team", "production team", "delivery team"],
  },

  // {
  //   id: 66,
  //   name: "Products",
  //   icon: ICON_HELPER.PRODUCT_ICON,
  //   special: ["product-details", "product-description"],
  //   for: ["super admin"],
  //   children: [
  //     {
  //       id: 61,
  //       name: "Product Details",
  //       to: "/products/product-details",
  //       special: ["product-details"],
  //     },
  //     {
  //       id: 62,
  //       name: "Product Description",
  //       to: "/products/product-description",
  //       special: ["product-description"],
  //     },
  //   ],
  // },
  {
    id:5,
    name: "Homepage",
    icon: ICON_HELPER.BANNER_ICON,
    special: ["banners", "product-section"],
    for: ["super admin"],
    children: [
      {
        id: 51,
        name: "Banners",
        to: "/homepage/banners",
        special: ["banners"],
      },
      {
        id: 52,
        name: "Product Section",
        to: "/homepage/product-section",
        special: ["product-section"],
      },
    ],
  },

  {
    id: 6,
    name: "Admin Users",
    icon: ICON_HELPER.ADMIN_ICON,
    to: "/admin-users",
    special: ["admin-users"],
    for: ["super admin"],
  },

  {
    id: 7,
    name: "Customers",
    icon: ICON_HELPER.USER_ICON,
    to: "/client-users",
    special: ["client-users", "user_details"],
    for: ["super admin"],
  },
  {
    id: 8,
    name: "Users",
    icon: ICON_HELPER.VENDORS_ICON,
    to: "/users",
    special: ["client-users", "user_details"],
    for: ["super admin","frontend admin"],
  },

  {
    id: 9,
    name: "Vendors",
    icon: ICON_HELPER.VENDORS_ICON,
    to: "/vendors",
    special: ["vendors", "vendor_details"],
    for: ["super admin","frontend admin"],
  },
  {
    id: 10,
    name: "Blogs",
    icon: ICON_HELPER.BLOG_ICONS,
    to: "/blogs",
    special: ["blogs"],
    for: ["super admin"],
  },

  {
    id: 11,
    name: "Review",
    icon: ICON_HELPER.REVIEW_ICON,
    to: "/review",
    special: ["review"],
    for: ["super admin"],
  },
  {
    id: 12,
    name: "Enquires",
    icon: ICON_HELPER.MAIL_ICON,
    to: "/enquires",
    special: ["enquires", "enquires-details"],
    for: ["super admin"],
  },
  {
    id: 14,
    name: "Bulk Enquires",
    icon: ICON_HELPER.MAIL_ICON,
    to: "/bulk-enquires",
    special: ["bulk-enquires"],
    for: ["super admin"]
  },
  {
    id: 13,
    name: "Setting",
    icon: ICON_HELPER.SETTINGS_ICON,
    to: "/settings",
    special: ["settings"],
    for: ["super admin", "accounting team", "designing team", "production team", "delivery team"],
  },
];

export const GET_DASHBOARD_COUNTS = (name, allCounts, others) => {
  try {
    const result = allCounts.filter((res) => {
      return res.name === name;
    });
    let labels = _.get(result, "[0].count", []).map((res) => {
      return _.get(res, "_id.type", "");
    });
    let count = _.get(result, "[0].count", []).map((res) => {
      return _.get(res, "total_products", 0);
    });
    if (others) {
      return [
        ["", ""],
        [labels[0], count[0]],
        [labels[1], count[1]],
      ];
    } else {
      return [
        ["", ...labels],
        ["", ...count],
      ];
    }
  } catch (err) {
    console.log(err);
  }
};

export const GET_DASHBOARD_SUB_COUNTS = (name, allCounts) => {
  try {
    const result = allCounts.filter((res) => {
      return res.name === name;
    });

    return _.get(result, "[0].count", 0);
  } catch (err) {
    console.log(err);
  }
};
