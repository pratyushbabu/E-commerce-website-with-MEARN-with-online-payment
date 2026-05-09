import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const handlers = {
      'order-status-update': ({ orderId, orderStatus, status }) => {
        const finalStatus = orderStatus || status;
        toast.success(`Order status: ${finalStatus}`, { icon: '📦' });
        const notif = {
          _id: `live-${Date.now()}`,
          message: `Order status updated to "${finalStatus}"`,
          type: 'order',
          isRead: false,
          createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      },
      'product-approved': ({ name }) => {
        toast.success(`Product "${name}" approved! 🎉`);
        const notif = {
          _id: `live-${Date.now()}`,
          message: `Your product "${name}" has been approved`,
          type: 'product',
          isRead: false,
          createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      },
      'product-rejected': ({ name }) => {
        toast.error(`Product "${name}" was rejected`);
        const notif = {
          _id: `live-${Date.now()}`,
          message: `Your product "${name}" was rejected`,
          type: 'product',
          isRead: false,
          createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      },
      'account-approved': ({ approved }) => {
        if (approved) toast.success('Your seller account has been approved! 🎉');
        else toast.error('Your seller account application was rejected');
        const notif = {
          _id: `live-${Date.now()}`,
          message: approved ? 'Your seller account has been approved!' : 'Your seller account was rejected',
          type: 'system',
          isRead: false,
          createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      },
      'new-order': ({ orderId }) => {
        if (user.role === 'seller' || user.role === 'admin') {
          toast.success('New order received!', { icon: '🛒' });
          const notif = {
            _id: `live-${Date.now()}`,
            message: 'New order received',
            type: 'order',
            isRead: false,
            createdAt: new Date(),
          };
          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(c => c + 1);
        }
      },
      'order-placed': ({ orderId }) => {
        toast.success('Order placed successfully!', { icon: '✅' });
      },
      'payment-refunded': ({ amount }) => {
        toast.success(`Refund of ₹${amount} processed`, { icon: '💰' });
        const notif = {
          _id: `live-${Date.now()}`,
          message: `Refund of ₹${amount} has been processed`,
          type: 'payment',
          isRead: false,
          createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      },
      'earnings-updated': ({ amount, orderId }) => {
        toast.success(`₹${amount?.toLocaleString()} added to your earnings!`, { icon: '💰' });
        const notif = {
          _id: `live-${Date.now()}`,
          message: `₹${amount?.toLocaleString()} credited to your earnings`,
          type: 'payment',
          isRead: false,
          createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      },
      // Seller withdrawal approved/rejected by admin
      'withdrawal-processed': ({ action, amount }) => {
        if (action === 'approved') {
          toast.success(`Withdrawal of ₹${amount?.toLocaleString()} approved! 🎉`, { duration: 6000 });
        } else {
          toast.error(`Withdrawal of ₹${amount?.toLocaleString()} was rejected.`);
        }
        const notif = {
          _id: `live-${Date.now()}`,
          message: action === 'approved'
            ? `Your withdrawal of ₹${amount?.toLocaleString()} was approved`
            : `Your withdrawal of ₹${amount?.toLocaleString()} was rejected`,
          type: 'payment',
          isRead: false,
          createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
      },
      // Account blocked/unblocked by admin
      'account-blocked': ({ blocked }) => {
        if (blocked) {
          toast.error('Your account has been blocked by admin.', { duration: 8000 });
        } else {
          toast.success('Your account has been unblocked by admin!');
        }
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      Object.keys(handlers).forEach(event => socket.off(event));
    };
  }, [user]);

  const markRead = () => setUnreadCount(0);

  return (
    <SocketContext.Provider value={{
      notifications, setNotifications,
      unreadCount, setUnreadCount,
      markRead,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
