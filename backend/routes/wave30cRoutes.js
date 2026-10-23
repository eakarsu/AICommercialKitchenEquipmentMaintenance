'use strict';
const {createWave30cRouter}=require('./wave30c');
const auth=require('../middleware/auth');
const pool=require('../db');
async function loadRecords(){ const r=await pool.query('SELECT id,title,status,priority,equipment_id,due_date FROM work_orders ORDER BY created_at DESC LIMIT 200'); return r.rows; }
module.exports=createWave30cRouter({auth,loadRecords,features:["failure-risk-summary", "maintenance-due-forecast", "work-order-priority-brief"],searchFields:['title','name','client_name']});
