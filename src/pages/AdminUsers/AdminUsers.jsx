import React, { useEffect, useState } from "react";
import DefaultTile from "../../components/DefaultTile";
import { Button, Input, Modal, Select, Table, Tag } from "antd";
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { addAdmin, deleteAdamin, getAdmin, updateAdmin } from "../../api/index";
import _ from "lodash";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import CustomTable from "../../components/CustomTable";
const AdminUsers = () => {
  const [adminUsersData, setAdminUsersData] = useState([]);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalType, setModalType] = useState("Add");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });
  const { confirm } = Modal;

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCloseModal = () => {
    setModalStatus(false);
    setModalType("Add");
    setAddUserForm({
      _id: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "",
    });
  };

  const deleteUserConfirm = (record) => {
    confirm({
      title: "Do you want to delete User?",
      content: "",
      async onOk() {
        try {
          const result = await deleteAdamin(record._id);
          SUCCESS_NOTIFICATION(result);
          fetchAdminData();
        } catch (error) {
          ERROR_NOTIFICATION(error);
        }
      },
      onCancel() {},
    });
  };

  const handleOkModal = async () => {
    let result;
    try {
      setConfirmLoading(true);
      if (modalType === "Add") result = await addAdmin(addUserForm);
      else if (modalType === "Edit") result = await updateAdmin(addUserForm);
      else
        result = await updateAdmin({
          _id: addUserForm._id,
          email: addUserForm.email,
          password: addUserForm.password,
        });
      SUCCESS_NOTIFICATION(result);
      setConfirmLoading(false);
      handleCloseModal();
      fetchAdminData();
    } catch (error) {
      console.error("Error fetching admin data:", error);
      ERROR_NOTIFICATION(error);
      setConfirmLoading(false);
    }
  };

  const handleEditDetails = (record) => {
    setAddUserForm(record);
    setModalStatus(true);
    setModalType("Edit");
  };

  const handleEditPassword = (record) => {
    setAddUserForm(record);
    setAddUserForm((pre) => ({ ...pre, password: "" }));
    setModalStatus(true);
    setModalType("Edit Password");
  };

  const handleOnChange = (e) => {
    const { value, name } = e.target;
    setAddUserForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectOnChange = (value) => {
    setAddUserForm((pre) => ({ ...pre, role: value }));
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const result = await getAdmin();
      setAdminUsersData(_.get(result, "data.data", []));
    } catch (error) {
      console.error("Error fetching admin data:", error);
      ERROR_NOTIFICATION(error);
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
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Mobile Number",
      dataIndex: "phone",
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (data) => {
        switch (data) {
          case "super admin":
            return <Tag color="magenta">{data}</Tag>;
          case "accounting team":
            return <Tag color="volcano">{data}</Tag>;
          case "designing team":
            return <Tag color="green">{data}</Tag>;
          case "production team":
            return <Tag color="gold">{data}</Tag>;
          case "delivery team":
            return <Tag color="blue">{data}</Tag>;
          default:
            return <Tag color="purple">{data}</Tag>;
        }
      },
    },
    {
      title: "Password",
      align: "center",
      render: (text, record, index) => {
        return (
          record.role !== "super admin" && (
            <Button className="text-green-600" onClick={() => handleEditPassword(record)}>
              Edit
            </Button>
          )
        );
      },
    },
    {
      title: "Action",
      render: (text, record, index) => {
        return (
          <div className="flex gap-1">
            <Button className="text-green-600" onClick={() => handleEditDetails(record)}>
              Edit
            </Button>
            {record.role !== "super admin" && (
              <Button className="text-red-500" onClick={() => deleteUserConfirm(record)}>
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const roles = [{ value: "super admin" }, { value: "accounting team" }, { value: "designing team" }, { value: "production team" }, { value: "delivery team" }];

  return (
    <div>
      <DefaultTile title={"Admin Users"} addModal={true} addModalText="User" modalFormStatus={modalStatus} setModalFormStatus={setModalStatus} />
      <div>
        <CustomTable loading={loading} dataSource={adminUsersData} columns={columns} />
      </div>

      <Modal open={modalStatus} confirmLoading={confirmLoading} onOk={handleOkModal} closable={false} onCancel={handleCloseModal} okText={`${modalType} User`} title={`${modalType}`}>
        {modalType !== "Edit Password" ? (
          <div className="px-5 py-1 flex flex-col gap-5">
            <div>
              <label>
                Name <span className="text-red-500">*</span>
              </label>
              <Input className="" placeholder="Your Name" name="name" onChange={handleOnChange} value={addUserForm.name} />
            </div>
            <div>
              <label>
                Email <span className="text-red-500">*</span>
              </label>
              <Input className="" placeholder="Your Email" name="email" onChange={handleOnChange} value={addUserForm.email} required />
            </div>
            {modalType === "Add" && (
              <div>
                <label>
                  Password <span className="text-red-500">*</span>
                </label>
                <Input.Password className="" placeholder="Your Password" name="password" onChange={handleOnChange} value={addUserForm.password} />
              </div>
            )}
            <div>
              <label>
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <Input className="" placeholder="Your Mobile Number" name="phone" onChange={handleOnChange} value={addUserForm.phone} />
            </div>
            <div className="flex flex-col">
              <label>
                Role <span className="text-red-500">*</span>
              </label>
              <Select placeholder={"Your Role"} onChange={handleSelectOnChange} options={roles} value={addUserForm.role} />
            </div>
          </div>
        ) : (
          <div>
            <label>
              Password <span className="text-red-500">*</span>
            </label>
            <Input.Password className="" placeholder="Your Password" name="password" onChange={handleOnChange} value={addUserForm.password} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
