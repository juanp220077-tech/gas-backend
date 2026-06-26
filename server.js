const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ========================================================
// 🛠️ 1. MIDDLEWARES GLOBALES
// ========================================================
app.use(express.json());
app.use(cors());

// ========================================================
// 🗄️ 2. MODELO DE MONGOOSE (SCHEMA)
// ========================================================
const OrderSchema = new mongoose.Schema({
  client: { type: String, required: true },
  driver: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'delivered'], default: 'pending' },
  eta: { type: Number, default: 7 },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// ========================================================
// 📦 3. ENDPOINT PARA CREAR UN PEDIDO (Asegura duplicidad de variables)
// ========================================================
app.post('/api/orders/create', async (req, res) => {
  const { clientId, driverId, driver } = req.body;
  
  // Respaldo: si viene como driverId o driver, capturamos el valor real.
  const finalDriverId = driverId || driver || "65f987654321098765432109";
  
  console.log(`➡️ [POST] /orders/create -> Cliente: ${clientId} asignado a Chofer: ${finalDriverId}`);

  try {
    const newOrder = new Order({ 
      client: clientId, 
      driver: finalDriverId, 
      status: 'pending' 
    });
    
    await newOrder.save();
    console.log(`✅ Pedido guardado en Atlas en estado: PENDING.`);
    return res.status(201).json(newOrder);
  } catch (error) {
    console.error("❌ Error al insertar pedido:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 📡 4. ENDPOINT DE CONSULTA DE ÓRDENES ACTIVAS (COLA MÚLTIPLE)
// ========================================================
app.get('/api/orders/driver/:driverId', async (req, res) => {
  const { driverId } = req.params;
  try {
    // Retorna todos los pedidos pendientes o aceptados de este chofer
    // Ordenados de la más antigua a la más nueva (sort 1)
    const activeOrders = await Order.find({ 
      driver: driverId,
      status: { $in: ['pending', 'accepted'] }
    }).sort({ createdAt: 1 });
    
    return res.status(200).json(activeOrders);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// ⚡ 5. ENDPOINT PARA ACEPTAR UN PEDIDO EN COLA
// ========================================================
app.put('/api/orders/accept/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'accepted', eta: 7 },
      { new: true }
    );
    console.log(`⚡ Pedido ${orderId} cambiado a estado: ACCEPTED.`);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 🛑 6. ENDPOINT PARA MARCAR COMO ENTREGADO
// ========================================================
app.put('/api/orders/deliver/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'delivered' },
      { new: true }
    );
    console.log(`📦 Pedido ${orderId} cambiado a estado: DELIVERED.`);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 🌐 7. RUTA RAÍZ (Para diagnóstico básico en Render)
// ========================================================
app.get('/', (req, res) => {
  res.send('🚀 Servidor Express de Gas-Express activo y respondiendo.');
});

// ========================================================
// 🔌 8. CONEXIÓN A MONGO DB ATLAS Y APERTURA DE PUERTO
// ========================================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://juanp220077_db_user:P43nt32026@cluster0.1husfjv.mongodb.net/?appName=Cluster0";
// const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("🔥 MongoDB Conectado con éxito a Atlas.");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en el puerto HTTP: ${PORT}`);
    });
  })
  .catch(err => console.error("❌ Fallo crítico de conexión a Mongo:", err));
