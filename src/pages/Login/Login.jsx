import { Button, Checkbox, Form, Input, message } from "antd";
import { LabelHelper } from "../../components/LabelHelper";
import { IMAGE_HELPER } from "../../helper/imagehelper";
import { EmailValidation, formValidation, PasswordValidation } from "../../helper/formvalidation";
import { useEffect, useState } from "react";
import { login } from "../../api";
import _ from "lodash";
import { admintoken, ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { isLoginSuccess } from "../../redux/slices/authSlice";

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const result = await login(values);
      if (_.isEmpty(_.get(result, "data.data", []))) {
        return ERROR_NOTIFICATION("Invalid credentials");
      }
      dispatch(isLoginSuccess(_.get(result, "data.data", {})));
      localStorage.setItem(admintoken, _.get(result, "data.data.token", ""));
      localStorage.setItem("userprofile",JSON.stringify(_.get(result,"data.data","")))
      SUCCESS_NOTIFICATION(result);
      navigate("/dashboard");
      form.resetFields();
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem(admintoken)) {
      navigate("/dashboard");
    }
  }, []);

  return (
    <>
      <div className="bg-white">
        <div className="flex ">
          {/* image div */}

          <div className="w-1/2 items-center  justify-center m-auto   ">
            <h1 className="text-primary font-semibold pl-[300px] text-4xl pb-10 drop-shadow-2xl">
              Welcome...
              <br />
              <span className="text-sm text-black  -ml-[100px]">Customize your products and purchase them with ease.</span>
            </h1>

            <img src="https://img.freepik.com/free-vector/social-media-data-center-smm-stats-digital-marketing-research-market-trends-analysis-female-expert-studying-online-survey-results_335657-868.jpg?t=st=1736316714~exp=1736320314~hmac=63b171b3c7ee1eb45ef0dfbaa651a56653aa1e439f38d90653d1cde0a0e00fb3&w=740" alt="Login Visual" className=" h-[400px]  w-full  object-contain   rounded-md shadow-sm" />
          </div>

          {/* form div */}
          <div className="w-[50%] h-screen center_div  ">
            <div className="w-[70%] m-auto">
              <div>
                <h1 className="text-4xl   text-primary font-bold tracking-wider">Adventure start here </h1>
                <p className="text-sm">Make your app management easy and fun !</p>
              </div>

              <div>
                <Form onFinish={onFinish} name="login" layout="vertical" className="flex flex-wrap gap-x-10 w-full pt-5" form={form} requiredMark={false}>
                  <Form.Item name="email" className="" label={<LabelHelper title={"Email"} />} rules={[EmailValidation("Enter Email")]}>
                    <Input placeholder="Enter Email" className="w-[400px] h-[45px] " />
                  </Form.Item>

                  <Form.Item name="password" className="pb-2" label={<LabelHelper title={"Password"} />} rules={[PasswordValidation("Enter Password")]}>
                    <Input.Password placeholder="Enter Password" className="w-[400px] h-[45px]" />
                  </Form.Item>

                  <Form.Item>
                    <Button htmlType="submit" className="bg-primary text-white center_div w-[400px] h-[45px]">
                      Login
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
