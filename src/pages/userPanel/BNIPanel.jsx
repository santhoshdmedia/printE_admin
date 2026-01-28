import { useEffect, useState } from "react";
import {
    Button,
    Form,
    Input,
    Modal,
    Spin,
    Card,
    Tag,
    Select,
    Popconfirm,
    message,
    Table,
    Empty,
    Descriptions,
    Divider,
    Row,
    Col
} from "antd";
import {
    MailOutlined,
    PhoneOutlined,
    EyeOutlined,
    SendOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    UserOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
    IdcardOutlined,
    BookOutlined // Add this icon for chapter name
} from "@ant-design/icons";
import { ERROR_NOTIFICATION, SUCCESS_NOTIFICATION } from "../../helper/notification_helper";
import { getCustomUser, sendMailDealer, verifyUser } from "../../api";
import _ from "lodash";
import { useNavigate } from "react-router-dom";

const BNIPanel = () => {
    const [search, setSearch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sendingMail, setSendingMail] = useState({});
    const [verifying, setVerifying] = useState({});
    const [allCustomUser, setAllCustomUser] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const navigate = useNavigate();

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [sortedData, setSortedData] = useState([]);

    const handleView = (user) => {
        try {
            setSelectedUser(user);
            setViewModalVisible(true);
        } catch (error) {
            console.error("Error opening modal:", error);
        }
    };

    const handleVerify = async (userId, userEmail) => {
        try {
            setVerifying(prev => ({ ...prev, [userId]: true }));

            const data = {
                Dealer_verification: true,
                verified_at: new Date().toISOString(),
            };

            await verifyUser(userId, data);

            // Update local state
            setAllCustomUser(prevUsers =>
                prevUsers.map(user =>
                    user._id === userId ? { ...user, ...data } : user
                )
            );
            setSortedData(prevUsers =>
                prevUsers.map(user =>
                    user._id === userId ? { ...user, ...data } : user
                )
            );

            SUCCESS_NOTIFICATION({ message: 'User verified successfully!' });

            // After successful verification, send mail
            if (userEmail) {
                await handleSendMail(userId, userEmail);
            }
        } catch (err) {
            console.error('Error verifying user:', err);
            ERROR_NOTIFICATION(err);
        } finally {
            setVerifying(prev => ({ ...prev, [userId]: false }));
        }
    };

    const collectUsers = async () => {
        try {
            setLoading(true);
            const result = await getCustomUser(search);
            const data = _.get(result, "data.data", []);

            const sorted = _.orderBy(
                data,
                ['createdAt', '_id'],
                ['desc', 'desc']
            );
            const BNIUsers = sorted.filter((user) => user.role === "bni_user");

            setAllCustomUser(BNIUsers);
            setSortedData(BNIUsers);
            setPagination({
                ...pagination,
                total: BNIUsers.length,
            });
        } catch (err) {
            console.log(err);
            ERROR_NOTIFICATION(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        collectUsers();
    }, [search]);

    const handleSendMail = async (userId, userEmail) => {
        if (!userEmail) {
            message.error("No email address found for this user");
            return;
        }

        try {
            setSendingMail(prev => ({ ...prev, [userId]: true }));

            const payload = { mail_id: userEmail };
            const result = await sendMailDealer(payload);

            SUCCESS_NOTIFICATION(result || { message: "Mail sent successfully!" });
        } catch (err) {
            console.error("Error sending mail:", err);
            ERROR_NOTIFICATION(err);
        } finally {
            setSendingMail(prev => ({ ...prev, [userId]: false }));
        }
    };

    const columns = [
        {
            title: "S.No",
            key: "sno",
            align: "center",
            width: 80,
            render: (text, record, index) => {
                const { current, pageSize, total } = pagination;
                const globalIndex = (current - 1) * pageSize + index;
                return <span>{total - globalIndex}</span>;
            },
        },
        {
            title: "Name",
            dataIndex: "name",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            render: (name) => <div className="font-medium">{name}</div>,
        },
        {
            title: "Chapter Name",
            dataIndex: "chapter_Name",
            sorter: (a, b) => (a.chapter_Name || "").localeCompare(b.chapter_Name || ""),
            render: (chapter_Name) => (
                <div className="flex items-center">
                    <BookOutlined className="mr-1 text-gray-400" />
                    {chapter_Name || "N/A"}
                </div>
            ),
        },
        {
            title: "Verification Status",
            dataIndex: "Dealer_verification",
            sorter: (a, b) => (a.Dealer_verification ? 1 : 0) - (b.Dealer_verification ? 1 : 0),
            render: (verified) => {
                return verified ? (
                    <Tag
                        icon={<CheckCircleOutlined />}
                        color="success"
                        className="flex items-center"
                    >
                        Verified
                    </Tag>
                ) : (
                    <Tag
                        icon={<CloseCircleOutlined />}
                        color="error"
                        className="flex items-center"
                    >
                        Not Verified
                    </Tag>
                );
            },
        },
        {
            title: "Email",
            dataIndex: "email",
            sorter: (a, b) => (a.email || "").localeCompare(b.email || ""),
            render: (email) => (
                <div className="flex items-center">
                    <MailOutlined className="mr-1 text-gray-400" />
                    {email}
                </div>
            ),
        },
        {
            title: "Phone",
            dataIndex: "phone",
            sorter: (a, b) => (a.phone || "").localeCompare(b.phone || ""),
            render: (phone) => (
                <div className="flex items-center">
                    <PhoneOutlined className="mr-1 text-gray-400" />
                    {phone}
                </div>
            ),
        },
        {
            title: "Created Date",
            dataIndex: "createdAt",
            sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
            defaultSortOrder: 'descend',
            render: (date) => {
                if (!date) return "N/A";
                return new Date(date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            },
        },
        {
            title: "Action",
            key: "action",
            render: (text, record) => {
                const isVerified = record.Dealer_verification;
                
                return (
                    <div className="flex space-x-2">
                        <Button
                            icon={<EyeOutlined />}
                            className="text-yellow-600 border-yellow-400 hover:bg-yellow-50"
                            onClick={() => handleView(record)}
                        >
                            View
                        </Button>

                        {!isVerified && (
                            <Popconfirm
                                title="Verify this user?"
                                description={`This will verify ${record.name} and send them an email.`}
                                onConfirm={() => handleVerify(record._id, record.email)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    icon={<CheckCircleOutlined />}
                                    loading={verifying[record._id]}
                                    className="text-green-600 border-green-400 hover:bg-green-50"
                                >
                                    Verify
                                </Button>
                            </Popconfirm>
                        )}

                        {isVerified && (
                            <Popconfirm
                                title="Send mail to this user?"
                                description={`Send an email to ${record.email}?`}
                                onConfirm={() => handleSendMail(record._id, record.email)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    icon={<SendOutlined />}
                                    loading={sendingMail[record._id]}
                                    className="text-blue-600 border-blue-400 hover:bg-blue-50"
                                >
                                    Send Mail
                                </Button>
                            </Popconfirm>
                        )}
                    </div>
                );
            },
        },
    ];

    const handleTableChange = (newPagination, filters, sorter) => {
        setPagination({
            ...pagination,
            current: newPagination.current,
            pageSize: newPagination.pageSize,
        });

        if (sorter.field) {
            const data = [...allCustomUser];
            const sorted = _.orderBy(
                data,
                [sorter.field],
                [sorter.order === 'ascend' ? 'asc' : 'desc']
            );
            setSortedData(sorted);
        } else {
            const data = [...allCustomUser];
            const sorted = _.orderBy(data, ['createdAt', '_id'], ['desc', 'desc']);
            setSortedData(sorted);
        }
    };

    return (
        <Spin spinning={loading}>
            <div className="p-4 bg-yellow-50 min-h-screen">
                <Card
                    title={
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-yellow-800">
                                BNI Users
                            </h2>
                        </div>
                    }
                    className="rounded-lg shadow-sm border-0 border-t-4 border-t-yellow-400"
                >
                    <div className="mb-4 flex justify-between">
                        <Input.Search
                            placeholder="Search users..."
                            allowClear
                            onSearch={setSearch}
                            className="w-64"
                            size="large"
                        />
                        <div className="text-sm text-yellow-700">
                            Total Users:{" "}
                            <span className="font-semibold">{pagination.total}</span>
                        </div>
                    </div>

                    <div className="p-2">
                        {sortedData.length > 0 ? (
                            <Table
                                dataSource={sortedData}
                                columns={columns}
                                pagination={{
                                    ...pagination,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '20', '30', '50'],
                                    showTotal: (total, range) =>
                                        `${range[0]}-${range[1]} of ${total} users`,
                                }}
                                rowKey="_id"
                                onChange={handleTableChange}
                                bordered
                                className="bg-white"
                                rowClassName="hover:bg-yellow-50"
                            />
                        ) : (
                            <div className="flex justify-center items-center min-h-[200px]">
                                <Empty description="No Users Available" />
                            </div>
                        )}
                    </div>
                </Card>

                {/* View User Details Modal */}
                <Modal
                    title={
                        <div className="flex items-center">
                            <UserOutlined className="mr-2 text-yellow-600" />
                            <span>BNI User Details</span>
                        </div>
                    }
                    open={viewModalVisible}
                    onCancel={() => setViewModalVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setViewModalVisible(false)}>
                            Close
                        </Button>,
                        selectedUser && !selectedUser.Dealer_verification && (
                            <Popconfirm
                                key="verify"
                                title="Verify this user?"
                                description={`This will verify ${selectedUser.name} and send them an email.`}
                                onConfirm={() => {
                                    handleVerify(selectedUser._id, selectedUser.email);
                                    setViewModalVisible(false);
                                }}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    loading={verifying[selectedUser._id]}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Verify User
                                </Button>
                            </Popconfirm>
                        ),
                        selectedUser && selectedUser.Dealer_verification && (
                            <Popconfirm
                                key="mail"
                                title="Send mail to this user?"
                                description={`Send an email to ${selectedUser.email}?`}
                                onConfirm={() => {
                                    handleSendMail(selectedUser._id, selectedUser.email);
                                    setViewModalVisible(false);
                                }}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    loading={sendingMail[selectedUser._id]}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Send Mail
                                </Button>
                            </Popconfirm>
                        )
                    ]}
                    width={800}
                    centered
                >
                    {selectedUser && (
                        <div className="p-4">
                            <Descriptions bordered column={2}>
                                <Descriptions.Item label="Name" span={2}>
                                    <div className="flex items-center">
                                        <UserOutlined className="mr-2 text-gray-400" />
                                        {selectedUser.name || "N/A"}
                                    </div>
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="Email">
                                    <div className="flex items-center">
                                        <MailOutlined className="mr-2 text-gray-400" />
                                        {selectedUser.email || "N/A"}
                                    </div>
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="Chapter Name">
                                    <div className="flex items-center">
                                        <BookOutlined className="mr-2 text-gray-400" />
                                        {selectedUser.chapter_Name || "N/A"}
                                    </div>
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="Phone">
                                    <div className="flex items-center">
                                        <PhoneOutlined className="mr-2 text-gray-400" />
                                        {selectedUser.phone || "N/A"}
                                    </div>
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="Verification Status">
                                    {selectedUser.Dealer_verification ? (
                                        <Tag icon={<CheckCircleOutlined />} color="success">
                                            Verified
                                        </Tag>
                                    ) : (
                                        <Tag icon={<CloseCircleOutlined />} color="error">
                                            Not Verified
                                        </Tag>
                                    )}
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="Role">
                                    <Tag color="blue">
                                        {selectedUser.role || "N/A"}
                                    </Tag>
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="User ID">
                                    <div className="flex items-center">
                                        <IdcardOutlined className="mr-2 text-gray-400" />
                                        <code className="text-xs">{selectedUser._id}</code>
                                    </div>
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="Created Date">
                                    <div className="flex items-center">
                                        <CalendarOutlined className="mr-2 text-gray-400" />
                                        {selectedUser.createdAt ? (
                                            new Date(selectedUser.createdAt).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                        ) : "N/A"}
                                    </div>
                                </Descriptions.Item>
                                
                                <Descriptions.Item label="Verified Date">
                                    <div className="flex items-center">
                                        <CalendarOutlined className="mr-2 text-gray-400" />
                                        {selectedUser.verified_at ? (
                                            new Date(selectedUser.verified_at).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                        ) : "Not verified yet"}
                                    </div>
                                </Descriptions.Item>
                            </Descriptions>

                            {/* Additional Information Section */}
                            {/* <Divider orientation="left">Additional Information</Divider>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div className="mb-3">
                                        <strong className="block text-gray-600">Country:</strong>
                                        <span>{selectedUser.country || "N/A"}</span>
                                    </div>
                                    <div className="mb-3">
                                        <strong className="block text-gray-600">State:</strong>
                                        <span>{selectedUser.state || "N/A"}</span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="mb-3">
                                        <strong className="block text-gray-600">City:</strong>
                                        <span>{selectedUser.city || "N/A"}</span>
                                    </div>
                                    <div className="mb-3">
                                        <strong className="block text-gray-600">Pincode:</strong>
                                        <span>{selectedUser.pincode || "N/A"}</span>
                                    </div>
                                </Col>
                            </Row> */}

                            {/* Display any other fields that might exist */}
                            {Object.keys(selectedUser).filter(key => 
                                !['_id', 'name', 'email', 'phone', 'role', 'Dealer_verification', 
                                  'createdAt', 'verified_at', 'country', 'state', 'city', 'pincode',
                                  'chapter_Name', '__v'].includes(key)
                            ).length > 0 && (
                                <>
                                    {/* <Divider orientation="left">Other Details</Divider>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <pre className="text-xs overflow-auto max-h-40">
                                            {JSON.stringify(
                                                Object.fromEntries(
                                                    Object.entries(selectedUser).filter(([key]) => 
                                                        !['_id', 'name', 'email', 'phone', 'role', 'Dealer_verification', 
                                                          'createdAt', 'verified_at', 'country', 'state', 'city', 'pincode',
                                                          'chapter_Name', '__v'].includes(key)
                                                    )
                                                ), 
                                                null, 
                                                2
                                            )}  
                                        </pre>
                                    </div> */}
                                </>
                            )}
                        </div>
                    )}
                </Modal>

                <style jsx>{`
                    .ant-card-head-title {
                        font-weight: 600;
                    }
                    .ant-input:focus, .ant-input-focused {
                        border-color: #f59e0b;
                        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
                    }
                `}</style>
            </div>
        </Spin>
    );
};

export default BNIPanel;