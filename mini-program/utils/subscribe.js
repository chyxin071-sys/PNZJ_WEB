export const TEMPLATE_IDS = {
  PROJECT_UPDATE: 'p6lxditVBaingWXD6RqGPmz-HR_eTNkXPbfPOH_Zeuc', // 项目进度更新通知
  TODO_REMINDER: '4Q1FEem5Y-aOYcXN92aLg1kCfBuENtu0zedLmi6PSuA'    // 工地任务待处理提醒
};

export function requestSubscribe() {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_IDS.PROJECT_UPDATE, TEMPLATE_IDS.TODO_REMINDER],
      success(res) {
        console.log('订阅授权成功', res);
        resolve(res);
      },
      fail(err) {
        console.error('订阅授权失败', err);
        resolve(err);
      }
    });
  });
}
