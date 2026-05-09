module.exports = (io) => {
  const onlineUsers = new Map(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User joins their personal room
    socket.on('join', ({ userId, role }) => {
      if (userId) {
        socket.join(`user-${userId}`);
        onlineUsers.set(userId, socket.id);
        if (role === 'admin') socket.join('admin-room');
        console.log(`👤 ${role} ${userId} joined`);
        io.to('admin-room').emit('user-online', { userId, online: true });
      }
    });

    // Buyer joins product room for live stock updates
    socket.on('watch-product', (productId) => {
      socket.join(`product-${productId}`);
    });

    socket.on('leave-product', (productId) => {
      socket.leave(`product-${productId}`);
    });

    // Buyer tracks order
    socket.on('track-order', (orderId) => {
      socket.join(`order-${orderId}`);
    });

    // Admin real-time room
    socket.on('join-admin', () => {
      socket.join('admin-room');
    });

    socket.on('disconnect', () => {
      for (const [userId, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(userId);
          io.to('admin-room').emit('user-online', { userId, online: false });
          break;
        }
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};
