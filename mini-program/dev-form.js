const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';

// 1. 创建新建/编辑待办页面的文件夹
const todoFormDir = path.join(mpRoot, 'pages', 'todoForm');
if (!fs.existsSync(todoFormDir)) {
  fs.mkdirSync(todoFormDir, { recursive: true });
}

// 2. 写入 todoForm 页面代码

// index.json
const formJson = {
  "navigationBarTitleText": "新建待办",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#faf9f8"
};
fs.writeFileSync(path.join(todoFormDir, 'index.json'), JSON.stringify(formJson, null, 2), 'utf8');

// index.wxml
const formWxml = `
<view class="page-container">
  <scroll-view scroll-y class="form-scroll">
    <!-- 标题 -->
    <view class="form-group">
      <view class="label">任务标题 <text class="required">*</text></view>
      <input class="input-box" placeholder="输入待办任务标题..." placeholder-class="ph" value="{{formData.title}}" bindinput="onInput" data-field="title" />
    </view>

    <!-- 优先级 -->
    <view class="form-group">
      <view class="label">优先级 <text class="required">*</text></view>
      <view class="priority-selector">
        <view class="p-btn {{formData.priority === 'low' ? 'p-active-low' : ''}}" bindtap="setPriority" data-value="low">
          <view class="p-dot bg-emerald-500"></view>普通
        </view>
        <view class="p-btn {{formData.priority === 'medium' ? 'p-active-medium' : ''}}" bindtap="setPriority" data-value="medium">
          <view class="p-dot bg-amber-500"></view>重要
        </view>
        <view class="p-btn {{formData.priority === 'high' ? 'p-active-high' : ''}}" bindtap="setPriority" data-value="high">
          <view class="p-dot bg-rose-500"></view>紧急
        </view>
      </view>
    </view>

    <!-- 关联类型与对象 -->
    <view class="form-row-group">
      <view class="form-group half">
        <view class="label">关联类型</view>
        <picker bindchange="onTypeChange" value="{{typeIndex}}" range="{{typeOptions}}">
          <view class="picker-box">
            <text class="{{!formData.relatedType ? 'ph' : ''}}">{{typeOptions[typeIndex] || '请选择'}}</text>
            <view class="arrow-down"></view>
          </view>
        </picker>
      </view>

      <view class="form-group half" wx:if="{{formData.relatedType !== 'none'}}">
        <view class="label">关联{{formData.relatedType === 'lead' ? '客户' : '工地'}}</view>
        <picker bindchange="onRelatedChange" value="{{relatedIndex}}" range="{{relatedOptions}}" range-key="name">
          <view class="picker-box">
            <text class="{{relatedIndex === -1 ? 'ph' : 'ellipsis'}}">{{relatedIndex !== -1 ? relatedOptions[relatedIndex].name : '请选择'}}</text>
            <view class="arrow-down"></view>
          </view>
        </picker>
      </view>
    </view>

    <!-- 截止日期 -->
    <view class="form-group">
      <view class="label">截止日期 <text class="required">*</text></view>
      <picker mode="date" value="{{formData.dueDate}}" bindchange="onDateChange">
        <view class="picker-box">
          <text class="{{!formData.dueDate ? 'ph' : ''}}">{{formData.dueDate || '选择截止日期'}}</text>
          <view class="icon-calendar"></view>
        </view>
      </picker>
    </view>

    <!-- 执行人 -->
    <view class="form-group">
      <view class="label">执行人 <text class="required">*</text></view>
      <picker bindchange="onAssigneeChange" value="{{assigneeIndex}}" range="{{employees}}" range-key="displayName">
        <view class="picker-box">
          <text class="{{assigneeIndex === -1 ? 'ph' : ''}}">{{assigneeIndex !== -1 ? employees[assigneeIndex].displayName : '请选择人员'}}</text>
          <view class="arrow-down"></view>
        </view>
      </picker>
    </view>

    <!-- 详细描述 -->
    <view class="form-group">
      <view class="label">详细描述</view>
      <textarea class="textarea-box" placeholder="添加更详细的任务描述（选填）..." placeholder-class="ph" value="{{formData.description}}" bindinput="onInput" data-field="description" auto-height maxlength="500"></textarea>
    </view>
    
    <view class="bottom-padding"></view>
  </scroll-view>

  <!-- 底部固定按钮区 -->
  <view class="bottom-bar">
    <view class="btn-cancel hover-scale" bindtap="goBack">取消</view>
    <view class="btn-save hover-scale" bindtap="saveTodo">保存</view>
  </view>
</view>
`;
fs.writeFileSync(path.join(todoFormDir, 'index.wxml'), formWxml, 'utf8');

