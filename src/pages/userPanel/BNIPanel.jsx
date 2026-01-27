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
    Empty
} from "antd";
import {
    MailOutlined,
    PhoneOutlined,
    EyeOutlined,
    SendOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined
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
    const navigate = useNavigate();

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [sortedData, setSortedData] = useState([]);

    const handleView = (id) => {
        try {
            navigate("/user_details", { state: id });
        } catch (error) {
            console.error("Navigation error:", error);
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
                            onClick={() => handleView(record._id)}
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