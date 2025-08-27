import { Button, Form, Input } from "antd";
import DefaultTile from "../../components/DefaultTile";
import { formValidation } from "../../helper/formvalidation";
import { LabelHelper } from "../../components/LabelHelper";
import { changePassword, updateAdmin } from "../../api";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Settings = () => {
  const [form] = Form.useForm();
  const { user } = useSelector((state) => state.authSlice);

  const [editable, setEditable] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  const handleFinish = async (value) => {
    try {
      const { oldPassword, newPassword } = value;
      const result = await changePassword(oldPassword, newPassword);
      form.resetFields();
      SUCCESS_NOTIFICATION(result);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  const handleUpdateDetails = async () => {
    try {
      const result = await updateAdmin({ _id: user?._id, name: name, email: email });
      SUCCESS_NOTIFICATION(result);
      setEditable(false);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    }
  };

  return (
    <div>
      <DefaultTile title={"Settings"} />
      <div className="pt-10 pl-10">
        <h1 className="text-xl font-bold text-primary">Account</h1>
        <p>Manage Your Account</p>
        <div className="bg-primary h-0.5 rounded-full mt-5"></div>
      </div>

      <div className="pt-10 text-lg text-primary">
        <div className="flex items-center gap-x-4 pl-10">
          <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-secondary text-white font-bold text-2xl">{name?.[0]?.toUpperCase() || "A"}</div>
          <div>
            <p className="text-black text-lg font-medium">{name}</p>
          </div>
        </div>

        <div className="flex pl-10 m-auto gap-x-10">
          <div className="pt-10">
            <h1 className="text-xl font-semibold">Details</h1>
            <Form className="flex pt-4">
              <Form.Item label={<LabelHelper title={"Admin Name"} />} labelCol={{ span: 24 }}>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="w-[400px] h-[45px] rounded-full border-primary" placeholder="Admin Name" disabled={!editable} />
              </Form.Item>
            </Form>
            <Form>
              <Form.Item label={<LabelHelper title={"Email"} />} labelCol={{ span: 24 }}>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="w-[400px] h-[45px] rounded-full border-primary" placeholder="Email Address" disabled={!editable} />
              </Form.Item>
            </Form>
            {editable ? (
              <Button className="bg-primary text-white" onClick={handleUpdateDetails}>
                Save
              </Button>
            ) : (
              <Button className="bg-primary text-white" onClick={() => setEditable(true)}>
                Edit
              </Button>
            )}
          </div>

          <div className="pt-10">
            <h1 className="text-xl font-semibold text-primary">Change Password</h1>
            <Form className="pt-4" form={form} onFinish={handleFinish}>
              <Form.Item rules={formValidation["Enter Old Password"]} name="oldPassword" label={<LabelHelper title={"Old Password"} />} labelCol={{ span: 24 }}>
                <Input.Password placeholder="Enter Your Old Password" className="w-[400px] h-[45px] rounded-full border-primary" />
              </Form.Item>
              <Form.Item rules={formValidation["Enter New Passowrd"]} name="newPassword" label={<LabelHelper title={"New Password"} />} labelCol={{ span: 24 }}>
                <Input.Password placeholder="Enter Your New Password" className="w-[400px] h-[45px] rounded-full border-primary" />
              </Form.Item>
              <Form.Item className="pr-32 flex justify-end">
                <Button className="bg-primary text-white" htmlType="submit">
                  Save
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
      <div className="bg-primary h-0.5 rounded-full mt-5"></div>
    </div>
  );
};

export default Settings;
