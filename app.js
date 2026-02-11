/**
 * ALL-IN-ONE BIKE POWER PAY-AS-YOU-GO APP
 * Backend + Frontend in ONE FILE
 * Run: node app.js
 */

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ================== CONFIG ==================
const PORT = 3000;
const MONGO_URI = "mongodb://127.0.0.1:27017/bike_power_payg";

// ================== DATABASE ==================
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// ================== MODELS ==================
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const ClientSchema = new mongoose.Schema({
  fullName: String,
  idNumber: String,
  bikeModel: String,
  numberPlate: { type: String, unique: true },
  photoUrl: String,
  phone: String,
  lastPayment: Date,
  expiresAt: Date,
  powerStatus: { type: String, default: "OFF" }
});

const User = mongoose.model("User", UserSchema);
const Client = mongoose.model("Client", ClientSchema);

// ================== SEED ADMIN ==================
(async () => {
  const exists = await User.findOne({ username: "admin" });
  if (!exists) {
    await User.create({ username: "admin", password: "1234" });
    console.log("Admin user created: admin / 1234");
  }
})();

// ================== FRONTEND PAGES ==================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Bike Power Login</title>
  <style>
    body { margin:0; height:100vh; background:linear-gradient(135deg,#0f172a,#020617);
      display:flex; align-items:center; justify-content:center; font-family:Arial; color:white; }
    .card { background:#0b1220; padding:40px; border-radius:16px; width:320px; text-align:center;
      box-shadow:0 10px 30px rgba(0,0,0,.6); }
    .logo { font-size:28px; font-weight:bold; margin-bottom:10px; animation:pulse 2s infinite; }
    @keyframes pulse { 0%{transform:scale(1);opacity:.7} 50%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:.7} }
    input,button { width:100%; padding:12px; margin:10px 0; border-radius:8px; border:none; }
    button { background:#22c55e; font-weight:bold; cursor:pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚡ Bike Power</div>
    <input id="username" placeholder="Username" />
    <input id="password" type="password" placeholder="Password" />
    <button onclick="login()">Login</button>
    <p id="msg"></p>
  </div>
<script>
async function login(){
  const res = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:username.value,password:password.value})});
  const data = await res.json();
  if(data.success) location.href='/dashboard';
  else msg.innerText='Login failed';
}
</script>
</body>
</html>
`);
});

app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <style>
    body{margin:0;min-height:100vh;background:#020617;color:white;font-family:Arial;padding:30px;}
    .card{background:#0f172a;padding:20px;border-radius:14px;max-width:520px;margin:auto;}
    input,button{width:100%;padding:10px;margin:8px 0;border-radius:6px;border:none;}
    button{background:#38bdf8;font-weight:bold;cursor:pointer;}
    .on{color:#22c55e;font-weight:bold} .off{color:#ef4444;font-weight:bold}
    .watermark{text-align:center;margin-top:40px;opacity:.3}
  </style>
</head>
<body>
  <div class="card">
    <h2>🚀 Bike Dashboard</h2>
    <input id="plate" placeholder="Number Plate" />
    <button onclick="check()">Check Status</button>
    <p id="status"></p>
    <p id="expires"></p>
    <hr/>
    <h3>Register Client</h3>
    <input id="fullName" placeholder="Full Name"/>
    <input id="idNumber" placeholder="ID Number"/>
    <input id="bikeModel" placeholder="Bike Model"/>
    <input id="numberPlate" placeholder="Number Plate"/>
    <input id="phone" placeholder="Phone (2547...)" />
    <button onclick="register()">Register Client</button>
    <hr/>
    <button onclick="pay()">Simulate Pay KSh 50</button>
    <p id="paymsg"></p>
  </div>
  <div class="watermark">Cheptek Bike Power System</div>
<script>
async function check(){
  const res = await fetch('/api/status/'+plate.value);
  const d = await res.json();
  if(!d.powerStatus){ status.innerText='Not found'; return; }
  status.innerHTML = 'Power: ' + (d.powerStatus==='ON' ? '<span class="on">ON</span>' : '<span class="off">OFF</span>');
  expires.innerText = 'Expires: ' + new Date(d.expiresAt).toLocaleString();
}
async function register(){
  const res = await fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fullName:fullName.value,idNumber:idNumber.value,bikeModel:bikeModel.value,
      numberPlate:numberPlate.value,phone:phone.value})});
  const d = await res.json();
  alert(d.success ? 'Client registered' : 'Error');
}
async function pay(){
  const res = await fetch('/api/simulate-pay',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({numberPlate:plate.value})});
  const d = await res.json();
  paymsg.innerText = d.message;
}
</script>
</body>
</html>
`);
});

// ================== APIs ==================
app.post("/api/login", async (req,res)=>{
  const {username,password} = req.body;
  const u = await User.findOne({username,password});
  res.json({success: !!u});
});

app.post("/api/clients", async (req,res)=>{
  try{ const c = await Client.create(req.body); res.json({success:true,client:c}); }
  catch(e){ res.json({success:false,error:e.message}); }
});

app.post("/api/simulate-pay", async (req,res)=>{
  const {numberPlate} = req.body;
  const c = await Client.findOne({numberPlate});
  if(!c) return res.json({success:false,message:'Bike not found'});
  const now = new Date();
  c.lastPayment = now;
  c.expiresAt = new Date(now.getTime()+24*60*60*1000);
  c.powerStatus = "ON";
  await c.save();
  res.json({success:true,message:'Payment received. Power ON for 24 hours.'});
});

app.get("/api/status/:plate", async (req,res)=>{
  const c = await Client.findOne({numberPlate:req.params.plate});
  if(!c) return res.json({});
  if(c.expiresAt && new Date()>c.expiresAt){ c.powerStatus="OFF"; await c.save(); }
  res.json({powerStatus:c.powerStatus,expiresAt:c.expiresAt});
});

// ================== AUTO EXPIRE ==================
setInterval(async ()=>{
  const now = new Date();
  const expired = await Client.find({expiresAt:{$lt:now},powerStatus:"ON"});
  for(const c of expired){ c.powerStatus="OFF"; await c.save(); console.log("POWER OFF:",c.numberPlate); }
}, 60000);

app.listen(PORT, ()=>console.log("🚀 App running on http://localhost:"+PORT));