// index.wxss
const formWxss = `
.page-container { height: 100vh; display: flex; flex-direction: column; background: #faf9f8; }

.form-scroll { flex: 1; padding: 32rpx; box-sizing: border-box; }

.form-group { margin-bottom: 40rpx; }
.form-row-group { display: flex; gap: 24rpx; }
.half { flex: 1; min-width: 0; }

.label { font-size: 28rpx; font-weight: bold; color: #4a403a; margin-bottom: 16rpx; display: flex; align-items: center; }
.required { color: #e11d48; margin-left: 8rpx; }

.input-box, .picker-box, .textarea-box { background: #fff; border: 2rpx solid #eaddd7; border-radius: 16rpx; font-size: 28rpx; color: #4a403a; transition: all 0.2s; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.01); }
.input-box:focus, .textarea-box:focus { border-color: #b5a49a; box-shadow: 0 4rpx 12rpx rgba(74, 64, 58, 0.05); }

.input-box { height: 96rpx; padding: 0 24rpx; }
.picker-box { height: 96rpx; padding: 0 24rpx; display: flex; align-items: center; justify-content: space-between; }
.textarea-box { padding: 24rpx; min-height: 200rpx; width: 100%; box-sizing: border-box; }

.ph { color: #b5a49a; }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85%; }

/* 箭头和图标 */
.arrow-down { width: 0; height: 0; border-left: 10rpx solid transparent; border-right: 10rpx solid transparent; border-top: 12rpx solid #b5a49a; border-radius: 2rpx; flex-shrink: 0; }
.icon-calendar { width: 28rpx; height: 28rpx; border: 4rpx solid #b5a49a; border-radius: 6rpx; position: relative; flex-shrink: 0; }
.icon-calendar::before { content: ''; position: absolute; top: -6rpx; left: 4rpx; width: 4rpx; height: 8rpx; background: #b5a49a; border-radius: 2rpx; box-shadow: 12rpx 0 0 #b5a49a; }
.icon-calendar::after { content: ''; position: absolute; top: 8rpx; left: 0; width: 100%; height: 4rpx; background: #b5a49a; }

/* 优先级选择器 */
.priority-selector { display: flex; gap: 20rpx; }
.p-btn { flex: 1; height: 88rpx; background: #fff; border: 2rpx solid #eaddd7; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: bold; color: #8c7a6e; transition: all 0.2s; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.01); }
.p-dot { width: 12rpx; height: 12rpx; border-radius: 50%; margin-right: 12rpx; }

.bg-emerald-500 { background: #10b981; }
.bg-amber-500 { background: #f59e0b; }
.bg-rose-500 { background: #e11d48; }

.p-active-low { background: #ecfdf5; border-color: #34d399; color: #059669; }
.p-active-medium { background: #fffbeb; border-color: #fbbf24; color: #d97706; }
.p-active-high { background: #fff1f2; border-color: #fb7185; color: #e11d48; }

.bottom-padding { height: 180rpx; }

/* 底部操作栏 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 24rpx 40rpx 60rpx; border-top: 1rpx solid rgba(0,0,0,0.05); display: flex; gap: 24rpx; z-index: 100; }
.btn-cancel { flex: 1; height: 96rpx; background: #f5f4f2; color: #4a403a; border-radius: 48rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: bold; }
.btn-save { flex: 2; height: 96rpx; background: #4a403a; color: #fff; border-radius: 48rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: bold; box-shadow: 0 8rpx 24rpx rgba(74, 64, 58, 0.2); }

/* 全局点击动效 */
.hover-scale { transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1); }
.hover-scale:active { transform: scale(0.96); }
`;
fs.writeFileSync(path.join(todoFormDir, 'index.wxss'), formWxss, 'utf8');

