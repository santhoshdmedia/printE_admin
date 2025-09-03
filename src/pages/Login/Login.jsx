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
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

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
      
      // Animation before navigation
      setTimeout(() => {
        navigate("/dashboard");
        form.resetFields();
      }, 1500);
    } catch (err) {
      console.log(err);
      ERROR_NOTIFICATION(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem(admintoken)) {
      navigate("/dashboard");
    }
    
    // Welcome message animation timer
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 2500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white min-h-screen overflow-hidden">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Left Section - Image & Welcome */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50"
        >
          <AnimatePresence>
            {showWelcome ? (
              <motion.div
                key="welcome-message"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-10"
              >
                <h1 className="text-primary font-bold text-5xl mb-4">Welcome!</h1>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-1 bg-primary rounded-full mx-auto mb-4"
                />
                <p className="text-lg text-gray-600">Customize your products and purchase them with ease.</p>
              </motion.div>
            ) : (
              <motion.div
                key="login-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
              >
                <motion.h1 
                  className="text-primary font-semibold text-4xl mb-6 text-center"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  Start Your Journey
                </motion.h1>
                <motion.p 
                  className="text-gray-600 text-center mb-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Sign in to access your personalized dashboard
                </motion.p>
                <motion.img 
                  src="https://img.freepik.com/free-vector/social-media-data-center-smm-stats-digital-marketing-research-market-trends-analysis-female-expert-studying-online-survey-results_335657-868.jpg?t=st=1736316714~exp=1736320314~hmac=63b171b3c7ee1eb45ef0dfbaa651a56653aa1e439f38d90653d1cde0a0e00fb3&w=740" 
                  alt="Login Visual" 
                  className="w-full h-auto object-contain rounded-lg shadow-lg"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.7 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Section - Form */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white"
        >
          <div className="w-full max-w-md">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mb-8 text-center"
            >
              <h1 className="text-3xl font-bold text-primary mb-2">Adventure Starts Here</h1>
              <p className="text-gray-600">Make your app management easy and fun!</p>
            </motion.div>

            <Form 
              onFinish={onFinish} 
              name="login" 
              layout="vertical" 
              className="w-full"
              form={form} 
              requiredMark={false}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Form.Item 
                  name="email" 
                  label={<LabelHelper title={"Email"} />} 
                  rules={[EmailValidation("Enter Email")]}
                >
                  <Input 
                    placeholder="Enter Email" 
                    className="h-12 rounded-lg"
                    disabled={loading}
                  />
                </Form.Item>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <Form.Item 
                  name="password" 
                  label={<LabelHelper title={"Password"} />} 
                  rules={[PasswordValidation("Enter Password")]}
                >
                  <Input.Password 
                    placeholder="Enter Password" 
                    className="h-12 rounded-lg"
                    disabled={loading}
                  />
                </Form.Item>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mb-4"
              >
                <Form.Item name="remember" valuePropName="checked">
                  <Checkbox disabled={loading}>Remember me</Checkbox>
                </Form.Item>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <Form.Item>
                  <Button 
                    htmlType="submit" 
                    className="w-full h-12 rounded-lg bg-primary text-white font-semibold border-none"
                    disabled={loading}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center"
                        >
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Signing In...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="login-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Sign In
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </Form.Item>
              </motion.div>
            </Form>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="mt-6 text-center"
            >
              <p className="text-gray-600">
                Don't have an account?{" "}
                <a href="#" className="text-primary font-semibold hover:underline">
                  Sign up
                </a>
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;