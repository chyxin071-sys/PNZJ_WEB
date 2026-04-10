-- ==============================================================================
-- 品诺筑家 (PNZJ) - 轻量化整装全链路管理系统 V1.0 - 数据库建表语句
-- 建议使用的数据库: PostgreSQL (推荐结合 Supabase 使用)
-- ==============================================================================

-- 1. 用户/员工表 (users) - 存储员工账号、角色权限与组织架构
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL, -- 登录账号/手机号
    password_hash VARCHAR(255) NOT NULL,  -- 加密后的密码
    full_name VARCHAR(50) NOT NULL,       -- 员工姓名 (如: 王某某)
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'sales', 'designer', 'manager')), -- 角色
    department VARCHAR(50) DEFAULT '未分配', -- 所属部门 (如: 销售部、设计部、工程部)
    is_active BOOLEAN DEFAULT true,       -- 是否在职 (false 代表离职，禁止登录系统)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 客户线索表 (leads) - CRM 模块
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- 新增: 客户评级 (A: 立刻装, B: 近期装, C: 观望比较, D: 无意向)
    rating VARCHAR(10) DEFAULT 'C' CHECK (rating IN ('A', 'B', 'C', 'D')),
    
    -- 新增: 房屋类型/需求类型
    house_type VARCHAR(20) CHECK (house_type IN ('毛坯新房', '旧房翻新', '局部改造', '工装')),
    
    -- 新增: 详细地址和面积
    address VARCHAR(255),
    area DECIMAL(10, 2),                  -- 房屋面积 (平米)
    
    status VARCHAR(20) NOT NULL DEFAULT '沟通中' CHECK (status IN ('沟通中', '已量房', '方案阶段', '已签单', '已流失')),
    budget VARCHAR(50),                   -- 预算范围
    source VARCHAR(50),                   -- 来源 (大众点评, 转介绍等)
    sales_id UUID REFERENCES users(id),   -- 绑定的销售 (外键)
    designer_id UUID REFERENCES users(id),-- 绑定的设计师 (外键, 可为空)
    
    first_visit_date DATE DEFAULT CURRENT_DATE, -- 首次进店/录入时间
    last_follow_up DATE DEFAULT CURRENT_DATE,   -- 最后跟进时间
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 产品/材料库表 (products) - 用于仓库/套餐管理
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),                    -- 品牌
    category VARCHAR(50) CHECK (category IN ('主材', '辅材', '软装', '家电', '人工', '套餐')), -- 增加'套餐'类型
    sku_code VARCHAR(50) UNIQUE,          -- 产品编号/SKU
    unit VARCHAR(20),                     -- 单位 (如: 平米、个、套、项)
    price DECIMAL(10, 2) NOT NULL,        -- 单价
    stock INTEGER DEFAULT 0,              -- 仓库库存
    is_active BOOLEAN DEFAULT true,       -- 是否上架可用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 合同与报价主表 (contracts/quotes) - 连接 CRM 与 ERP 的桥梁
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_no VARCHAR(50) UNIQUE NOT NULL,      -- 合同编号
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE, -- 关联的客户
    total_amount DECIMAL(12, 2) DEFAULT 0,        -- 合同总价 (由明细表自动汇总)
    discount_amount DECIMAL(12, 2) DEFAULT 0,     -- 优惠金额
    final_amount DECIMAL(12, 2) DEFAULT 0,        -- 最终成交价
    status VARCHAR(20) NOT NULL DEFAULT '草稿' CHECK (status IN ('草稿', '待客户确认', '已签约', '已作废')),
    sign_date DATE,                               -- 签约日期
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 合同/报价明细表 (contract_items) - 实现报价与产品库联动
CREATE TABLE contract_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),      -- 关联产品库 (可为空，代表非库内自定义项)
    custom_name VARCHAR(100),                     -- 自定义项目名称
    quantity DECIMAL(10, 2) NOT NULL,             -- 数量
    unit_price DECIMAL(10, 2) NOT NULL,           -- 单价
    total_price DECIMAL(12, 2) NOT NULL,          -- 总价 (数量 * 单价)
    notes TEXT,                                   -- 备注说明
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 施工项目表 (projects) - ERP 模块 (签单后自动生成)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE, -- 关联的合同
    lead_id UUID NOT NULL REFERENCES leads(id),   -- 冗余关联客户，方便查询
    manager_id UUID REFERENCES users(id),         -- 老板指派的工长
    current_node_index INTEGER DEFAULT 1,         -- 当前进行到的节点索引 (1-8)
    status VARCHAR(20) NOT NULL DEFAULT '未开工' CHECK (status IN ('未开工', '施工中', '已竣工', '已停工')), 
    health_status VARCHAR(20) DEFAULT '正常' CHECK (health_status IN ('正常', '预警', '严重延期')), -- 新增: 项目健康度
    start_date DATE,                              -- 实际开工日期
    expected_end_date DATE,                       -- 预计完工日期
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. 施工节点打卡记录表 (project_nodes) - 记录8个标准节点的详细流水
CREATE TABLE project_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    node_name VARCHAR(50) NOT NULL,       -- 节点名称 ('开工交底', '水电交底', '木工' 等)
    node_index INTEGER NOT NULL,          -- 节点顺序 (1-8)
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE, -- 工长打卡确认完成的时间
    photo_urls JSONB,                     -- 存储打卡照片的 URL 数组 (JSON 格式)
    notes TEXT,                           -- 工长填写的备注
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. 客户文件与资料表 (customer_documents) - 贯穿全链路的共享附件池
CREATE TABLE customer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE, -- 绑定客户线索
    file_name VARCHAR(255) NOT NULL,      -- 文件名
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('合同', '图纸', '其他')), -- 资料分类
    file_url TEXT NOT NULL,               -- 文件存储地址 (如 OSS 链接)
    uploaded_by UUID REFERENCES users(id),-- 上传人
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. 跟进日志表 (follow_ups) - 记录销售和设计师的沟通流水
CREATE TABLE follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id), -- 是谁填写的记录 (区分销售还是设计)
    content TEXT NOT NULL,                -- 沟通内容
    follow_type VARCHAR(20) NOT NULL CHECK (follow_type IN ('电话沟通', '微信沟通', '门店面谈', '现场量房')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 触发器/函数 (预留):
-- 1. 当 leads 表的 status 变为 '已签单' 时，自动在 projects 表创建一条新记录。
-- 2. 创建 project 时，自动在 project_nodes 表插入 8 条初始状态(pending)的节点数据。
-- ==============================================================================