// index.js
const formJs = `
const leadsData = require('../../mock/leads.js');
const projectsData = require('../../mock/projects.js');
const employeesData = require('../../mock/employees.js');

Page({
  data: {
    isEdit: false,
    id: null,
    
    formData: {
      title: '',
      priority: 'low',
      relatedType: 'none',
      relatedId: '',
      dueDate: '',
      assignedToId: '',
      description: ''
    },
    
    // UI Options
    typeOptions: ['无关联', '关联客户', '关联工地'],
    typeValues: ['none', 'lead', 'project'],
    typeIndex: 0,
    
    relatedOptions: [],
    relatedIndex: -1,
    
    employees: [],
    assigneeIndex: -1
  },

  onLoad(options) {
    // 格式化员工数据用于选择
    const emps = employeesData.map(e => ({
      ...e,
      displayName: \`\${e.name} (\${e.role === 'admin' ? '管理员' : e.role === 'designer' ? '设计师' : e.role === 'sales' ? '销售' : '项目经理'})\`
    }));
    this.setData({ employees: emps });

    if (options.id) {
      // TODO: Edit mode load data
      wx.setNavigationBarTitle({ title: '编辑待办' });
      this.setData({ isEdit: true, id: options.id });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [\`formData.\${field}\`]: e.detail.value
    });
  },

  setPriority(e) {
    this.setData({
      'formData.priority': e.currentTarget.dataset.value
    });
  },

  onTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const typeVal = this.data.typeValues[idx];
    
    let relatedOps = [];
    if (typeVal === 'lead') {
      relatedOps = leadsData.map(l => ({ id: l.id, name: \`\${l.name} - \${l.status}\` }));
    } else if (typeVal === 'project') {
      relatedOps = projectsData.map(p => ({ id: p.id, name: \`\${p.customer} - \${p.address}\` }));
    }

    this.setData({
      typeIndex: idx,
      'formData.relatedType': typeVal,
      relatedOptions: relatedOps,
      relatedIndex: -1,
      'formData.relatedId': ''
    });
  },

  onRelatedChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      relatedIndex: idx,
      'formData.relatedId': this.data.relatedOptions[idx].id
    });
  },

  onDateChange(e) {
    this.setData({
      'formData.dueDate': e.detail.value
    });
  },

  onAssigneeChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      assigneeIndex: idx,
      'formData.assignedToId': this.data.employees[idx].id
    });
  },

  goBack() {
    wx.navigateBack();
  },

  saveTodo() {
    const d = this.data.formData;
    if (!d.title.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!d.dueDate) return wx.showToast({ title: '请选择截止日期', icon: 'none' });
    if (!d.assignedToId) return wx.showToast({ title: '请选择执行人', icon: 'none' });
    if (d.relatedType !== 'none' && !d.relatedId) return wx.showToast({ title: '请选择关联对象', icon: 'none' });

    wx.showLoading({ title: '保存中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    }, 600);
  }
});
`;
fs.writeFileSync(path.join(todoFormDir, 'index.js'), formJs, 'utf8');

// 3. 在 app.json 中注册新页面
const appJsonPath = path.join(mpRoot, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
if (!appJson.pages.includes('pages/todoForm/index')) {
  appJson.pages.push('pages/todoForm/index');
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
}

// 4. 更新首页 (index/index.js 和 wxml) 添加跳转和卡片点击动效
const indexWxmlPath = path.join(mpRoot, 'pages', 'index', 'index.wxml');
let idxWxml = fs.readFileSync(indexWxmlPath, 'utf8');
// 添加卡片点击动画类 hover-class="card-hover" hover-stay-time="100"
idxWxml = idxWxml.replace('class="todo-card', 'class="todo-card" hover-class="card-hover" hover-stay-time="100"');
// 添加新建按钮动画类
idxWxml = idxWxml.replace('class="btn-create-small"', 'class="btn-create-small hover-scale"');
fs.writeFileSync(indexWxmlPath, idxWxml, 'utf8');

const indexWxssPath = path.join(mpRoot, 'pages', 'index', 'index.wxss');
let idxWxss = fs.readFileSync(indexWxssPath, 'utf8');
idxWxss += `\n/* 点击动效 */\n.card-hover { transform: scale(0.98); opacity: 0.9; }\n.hover-scale { transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1); }\n.hover-scale:active { transform: scale(0.95); }\n`;
fs.writeFileSync(indexWxssPath, idxWxss, 'utf8');

const indexJsPath = path.join(mpRoot, 'pages', 'index', 'index.js');
let idxJs = fs.readFileSync(indexJsPath, 'utf8');
idxJs = idxJs.replace(
  /createTodo\(\) \{[\s\S]*?\}/,
  `createTodo() {
    wx.navigateTo({ url: '/pages/todoForm/index' });
  }`
);
idxJs = idxJs.replace(
  /onTodoTap\(e\) \{[\s\S]*?\}/,
  `onTodoTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/todoForm/index?id=' + id });
  }`
);
// 如果原本没有 onTodoTap，加上去
if (!idxJs.includes('onTodoTap')) {
  idxJs = idxJs.replace(/createTodo\(\) \{/, `onTodoTap(e) {
    const id = e.currentTarget.dataset.id;
    if(id) wx.navigateTo({ url: '/pages/todoForm/index?id=' + id });
  },
  createTodo() {`);
}
fs.writeFileSync(indexJsPath, idxJs, 'utf8');

console.log('Todo Form developed and animations added.');
