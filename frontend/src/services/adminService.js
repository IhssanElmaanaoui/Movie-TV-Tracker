import api from './api';

const getAdminId = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.id;
};

const adminService = {
  /** Feature 3 – Dashboard stats */
  getDashboard: (period = 'all') =>
    api.get('/admin/dashboard', { params: { adminId: getAdminId(), period } }),


  /** Feature 1 – User management */
  getAllUsers: () =>
    api.get('/admin/users', { params: { adminId: getAdminId() } }),

  addAdmin: (data) =>
    api.post('/admin/users', data, { params: { adminId: getAdminId() } }),

  /** Feature 2 – Community moderation */
  suspendUser: (targetUserId, reason, hours) =>
    api.put(`/admin/users/${targetUserId}/suspend`, { reason, hours }, {
      params: { adminId: getAdminId() },
    }),

  banUser: (targetUserId, reason) =>
    api.put(`/admin/users/${targetUserId}/ban`, { reason }, {
      params: { adminId: getAdminId() },
    }),

  unbanUser: (targetUserId) =>
    api.put(`/admin/users/${targetUserId}/unban`, {}, {
      params: { adminId: getAdminId() },
    }),

  forceDeleteTopic: (topicId) =>
    api.delete(`/admin/community/topics/${topicId}`, {
      params: { adminId: getAdminId() },
    }),

  forceDeleteReply: (replyId) =>
    api.delete(`/admin/community/replies/${replyId}`, {
      params: { adminId: getAdminId() },
    }),

  lockTopic: (topicId, locked) =>
    api.put(`/admin/community/topics/${topicId}/lock`, {}, {
      params: { adminId: getAdminId(), locked },
    }),

  pinTopic: (topicId, pinned) =>
    api.put(`/admin/community/topics/${topicId}/pin`, {}, {
      params: { adminId: getAdminId(), pinned },
    }),
};

export default adminService;
