const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pnzj';

// 定义简单的 Schema（仅用于数据导入）
const UserSchema = new mongoose.Schema({}, { strict: false });
const LeadSchema = new mongoose.Schema({}, { strict: false });
const ProjectSchema = new mongoose.Schema({}, { strict: false });
const TodoSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
const Todo = mongoose.models.Todo || mongoose.model('Todo', TodoSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB at', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 清空现有数据
    await User.deleteMany({});
    await Lead.deleteMany({});
    await Project.deleteMany({});
    await Todo.deleteMany({});
    console.log('Cleared existing collections');

    // 导入用户
    const employeesPath = path.join(__dirname, '../../shared/mock_data/employees.json');
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf-8'));
    
    // 为所有用户生成默认密码 123456 的 Hash
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    const usersToInsert = employeesData.map((emp) => ({
      name: emp.name,
      phone: emp.username, // mock data uses username for phone
      role: emp.role,
      department: emp.department,
      status: emp.status,
      joinDate: emp.joinDate,
      passwordHash: passwordHash,
      createdAt: new Date()
    }));

    await User.insertMany(usersToInsert);
    console.log(`Inserted ${usersToInsert.length} users`);

    // 导入客户
    const leadsPath = path.join(__dirname, '../../shared/mock_data/leads.json');
    const leadsData = JSON.parse(fs.readFileSync(leadsPath, 'utf-8'));
    await Lead.insertMany(leadsData);
    console.log(`Inserted ${leadsData.length} leads`);

    // 导入工地
    const projectsPath = path.join(__dirname, '../../shared/mock_data/projects.json');
    const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    await Project.insertMany(projectsData);
    console.log(`Inserted ${projectsData.length} projects`);

    // 导入待办
    const todosPath = path.join(__dirname, '../../shared/mock_data/todos.json');
    const todosData = JSON.parse(fs.readFileSync(todosPath, 'utf-8'));
    await Todo.insertMany(todosData);
    console.log(`Inserted ${todosData.length} todos`);

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();